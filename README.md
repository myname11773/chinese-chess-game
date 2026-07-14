# 中国象棋 - 人机对战

一款使用 HTML + CSS + JavaScript 制作的浏览器中国象棋游戏，集成 Pikafish 开源象棋引擎（WASM），开箱即玩。

## 功能特性

- 完整实现中国象棋全部走棋规则
- 将军 / 将死 / 困毙自动判定
- 飞将规则（两将照面判定）
- 蹩马腿、塞象眼、隔山打炮等细节规则
- **Pikafish WASM 引擎**：世界级象棋 AI，NNUE 神经网络评估
- **内置后备 AI**：Negamax + Alpha-Beta 剪枝 + 静态搜索 + MVV-LVA 走法排序
- 五档难度可选（入门 / 初级 / 中级 / 高级 / 大师）
- 可选执棋方（开局可选红方先手或黑方后手，随时换边）
- bg.png 棋盘图片（缺失时自动用 Canvas 绘制后备棋盘）
- 棋子图片缺失时自动显示文字棋子（无需图片也能玩）
- 棋子选中高亮、有效走法提示
- 音效系统（选子/落子/吃子/将军/绝杀）
- 悔棋功能（AI 模式下自动撤两步）
- 棋谱记录（中文象棋记法）
- 俘获棋子展示
- 上一步走棋标记
- 响应式布局，支持移动端

## 使用方法

### 快速开始

```bash
cd chinese-chess
python3 server.py
```

浏览器打开 `http://localhost:8080` 即可开始游戏。

> 需要通过 HTTP 服务器访问（不能用 file:// 直接打开），因为 Pikafish WASM 引擎需要加载 .wasm 和 .data 文件。

### 直接打开

如果不需要 Pikafish AI（使用内置 AI），可以直接用浏览器打开 `index.html`。Pikafish 引擎加载失败时会自动回退到内置 AI。

## AI 引擎说明

### Pikafish WASM 引擎（主引擎）

本项目集成了 [Pikafish](https://github.com/official-pikafish/Pikafish) 象棋引擎，编译为 WebAssembly 在浏览器中运行：

- **NNUE 神经网络评估**：使用 pikafish.nnue（49MB）进行精准局面评估
- **单线程模式**：不需要 SharedArrayBuffer / COOP / COEP 头，兼容所有浏览器
- **Web Worker**：在后台线程运行，不阻塞 UI
- **难度对应搜索深度**：入门(depth 4) / 初级(depth 8) / 中级(depth 12) / 高级(depth 16) / 大师(depth 22)

### 内置 AI（后备引擎）

当 Pikafish 引擎不可用时（如直接用 file:// 打开），自动使用内置 AI：

- Negamax + Alpha-Beta 剪枝
- MVV-LVA 走法排序
- 静态搜索（Quiescence Search）
- Zobrist 置换表
- 迭代加深 + 时间限制
- 开局库 + Pondering 预计算

## 资源文件清单

### 图片资源（放入 `images/` 文件夹，可选）

| 文件名 | 说明 |
|--------|------|
| bg.png  | 棋盘背景图（缺失时自动用 Canvas 绘制） |
| b_c.png | 黑方车 |
| b_j.png | 黑方将 |
| b_m.png | 黑方马 |
| b_x.png | 黑方象 |
| b_s.png | 黑方士 |
| b_p.png | 黑方炮 |
| b_z.png | 黑方卒 |
| r_c.png | 红方车 |
| r_j.png | 红方帅 |
| r_m.png | 红方马 |
| r_x.png | 红方相 |
| r_p.png | 红方炮 |
| r_s.png | 红方仕 |
| r_z.png | 红方兵 |

### 音频资源（放入 `audio/` 文件夹，可选）

| 文件名 | 说明 |
|--------|------|
| click.wav    | 选中棋子音效 |
| select.wav   | 落下棋子音效 |
| chi.mp3      | 吃子音效 |
| jiangjun.mp3 | 将军音效 |
| juesha.mp3   | 绝杀音效 |

## 项目结构

```
chinese-chess/
├── index.html              # 主页面
├── server.py               # 本地 HTTP 服务器
├── css/
│   └── style.css           # 样式文件
├── js/
│   └── game.js             # 游戏逻辑 + AI 引擎 + Canvas 棋盘绘制
├── engine/
│   ├── pikafish.js         # Pikafish WASM 引擎（Emscripten 生成）
│   ├── pikafish.wasm       # WASM 二进制
│   ├── pikafish.data        # NNUE 网络数据（49MB）
│   └── pikafish-worker.js  # Web Worker 桥接层
├── images/                 # 棋子图片（可选）
├── audio/                  # 音效文件（可选）
└── README.md               # 说明文档
```

## 棋盘对齐调整

如果棋子没有对齐棋盘交叉点，可修改 `js/game.js` 中的 `CONFIG.board`：

```javascript
board: {
  marginXPercent: 5.56,  // 水平边距百分比
  marginYPercent: 5.0,   // 垂直边距百分比
}
```

## 游戏规则

- 红方先走，双方交替走棋
- 点击己方棋子选中（金色高光），有效走法位置会显示蓝色圆点
- 可吃子位置显示红色圆环
- 再次点击同一棋子取消选中
- 将死对方或对方困毙即获胜

## 技术细节

### Pikafish WASM 编译

Pikafish 引擎编译为单线程 WASM，关键修改：

- 移除 `-pthread` 和 `USE_PTHREADS` 宏，不依赖 SharedArrayBuffer
- `NativeThread` 改为空操作桩（WASM 单线程不需要真实线程）
- `Thread::idle_loop()` / `run_custom_job()` / `wait_for_search_finished()` 改为同步执行
- 使用 `--preload-file pikafish.nnue` 将 NNUE 网络嵌入虚拟文件系统
- 通过 `EMSCRIPTEN_KEEPALIVE` 导出 `js_init` / `js_set_position` / `js_search` 等 C 接口
