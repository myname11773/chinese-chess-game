/**
 * Pikafish WASM Worker（单线程模式，无需 SharedArrayBuffer）
 * 使用 Emscripten classic script + importScripts
 * 包含防重复将军逻辑
 */

// === 修复 Emscripten 6.x ResizableArrayBuffer 兼容性问题 ===
// Emscripten 6.x 使用 ResizableArrayBuffer，但 TextDecoder.decode 不支持
(function() {
  var origDecode = TextDecoder.prototype.decode;
  TextDecoder.prototype.decode = function(input, options) {
    try {
      return origDecode.call(this, input, options);
    } catch(e) {
      // 如果 decode 失败（可能是 resizable ArrayBuffer），创建副本后重试
      var buf;
      if (input instanceof ArrayBuffer) {
        buf = new Uint8Array(input.byteLength);
        buf.set(new Uint8Array(input));
      } else if (input && input.buffer instanceof ArrayBuffer) {
        buf = new Uint8Array(input.byteLength);
        buf.set(new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
      } else {
        throw e;
      }
      return origDecode.call(this, buf, options);
    }
  };
})();

// === 游戏棋子代码到 FEN 字符的映射 ===
const PIECE_TO_FEN = {
  b_j: 'k', b_s: 'a', b_x: 'b', b_m: 'n', b_c: 'r', b_p: 'c', b_z: 'p',
  r_j: 'K', r_s: 'A', r_x: 'B', r_m: 'N', r_c: 'R', r_p: 'C', r_z: 'P',
};

function boardToFen(board, currentPlayer) {
  const fenRows = [];
  for (let r = 0; r < 10; r++) {
    let rowStr = '', empty = 0;
    for (let c = 0; c < 9; c++) {
      const code = board[r][c];
      if (!code) { empty++; }
      else {
        if (empty > 0) { rowStr += empty; empty = 0; }
        rowStr += PIECE_TO_FEN[code] || '?';
      }
    }
    if (empty > 0) rowStr += empty;
    fenRows.push(rowStr);
  }
  const fenBoard = fenRows.join('/');
  const side = currentPlayer === 'red' ? 'w' : 'b';
  return `${fenBoard} ${side} - - 0 1`;
}

function parseBestmove(bestmove) {
  if (!bestmove || bestmove === '(none)') return null;
  var move = bestmove.replace(/[+#]/g, '');
  if (move.length < 4) return null;
  // UCI 坐标：列 a-i (0-8)，行 0-9（0=红方底线，9=黑方底线）
  // 棋盘数组：行 0=黑方顶，9=红方底，列 0-8
  var fromCol = move.charCodeAt(0) - 97;
  var fromRow = 9 - parseInt(move.substring(1, 2));
  var toCol = move.charCodeAt(2) - 97;
  var toRow = 9 - parseInt(move.substring(3, 4));
  if (isNaN(fromRow) || isNaN(toRow)) return null;
  return { fromRow: fromRow, fromCol: fromCol, toRow: toRow, toCol: toCol };
}

const DIFFICULTY_SETTINGS = {
  1: { depth: 4,  movetime: 1000 },
  2: { depth: 8,  movetime: 2000 },
  3: { depth: 12, movetime: 3000 },
  4: { depth: 16, movetime: 5000 },
  5: { depth: 22, movetime: 8000 },
};

// 满血版Pikafish：适中深度，保证1-3秒内返回
const MAX_STRENGTH = { depth: 10, movetime: 2000 };

let initialized = false;

// 防重复将军：记录 AI 近期走法
let recentMoves = [];      // 最近 AI 走法列表
let consecutiveChecks = 0; // 连续将军次数

var Module = {
  locateFile: function(path) {
    var base = self.location.href.replace(/[^/]*$/, '');
    return base + path;
  },
  print: function(text) {
    // 转发引擎输出用于调试
    if (typeof text === 'string' && text.length > 0) {
      self.postMessage({ type: 'debug', msg: '[engine] ' + text });
    }
  },
  printErr: function(text) {
    // 转发所有 stderr 输出用于调试
    if (typeof text === 'string' && text.length > 0) {
      self.postMessage({ type: 'debug', msg: '[engine err] ' + text });
    }
    // 只在真正崩溃时发送 error（避免误判正常输出）
    if (typeof text === 'string' && (text.indexOf('Aborted(') !== -1 || text.indexOf('abort()') !== -1)) {
      self.postMessage({ type: 'error', message: text });
    }
  },
  onRuntimeInitialized: function() {
    try {
      Module.ccall('js_init', null, [], []);
      initialized = true;
      recentMoves = [];
      consecutiveChecks = 0;
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: 'js_init failed: ' + String(err.message || err) });
    }
  },
};

var baseUrl = self.location.href.replace(/[^/]*$/, '');
importScripts(baseUrl + 'pikafish.js');

self.addEventListener('message', function(e) {
  const msg = e.data;

  if (msg.type === 'search' && initialized) {
    var searchDepth = MAX_STRENGTH.depth;
    var searchMovetime = MAX_STRENGTH.movetime;

    function doSearch(depth, movetime) {
      try {
        self.postMessage({ type: 'debug', msg: '开始搜索 depth=' + depth + ' movetime=' + movetime });
        
        const { board, currentPlayer } = msg;
        const fen = boardToFen(board, currentPlayer);

        const ret = Module.ccall('js_set_position', 'number',
          ['string', 'string'], [fen, '']);

        if (ret !== 0) {
          self.postMessage({ type: 'error', message: 'Invalid position: ' + fen, searchId: msg.searchId });
          return;
        }

        let bestmove = Module.ccall('js_search', 'string',
          ['number', 'number'], [depth, movetime]);

        self.postMessage({ type: 'debug', msg: '搜索结果: ' + bestmove });

        // 搜索结果为空，降级重试
        if (!bestmove || bestmove === '(none)' || bestmove === 'null' || bestmove === 'undefined') {
          self.postMessage({ type: 'debug', msg: '搜索返回空，尝试降低深度重试' });
          if (depth > 8) {
            doSearch(Math.floor(depth / 2), movetime);
            return;
          }
          self.postMessage({ type: 'error', message: '搜索返回空结果', searchId: msg.searchId });
          return;
        }

      // 防重复将军：记录走法，但不再额外搜索（避免变慢）
      const isCheck = bestmove.includes('+');
      const moveKey = bestmove.replace(/[+#]/g, '');

      recentMoves.push(moveKey);
      if (recentMoves.length > 10) recentMoves.shift();

      if (isCheck) {
        consecutiveChecks++;
      } else {
        consecutiveChecks = 0;
      }

      const move = parseBestmove(bestmove);
      self.postMessage({ type: 'bestmove', move: move, bestmove: bestmove, engine: 'pikafish', searchId: msg.searchId });
      } catch (err) {
        // 搜索崩溃，尝试降低深度重试
        self.postMessage({ type: 'debug', msg: '搜索崩溃: ' + String(err.message || err) + '，尝试降低深度重试' });
        if (depth > 8) {
          try {
            doSearch(Math.floor(depth / 2), movetime);
          } catch (err2) {
            self.postMessage({ type: 'error', message: '重试也失败: ' + String(err2.message || err2), searchId: msg.searchId });
          }
        } else {
          self.postMessage({ type: 'error', message: String(err.message || err), searchId: msg.searchId });
        }
      }
    }

    // 启动搜索
    doSearch(searchDepth, searchMovetime);
  }

  if (msg.type === 'newgame' && initialized) {
    Module.ccall('js_new_game', null, [], []);
    recentMoves = [];
    consecutiveChecks = 0;
    self.postMessage({ type: 'newgame_done' });
  }
});
