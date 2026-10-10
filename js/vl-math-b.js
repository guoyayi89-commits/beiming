// 各章数学细线（下）：三 · 洛伦兹吸引子　四 · 微分与守恒
(function () {
  'use strict';
  if (!window.VL) return;
  var S = VL.svg, T = VL.text;

  // ---------- 三 · 洛伦兹吸引子：x–z 投影本身就是一只蝴蝶 ----------
  (function () {
    var host = document.getElementById('dream');
    if (!host) return;
    var W = 600, H = 470, sg = 10, rho = 28, beta = 8 / 3;
    var sv = S('svg', { 'class': 'math math-lorenz', viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' });
    host.insertBefore(sv, host.firstChild);
    function X(x) { return 300 + x * 11.5; }
    function Z(z) { return 430 - z * 7.6; }
    var g = S('g', {}, sv);

    var x = 0.1, y = 0, z = 0, dt = 0.004, d = '';
    for (var i = 0; i < 10000; i++) {
      var dx = sg * (y - x), dy = x * (rho - z) - y, dz = x * y - beta * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
      if (i > 300 && i % 2 === 0) d += (d ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Z(z).toFixed(1);
    }
    S('path', { d: d, 'class': 'm-c m-trace', pathLength: 1 }, g);

    var ax = S('g', { 'class': 'm-draw' }, g);
    S('line', { x1: X(-22), y1: Z(-2), x2: X(22), y2: Z(-2), 'class': 'm-l' }, ax);
    S('line', { x1: X(-24), y1: Z(0), x2: X(-24), y2: Z(50), 'class': 'm-l' }, ax);
    [-20, -10, 0, 10, 20].forEach(function (v) {
      S('line', { x1: X(v), y1: Z(-2) - 3, x2: X(v), y2: Z(-2) + 3, 'class': 'm-l' }, ax);
      T(ax, X(v), Z(-2) + 15, String(v), 'm-t', 'middle');
    });
    [0, 25, 50].forEach(function (v) {
      S('line', { x1: X(-24) - 3, y1: Z(v), x2: X(-24) + 3, y2: Z(v), 'class': 'm-l' }, ax);
      T(ax, X(-24) - 7, Z(v) + 3, String(v), 'm-t', 'end');
    });
    T(ax, X(22) + 6, Z(-2) + 3, 'x', 'm-t m-tk');
    T(ax, X(-24), Z(50) - 8, 'z', 'm-t m-tk', 'middle');

    var c = Math.sqrt(beta * (rho - 1));
    [[-c, 'C⁻ · 庄周'], [c, 'C⁺ · 胡蝶']].forEach(function (p, k) {
      var px = X(p[0]), pz = Z(rho - 1);
      S('rect', { x: px - 3, y: pz - 3, width: 6, height: 6, 'class': 'm-sq' }, ax);
      S('line', { x1: px, y1: pz, x2: px, y2: Z(-2), 'class': 'm-d' }, ax);
      T(ax, px + (k ? 10 : -10), pz - 10, p[1], 'm-t m-tk', k ? 'start' : 'end');
    });

    var lx = 360, ly = 24;
    ['dx/dt = σ(y − x)', 'dy/dt = x(ρ − z) − y', 'dz/dt = xy − βz'].forEach(function (s, k) { T(ax, lx, ly + k * 16, s, 'm-t m-tk'); });
    T(ax, lx, ly + 52, 'σ = 10　ρ = 28　β = 8/3', 'm-t');
    T(ax, 10, H - 6, '洛伦兹吸引子 · x–z 投影 · 两个中心之间来回，轨迹永不重合', 'm-t');
    VL.reveal(sv, 0.15);
  })();

  // ---------- 四 · 微分与守恒：月的盈虚是一条正弦，切线是变化，积分为零是不变 ----------
  (function () {
    var host = document.querySelector('.moon-grid');
    if (!host) return;
    var W = 1180, H = 150, x0 = 70, x1 = 1110, yb = 118, A = 88;
    var sv = S('svg', { 'class': 'math math-calc', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
    host.insertBefore(sv, host.firstChild);
    var g = S('g', { 'class': 'm-draw' }, sv);
    function f(t) { return (1 - Math.cos(2 * Math.PI * t)) / 2; }
    function X(t) { return x0 + (x1 - x0) * t; }
    function Y(v) { return yb - A * v; }
    var ym = Y(0.5);

    S('line', { x1: x0 - 20, y1: yb, x2: x1 + 20, y2: yb, 'class': 'm-l' }, g);
    S('line', { x1: x0 - 20, y1: ym, x2: x1 + 20, y2: ym, 'class': 'm-d' }, g);
    T(g, x1 + 26, ym + 3, 'ȳ', 'm-t m-tk');
    for (var t = 0.006; t < 1; t += 0.012) {
      S('line', { x1: X(t), y1: Y(f(t)), x2: X(t), y2: ym, 'class': 'm-f' }, g);
    }
    var d = '';
    for (var k = 0; k <= 200; k++) { var tt = k / 200; d += (k ? 'L' : 'M') + X(tt).toFixed(1) + ' ' + Y(f(tt)).toFixed(1); }
    S('path', { d: d, 'class': 'm-c' }, g);
    T(g, X(0.42), ym - 16, '+', 'm-t m-tk', 'middle');
    T(g, X(0.08), ym + 16, '−', 'm-t m-tk', 'middle');
    T(g, X(0.92), ym + 16, '−', 'm-t m-tk', 'middle');

    // 切线：dy/dt
    [[0.25, 'dy/dt > 0 · 盈'], [0.5, 'dy/dt = 0'], [0.75, 'dy/dt < 0 · 虚']].forEach(function (p) {
      var t = p[0], h = 0.001, sl = (Y(f(t + h)) - Y(f(t - h))) / (X(t + h) - X(t - h));
      var len = 64 / Math.sqrt(1 + sl * sl), cx = X(t), cy = Y(f(t));
      S('line', { x1: cx - len, y1: cy - sl * len, x2: cx + len, y2: cy + sl * len, 'class': 'm-l' }, g);
      T(g, cx + 10, cy + (t === 0.5 ? -10 : 16), p[1], 'm-t m-tk', t === 0.75 ? 'end' : 'start');
    });

    // 月相落在曲线上：亮面 = 克莱因蓝
    for (var m = 0; m <= 8; m++) {
      var tm = m / 8, fr = f(tm), cx = X(tm), cy = Y(fr), r = 6.5;
      S('circle', { cx: cx, cy: cy, r: r, 'class': 'm-moon' }, g);
      if (fr > 0.02) {
        var rx = r * Math.abs(1 - 2 * fr), sw = fr < 0.5 ? 0 : 1;
        S('path', {
          d: 'M' + cx + ' ' + (cy - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + cx + ' ' + (cy + r) + 'A' + rx + ' ' + r + ' 0 0 ' + sw + ' ' + cx + ' ' + (cy - r) + 'Z',
          'class': 'm-sq', transform: tm > 0.5 ? 'translate(' + 2 * cx + ' 0) scale(-1 1)' : null
        }, g);
      }
    }
    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) { T(g, X(t), yb + 16, (29.53 * t).toFixed(1) + ' d', 'm-t', 'middle'); });

    T(g, 0, 14, 'y(t) = ½(1 − cos 2πt/T)　T = 29.53 d', 'm-t m-tk');
    T(g, W, 14, '∫₀ᵀ (y − ȳ) dt = 0　·　d/dt(盈 + 虚) = 0', 'm-t m-tk', 'end');
    T(g, W, 30, '变的一面看是导数，不变的一面看是积分', 'm-t', 'end');
    VL.reveal(sv, 0.3);
  })();
})();
