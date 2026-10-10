// 鲲的故事线：每个关键帧绑定页面上的一个位置。
// p：粘性舞台的进度（0 贴顶，1 离开）；at：元素高度的比例，此处位于视口中央。
// f 形态 · x y 视口坐标 · s 尺寸（相对视口短边）· a 透明度 · d 消散 · fx 朝向 · tone 0 暗底 1 亮底
// an 定位点：c 中心 / eye 眼睛（鲸以眼睛定住，不再自游）/ dot 问号句点 · fit 贴合某元素的圆 · mx my ms 窄屏覆盖值
// 鲸的 x y 是它游动时围绕的落点；朝向、路线由 kun-swim.js 决定。
// 未写出的属性沿用上一帧。
window.KUN_STORY = [
  // 首页：鲲约屏宽 1/8，在月下字流里游。wide 时 s 为视口宽度的倍数；steer 时由字流脚本给出鼠标与水域
  { sel: '#home', p: 0, f: 'fish', x: 0.5, y: 0.55, s: 0.125, a: 0.9, d: 0, fx: 1, tone: 0, an: 'c', wide: true, steer: true, ms: 0.24 },
  { sel: '.earth', at: 0.5, x: 0.5, y: 0.2, s: 0.13, a: 0.9, wide: false, mx: 0.5, my: 0.12, ms: 0.24 },

  // 转场一：钻进鲸的眼睛
  // 眼眶的半径约为 0.0117 s 个视口短边，与转场揭开的圆同步放大
  { sel: '#tr1', p: 0, x: 0.5, y: 0.5, s: 0.42, a: 0.95, an: 'eye', fx: 1 },
  { sel: '#tr1', p: 0.18, s: 1 },
  { sel: '#tr1', p: 0.3, s: 7 },
  { sel: '#tr1', p: 0.45, s: 28 },
  { sel: '#tr1', p: 0.6, s: 54 },
  { sel: '#tr1', p: 0.8, s: 80 },
  { sel: '#tr1', p: 1, s: 95, a: 0 },

  // 一 · 创造：由 0 和 1 聚合，在两指之间诞生
  { sel: '#creation .scrolly', p: 0, f: 'binary', x: 0.5, y: 0.5, s: 0.8, a: 0.45, an: 'c' },
  { sel: '#creation .scrolly', p: 0.6, s: 0.55, a: 0.75 },
  { sel: '#creation .scrolly', p: 0.86, f: 'fish', s: 0.15, a: 1 },
  { sel: '#creation .scrolly', p: 1, x: 0.5, y: 0.24, s: 0.18 },
  { sel: '.leibniz', at: 0.5, x: 0.93, y: 0.4, s: 0.12 },

  // 转场二：它睁开眼，光涌进来
  { sel: '#tr2', p: 0, x: 0.5, y: 0.5, s: 0.36, an: 'eye', tone: 0 },
  { sel: '#tr2', p: 0.55, s: 0.48, tone: 0.6 },
  { sel: '#tr2', p: 1, f: 'question', s: 0.42, an: 'c', tone: 1 },

  // 二 · 我思：自问
  { sel: '.cogito-grid', at: 0.5, x: 0.94, y: 0.42, s: 0.2 },
  { sel: '.gallery', p: 0, x: 0.5, y: 0.1, s: 0.11, tone: 0 },
  { sel: '.gallery', p: 1 },
  { sel: '#cogito', at: 1, x: 0.5, y: 0.45, s: 0.3, tone: 1, v: 1 },

  // 转场三：穿过问号的句点，入梦
  { sel: '#tr3', p: 0, x: 0.5, y: 0.5, s: 0.5, an: 'dot' },
  { sel: '#tr3', p: 0.6, s: 0.32, d: 0.9 },
  { sel: '#tr3', p: 1, f: 'butterfly', s: 0.34, d: 0, an: 'c' },

  // 三 · 梦蝶：化蝶
  { sel: '.dream-grid', at: 0.5, x: 0.94, y: 0.3, s: 0.14 },
  { sel: '.lily-grid', at: 0.5, y: 0.62, s: 0.12 },

  // 转场四：蝴蝶飞进夜色
  { sel: '#tr4', p: 0, x: 0.5, y: 0.5, s: 0.3, tone: 1 },
  { sel: '#tr4', p: 0.55, s: 3, tone: 0.5 },
  { sel: '#tr4', p: 0.7, s: 5, a: 0, tone: 0 },
  { sel: '#tr4', p: 1, f: 'fish', x: 0.76, y: 0.62, s: 0.32, a: 0.95, d: 0.2, fx: -1 },

  // 四 · 须臾：消散
  { sel: '.moment-banner', at: 0.6, y: 0.72, d: 0.3 },
  { sel: '#ctx', at: 0.5, x: 0.95, y: 0.5, s: 0.14, d: 0.6, a: 0.8 },
  { sel: '.moon-grid', at: 0.5, f: 'ring', fit: '.moon', d: 0.15, a: 0.9 },
  { sel: '.marey', at: 0.5, f: 'fish', x: 0.9, y: 0.25, s: 0.12, d: 0.85, a: 0.5 },
  { sel: '.dm', at: 0.5, x: 0.5, y: 0.3, s: 0.3, d: 1, a: 0.35 },

  // 转场五：落进月亮
  { sel: '#tr5', p: 0, f: 'ring', fit: '#tr5 .tr-reveal img', fitK: 0.89, d: 0.2, a: 0.85 },
  { sel: '#tr5', p: 0.55, a: 0.7 },
  { sel: '#tr5', p: 0.85, a: 0, tone: 1 },

  // 终章：在濠水里重聚，化而为鹏
  { sel: '.pond', at: 0.25, f: 'scatter', x: 0.5, y: 0.5, s: 1.05, a: 0.55, d: 0, fx: 1, tone: 1 },
  { sel: '.pond', at: 0.65, f: 'fish', x: 0.62, y: 0.42, s: 0.34, a: 1 },
  { sel: '#dialog', at: 0.5, x: 0.93, y: 0.5, s: 0.12 },
  { sel: '.peng', p: 0.05, x: 0.5, y: 0.66, s: 0.3 },
  { sel: '.peng', p: 0.45, f: 'bird', y: 0.42, s: 0.62 },
  { sel: '.peng', p: 0.6, y: 0.38, s: 0.66 },
  { sel: '.peng', p: 1, y: -0.4, s: 1.1, a: 0.7 }
];
