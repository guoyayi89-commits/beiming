// 各章数学细线（上）：二 · 笛卡尔坐标系
(function () {
  'use strict';
  if (!window.VL || !window.BM) return;
  var S = VL.svg, T = VL.text;

  // ---------- 二 · 笛卡尔坐标系：画像上的坐标轴与叶形线 ----------
  (function () {
    var fig = document.querySelector('.descartes');
    if (!fig) return;
    var W = 817, H = 1000, O = [408, 330], U = 70;
    var sv = S('svg', { 'class': 'math math-xy', viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' });
    fig.appendChild(sv);
    function to(x, y) { return [O[0] + x * U, O[1] - y * U]; }
    var g = S('g', { 'class': 'm-draw' }, sv);
    var defs = S('defs', {}, sv), mk = S('marker', { id: 'xyArrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto' }, defs);
    S('path', { d: 'M0 0L8 4L0 8', 'class': 'm-l' }, mk);

    for (var i = -5; i <= 5; i++) {
      var x = O[0] + i * U;
      if (i) S('line', { x1: x, y1: 0, x2: x, y2: H, 'class': 'm-g' }, g);
      S('line', { x1: x, y1: O[1] - 4, x2: x, y2: O[1] + 4, 'class': 'm-l' }, g);
      if (i) T(g, x, O[1] + 18, String(i), 'm-t', 'middle');
    }
    for (var j = -9; j <= 4; j++) {
      var y = O[1] - j * U;
      if (j) S('line', { x1: 0, y1: y, x2: W, y2: y, 'class': 'm-g' }, g);
      S('line', { x1: O[0] - 4, y1: y, x2: O[0] + 4, y2: y, 'class': 'm-l' }, g);
      if (j) T(g, O[0] - 10, y + 3, String(j), 'm-t', 'end');
    }
    S('line', { x1: -50, y1: O[1], x2: W + 60, y2: O[1], 'class': 'm-l', 'marker-end': 'url(#xyArrow)' }, g);
    S('line', { x1: O[0], y1: H + 30, x2: O[0], y2: -46, 'class': 'm-l', 'marker-end': 'url(#xyArrow)' }, g);
    T(g, W + 64, O[1] + 18, 'x', 'm-t m-tk m-big');
    T(g, O[0] + 12, -40, 'y', 'm-t m-tk m-big');
    T(g, O[0] + 8, O[1] + 18, 'O', 'm-t m-tk');

    // 叶形线 x³ + y³ = 3axy
    var A = 1.6;
    function leaf(t0, t1, n) {
      var d = '';
      for (var k = 0; k <= n; k++) {
        var t = t0 + (t1 - t0) * k / n, den = 1 + t * t * t, p = to(3 * A * t / den, 3 * A * t * t / den);
        d += (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      }
      return d;
    }
    S('path', { d: leaf(-0.6, 0, 60) + leaf(0, 40, 400).replace(/^M/, 'L') + leaf(-7, -1.28, 160), 'class': 'm-c' }, g);
    var a1 = to(-6, 6 - A), a2 = to(4, -4 - A);
    S('line', { x1: a1[0], y1: a1[1], x2: a2[0], y2: a2[1], 'class': 'm-d' }, g);
    T(g, a2[0] - 6, a2[1] - 8, 'x + y + a = 0', 'm-t', 'end');

    var P = to(1.5 * A, 1.5 * A);
    S('line', { x1: P[0], y1: P[1], x2: P[0], y2: O[1], 'class': 'm-d' }, g);
    S('line', { x1: P[0], y1: P[1], x2: O[0], y2: P[1], 'class': 'm-d' }, g);
    S('rect', { x: P[0] - 3.5, y: P[1] - 3.5, width: 7, height: 7, 'class': 'm-sq' }, g);
    T(g, P[0] + 10, P[1] - 8, 'P (3a/2, 3a/2)', 'm-t m-tk');
    T(g, P[0] + 10, P[1] + 8, '我在 = (x, y) ?', 'm-t');
    T(g, 16, H - 34, 'x³ + y³ = 3axy　a = ' + A, 'm-t m-tk m-big');
    T(g, 16, H - 16, '笛卡尔叶形线 · 1638 · 把"在哪里"写成一对数', 'm-t');
    VL.reveal(sv, 0.2);
  })();
})();
