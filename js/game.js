'use strict';

/* ========================================================================
 * 中国象棋 - 人机对战版
 * 功能：Canvas 自绘棋盘、全规则引擎、Minimax + Alpha-Beta 剪枝 AI
 * ======================================================================== */

// ======================== 配置 ========================

const CONFIG = {
  board: {
    cols: 9,
    rows: 10,
    // Canvas绘制：9:10容器比例，方格为正方形，边距=半个方格
    // 8格宽+左右各半格边距=9格宽, 9格高+上下各半格边距=10格高
    marginLeftPercent: 5.7,
    marginTopPercent: 5.3,
    cellWPercent: 11.111,
    cellHPercent: 10.0,
  },
  audio: {
    click:    'audio/click.wav',
    select:   'audio/select.wav',
    chi:      'audio/chi.mp3',
    jiangjun: 'audio/jiangjun.mp3',
    juesha:   'audio/juesha.mp3',
  },
};

// 棋子图片映射
const PIECE_IMAGES = {
  b_j: 'images/b_j.png', b_s: 'images/b_s.png', b_x: 'images/b_x.png',
  b_m: 'images/b_m.png',  b_c: 'images/b_c.png', b_p: 'images/b_p.png',
  b_z: 'images/b_z.png',
  r_j: 'images/r_j.png', r_s: 'images/r_s.png', r_x: 'images/r_x.png',
  r_m: 'images/r_m.png',  r_c: 'images/r_c.png', r_p: 'images/r_p.png',
  r_z: 'images/r_z.png',
};

// 棋子类型信息
const PIECE_INFO = {
  b_j: { type: 'king',     color: 'black', name: '将', char: '將' },
  b_s: { type: 'advisor',  color: 'black', name: '士', char: '士' },
  b_x: { type: 'elephant', color: 'black', name: '象', char: '象' },
  b_m: { type: 'horse',    color: 'black', name: '马', char: '馬' },
  b_c: { type: 'chariot',  color: 'black', name: '车', char: '車' },
  b_p: { type: 'cannon',   color: 'black', name: '炮', char: '砲' },
  b_z: { type: 'soldier',  color: 'black', name: '卒', char: '卒' },
  r_j: { type: 'king',     color: 'red',   name: '帅', char: '帥' },
  r_s: { type: 'advisor',  color: 'red',   name: '仕', char: '仕' },
  r_x: { type: 'elephant', color: 'red',   name: '相', char: '相' },
  r_m: { type: 'horse',    color: 'red',   name: '马', char: '馬' },
  r_c: { type: 'chariot',  color: 'red',   name: '车', char: '車' },
  r_p: { type: 'cannon',   color: 'red',   name: '炮', char: '炮' },
  r_z: { type: 'soldier',  color: 'red',   name: '兵', char: '兵' },
};

// 初始棋盘布局
const INITIAL_BOARD = [
  ['b_c','b_m','b_x','b_s','b_j','b_s','b_x','b_m','b_c'],
  [ null , null , null , null , null , null , null , null , null ],
  [ null ,'b_p', null , null , null , null , null ,'b_p', null ],
  ['b_z', null ,'b_z', null ,'b_z', null ,'b_z', null ,'b_z'],
  [ null , null , null , null , null , null , null , null , null ],
  [ null , null , null , null , null , null , null , null , null ],
  ['r_z', null ,'r_z', null ,'r_z', null ,'r_z', null ,'r_z'],
  [ null ,'r_p', null , null , null , null , null ,'r_p', null ],
  [ null , null , null , null , null , null , null , null , null ],
  ['r_c','r_m','r_x','r_s','r_j','r_s','r_x','r_m','r_c'],
];

const CN_NUMS = ['一','二','三','四','五','六','七','八','九'];

// ======================== AI 估值表 ========================

// 棋子基础价值
const PIECE_VALUES = {
  king: 10000, chariot: 900, cannon: 450, horse: 400,
  elephant: 200, advisor: 200, soldier: 100,
};

// 棋子交换价值（用于 MVV-LVA 走法排序）
const PIECE_ATTACK_VALUES = {
  king: 1000, chariot: 90, cannon: 45, horse: 40,
  elephant: 20, advisor: 20, soldier: 10,
};

// 位置价值表（参考一叶孤舟象棋引擎，黑方视角）
// 值已包含基础价值，评估时直接查表
const POSITION_TABLES = {
  // 车价值：中线最高，边线最低
  chariot: [
    [206, 208, 207, 213, 214, 213, 207, 208, 206],
    [206, 212, 209, 216, 233, 216, 209, 212, 206],
    [206, 208, 207, 214, 216, 214, 207, 208, 206],
    [206, 213, 213, 216, 216, 216, 213, 213, 206],
    [208, 211, 211, 214, 215, 214, 211, 211, 208],
    [208, 212, 212, 214, 215, 214, 212, 212, 208],
    [204, 209, 204, 212, 214, 212, 204, 209, 204],
    [198, 208, 204, 212, 212, 212, 204, 208, 198],
    [200, 208, 206, 212, 200, 212, 206, 208, 200],
    [194, 206, 204, 212, 200, 212, 204, 206, 194],
  ],
  // 马价值：中央高，边角低，卧槽位高
  horse: [
    [ 90, 90, 90, 96, 90, 96, 90, 90, 90],
    [ 90, 96,103, 97, 94, 97,103, 96, 90],
    [ 92, 98, 99,103, 99,103, 99, 98, 92],
    [ 93,108,100,107,100,107,100,108, 93],
    [ 90,100, 99,103,104,103, 99,100, 90],
    [ 90, 98,101,102,103,102,101, 98, 90],
    [ 92, 94, 98, 95, 98, 95, 98, 94, 92],
    [ 93, 92, 94, 95, 92, 95, 94, 92, 93],
    [ 85, 90, 92, 93, 78, 93, 92, 90, 85],
    [ 88, 85, 90, 88, 90, 88, 90, 85, 88],
  ],
  // 炮价值：中路和士角高
  cannon: [
    [100, 100, 96, 91, 90, 91, 96, 100, 100],
    [ 98, 98, 96, 92, 89, 92, 96, 98, 98],
    [ 97, 97, 96, 91, 92, 91, 96, 97, 97],
    [ 96, 99, 99, 98,100, 98, 99, 99, 96],
    [ 96, 96, 96, 96,100, 96, 96, 96, 96],
    [ 95, 96, 99, 96,100, 96, 99, 96, 95],
    [ 96, 96, 96, 96, 96, 96, 96, 96, 96],
    [ 97, 96,100, 99,101, 99,100, 96, 97],
    [ 96, 97, 98, 98, 98, 98, 98, 97, 96],
    [ 96, 96, 97, 99, 99, 99, 97, 96, 96],
  ],
  // 卒价值：过河后暴涨，未过河极低
  soldier: [
    [  9,  9,  9, 11, 13, 11,  9,  9,  9],
    [ 19, 24, 34, 42, 44, 42, 34, 24, 19],
    [ 19, 24, 32, 37, 37, 37, 32, 24, 19],
    [ 19, 23, 27, 29, 30, 29, 27, 23, 19],
    [ 14, 18, 20, 27, 29, 27, 20, 18, 14],
    [  7,  0, 13,  0, 16,  0, 13,  0,  7],
    [  7,  0,  7,  0, 15,  0,  7,  0,  7],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  ],
  // 将价值：九宫内
  king: [
    [  0,  0,  0, 20, 30, 20,  0,  0,  0],
    [  0,  0,  0, 25, 35, 25,  0,  0,  0],
    [  0,  0,  0, 20, 30, 20,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0, 20, 30, 20,  0,  0,  0],
    [  0,  0,  0, 25, 35, 25,  0,  0,  0],
    [  0,  0,  0, 20, 30, 20,  0,  0,  0],
  ],
  // 士价值
  advisor: [
    [  0,  0,  0, 20,  0, 20,  0,  0,  0],
    [  0,  0,  0,  0, 23,  0,  0,  0,  0],
    [  0,  0,  0, 20,  0, 20,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0, 20,  0, 20,  0,  0,  0],
    [  0,  0,  0,  0, 23,  0,  0,  0,  0],
    [  0,  0,  0, 20,  0, 20,  0,  0,  0],
  ],
  // 象价值
  elephant: [
    [  0,  0, 20,  0,  0,  0, 20,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0, 23,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0, 20,  0,  0,  0, 20,  0,  0],
    [  0,  0, 20,  0,  0,  0, 20,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [ 18,  0,  0,  0, 23,  0,  0,  0, 18],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0, 20,  0,  0,  0, 20,  0,  0],
  ],
};

// ======================== 游戏状态 ========================

let game = {
  board: [],
  currentPlayer: 'red',
  aiRed: false,         // AI 控制红方
  aiBlack: false,       // AI 控制黑方
  aiDifficulty: 5, // 固定最高难度，直接与引擎对弈
  boardFlipped: false,  // 棋盘是否旋转180度（独立于执棋方）
  selectedPos: null,
  validMoves: [],
  gameOver: false,
  winner: null,
  moveHistory: [],
  capturedPieces: { red: [], black: [] },
  inCheck: false,
  checkedColor: null,
  lastMove: null,
  boardSnapshots: [],
  aiThinking: false,
  moveAnimating: false, // 棋子移动动画进行中，阻止操作
  aiMoveHistory: [],
  sessionId: 0,  // 棋局标识，每次 initGame 递增，用于废弃过期回调
  positionHistory: [],  // 长将检测：记录每次走棋后的局面哈希
};

// === 长将检测 ===
// 将棋盘序列化为哈希字符串
function boardHash(board, currentPlayer) {
  let s = currentPlayer + '|';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      s += (board[r][c] || '.') + ',';
    }
  }
  return s;
}

// 记录局面到历史
function recordPosition(wasCheck, moverColor) {
  const hash = boardHash(game.board, game.currentPlayer);
  game.positionHistory.push({ hash, wasCheck, moverColor });
}

// 检测走某步后是否会造成长将（同一局面出现3次且都是将军）
// 返回 true 表示这是第3次重复将军，必须变招
function wouldBePerpetualCheck(board, currentPlayer, moverColor, move) {
  // 模拟走棋
  const sim = cloneBoard(board);
  const code = sim[move.fromRow][move.fromCol];
  sim[move.toRow][move.toCol] = code;
  sim[move.fromRow][move.fromCol] = null;
  const nextPlayer = currentPlayer === 'red' ? 'black' : 'red';

  // 检查这步是否将军
  const isCheck = isInCheck(nextPlayer, sim);
  if (!isCheck) return false;  // 不是将军，不是长将

  // 计算走棋后的局面哈希
  const hash = boardHash(sim, nextPlayer);

  // 统计该局面在历史中出现的次数（且当时也是将军，且将军方相同）
  let count = 0;
  for (const entry of game.positionHistory) {
    if (entry.hash === hash && entry.wasCheck && entry.moverColor === moverColor) {
      count++;
    }
  }
  // 如果已经有2次，这次就是第3次 → 长将
  return count >= 2;
}

// 找一个不造成长将的替代走法
function findNonPerpetualMove(moverColor) {
  const allMoves = [];
  // 收集所有合法走法
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const code = game.board[r][c];
      if (!code || PIECE_INFO[code].color !== moverColor) continue;
      const moves = getValidMoves(r, c, game.board);
      for (const m of moves) {
        allMoves.push({ fromRow: r, fromCol: c, toRow: m.row, toCol: m.col });
      }
    }
  }

  // 过滤掉会造成长将的走法
  const validMoves = [];
  for (const m of allMoves) {
    if (!wouldBePerpetualCheck(game.board, game.currentPlayer, moverColor, m)) {
      validMoves.push(m);
    }
  }

  if (validMoves.length === 0) {
    // 所有走法都会长将，退而求其次：选一个不是将军的走法
    const nonCheckMoves = allMoves.filter(m => {
      const sim = cloneBoard(game.board);
      const code = sim[m.fromRow][m.fromCol];
      sim[m.toRow][m.toCol] = code;
      sim[m.fromRow][m.fromCol] = null;
      const nextPlayer = game.currentPlayer === 'red' ? 'black' : 'red';
      return !isInCheck(nextPlayer, sim);
    });
    if (nonCheckMoves.length > 0) {
      // 用内置评估函数选最好的
      return pickBestMove(nonCheckMoves, moverColor);
    }
    // 实在没有非将军走法，随便选一个
    return allMoves[0] || null;
  }

  // 用内置评估函数选最好的
  return pickBestMove(validMoves, moverColor);
}

// 从候选走法中用内置评估函数选最优
function pickBestMove(moves, moverColor) {
  let bestScore = -Infinity;
  let bestMove = moves[0];
  for (const m of moves) {
    const sim = cloneBoard(game.board);
    const code = sim[m.fromRow][m.fromCol];
    sim[m.toRow][m.toCol] = code;
    sim[m.fromRow][m.fromCol] = null;
    const nb = boardToNumeric(sim);
    const score = evaluate(nb);
    const sign = moverColor === 'black' ? 1 : -1;
    if (score * sign > bestScore) {
      bestScore = score * sign;
      bestMove = m;
    }
  }
  return bestMove;
}

// 判断某方是否由AI控制
function isAIControlled(color) {
  return (color === 'red' && game.aiRed) || (color === 'black' && game.aiBlack);
}

let el = {};

// ======================== 工具函数 ========================

function getPosPercent(col, row) {
  return {
    left: CONFIG.board.marginLeftPercent + col * CONFIG.board.cellWPercent,
    top: CONFIG.board.marginTopPercent + row * CONFIG.board.cellHPercent,
  };
}

function getPiece(row, col, board) {
  const b = board || game.board;
  if (row < 0 || row >= 10 || col < 0 || col >= 9) return null;
  return b[row][col];
}

function cloneBoard(board) {
  return board.map(row => row.slice());
}

// ======================== 走棋规则 ========================

function getPseudoLegalMoves(row, col, board) {
  const code = board[row][col];
  if (!code) return [];
  const info = PIECE_INFO[code];
  switch (info.type) {
    case 'king':     return getKingMoves(row, col, board, info.color);
    case 'advisor':  return getAdvisorMoves(row, col, board, info.color);
    case 'elephant': return getElephantMoves(row, col, board, info.color);
    case 'horse':    return getHorseMoves(row, col, board, info.color);
    case 'chariot':  return getChariotMoves(row, col, board, info.color);
    case 'cannon':   return getCannonMoves(row, col, board, info.color);
    case 'soldier':  return getSoldierMoves(row, col, board, info.color);
    default: return [];
  }
}

function getKingMoves(row, col, board, color) {
  const moves = [];
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr, nc = col + dc;
    if (color === 'black') {
      if (nr < 0 || nr > 2 || nc < 3 || nc > 5) continue;
    } else {
      if (nr < 7 || nr > 9 || nc < 3 || nc > 5) continue;
    }
    const target = board[nr][nc];
    if (!target || PIECE_INFO[target].color !== color) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

function getAdvisorMoves(row, col, board, color) {
  const moves = [];
  const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr, nc = col + dc;
    if (color === 'black') {
      if (nr < 0 || nr > 2 || nc < 3 || nc > 5) continue;
    } else {
      if (nr < 7 || nr > 9 || nc < 3 || nc > 5) continue;
    }
    const target = board[nr][nc];
    if (!target || PIECE_INFO[target].color !== color) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

function getElephantMoves(row, col, board, color) {
  const moves = [];
  const dirs = [
    { dr: -2, dc: -2, er: -1, ec: -1 },
    { dr: -2, dc:  2, er: -1, ec:  1 },
    { dr:  2, dc: -2, er:  1, ec: -1 },
    { dr:  2, dc:  2, er:  1, ec:  1 },
  ];
  for (const d of dirs) {
    const nr = row + d.dr, nc = col + d.dc;
    if (nr < 0 || nr >= 10 || nc < 0 || nc >= 9) continue;
    if (color === 'black' && nr > 4) continue;
    if (color === 'red' && nr < 5) continue;
    if (board[row + d.er][col + d.ec]) continue;
    const target = board[nr][nc];
    if (!target || PIECE_INFO[target].color !== color) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

function getHorseMoves(row, col, board, color) {
  const moves = [];
  const dirs = [
    { dr: -2, dc: -1, lr: -1, lc:  0 },
    { dr: -2, dc:  1, lr: -1, lc:  0 },
    { dr:  2, dc: -1, lr:  1, lc:  0 },
    { dr:  2, dc:  1, lr:  1, lc:  0 },
    { dr: -1, dc: -2, lr:  0, lc: -1 },
    { dr:  1, dc: -2, lr:  0, lc: -1 },
    { dr: -1, dc:  2, lr:  0, lc:  1 },
    { dr:  1, dc:  2, lr:  0, lc:  1 },
  ];
  for (const d of dirs) {
    const nr = row + d.dr, nc = col + d.dc;
    if (nr < 0 || nr >= 10 || nc < 0 || nc >= 9) continue;
    if (board[row + d.lr][col + d.lc]) continue;
    const target = board[nr][nc];
    if (!target || PIECE_INFO[target].color !== color) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

function getChariotMoves(row, col, board, color) {
  const moves = [];
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < 10 && c >= 0 && c < 9) {
      if (board[r][c]) {
        if (PIECE_INFO[board[r][c]].color !== color) {
          moves.push({ row: r, col: c });
        }
        break;
      }
      moves.push({ row: r, col: c });
      r += dr; c += dc;
    }
  }
  return moves;
}

function getCannonMoves(row, col, board, color) {
  const moves = [];
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    let r = row + dr, c = col + dc;
    let jumped = false;
    while (r >= 0 && r < 10 && c >= 0 && c < 9) {
      if (!jumped) {
        if (board[r][c]) { jumped = true; }
        else { moves.push({ row: r, col: c }); }
      } else {
        if (board[r][c]) {
          if (PIECE_INFO[board[r][c]].color !== color) {
            moves.push({ row: r, col: c });
          }
          break;
        }
      }
      r += dr; c += dc;
    }
  }
  return moves;
}

function getSoldierMoves(row, col, board, color) {
  const moves = [];
  const dirs = [];
  if (color === 'red') {
    dirs.push([-1, 0]);
    if (row <= 4) dirs.push([0, -1], [0, 1]);
  } else {
    dirs.push([1, 0]);
    if (row >= 5) dirs.push([0, -1], [0, 1]);
  }
  for (const [dr, dc] of dirs) {
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= 10 || nc < 0 || nc >= 9) continue;
    const target = board[nr][nc];
    if (!target || PIECE_INFO[target].color !== color) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

// ======================== 将军判定 ========================

function isInCheck(color, board) {
  let kingPos = null;
  let otherKingPos = null;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const code = board[r][c];
      if (!code) continue;
      const info = PIECE_INFO[code];
      if (info.type === 'king') {
        if (info.color === color) kingPos = { row: r, col: c };
        else otherKingPos = { row: r, col: c };
      }
    }
  }
  if (!kingPos) return true; // 将被吃了

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const code = board[r][c];
      if (!code) continue;
      if (PIECE_INFO[code].color === color) continue;
      const moves = getPseudoLegalMoves(r, c, board);
      if (moves.some(m => m.row === kingPos.row && m.col === kingPos.col)) {
        return true;
      }
    }
  }

  // 飞将
  if (otherKingPos && kingPos.col === otherKingPos.col) {
    const minR = Math.min(kingPos.row, otherKingPos.row);
    const maxR = Math.max(kingPos.row, otherKingPos.row);
    let blocked = false;
    for (let r = minR + 1; r < maxR; r++) {
      if (board[r][kingPos.col]) { blocked = true; break; }
    }
    if (!blocked) return true;
  }
  return false;
}

function getValidMoves(row, col, board) {
  const b = board || game.board;
  const code = b[row][col];
  if (!code) return [];
  const color = PIECE_INFO[code].color;
  const pseudoMoves = getPseudoLegalMoves(row, col, b);
  const validMoves = [];

  for (const move of pseudoMoves) {
    const captured = b[move.row][move.col];
    b[move.row][move.col] = code;
    b[row][col] = null;
    if (!isInCheck(color, b)) {
      validMoves.push(move);
    }
    b[row][col] = code;
    b[move.row][move.col] = captured;
  }
  return validMoves;
}

function isCheckmate(color, board) {
  const b = board || game.board;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const code = b[r][c];
      if (!code || PIECE_INFO[code].color !== color) continue;
      if (getValidMoves(r, c, b).length > 0) return false;
    }
  }
  return true;
}

function isStalemate(color, board) {
  const b = board || game.board;
  if (isInCheck(color, b)) return false;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const code = b[r][c];
      if (!code || PIECE_INFO[code].color !== color) continue;
      if (getValidMoves(r, c, b).length > 0) return false;
    }
  }
  return true;
}


// ======================== AI 引擎 ========================
// 算法：Alpha-Beta剪枝 + 迭代加深 + 置换表 + MVV-LVA着法排序 + 静止期搜索
// 难度：3~9层可调，每步0.3~2秒

// --- 棋子编码 ---
// 0=空，正数=黑方，负数=红方
// 1=王 2=士 3=象 4=马 5=车 6=炮 7=兵卒
const TYPE_ID = { king:1, advisor:2, elephant:3, horse:4, chariot:5, cannon:6, soldier:7 };
const PIECE_TYPE_ID = {};
const PIECE_COLOR = {};
(function buildLookups() {
  for (const code in PIECE_INFO) {
    const info = PIECE_INFO[code];
    PIECE_TYPE_ID[code] = TYPE_ID[info.type];
    PIECE_COLOR[code] = info.color === 'black' ? 1 : -1;
  }
})();

const TYPE_NAMES = [null,'king','advisor','elephant','horse','chariot','cannon','soldier'];
const TYPE_VALUES = [0, 10000, 200, 200, 400, 900, 450, 100];
const TYPE_ATTACK = [0, 1000, 20, 20, 40, 90, 45, 10];

// --- 数值化棋盘 ---
function boardToNumeric(board) {
  const nb = new Int8Array(90);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const code = board[r][c];
      if (!code) { nb[r*9+c] = 0; continue; }
      nb[r*9+c] = PIECE_TYPE_ID[code] * PIECE_COLOR[code];
    }
  }
  return nb;
}

// --- 走法生成 ---
function genMovesFast(nb, color) {
  const moves = [];
  const sign = color === 'black' ? 1 : -1;
  for (let i = 0; i < 90; i++) {
    const p = nb[i];
    if (p === 0 || (p > 0 ? 1 : -1) !== sign) continue;
    const absP = p > 0 ? p : -p;
    const r = (i / 9) | 0;
    const c = i - r * 9;
    switch (absP) {
      case 1: genKingFast(nb, r, c, color, moves); break;
      case 2: genAdvisorFast(nb, r, c, color, moves); break;
      case 3: genElephantFast(nb, r, c, color, moves); break;
      case 4: genHorseFast(nb, r, c, color, moves); break;
      case 5: genChariotFast(nb, r, c, color, moves); break;
      case 6: genCannonFast(nb, r, c, color, moves); break;
      case 7: genSoldierFast(nb, r, c, color, moves); break;
    }
  }
  return moves;
}

function inBoard(r, c) { return r >= 0 && r < 10 && c >= 0 && c < 9; }

function genKingFast(nb, r, c, color, moves) {
  const sign = color === 'black' ? 1 : -1;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    const nr = r+dr, nc = c+dc;
    if (color === 'black') { if (nr<0||nr>2||nc<3||nc>5) continue; }
    else { if (nr<7||nr>9||nc<3||nc>5) continue; }
    const t = nb[nr*9+nc];
    if (t === 0 || (t > 0 ? 1 : -1) !== sign) moves.push([r, c, nr, nc, t]);
  }
}

function genAdvisorFast(nb, r, c, color, moves) {
  const sign = color === 'black' ? 1 : -1;
  const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of dirs) {
    const nr = r+dr, nc = c+dc;
    if (color === 'black') { if (nr<0||nr>2||nc<3||nc>5) continue; }
    else { if (nr<7||nr>9||nc<3||nc>5) continue; }
    const t = nb[nr*9+nc];
    if (t === 0 || (t > 0 ? 1 : -1) !== sign) moves.push([r, c, nr, nc, t]);
  }
}

function genElephantFast(nb, r, c, color, moves) {
  const sign = color === 'black' ? 1 : -1;
  const dirs = [[-2,-2,-1,-1],[-2,2,-1,1],[2,-2,1,-1],[2,2,1,1]];
  for (const [dr, dc, er, ec] of dirs) {
    const nr = r+dr, nc = c+dc;
    if (!inBoard(nr, nc)) continue;
    if (color === 'black' && nr > 4) continue;
    if (color === 'red' && nr < 5) continue;
    if (nb[(r+er)*9+(c+ec)] !== 0) continue;
    const t = nb[nr*9+nc];
    if (t === 0 || (t > 0 ? 1 : -1) !== sign) moves.push([r, c, nr, nc, t]);
  }
}

function genHorseFast(nb, r, c, color, moves) {
  const sign = color === 'black' ? 1 : -1;
  const dirs = [[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];
  for (const [dr, dc, lr, lc] of dirs) {
    const nr = r+dr, nc = c+dc;
    if (!inBoard(nr, nc)) continue;
    if (nb[(r+lr)*9+(c+lc)] !== 0) continue;
    const t = nb[nr*9+nc];
    if (t === 0 || (t > 0 ? 1 : -1) !== sign) moves.push([r, c, nr, nc, t]);
  }
}

function genChariotFast(nb, r, c, color, moves) {
  const sign = color === 'black' ? 1 : -1;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    let nr = r+dr, nc = c+dc;
    while (inBoard(nr, nc)) {
      const t = nb[nr*9+nc];
      if (t !== 0) {
        if ((t > 0 ? 1 : -1) !== sign) moves.push([r, c, nr, nc, t]);
        break;
      }
      moves.push([r, c, nr, nc, 0]);
      nr += dr; nc += dc;
    }
  }
}

function genCannonFast(nb, r, c, color, moves) {
  const sign = color === 'black' ? 1 : -1;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    let nr = r+dr, nc = c+dc;
    let jumped = false;
    while (inBoard(nr, nc)) {
      const t = nb[nr*9+nc];
      if (!jumped) {
        if (t !== 0) jumped = true;
        else moves.push([r, c, nr, nc, 0]);
      } else {
        if (t !== 0) {
          if ((t > 0 ? 1 : -1) !== sign) moves.push([r, c, nr, nc, t]);
          break;
        }
      }
      nr += dr; nc += dc;
    }
  }
}

function genSoldierFast(nb, r, c, color, moves) {
  const sign = color === 'black' ? 1 : -1;
  const dirs = [];
  if (color === 'black') {
    dirs.push([1, 0]);
    if (r >= 5) dirs.push([0, -1], [0, 1]);
  } else {
    dirs.push([-1, 0]);
    if (r <= 4) dirs.push([0, -1], [0, 1]);
  }
  for (const [dr, dc] of dirs) {
    const nr = r+dr, nc = c+dc;
    if (!inBoard(nr, nc)) continue;
    const t = nb[nr*9+nc];
    if (t === 0 || (t > 0 ? 1 : -1) !== sign) moves.push([r, c, nr, nc, t]);
  }
}

// --- 王被吃检测（过滤自将军的核心） ---
function canCaptureKing(nb, color) {
  const kingSign = color === 'black' ? 1 : -1;
  let kr = -1, kc = -1;
  for (let i = 0; i < 90; i++) {
    if (nb[i] === kingSign) { kr = (i/9)|0; kc = i - kr*9; break; }
  }
  if (kr < 0) return true;

  const enemySign = -kingSign;

  // 车/炮直线攻击
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    let nr = kr+dr, nc = kc+dc;
    let jumped = false;
    while (inBoard(nr, nc)) {
      const t = nb[nr*9+nc];
      if (!jumped) {
        if (t !== 0) {
          if ((t > 0 ? 1 : -1) === enemySign) {
            const at = t > 0 ? t : -t;
            if (at === 5) return true; // 车
          }
          jumped = true;
        }
      } else {
        if (t !== 0) {
          if ((t > 0 ? 1 : -1) === enemySign) {
            const at = t > 0 ? t : -t;
            if (at === 6) return true; // 炮
          }
          break;
        }
      }
      nr += dr; nc += dc;
    }
  }

  // 马日字攻击（腿位相对王计算）
  const horseChecks = [
    [-2,-1,-1,-1],[-2,1,-1,1],
    [ 2,-1, 1,-1],[ 2,1, 1,1],
    [-1,-2,-1,-1],[1,-2, 1,-1],
    [-1, 2,-1, 1],[1, 2, 1, 1],
  ];
  for (const [dr, dc, lr, lc] of horseChecks) {
    const nr = kr+dr, nc = kc+dc;
    if (!inBoard(nr, nc)) continue;
    const t = nb[nr*9+nc];
    if (t !== 0 && (t > 0 ? 1 : -1) === enemySign && (t > 0 ? t : -t) === 4) {
      if (nb[(kr+lr)*9+(kc+lc)] === 0) return true;
    }
  }

  // 兵卒攻击
  const soldierDirs = color === 'black' ? [[1,0],[0,-1],[0,1]] : [[-1,0],[0,-1],[0,1]];
  for (const [dr, dc] of soldierDirs) {
    const nr = kr+dr, nc = kc+dc;
    if (!inBoard(nr, nc)) continue;
    const t = nb[nr*9+nc];
    if (t !== 0 && (t > 0 ? 1 : -1) === enemySign && (t > 0 ? t : -t) === 7) {
      if (color === 'black' && dr === 1) return true;
      if (color === 'red' && dr === -1) return true;
      if (dr === 0) return true;
    }
  }

  // 飞将
  let okr = -1, okc = -1;
  for (let i = 0; i < 90; i++) {
    if (nb[i] === enemySign && (nb[i] > 0 ? nb[i] : -nb[i]) === 1) { okr = (i/9)|0; okc = i - okr*9; break; }
  }
  if (okr >= 0 && okc === kc) {
    let blocked = false;
    const minR = Math.min(kr, okr), maxR = Math.max(kr, okr);
    for (let r = minR+1; r < maxR; r++) {
      if (nb[r*9+kc] !== 0) { blocked = true; break; }
    }
    if (!blocked) return true;
  }
  return false;
}

// --- 评估函数：子力价值 + 位置分 + 将军威胁 ---
function evaluate(nb) {
  const aiColor = game.currentPlayer;
  const aiSign = aiColor === 'black' ? 1 : -1;
  let score = 0;
  let aiKingExists = false, playerKingExists = false;

  // === 红方进攻偏好 ===
  // 红方AI更偏好进攻：奖励推进、控制中心、将军
  const redAggression = aiColor === 'red';

  for (let i = 0; i < 90; i++) {
    const p = nb[i];
    if (p === 0) continue;
    const absP = p > 0 ? p : -p;
    const sign = p > 0 ? 1 : -1;
    const r = (i/9)|0, c = i - r*9;

    if (absP === 1) {
      if (sign === aiSign) aiKingExists = true;
      else playerKingExists = true;
    }

    // 子力价值 + 位置分（位置表已包含基础价值）
    const pieceType = TYPE_NAMES[absP];
    const table = POSITION_TABLES[pieceType];
    let val = table ? table[sign > 0 ? r : 9 - r][c] : TYPE_VALUES[absP];

    // 兵卒过河额外加成
    if (absP === 7) {
      if (sign > 0 && r >= 5) val += 20;
      if (sign < 0 && r <= 4) val += 20;
    }

    // === 红方进攻偏好：奖励红方棋子推进到黑方半场 ===
    if (redAggression && sign === aiSign) {
      // 红方棋子(sign=-1)越靠近黑方(r越小)越奖励
      // r=0(黑方底线)奖励最大，r=4(河界)奖励最小
      if (absP !== 1) { // 不对将帅加成
        const advanceBonus = Math.max(0, (4 - r) * 5);
        val += advanceBonus;
      }
      // 控制中路（c=3,4,5）额外加成
      if (c >= 3 && c <= 5 && r <= 4) {
        val += 8;
      }
    }

    score += sign === aiSign ? val : -val;
  }

  if (!aiKingExists) return -100000;
  if (!playerKingExists) return 100000;

  // 将军威胁
  const enemyColor = aiColor === 'black' ? 'red' : 'black';
  if (canCaptureKing(nb, enemyColor)) score += 300;
  if (canCaptureKing(nb, aiColor)) score -= 300;

  // === 红方进攻偏好：将军额外加成 ===
  if (redAggression && canCaptureKing(nb, enemyColor)) {
    score += 150; // 红方将军额外奖励
  }

  return score;
}

// --- MVV-LVA 着法排序 ---
function scoreMove(move, nb) {
  if (move[4] !== 0) {
    const victimType = move[4] > 0 ? move[4] : -move[4];
    const attackerPiece = nb[move[0]*9+move[1]];
    const attackerType = attackerPiece > 0 ? attackerPiece : -attackerPiece;
    return 10000 + TYPE_ATTACK[victimType] * 10 - TYPE_ATTACK[attackerType];
  }
  return 0;
}

function sortMoves(moves, nb) {
  moves.sort((a, b) => scoreMove(b, nb) - scoreMove(a, nb));
}

// --- 静止期搜索（只搜索吃子走法，避免地平线效应） ---
function quiescence(nb, alpha, beta, color) {
  const rawEval = evaluate(nb);
  const standPat = color === game.currentPlayer ? rawEval : -rawEval;
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const moves = genMovesFast(nb, color);
  const captures = moves.filter(m => m[4] !== 0);
  captures.sort((a, b) => scoreMove(b, nb) - scoreMove(a, nb));

  const enemyColor = color === 'black' ? 'red' : 'black';
  for (const m of captures) {
    const from = m[0]*9+m[1], to = m[2]*9+m[3];
    const captured = nb[to];
    nb[to] = nb[from];
    nb[from] = 0;

    // 过滤自将军
    if (canCaptureKing(nb, color)) {
      nb[from] = nb[to];
      nb[to] = captured;
      continue;
    }

    const score = -quiescence(nb, -beta, -alpha, enemyColor);

    nb[from] = nb[to];
    nb[to] = captured;

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// --- 时间管理 ---
let aiStartTime = 0;
let aiTimeLimit = 2000;
let aiShouldStop = false;

function timeUp() {
  return (Date.now() - aiStartTime) > aiTimeLimit;
}

// --- 置换表 ---
let zobristKeys = null;
let zobristSide = 0;
const transpositionTable = new Map();
const TT_SIZE = 200000;

function initZobrist() {
  zobristKeys = new Uint32Array(90 * 14);
  for (let i = 0; i < zobristKeys.length; i++) {
    zobristKeys[i] = (Math.random() * 0xFFFFFFFF) >>> 0;
  }
  zobristSide = (Math.random() * 0xFFFFFFFF) >>> 0;
}

function pieceZobristIndex(p) {
  return p > 0 ? p - 1 : (-p) - 1 + 7;
}

function computeZobristKey(nb, color) {
  let key = 0;
  for (let i = 0; i < 90; i++) {
    if (nb[i] !== 0) {
      key ^= zobristKeys[i * 14 + pieceZobristIndex(nb[i])];
    }
  }
  if (color === 'red') key ^= zobristSide;
  return key >>> 0;
}

// --- Alpha-Beta 搜索 + 置换表 ---
function alphaBeta(nb, depth, alpha, beta, color) {
  if (timeUp()) { aiShouldStop = true; }
  if (aiShouldStop) return 0;

  // 置换表查询
  const ttKey = computeZobristKey(nb, color);
  const ttEntry = transpositionTable.get(ttKey);
  let ttBestMove = null;
  if (ttEntry) {
    ttBestMove = ttEntry.bestMove;
    if (ttEntry.depth >= depth) {
      if (ttEntry.flag === 0) return ttEntry.score;
      if (ttEntry.flag === 1 && ttEntry.score <= alpha) return ttEntry.score;
      if (ttEntry.flag === 2 && ttEntry.score >= beta) return ttEntry.score;
    }
  }

  if (depth === 0) {
    return quiescence(nb, alpha, beta, color);
  }

  const moves = genMovesFast(nb, color);

  // 着法排序：置换表最佳走法优先 → MVV-LVA
  if (ttBestMove) {
    for (let i = 0; i < moves.length; i++) {
      if (moves[i][0]===ttBestMove[0] && moves[i][1]===ttBestMove[1] &&
          moves[i][2]===ttBestMove[2] && moves[i][3]===ttBestMove[3]) {
        const tmp = moves[0]; moves[0] = moves[i]; moves[i] = tmp;
        break;
      }
    }
    const rest = moves.slice(1);
    rest.sort((a, b) => scoreMove(b, nb) - scoreMove(a, nb));
    for (let i = 0; i < rest.length; i++) moves[i+1] = rest[i];
  } else {
    sortMoves(moves, nb);
  }

  const enemyColor = color === 'black' ? 'red' : 'black';
  let bestScore = -Infinity;
  let bestMove = null;
  let moveCount = 0;
  const oldAlpha = alpha;

  for (const m of moves) {
    const from = m[0]*9+m[1], to = m[2]*9+m[3];
    const captured = nb[to];

    nb[to] = nb[from];
    nb[from] = 0;

    // 过滤自将军
    if (canCaptureKing(nb, color)) {
      nb[from] = nb[to];
      nb[to] = captured;
      continue;
    }

    moveCount++;
    const score = -alphaBeta(nb, depth - 1, -beta, -alpha, enemyColor);

    nb[from] = nb[to];
    nb[to] = captured;

    if (aiShouldStop) return 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }

  if (moveCount === 0) {
    bestScore = -99000 - depth;
  }

  // 存入置换表
  if (transpositionTable.size >= TT_SIZE) transpositionTable.clear();
  let flag = 0;
  if (bestScore <= oldAlpha) flag = 2;
  else if (bestScore >= beta) flag = 1;
  transpositionTable.set(ttKey, { depth, score: bestScore, flag, bestMove });

  return bestScore;
}

// --- 难度配置 ---
const DIFFICULTY_CONFIG = {
  1: { name: '入门', depth: 3, time: 300 },
  2: { name: '初级', depth: 4, time: 500 },
  3: { name: '中级', depth: 5, time: 800 },
  4: { name: '高级', depth: 7, time: 1200 },
  5: { name: '大师', depth: 30, time: 180000 },
};

// --- AI 走法选择（迭代加深） ---
function getAIMove() {
  if (!zobristKeys) initZobrist();

  const nb = boardToNumeric(game.board);
  const aiColor = game.currentPlayer;
  const enemyColor = aiColor === 'black' ? 'red' : 'black';

  // 难度配置
  const config = DIFFICULTY_CONFIG[game.aiDifficulty] || DIFFICULTY_CONFIG[3];
  const maxDepth = config.depth;
  aiTimeLimit = config.time;
  aiStartTime = Date.now();
  aiShouldStop = false;
  transpositionTable.clear();

  // 生成合法走法（过滤自将军）
  const allMoves = genMovesFast(nb, aiColor);
  const legalMoves = [];
  for (const m of allMoves) {
    const from = m[0]*9+m[1], to = m[2]*9+m[3];
    const captured = nb[to];
    nb[to] = nb[from];
    nb[from] = 0;
    if (!canCaptureKing(nb, aiColor)) legalMoves.push(m);
    nb[from] = nb[to];
    nb[to] = captured;
  }

  if (legalMoves.length === 0) return null;
  if (legalMoves.length === 1) {
    const m = legalMoves[0];
    return { fromRow: m[0], fromCol: m[1], toRow: m[2], toCol: m[3] };
  }

  // 迭代加深
  const scoredMoves = legalMoves.map(m => ({ move: m, score: -Infinity }));
  let bestMove = scoredMoves[0];

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (aiShouldStop || timeUp()) break;

    scoredMoves.sort((a, b) => b.score - a.score);
    let alpha = -Infinity;
    const beta = Infinity;

    for (const sm of scoredMoves) {
      const m = sm.move;
      const from = m[0]*9+m[1], to = m[2]*9+m[3];
      const captured = nb[to];
      nb[to] = nb[from];
      nb[from] = 0;
      const score = -alphaBeta(nb, depth - 1, -beta, -alpha, enemyColor);
      nb[from] = nb[to];
      nb[to] = captured;

      if (aiShouldStop) break;
      sm.score = score;
      if (score > alpha) alpha = score;
    }

    if (!aiShouldStop) {
      scoredMoves.sort((a, b) => b.score - a.score);
      bestMove = scoredMoves[0];
      // 找到将杀提前终止
      if (bestMove.score >= 90000) break;
    }
  }

  // === 防重复将军变招 ===
  // 检查最佳走法是否重复过多
  const moveKey = `${bestMove.move[0]},${bestMove.move[1]},${bestMove.move[2]},${bestMove.move[3]}`;
  game.aiMoveHistory = game.aiMoveHistory || [];
  game.aiMoveHistory.push(moveKey);
  if (game.aiMoveHistory.length > 8) game.aiMoveHistory.shift();

  // 统计近期重复次数
  const moveCounts = {};
  game.aiMoveHistory.forEach(m => { moveCounts[m] = (moveCounts[m] || 0) + 1; });
  const repeatCount = moveCounts[moveKey] || 0;

  // 如果同一走法重复3次以上，或重复2次且分数不占优，换次优走法
  if (repeatCount >= 3 && scoredMoves.length > 1) {
    // 找一个不重复的走法
    for (let i = 1; i < scoredMoves.length; i++) {
      const altMoveKey = `${scoredMoves[i].move[0]},${scoredMoves[i].move[1]},${scoredMoves[i].move[2]},${scoredMoves[i].move[3]}`;
      const altCount = moveCounts[altMoveKey] || 0;
      // 次优走法分数差距不大（500 以内）且重复次数少
      if (altCount < 2 && (bestMove.score - scoredMoves[i].score) < 500) {
        bestMove = scoredMoves[i];
        break;
      }
    }
  }

  const m = bestMove.move;
  return { fromRow: m[0], fromCol: m[1], toRow: m[2], toCol: m[3] };
}

// --- 触发 AI（使用 Pikafish 引擎）---

let pikafishWorker = null;
let pikafishReady = false;
let pikafishInitializing = false;
let searchTimeoutId = null;
let currentSearchId = 0;  // 搜索ID，防止AI走两步

function initPikafish() {
  if (pikafishInitializing) return;
  // 如果已有 worker 但未就绪（出错或崩溃），先终止旧 worker
  if (pikafishWorker && !pikafishReady) {
    try { pikafishWorker.terminate(); } catch(e) {}
    pikafishWorker = null;
  }
  if (pikafishWorker) return;
  pikafishInitializing = true;

  // 显示引擎加载状态
  updateEngineStatus('loading');

  try {
    pikafishWorker = new Worker('engine/pikafish-worker.js');
  } catch (e) {
    console.warn('Pikafish Worker 创建失败，将使用内置 AI:', e);
    pikafishInitializing = false;
    updateEngineStatus('builtin');
    return;
  }

  // 超时检测：180 秒未就绪则标记为后备模式（pikafish.data 有49MB，GitHub Pages 上下载较慢）
  let initTimeout = setTimeout(function() {
    if (!pikafishReady && pikafishInitializing) {
      console.warn('Pikafish 引擎加载超时（180秒），切换到内置 AI');
      pikafishInitializing = false;
      updateEngineStatus('builtin');
      // 不终止 worker，让它继续在后台加载
    }
  }, 180000);

  pikafishWorker.onmessage = function(e) {
    const msg = e.data;
    if (msg.type === 'ready') {
      clearTimeout(initTimeout);
      pikafishReady = true;
      pikafishInitializing = false;
      console.log('Pikafish 引擎已就绪');
      updateEngineStatus('pikafish');
      // 如果等待中则触发 AI
      if (game.aiThinking && isAIControlled(game.currentPlayer)) {
        // 引擎刚就绪，重新触发
        doPikafishSearch();
      }
    } else if (msg.type === 'debug') {
      console.log(msg.msg);
    } else if (msg.type === 'bestmove') {
      // 清除搜索超时
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId);
        searchTimeoutId = null;
      }
      onPikafishBestmove(msg);
    } else if (msg.type === 'error') {
      clearTimeout(initTimeout);
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId);
        searchTimeoutId = null;
      }
      console.warn('Pikafish 搜索错误:', msg.message);
      // 检查 searchId，防止过期的错误触发回退
      if (msg.searchId !== undefined && msg.searchId !== currentSearchId) {
        console.log('过期的错误消息，忽略');
        return;
      }
      if (game.aiThinking) {
        fallbackToBuiltinAI();
      }
    } else if (msg.type === 'newgame_done') {
      // 忽略
    }
  };

  pikafishWorker.onerror = function(err) {
    clearTimeout(initTimeout);
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId);
      searchTimeoutId = null;
    }
    console.warn('Pikafish Worker 错误:', err);
    pikafishReady = false;
    pikafishInitializing = false;
    updateEngineStatus('builtin');
    if (game.aiThinking) {
      fallbackToBuiltinAI();
    }
  };

  // Worker 加载 pikafish.js 后会自动初始化，不需要发送 init 消息
}

function doPikafishSearch() {
  if (!pikafishReady || !pikafishWorker) {
    // 引擎还没准备好，先等一下
    if (pikafishInitializing) {
      // 正在初始化，设置15秒超时后回退到内置AI
      if (searchTimeoutId) clearTimeout(searchTimeoutId);
      const mySearchId = ++currentSearchId;
      searchTimeoutId = setTimeout(function() {
        if (game.aiThinking && !pikafishReady && mySearchId === currentSearchId) {
          console.warn('引擎初始化中超时（15秒），本步用内置 AI');
          fallbackToBuiltinAI();
        }
      }, 15000);
      return;
    }
    // 尝试初始化
    initPikafish();
    if (!pikafishReady) {
      // 初始化失败，回退
      fallbackToBuiltinAI();
      return;
    }
  }

  // 设置搜索超时：10秒后如果还没返回，这步用内置AI走，但不杀引擎
  if (searchTimeoutId) clearTimeout(searchTimeoutId);
  const mySearchId = ++currentSearchId;
  searchTimeoutId = setTimeout(function() {
    if (game.aiThinking && mySearchId === currentSearchId) {
      console.warn('Pikafish 搜索超时（10秒），本步用内置 AI');
      fallbackToBuiltinAI();
    }
  }, 10000);

  // 发送搜索请求（传递棋盘副本）
  pikafishWorker.postMessage({
    type: 'search',
    board: cloneBoard(game.board),
    currentPlayer: game.currentPlayer,
    searchId: mySearchId,
  });
}

function onPikafishBestmove(msg) {
  // 检查 searchId，防止超时回退后 Pikafish 又返回导致走两步
  if (msg.searchId !== undefined && msg.searchId !== currentSearchId) {
    console.log('Pikafish 返回了过期的搜索结果 (searchId=' + msg.searchId + ', current=' + currentSearchId + ')，忽略');
    return;
  }
  // 清除搜索超时
  if (searchTimeoutId) {
    clearTimeout(searchTimeoutId);
    searchTimeoutId = null;
  }
  game.aiThinking = false;
  el.aiThinking.style.display = 'none';
  el.clickLayer.style.pointerEvents = '';

  const move = msg.move;
  if (move) {
    // === 红方AI进攻偏好：如果引擎选了被动走法，寻找进攻替代 ===
    const finalMove = (game.currentPlayer === 'red')
      ? applyRedAggressionOverride(move)
      : move;

    // 长将检测：如果这步会造成第3次重复将军，强制变招
    const moverColor = game.currentPlayer;
    if (wouldBePerpetualCheck(game.board, game.currentPlayer, moverColor, finalMove)) {
      console.warn('检测到长将！强制AI变招');
      const altMove = findNonPerpetualMove(moverColor);
      if (altMove) {
        makeMove(altMove.fromRow, altMove.fromCol, altMove.toRow, altMove.toCol);
      } else {
        makeMove(finalMove.fromRow, finalMove.fromCol, finalMove.toRow, finalMove.toCol);
      }
    } else {
      makeMove(finalMove.fromRow, finalMove.fromCol, finalMove.toRow, finalMove.toCol);
    }
  } else {
    // 没有合法走法（将死或困毙），不结束游戏，仅提示
    console.warn('Pikafish 返回空走法:', msg.bestmove);
    if (isCheckmate(game.currentPlayer, game.board)) {
      playSound('juesha');
      flashStatus('将死！');
    } else {
      playSound('juesha');
      flashStatus('困毙！');
    }
  }
}

// === 红方AI进攻偏好：引擎走法后处理 ===
// 当 Pikafish 返回的走法不是吃子/将军时，
// 检查是否有同等优秀的进攻性走法（吃子或将军）
function applyRedAggressionOverride(engineMove) {
  const board = game.board;
  const aiColor = 'red';

  // 如果引擎走法本身就是吃子或将军，直接使用
  const isCapture = board[engineMove.toRow][engineMove.toCol] !== null;
  if (isCapture) return engineMove;

  // 检查引擎走法是否将军
  const tempBoard = cloneBoard(board);
  const piece = tempBoard[engineMove.fromRow][engineMove.fromCol];
  tempBoard[engineMove.toRow][engineMove.toCol] = piece;
  tempBoard[engineMove.fromRow][engineMove.fromCol] = null;
  const isCheck = canCaptureKing(boardToNumeric(tempBoard), 'red');
  if (isCheck) return engineMove;

  // 寻找所有合法的吃子走法和将军走法
  const nb = boardToNumeric(board);
  const allMoves = genMovesFast(nb, aiColor);
  const aggressiveMoves = [];

  for (const m of allMoves) {
    const from = m[0]*9+m[1], to = m[2]*9+m[3];
    const captured = nb[to];

    // 只看吃子走法
    if (captured === 0) continue;

    // 模拟走法，检查合法性和是否将军
    nb[to] = nb[from];
    nb[from] = 0;
    if (!canCaptureKing(nb, aiColor)) {
      // 合法吃子走法
      // 检查是否同时将军
      const givesCheck = canCaptureKing(nb, 'red');
      aggressiveMoves.push({
        fromRow: m[0], fromCol: m[1], toRow: m[2], toCol: m[3],
        capturedType: captured > 0 ? captured : -captured,
        givesCheck: givesCheck,
      });
    }
    nb[from] = nb[to];
    nb[to] = captured;
  }

  if (aggressiveMoves.length === 0) return engineMove;

  // 按吃子价值和是否将军排序
  aggressiveMoves.sort((a, b) => {
    // 先看是否将军
    if (a.givesCheck && !b.givesCheck) return -1;
    if (!a.givesCheck && b.givesCheck) return 1;
    // 再看吃子价值（type: 5=车900, 6=炮450, 4=马400, 3=象200, 2=士200, 7=卒100）
    const valA = TYPE_VALUES[a.capturedType] || 0;
    const valB = TYPE_VALUES[b.capturedType] || 0;
    return valB - valA;
  });

  // 优先选将军+吃子的走法
  const checkCaptures = aggressiveMoves.filter(m => m.givesCheck);
  if (checkCaptures.length > 0) {
    // 将军+吃子，直接使用
    const best = checkCaptures[0];
    console.log('[红方进攻] 引擎走法被替换为将军+吃子:', best);
    return { fromRow: best.fromRow, fromCol: best.fromCol, toRow: best.toRow, toCol: best.toCol };
  }

  // 吃高价值棋子（车/马/炮，type 4/5/6）的走法
  const bigCaptures = aggressiveMoves.filter(m => m.capturedType >= 4 && m.capturedType <= 6);
  if (bigCaptures.length > 0 && Math.random() < 0.4) {
    // 40%概率选择吃大子
    const best = bigCaptures[0];
    console.log('[红方进攻] 引擎走法被替换为吃大子:', best);
    return { fromRow: best.fromRow, fromCol: best.fromCol, toRow: best.toRow, toCol: best.toCol };
  }

  // 其他吃子走法，20%概率替换（避免频繁偏离引擎判断）
  if (aggressiveMoves.length > 0 && Math.random() < 0.2) {
    const best = aggressiveMoves[0];
    console.log('[红方进攻] 引擎走法被替换为吃子:', best);
    return { fromRow: best.fromRow, fromCol: best.fromCol, toRow: best.toRow, toCol: best.toCol };
  }

  return engineMove;
}

function fallbackToBuiltinAI() {
  const mySearchId = ++currentSearchId;  // 递增ID，使过期的 Pikafish 结果失效
  if (searchTimeoutId) {
    clearTimeout(searchTimeoutId);
    searchTimeoutId = null;
  }
  // 使用内置 AI 作为后备
  setTimeout(() => {
    // 再次检查，防止期间已被其他路径处理或棋局已重置
    if (mySearchId !== currentSearchId) return;
    const aiMove = getAIMove();
    game.aiThinking = false;
    el.aiThinking.style.display = 'none';
    el.clickLayer.style.pointerEvents = '';
    if (aiMove) {
      makeMove(aiMove.fromRow, aiMove.fromCol, aiMove.toRow, aiMove.toCol);
    }
  }, 100);
}

// === 引擎状态指示器 ===
function updateEngineStatus(status) {
  let el2 = document.getElementById('engineStatus');
  if (!el2) {
    el2 = document.createElement('div');
    el2.id = 'engineStatus';
    el2.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:bold;border:1px solid;';
    // 插入到AI面板
    const aiPanel = document.querySelector('.ai-panel');
    if (aiPanel) aiPanel.appendChild(el2);
  }
  let dot;
  if (el2.querySelector('.engine-dot')) {
    dot = el2.querySelector('.engine-dot');
  } else {
    dot = document.createElement('span');
    dot.className = 'engine-dot';
    dot.style.cssText = 'width:10px;height:10px;border-radius:50%;flex-shrink:0;';
    el2.appendChild(dot);
    const text = document.createElement('span');
    text.className = 'engine-text';
    el2.appendChild(text);
  }
  const textEl = el2.querySelector('.engine-text');
  if (status === 'pikafish') {
    textEl.textContent = 'Pikafish 引擎运行中';
    el2.style.background = 'rgba(76, 175, 80, 0.2)';
    el2.style.color = '#4CAF50';
    el2.style.borderColor = 'rgba(76, 175, 80, 0.5)';
    dot.style.background = '#4CAF50';
    dot.style.boxShadow = '0 0 8px #4CAF50';
    dot.style.animation = '';
  } else if (status === 'builtin') {
    textEl.textContent = '内置 AI (后备模式)';
    el2.style.background = 'rgba(255, 152, 0, 0.2)';
    el2.style.color = '#FF9800';
    el2.style.borderColor = 'rgba(255, 152, 0, 0.5)';
    dot.style.background = '#FF9800';
    dot.style.boxShadow = '0 0 8px #FF9800';
    dot.style.animation = '';
  } else if (status === 'loading') {
    textEl.textContent = 'Pikafish 引擎加载中... (约50MB，首次加载需1-3分钟，请耐心等待)';
    el2.style.background = 'rgba(136, 136, 136, 0.2)';
    el2.style.color = '#aaa';
    el2.style.borderColor = 'rgba(136, 136, 136, 0.4)';
    dot.style.background = '#888';
    dot.style.boxShadow = '';
    dot.style.animation = 'engine-pulse 1s infinite';
  }
  // 加载动画 CSS
  if (!document.getElementById('engineStatusCSS')) {
    const style = document.createElement('style');
    style.id = 'engineStatusCSS';
    style.textContent = '@keyframes engine-pulse{0%,100%{opacity:1}50%{opacity:0.2}}';
    document.head.appendChild(style);
  }
}

// ========== 开局库 ==========
// 每条记录为一串着法 [fromRow, fromCol, toRow, toCol]
// 红方先行（索引0,2,4...），黑方后行（索引1,3,5...）
// aggression: 1=进攻型, 0=稳健型
const OPENING_BOOK = [
  // === 进攻型开局（红方AI优先选择）===
  // 1. 中炮对屏风马（马8进7）
  { moves: [[7,7,7,4],[0,7,2,6],[9,7,7,6],[0,1,2,2],[9,1,7,2],[3,6,4,6]], aggression: 1 },
  // 2. 中炮对屏风马（马2进3）
  { moves: [[7,7,7,4],[0,1,2,2],[9,7,7,6],[0,7,2,6],[9,1,7,2],[3,2,4,2]], aggression: 1 },
  // 3. 中炮对列手炮
  { moves: [[7,7,7,4],[2,7,2,4],[9,7,7,6],[0,1,2,2],[9,1,7,2],[0,7,2,6]], aggression: 1 },
  // 4. 中炮对顺炮
  { moves: [[7,7,7,4],[2,1,2,4],[9,7,7,6],[0,7,2,6],[9,1,7,2],[0,1,2,2]], aggression: 1 },
  // 5. 中炮对反宫马
  { moves: [[7,7,7,4],[0,7,2,6],[9,7,7,6],[3,2,4,2],[9,1,7,2],[0,1,2,2]], aggression: 1 },
  // 6. 左中炮对屏风马
  { moves: [[7,1,7,4],[0,1,2,2],[9,1,7,2],[0,7,2,6],[9,7,7,6],[3,2,4,2]], aggression: 1 },
  // 7. 左中炮对列手炮
  { moves: [[7,1,7,4],[2,1,2,4],[9,1,7,2],[0,7,2,6],[9,7,7,6],[0,1,2,2]], aggression: 1 },
  // 8. 中炮急进七兵
  { moves: [[7,7,7,4],[0,7,2,6],[6,2,5,2],[0,1,2,2],[9,7,7,6],[3,6,4,6]], aggression: 1 },
  // 9. 中炮横车盘头马
  { moves: [[7,7,7,4],[0,1,2,2],[9,0,9,1],[0,7,2,6],[9,7,7,6],[3,2,4,2]], aggression: 1 },
  // 10. 中炮巡河炮
  { moves: [[7,7,7,4],[0,7,2,6],[9,7,7,6],[0,1,2,2],[9,1,7,5],[0,7,2,6]], aggression: 1 },
  // === 稳健型开局 ===
  // 11. 仙人指路对卒底炮
  { moves: [[6,6,5,6],[2,7,2,4],[9,7,7,6],[0,1,2,2],[9,1,7,2],[0,7,2,6]], aggression: 0 },
  // 12. 仙人指路对起马
  { moves: [[6,6,5,6],[0,7,2,6],[9,7,7,6],[0,1,2,2],[9,1,7,2],[2,7,2,4]], aggression: 0 },
  // 13. 仙人指路对卒3进1
  { moves: [[6,6,5,6],[3,2,4,2],[9,7,7,6],[0,7,2,6],[9,1,7,2],[0,1,2,2]], aggression: 0 },
  // 14. 飞相局对中炮（相三进五）
  { moves: [[9,6,7,4],[2,7,2,4],[9,7,7,6],[0,1,2,2],[9,1,7,2],[0,7,2,6]], aggression: 0 },
  // 15. 飞相局对起马（相七进五）
  { moves: [[9,2,7,4],[0,7,2,6],[9,7,7,6],[0,1,2,2],[9,1,7,2],[2,1,2,4]], aggression: 0 },
  // 16. 起马局对中炮
  { moves: [[9,7,7,6],[2,7,2,4],[7,7,7,4],[0,1,2,2],[9,1,7,2],[0,7,2,6]], aggression: 0 },
  // 17. 起马局对起马
  { moves: [[9,7,7,6],[0,7,2,6],[7,7,7,4],[0,1,2,2],[9,1,7,2],[2,7,2,4]], aggression: 0 },
  // 18. 过宫炮对中炮
  { moves: [[7,7,7,3],[2,7,2,4],[9,7,7,6],[0,1,2,2],[9,1,7,2],[0,7,2,6]], aggression: 0 },
  // 19. 过宫炮对起马
  { moves: [[7,7,7,3],[0,7,2,6],[9,7,7,6],[0,1,2,2],[9,1,7,2],[2,7,2,4]], aggression: 0 },
];

function getOpeningBookMove() {
  const history = game.moveHistory;
  // 仅在前6步（每方3步）使用开局库
  if (history.length >= 6) return null;

  const aiColor = game.currentPlayer;
  const matching = [];

  for (const opening of OPENING_BOOK) {
    const moves = opening.moves;
    if (moves.length <= history.length) continue;

    let matches = true;
    for (let i = 0; i < history.length; i++) {
      const m = history[i];
      const o = moves[i];
      if (m.from.row !== o[0] || m.from.col !== o[1] ||
          m.to.row !== o[2] || m.to.col !== o[3]) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;

    // 检查下一手是否属于当前AI方
    const nextIdx = history.length;
    const isRedMove = nextIdx % 2 === 0;
    if ((isRedMove && aiColor === 'red') || (!isRedMove && aiColor === 'black')) {
      matching.push({ move: moves[nextIdx], aggression: opening.aggression });
    }
  }

  if (matching.length === 0) return null;

  // 红方AI优先选择进攻型开局（70%概率选进攻型，30%选稳健型）
  if (aiColor === 'red') {
    const aggressive = matching.filter(m => m.aggression === 1);
    const stable = matching.filter(m => m.aggression === 0);
    if (aggressive.length > 0 && Math.random() < 0.7) {
      const pick = aggressive[Math.floor(Math.random() * aggressive.length)];
      const move = pick.move;
      if (isOpeningMoveValid(move, aiColor)) {
        return { fromRow: move[0], fromCol: move[1], toRow: move[2], toCol: move[3] };
      }
    }
    if (stable.length > 0 && Math.random() < 0.5) {
      const pick = stable[Math.floor(Math.random() * stable.length)];
      const move = pick.move;
      if (isOpeningMoveValid(move, aiColor)) {
        return { fromRow: move[0], fromCol: move[1], toRow: move[2], toCol: move[3] };
      }
    }
  }

  // 随机选一个
  const pick = matching[Math.floor(Math.random() * matching.length)];
  const move = pick.move;
  if (!isOpeningMoveValid(move, aiColor)) return null;
  return { fromRow: move[0], fromCol: move[1], toRow: move[2], toCol: move[3] };
}

function isOpeningMoveValid(move, aiColor) {
  // 安全检查：目标格子上有自己的棋子则放弃
  const piece = game.board[move[0]][move[1]];
  if (!piece) return false;
  if (PIECE_INFO[piece].color !== aiColor) return false;

  // 检查这步棋是否合法
  const validMoves = getValidMoves(move[0], move[1]);
  if (!validMoves.some(m => m.row === move[2] && m.col === move[3])) return false;

  return true;
}

function triggerAI() {
  if (game.gameOver || !isAIControlled(game.currentPlayer)) return;

  // 优先使用开局库（前6步随机选择不同开局）
  const openingMove = getOpeningBookMove();
  if (openingMove) {
    const mySearchId = ++currentSearchId;
    setTimeout(() => {
      if (mySearchId !== currentSearchId) return;
      game.aiThinking = false;
      el.aiThinking.style.display = 'none';
      el.clickLayer.style.pointerEvents = '';
      makeMove(openingMove.fromRow, openingMove.fromCol, openingMove.toRow, openingMove.toCol);
    }, 400);
    return;
  }

  game.aiThinking = true;
  el.aiThinking.style.display = 'flex';
  el.clickLayer.style.pointerEvents = 'none';

  // 优先使用 Pikafish 引擎
  if (pikafishReady || pikafishInitializing) {
    doPikafishSearch();
  } else {
    // 尝试初始化 Pikafish，如果失败则回退
    initPikafish();
    if (!pikafishReady && !pikafishInitializing) {
      // 引擎未就绪，使用内置 AI
      updateEngineStatus('builtin');
      const mySearchId = ++currentSearchId;
      setTimeout(() => {
        if (mySearchId !== currentSearchId) return;
        const aiMove = getAIMove();
        game.aiThinking = false;
        el.aiThinking.style.display = 'none';
        el.clickLayer.style.pointerEvents = '';
        if (aiMove) {
          makeMove(aiMove.fromRow, aiMove.fromCol, aiMove.toRow, aiMove.toCol);
        }
      }, 100);
    }
  }
}


// ======================== 棋谱记法 ========================

function generateNotation(code, fromRow, fromCol, toRow, toCol) {
  const info = PIECE_INFO[code];
  const isRed = info.color === 'red';
  const fromColLabel = isRed ? CN_NUMS[8 - fromCol] : String(fromCol + 1);
  const toColLabel = isRed ? CN_NUMS[8 - toCol] : String(toCol + 1);

  let action, target;
  if (fromCol === toCol) {
    if (isRed) { action = toRow < fromRow ? '进' : '退'; }
    else { action = toRow > fromRow ? '进' : '退'; }
    target = isRed ? CN_NUMS[Math.abs(toRow - fromRow) - 1] : String(Math.abs(toRow - fromRow));
  } else if (fromRow === toRow) {
    action = '平';
    target = toColLabel;
  } else {
    if (isRed) { action = toRow < fromRow ? '进' : '退'; }
    else { action = toRow > fromRow ? '进' : '退'; }
    target = toColLabel;
  }
  return info.name + fromColLabel + action + target;
}

// ======================== 游戏操作 ========================

function initGame() {
  // 递增 sessionId，废弃所有旧的动画回调和 AI 搜索回调
  game.sessionId++;
  // 清除旧的搜索超时计时器
  if (searchTimeoutId) {
    clearTimeout(searchTimeoutId);
    searchTimeoutId = null;
  }
  // 递增 searchId，废弃旧的 Pikafish 结果
  currentSearchId++;

  // 从 UI 读取 AI 设置
  game.aiRed = el.aiRedToggle ? el.aiRedToggle.checked : false;
  game.aiBlack = el.aiBlackToggle ? el.aiBlackToggle.checked : false;

  game.board = cloneBoard(INITIAL_BOARD);
  game.currentPlayer = 'red';  // 红方始终先行
  game.selectedPos = null;
  game.validMoves = [];
  game.gameOver = false;
  game.winner = null;
  game.moveHistory = [];
  game.capturedPieces = { red: [], black: [] };
  game.inCheck = false;
  game.checkedColor = null;
  game.lastMove = null;
  game.boardSnapshots = [];
  game.aiThinking = false;
  game.moveAnimating = false;
  game.aiMoveHistory = [];
  game.positionHistory = [];  // 清空长将历史

  // 开始新棋局时，只在用户未关闭背景音乐时才播放
  if (el.bgmToggle && el.bgmToggle.checked) {
    startBgm();
  }

  saveSnapshot();
  drawBoard();
  updateBoardOrientation();
  renderAll();

  // 通知 Pikafish 引擎新游戏开始
  if (pikafishReady && pikafishWorker) {
    pikafishWorker.postMessage({ type: 'newgame' });
  }

  // 如果红方由 AI 控制，AI 先行
  if (isAIControlled(game.currentPlayer) && !game.gameOver) {
    triggerAI();
  }
}

function saveSnapshot() {
  // 记录长将检测所需的局面信息
  // 当前 currentPlayer 是走棋后的对方，moverColor 是刚走棋的一方
  const moverColor = game.currentPlayer === 'red' ? 'black' : 'red';
  recordPosition(game.inCheck, moverColor);
  game.boardSnapshots.push({
    board: cloneBoard(game.board),
    currentPlayer: game.currentPlayer,
    moveHistory: game.moveHistory.slice(),
    capturedPieces: {
      red: game.capturedPieces.red.slice(),
      black: game.capturedPieces.black.slice(),
    },
    inCheck: game.inCheck,
    checkedColor: game.checkedColor,
    lastMove: game.lastMove ? { ...game.lastMove } : null,
  });
}

function undoMove() {
  if (game.boardSnapshots.length <= 1 || game.aiThinking) return;

  // AI互殴模式（双方都是AI）：只退1步，方便观察
  if (game.aiRed && game.aiBlack) {
    let stepsToUndo = 1;
    for (let i = 0; i < stepsToUndo; i++) {
      game.boardSnapshots.pop();
      if (game.positionHistory.length > 0) game.positionHistory.pop();
    }
    const snapshot = game.boardSnapshots[game.boardSnapshots.length - 1];
    game.board = cloneBoard(snapshot.board);
    game.currentPlayer = snapshot.currentPlayer;
    game.moveHistory = snapshot.moveHistory.slice();
    game.capturedPieces = JSON.parse(JSON.stringify(snapshot.capturedPieces));
    game.lastMove = snapshot.lastMove;
    game.inCheck = snapshot.inCheck;
    game.checkedColor = snapshot.checkedColor;
    game.gameOver = false;
    game.winner = null;
    renderAll();
    if (isAIControlled(game.currentPlayer) && !game.gameOver) triggerAI();
    return;
  }

  // 回退到上一个人类可操作的局面：
  // 如果当前回合是AI控制的方，说明上一步是人类走的，只撤1步
  // 如果当前回合不是AI控制的方，说明上一步是AI走的，需要撤到再上一步
  let stepsToUndo = 1;
  while (stepsToUndo < game.boardSnapshots.length) {
    const snapshot = game.boardSnapshots[game.boardSnapshots.length - stepsToUndo];
    if (snapshot && !isAIControlled(snapshot.currentPlayer)) break;
    stepsToUndo++;
  }
  if (stepsToUndo >= game.boardSnapshots.length) stepsToUndo = game.boardSnapshots.length - 1;

  for (let i = 0; i < stepsToUndo; i++) {
    if (game.boardSnapshots.length <= 1) break;
    game.boardSnapshots.pop();
    if (game.positionHistory.length > 0) game.positionHistory.pop();
    // 同步移除 AI 走法历史
    if (game.aiMoveHistory.length > 0) {
      game.aiMoveHistory.pop();
    }
  }

  const prev = game.boardSnapshots[game.boardSnapshots.length - 1];
  game.board = cloneBoard(prev.board);
  game.currentPlayer = prev.currentPlayer;
  game.moveHistory = prev.moveHistory.slice();
  game.capturedPieces = {
    red: prev.capturedPieces.red.slice(),
    black: prev.capturedPieces.black.slice(),
  };
  game.inCheck = prev.inCheck;
  game.checkedColor = prev.checkedColor;
  game.lastMove = prev.lastMove ? { ...prev.lastMove } : null;
  game.selectedPos = null;
  game.validMoves = [];
  game.gameOver = false;
  game.winner = null;

  hideModal();
  renderAll();
  playSound('click');
}

function makeMove(fromRow, fromCol, toRow, toCol) {
  const code = game.board[fromRow][fromCol];
  const captured = game.board[toRow][toCol];
  const moverColor = PIECE_INFO[code].color;

  const notation = generateNotation(code, fromRow, fromCol, toRow, toCol);

  // === 动画阶段：先播放移动动画，再更新棋盘 ===
  const fromPos = getPosPercent(fromCol, fromRow);
  const toPos = getPosPercent(toCol, toRow);

  // 找到移动的棋子DOM元素
  const movingPiece = el.piecesLayer.querySelector('.piece[data-row="' + fromRow + '"][data-col="' + fromCol + '"]');

  if (movingPiece) {
    // 动画期间阻止用户操作
    game.moveAnimating = true;
    // 添加移动类，提升层级+抬起动画
    movingPiece.classList.add('moving');

    // 如果有吃子，先播放被吃棋子的消失动画
    if (captured) {
      const capturedPiece = el.piecesLayer.querySelector('.piece[data-row="' + toRow + '"][data-col="' + toCol + '"]');
      if (capturedPiece) {
        // 延迟一点让移动棋子快到达时才触发吃子动画
        setTimeout(function() {
          capturedPiece.classList.add('captured');
        }, 150);
      }
      // 添加多层冲击波效果
      const burst = document.createElement('div');
      burst.className = 'capture-burst';
      burst.style.left = toPos.left + '%';
      burst.style.top = toPos.top + '%';
      el.piecesLayer.appendChild(burst);

      // 添加火花粒子
      var sparkCount = 8;
      for (var s = 0; s < sparkCount; s++) {
        var spark = document.createElement('div');
        spark.className = 'capture-spark';
        spark.style.left = toPos.left + '%';
        spark.style.top = toPos.top + '%';
        var angle = (Math.PI * 2 * s) / sparkCount;
        var dist = 30 + Math.random() * 25;
        spark.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        spark.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        spark.style.animationDelay = (0.15 + Math.random() * 0.05) + 's';
        el.piecesLayer.appendChild(spark);
      }

      // 0.8秒后清理冲击波和火花
      setTimeout(function() {
        if (burst.parentNode) burst.parentNode.removeChild(burst);
        var sparks = el.piecesLayer.querySelectorAll('.capture-spark');
        sparks.forEach(function(sp) { if (sp.parentNode) sp.parentNode.removeChild(sp); });
      }, 800);
    }

    // 移动棋子到目标位置（CSS transition自动播放动画）
    // 用双 requestAnimationFrame 确保浏览器先渲染旧位置再改变
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        movingPiece.style.left = toPos.left + '%';
        movingPiece.style.top = toPos.top + '%';
      });
    });

    // 动画完成后更新棋盘状态并重新渲染
    var animDuration = captured ? 500 : 400;
    var mySessionId = game.sessionId;  // 记录当前棋局标识
    setTimeout(function() {
      // 如果棋局已重置（sessionId 变化），放弃此次回调
      if (mySessionId !== game.sessionId) return;
      // 解除动画锁
      game.moveAnimating = false;
      // 更新棋盘数据
      game.moveHistory.push({
        player: moverColor,
        notation: notation,
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        captured: captured,
      });

      game.board[toRow][toCol] = code;
      game.board[fromRow][fromCol] = null;
      game.lastMove = { fromRow, fromCol, toRow, toCol };

      if (captured) {
        game.capturedPieces[moverColor].push(captured);
      }

      game.currentPlayer = moverColor === 'red' ? 'black' : 'red';
      game.inCheck = isInCheck(game.currentPlayer, game.board);
      game.checkedColor = game.inCheck ? game.currentPlayer : null;

      if (isCheckmate(game.currentPlayer, game.board)) {
        // 将死不结束游戏，玩家可悔棋演算，仅提示
        playSound('juesha');
        flashStatus('将死！');
      } else if (isStalemate(game.currentPlayer, game.board)) {
        // 困毙不结束游戏，仅提示
        playSound('juesha');
        flashStatus('困毙！');
      } else if (game.inCheck) {
        playSound('jiangjun');
        flashStatus('将军！');
      } else if (captured) {
        playSound('chi');
      } else {
        playSound('click');
      }

      saveSnapshot();
      game.selectedPos = null;
      game.validMoves = [];
      renderAll();

      // 落地脉冲效果
      var landedPiece = el.piecesLayer.querySelector('.piece[data-row="' + toRow + '"][data-col="' + toCol + '"]');
      if (landedPiece) {
        landedPiece.classList.add('landing');
        setTimeout(function() {
          if (landedPiece.parentNode) landedPiece.classList.remove('landing');
        }, 300);
      }

      // AI 走棋
      if (!game.gameOver && isAIControlled(game.currentPlayer)) {
        triggerAI();
      }
    }, animDuration);
  } else {
    // 找不到DOM元素，直接更新（fallback）
    game.moveHistory.push({
      player: moverColor,
      notation: notation,
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      captured: captured,
    });

    game.board[toRow][toCol] = code;
    game.board[fromRow][fromCol] = null;
    game.lastMove = { fromRow, fromCol, toRow, toCol };

    if (captured) {
      game.capturedPieces[moverColor].push(captured);
    }

    game.currentPlayer = moverColor === 'red' ? 'black' : 'red';
    game.inCheck = isInCheck(game.currentPlayer, game.board);
    game.checkedColor = game.inCheck ? game.currentPlayer : null;

    if (isCheckmate(game.currentPlayer, game.board)) {
      // 将死不结束游戏，玩家可悔棋演算，仅提示
      playSound('juesha');
      flashStatus('将死！');
    } else if (isStalemate(game.currentPlayer, game.board)) {
      // 困毙不结束游戏，仅提示
      playSound('juesha');
      flashStatus('困毙！');
    } else if (game.inCheck) {
      playSound('jiangjun');
      flashStatus('将军！');
    } else if (captured) {
      playSound('chi');
    } else {
      playSound('click');
    }

    saveSnapshot();
    game.selectedPos = null;
    game.validMoves = [];
    renderAll();

    if (!game.gameOver && isAIControlled(game.currentPlayer)) {
      triggerAI();
    }
  }
}

// ======================== 事件处理 ========================

function handleBoardClick(row, col) {
  if (game.gameOver || game.aiThinking || game.moveAnimating) return;
  // AI 模式下，AI 回合禁止玩家操作
  if (isAIControlled(game.currentPlayer)) return;

  const piece = getPiece(row, col);

  if (game.selectedPos) {
    const { row: sr, col: sc } = game.selectedPos;

    if (sr === row && sc === col) {
      game.selectedPos = null;
      game.validMoves = [];
      renderPieces();
      renderMoves();
      return;
    }

    if (piece && PIECE_INFO[piece].color === game.currentPlayer) {
      game.selectedPos = { row, col };
      game.validMoves = getValidMoves(row, col);
      playSound('select');
      renderPieces();
      renderMoves();
      return;
    }

    const isValid = game.validMoves.some(m => m.row === row && m.col === col);
    if (isValid) {
      makeMove(sr, sc, row, col);
      return;
    }

    game.selectedPos = null;
    game.validMoves = [];
    renderPieces();
    renderMoves();
    return;
  }

  if (piece && PIECE_INFO[piece].color === game.currentPlayer) {
    game.selectedPos = { row, col };
    game.validMoves = getValidMoves(row, col);
    playSound('select');
    renderPieces();
    renderMoves();
  }
}

// ======================== 渲染 ========================

function renderAll() {
  renderTurnIndicator();
  renderStatus();
  renderPieces();
  renderMoves();
  renderClickZones();
  renderCapturedPieces();
  renderMoveHistory();
  updateUndoButton();
}

// 旋转棋盘视角（整个棋盘容器+棋子一起转，棋子由CSS类反向旋转保持正向）
function updateBoardOrientation() {
  const container = document.getElementById('boardContainer');
  if (!container) return;
  const flipped = game.boardFlipped;
  // 容器旋转180度
  container.style.transform = flipped ? 'rotate(180deg)' : '';
  container.style.transition = 'transform 0.4s ease';
  // CSS类控制棋子图片反向旋转（比内联样式更可靠，不会在重建DOM时闪烁）
  if (flipped) {
    container.classList.add('flipped');
  } else {
    container.classList.remove('flipped');
  }
}

// 切换棋盘旋转
function toggleBoardRotation() {
  game.boardFlipped = !game.boardFlipped;
  updateBoardOrientation();
  playSound('click');
}

function renderTurnIndicator() {
  const isRed = game.currentPlayer === 'red';
  const dot = el.turnIndicator.querySelector('.turn-dot');
  dot.className = 'turn-dot ' + game.currentPlayer + ' active';
  let text = (isRed ? '红方' : '黑方') + '走棋';
  if (isAIControlled(game.currentPlayer)) text += '（电脑）';
  el.turnText.textContent = text;
}

function renderStatus() {
  if (game.gameOver) {
    el.statusMessage.textContent = '';
    el.statusMessage.className = 'status-message';
    return;
  }
  if (game.inCheck) {
    el.statusMessage.textContent = '将军！' + (game.currentPlayer === 'red' ? '红方' : '黑方') + '须解将';
    el.statusMessage.className = 'status-message check';
  } else {
    el.statusMessage.textContent = '';
    el.statusMessage.className = 'status-message';
  }
}

function flashStatus(msg) {
  el.statusMessage.textContent = msg;
  el.statusMessage.className = 'status-message check';
  setTimeout(() => {
    if (!game.gameOver) renderStatus();
  }, 1200);
}

function renderPieces() {
  el.piecesLayer.innerHTML = '';

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const code = game.board[r][c];
      if (!code) continue;

      const pos = getPosPercent(c, r);
      const div = document.createElement('div');
      div.className = 'piece';
      div.dataset.row = r;
      div.dataset.col = c;

      if (game.selectedPos && game.selectedPos.row === r && game.selectedPos.col === c) {
        div.classList.add('selected');
      }

      // 如果该棋子是当前选中棋子的合法吃子目标，添加绿光提示
      if (game.selectedPos) {
        const isCaptureTarget = game.validMoves.some(m => m.row === r && m.col === c);
        if (isCaptureTarget) {
          div.classList.add('capture-target');
        }
      }

      if (game.inCheck && game.checkedColor === game.currentPlayer) {
        const info = PIECE_INFO[code];
        if (info.type === 'king' && info.color === game.checkedColor) {
          div.classList.add('in-check');
        }
      }

      div.style.left = pos.left + '%';
      div.style.top = pos.top + '%';

      const img = document.createElement('img');
      img.src = PIECE_IMAGES[code];
      img.alt = PIECE_INFO[code].name;
      // 棋盘翻转时的反向旋转由CSS类 #boardContainer.flipped .piece img 处理
      // 不在此处设置内联transform，避免重建棋子时出现旋转闪烁
      img.onerror = function() {
        this.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.className = 'piece-fallback';
        const info = PIECE_INFO[code];
        fallback.style.background = info.color === 'red'
          ? 'radial-gradient(circle, #e74c3c, #c0392b)'
          : 'radial-gradient(circle, #34495e, #2c3e50)';
        fallback.style.color = info.color === 'red' ? '#fff' : '#ecf0f1';
        fallback.style.border = '2px solid ' + (info.color === 'red' ? '#922b21' : '#1a1a2e');
        fallback.textContent = info.char;
        div.appendChild(fallback);
      };
      div.appendChild(img);

      el.piecesLayer.appendChild(div);
    }
  }

  // 上一步标记（在棋子之后创建，叠加在棋子图片上方）
  if (game.lastMove) {
    const fromPos = getPosPercent(game.lastMove.fromCol, game.lastMove.fromRow);
    const toPos = getPosPercent(game.lastMove.toCol, game.lastMove.toRow);
    const fromMarker = document.createElement('div');
    fromMarker.className = 'last-move-marker';
    fromMarker.style.left = fromPos.left + '%';
    fromMarker.style.top = fromPos.top + '%';
    el.piecesLayer.appendChild(fromMarker);
    const toMarker = document.createElement('div');
    toMarker.className = 'last-move-marker';
    toMarker.style.left = toPos.left + '%';
    toMarker.style.top = toPos.top + '%';
    el.piecesLayer.appendChild(toMarker);
  }
}

function renderMoves() {
  el.movesLayer.innerHTML = '';
  for (const move of game.validMoves) {
    const pos = getPosPercent(move.col, move.row);
    const div = document.createElement('div');
    const target = getPiece(move.row, move.col);
    div.className = 'move-hint ' + (target ? 'capture' : 'empty');
    div.style.left = pos.left + '%';
    div.style.top = pos.top + '%';
    el.movesLayer.appendChild(div);
  }
}

function renderClickZones() {
  el.clickLayer.innerHTML = '';
  const cellW = CONFIG.board.cellWPercent;
  const cellH = CONFIG.board.cellHPercent;
  const zoneW = cellW * 1.2;
  const zoneH = cellH * 1.2;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const pos = getPosPercent(c, r);
      const zone = document.createElement('div');
      zone.className = 'click-zone';
      zone.style.left = pos.left + '%';
      zone.style.top = pos.top + '%';
      zone.style.width = zoneW + '%';
      zone.style.height = zoneH + '%';
      zone.dataset.row = r;
      zone.dataset.col = c;
      zone.addEventListener('click', () => handleBoardClick(r, c));
      el.clickLayer.appendChild(zone);
    }
  }
}

function renderCapturedPieces() {
  el.capturedByRed.innerHTML = '';
  el.capturedByBlack.innerHTML = '';

  for (const code of game.capturedPieces.red) {
    const img = document.createElement('img');
    img.src = PIECE_IMAGES[code];
    img.alt = PIECE_INFO[code].name;
    img.title = PIECE_INFO[code].name;
    img.onerror = function() {
      const span = document.createElement('span');
      span.style.cssText = 'width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;border-radius:4px;' +
        'background:' + (PIECE_INFO[code].color === 'red' ? '#e74c3c' : '#2c3e50') +
        ';color:white;';
      span.textContent = PIECE_INFO[code].char;
      this.replaceWith(span);
    };
    el.capturedByRed.appendChild(img);
  }

  for (const code of game.capturedPieces.black) {
    const img = document.createElement('img');
    img.src = PIECE_IMAGES[code];
    img.alt = PIECE_INFO[code].name;
    img.title = PIECE_INFO[code].name;
    img.onerror = function() {
      const span = document.createElement('span');
      span.style.cssText = 'width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;border-radius:4px;' +
        'background:' + (PIECE_INFO[code].color === 'red' ? '#e74c3c' : '#2c3e50') +
        ';color:white;';
      span.textContent = PIECE_INFO[code].char;
      this.replaceWith(span);
    };
    el.capturedByBlack.appendChild(img);
  }
}

function renderMoveHistory() {
  if (game.moveHistory.length === 0) {
    el.moveHistory.innerHTML = '<div class="empty-history">暂无走棋记录</div>';
    return;
  }

  el.moveHistory.innerHTML = '';
  for (let i = 0; i < game.moveHistory.length; i++) {
    const move = game.moveHistory[i];
    const row = document.createElement('div');
    row.className = 'move-row';
    const num = document.createElement('span');
    num.className = 'move-num';
    num.textContent = Math.floor(i / 2) + 1 + '.';
    const text = document.createElement('span');
    text.className = 'move-text ' + move.player;
    text.textContent = move.notation;
    row.appendChild(num);
    row.appendChild(text);
    el.moveHistory.appendChild(row);
  }
  el.moveHistory.scrollTop = el.moveHistory.scrollHeight;
}

function updateUndoButton() {
  el.undoBtn.disabled = game.boardSnapshots.length <= 1 || game.gameOver || game.aiThinking;
  el.undoBtn.style.opacity = el.undoBtn.disabled ? '0.4' : '1';
  el.undoBtn.style.cursor = el.undoBtn.disabled ? 'not-allowed' : 'pointer';
}

// ======================== 弹窗 ========================

function showModal(winner, reason) {
  const winnerName = winner === 'red' ? '红方' : '黑方';
  const winnerIsAI = isAIControlled(winner);
  const loserIsAI = isAIControlled(winner === 'red' ? 'black' : 'red');
  const winnerLabel = winnerIsAI ? '电脑（' + winnerName + '）' : winnerName;
  el.gameOverTitle.textContent = '游戏结束';
  if (reason === 'checkmate') {
    el.gameOverText.textContent = winnerLabel + '获胜！将死' + (loserIsAI ? '电脑' : '你') + '！';
  } else if (reason === 'stalemate') {
    el.gameOverText.textContent = winnerLabel + '获胜！' + (loserIsAI ? '电脑' : '你') + '困毙！';
  }
  el.gameOverModal.classList.add('show');
}

function hideModal() {
  el.gameOverModal.classList.remove('show');
}

// ======================== 音效 ========================

const audioCache = {};
let webAudioCtx = null;

// 获取或创建 Web Audio 上下文
function getAudioContext() {
  if (!webAudioCtx) {
    try {
      webAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  // 浏览器策略：需要用户交互后才能恢复
  if (webAudioCtx.state === 'suspended') {
    webAudioCtx.resume().catch(function() {});
  }
  return webAudioCtx;
}

// ========== 背景音乐（Web Audio API 合成循环旋律） ==========
let bgmPlaying = false;
let bgmTimer = null;
let bgmGainNode = null;

// 五声音阶旋律（C大调：C D E G A）
const bgmNotes = [
  261.63, 293.66, 329.63, 392.00, 440.00,
  392.00, 329.63, 293.66, 261.63, 293.66,
  329.63, 392.00, 440.00, 392.00, 329.63,
  293.66, 261.63, 220.00, 261.63, 293.66
];

function startBgm() {
  var ctx = getAudioContext();
  if (!ctx) return;
  if (bgmPlaying) return;

  bgmPlaying = true;
  bgmGainNode = ctx.createGain();
  bgmGainNode.gain.value = 0.08;
  bgmGainNode.connect(ctx.destination);

  var noteIndex = 0;
  function playNextNote() {
    if (!bgmPlaying || !bgmGainNode) return;

    var freq = bgmNotes[noteIndex % bgmNotes.length];
    var now = ctx.currentTime;

    // 主旋律
    var osc = ctx.createOscillator();
    var noteGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(noteGain);
    noteGain.connect(bgmGainNode);
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.6, now + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.65);

    // 低八度伴奏
    var bassOsc = ctx.createOscillator();
    var bassGain = ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.value = freq / 2;
    bassOsc.connect(bassGain);
    bassGain.connect(bgmGainNode);
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    bassOsc.start(now);
    bassOsc.stop(now + 0.85);

    noteIndex++;
    bgmTimer = setTimeout(playNextNote, 500);
  }

  playNextNote();
}

function stopBgm() {
  bgmPlaying = false;
  if (bgmTimer) {
    clearTimeout(bgmTimer);
    bgmTimer = null;
  }
  if (bgmGainNode) {
    try {
      bgmGainNode.gain.exponentialRampToValueAtTime(0.001, webAudioCtx.currentTime + 0.3);
    } catch (e) {}
    var oldGain = bgmGainNode;
    setTimeout(function() {
      try { oldGain.disconnect(); } catch (e) {}
    }, 400);
    bgmGainNode = null;
  }
}

// 用 Web Audio API 合成音效（不依赖外部文件）
function playSynthSound(name) {
  var ctx = getAudioContext();
  if (!ctx) return;

  var now = ctx.currentTime;

  if (name === 'jiangjun') {
    // 将军：急促的三连音警报（高音）
    var freqs = [880, 988, 880];
    for (var i = 0; i < freqs.length; i++) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freqs[i];
      osc.connect(gain);
      gain.connect(ctx.destination);
      var t = now + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.start(t);
      osc.stop(t + 0.14);
    }
  } else if (name === 'juesha') {
    // 绝杀：低沉有力的下行音
    var freqs2 = [440, 330, 220];
    for (var j = 0; j < freqs2.length; j++) {
      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.value = freqs2[j];
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      var t2 = now + j * 0.18;
      gain2.gain.setValueAtTime(0, t2);
      gain2.gain.linearRampToValueAtTime(0.35, t2 + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.3);
      osc2.start(t2);
      osc2.stop(t2 + 0.3);
    }
  } else if (name === 'chi') {
    // 吃子：清脆的短促音
    var osc3 = ctx.createOscillator();
    var gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(600, now);
    osc3.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    gain3.gain.setValueAtTime(0.3, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc3.start(now);
    osc3.stop(now + 0.15);
  } else if (name === 'select') {
    // 落子：轻柔的木质音
    var osc4 = ctx.createOscillator();
    var gain4 = ctx.createGain();
    osc4.type = 'sine';
    osc4.frequency.setValueAtTime(300, now);
    osc4.frequency.exponentialRampToValueAtTime(150, now + 0.1);
    osc4.connect(gain4);
    gain4.connect(ctx.destination);
    gain4.gain.setValueAtTime(0.2, now);
    gain4.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc4.start(now);
    osc4.stop(now + 0.1);
  } else if (name === 'click') {
    // 点击：极短的咔嗒声
    var osc5 = ctx.createOscillator();
    var gain5 = ctx.createGain();
    osc5.type = 'square';
    osc5.frequency.value = 1200;
    osc5.connect(gain5);
    gain5.connect(ctx.destination);
    gain5.gain.setValueAtTime(0.15, now);
    gain5.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc5.start(now);
    osc5.stop(now + 0.03);
  }
}

function playSound(name) {
  const src = CONFIG.audio[name];
  if (!src) {
    // 没有音频文件配置，直接用合成音效
    try { playSynthSound(name); } catch (e) {}
    return;
  }

  try {
    if (!audioCache[name]) {
      audioCache[name] = new Audio(src);
      audioCache[name].onerror = function() {
        try { playSynthSound(name); } catch (e) {}
      };
    }
    const audio = audioCache[name];
    // 如果音频还没加载好，直接用合成音效（不等待文件加载）
    if (audio.readyState < 2) {
      try { playSynthSound(name); } catch (e) {}
      // 同时继续预加载文件，下次就能用
      return;
    }
    audio.currentTime = 0;
    var playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(function() {
        try { playSynthSound(name); } catch (e) {}
      });
    }
  } catch (e) {
    try { playSynthSound(name); } catch (e2) {}
  }
}

// ======================== Canvas 棋盘绘制 ========================

function drawBoard() {
  const canvas = document.getElementById('boardCanvas');
  if (!canvas) return;
  const container = canvas.parentElement;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w === 0 || h === 0) return;

  // 高 DPI 支持
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const mX = w * CONFIG.board.marginLeftPercent / 100;
  const mY = h * CONFIG.board.marginTopPercent / 100;
  const cellW = w * CONFIG.board.cellWPercent / 100;
  const cellH = h * CONFIG.board.cellHPercent / 100;

  // 木质背景渐变
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#e8c887');
  bgGrad.addColorStop(0.5, '#dcb775');
  bgGrad.addColorStop(1, '#c9a560');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 木纹纹理（细微的线条）
  ctx.strokeStyle = 'rgba(139, 90, 43, 0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    const y = (h / 40) * i + Math.sin(i) * 3;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + 2, w * 0.7, y - 2, w, y);
    ctx.stroke();
  }

  // 外边框
  ctx.strokeStyle = '#5a3e1b';
  ctx.lineWidth = 3;
  ctx.strokeRect(mX - 6, mY - 6, w - 2 * mX + 12, h - 2 * mY + 12);

  // 画线
  ctx.strokeStyle = '#4a3010';
  ctx.lineWidth = 1.5;

  // 横线（10条）
  for (let r = 0; r < 10; r++) {
    ctx.beginPath();
    ctx.moveTo(mX, mY + r * cellH);
    ctx.lineTo(w - mX, mY + r * cellH);
    ctx.stroke();
  }

  // 竖线（9条，中间在河界断开）
  for (let c = 0; c < 9; c++) {
    ctx.beginPath();
    if (c === 0 || c === 8) {
      ctx.moveTo(mX + c * cellW, mY);
      ctx.lineTo(mX + c * cellW, h - mY);
    } else {
      ctx.moveTo(mX + c * cellW, mY);
      ctx.lineTo(mX + c * cellW, mY + 4 * cellH);
      ctx.moveTo(mX + c * cellW, mY + 5 * cellH);
      ctx.lineTo(mX + c * cellW, h - mY);
    }
    ctx.stroke();
  }

  // 九宫斜线
  ctx.beginPath();
  ctx.moveTo(mX + 3 * cellW, mY);
  ctx.lineTo(mX + 5 * cellW, mY + 2 * cellH);
  ctx.moveTo(mX + 5 * cellW, mY);
  ctx.lineTo(mX + 3 * cellW, mY + 2 * cellH);
  ctx.moveTo(mX + 3 * cellW, mY + 7 * cellH);
  ctx.lineTo(mX + 5 * cellW, mY + 9 * cellH);
  ctx.moveTo(mX + 5 * cellW, mY + 7 * cellH);
  ctx.lineTo(mX + 3 * cellW, mY + 9 * cellH);
  ctx.stroke();

  // 楚河汉界
  ctx.fillStyle = 'rgba(74, 48, 16, 0.85)';
  ctx.font = 'bold ' + Math.floor(cellH * 0.6) + 'px "STKaiti", "KaiTi", "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('楚  河', mX + 2 * cellW, mY + 4.5 * cellH);
  ctx.fillText('漢  界', mX + 6 * cellW, mY + 4.5 * cellH);

  // 兵卒/炮位标记
  const marks = [
    { r: 2, c: 1 }, { r: 2, c: 7 },
    { r: 7, c: 1 }, { r: 7, c: 7 },
    { r: 3, c: 0 }, { r: 3, c: 2 }, { r: 3, c: 4 }, { r: 3, c: 6 }, { r: 3, c: 8 },
    { r: 6, c: 0 }, { r: 6, c: 2 }, { r: 6, c: 4 }, { r: 6, c: 6 }, { r: 6, c: 8 },
  ];
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#4a3010';
  const markSize = cellW * 0.1;
  const markOffset = cellW * 0.08;
  for (const m of marks) {
    const x = mX + m.c * cellW;
    const y = mY + m.r * cellH;
    drawPositionMark(ctx, x, y, markSize, markOffset, m.c === 0, m.c === 8);
  }
}

function drawPositionMark(ctx, x, y, size, offset, isLeftEdge, isRightEdge) {
  if (!isLeftEdge) {
    ctx.beginPath();
    ctx.moveTo(x - offset - size, y - offset);
    ctx.lineTo(x - offset, y - offset);
    ctx.lineTo(x - offset, y - offset - size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - offset - size, y + offset);
    ctx.lineTo(x - offset, y + offset);
    ctx.lineTo(x - offset, y + offset + size);
    ctx.stroke();
  }
  if (!isRightEdge) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y - offset);
    ctx.lineTo(x + offset + size, y - offset);
    ctx.lineTo(x + offset, y - offset - size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + offset, y + offset);
    ctx.lineTo(x + offset + size, y + offset);
    ctx.lineTo(x + offset, y + offset + size);
    ctx.stroke();
  }
}

// ======================== 初始化 ========================

function bindElements() {
  el = {
    turnIndicator: document.getElementById('turnIndicator'),
    turnText: document.getElementById('turnText'),
    statusMessage: document.getElementById('statusMessage'),
    resetBtn: document.getElementById('resetBtn'),
    undoBtn: document.getElementById('undoBtn'),
    rotateBtn: document.getElementById('rotateBtn'),
    boardContainer: document.getElementById('boardContainer'),
    piecesLayer: document.getElementById('piecesLayer'),
    movesLayer: document.getElementById('movesLayer'),
    clickLayer: document.getElementById('clickLayer'),
    capturedByRed: document.getElementById('capturedByRed'),
    capturedByBlack: document.getElementById('capturedByBlack'),
    moveHistory: document.getElementById('moveHistory'),
    gameOverModal: document.getElementById('gameOverModal'),
    gameOverTitle: document.getElementById('gameOverTitle'),
    gameOverText: document.getElementById('gameOverText'),
    modalResetBtn: document.getElementById('modalResetBtn'),
    aiRedToggle: document.getElementById('aiRedToggle'),
    aiBlackToggle: document.getElementById('aiBlackToggle'),
    aiThinking: document.getElementById('aiThinking'),
    bgmToggle: document.getElementById('bgmToggle'),
    bgmToggleText: document.getElementById('bgmToggleText'),
  };
}

function bindEvents() {
  el.resetBtn.addEventListener('click', () => {
    initGame();
    playSound('click');
  });
  el.undoBtn.addEventListener('click', undoMove);
  el.rotateBtn.addEventListener('click', toggleBoardRotation);
  el.modalResetBtn.addEventListener('click', () => {
    hideModal();
    initGame();
    playSound('click');
  });

  // 红方AI开关
  el.aiRedToggle.addEventListener('change', () => {
    game.aiRed = el.aiRedToggle.checked;
    renderTurnIndicator();
    if (isAIControlled(game.currentPlayer) && !game.gameOver && !game.aiThinking) {
      triggerAI();
    }
  });

  // 黑方AI开关
  el.aiBlackToggle.addEventListener('change', () => {
    game.aiBlack = el.aiBlackToggle.checked;
    renderTurnIndicator();
    if (isAIControlled(game.currentPlayer) && !game.gameOver && !game.aiThinking) {
      triggerAI();
    }
  });

  // 背景音乐开关
  el.bgmToggle.addEventListener('change', function() {
    if (el.bgmToggle.checked) {
      startBgm();
    } else {
      stopBgm();
    }
    el.bgmToggleText.textContent = el.bgmToggle.checked ? '背景音乐' : '音乐已关';
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawBoard();
      renderClickZones();
      renderPieces();
    }, 150);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  bindElements();
  bindEvents();

  // 初始化 Pikafish 引擎（异步，不阻塞页面渲染）
  updateEngineStatus('loading');
  initPikafish();

  // 直接开始新棋局（默认无AI，玩家手动勾选AI方）
  setTimeout(() => {
    initGame();
  }, 100);
});
