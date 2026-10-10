// 首屏线框：一点透视的房间围合水墨山；顶边是先天六十四卦标尺（阴 0 阳 1）
(function () {
  'use strict';
  if (!window.VL) return;
  var S = VL.svg, T = VL.text;

  function at(VP, x, y, k) { return [VP.x + (x - VP.x) * k, VP.y + (y - VP.y) * k]; }
  function line(g, a, b, cls) { return S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], 'class': cls }, g); }
  function rect(g, VP, F, k, cls) {
    var a = at(VP, F.l, F.t, k), b = at(VP, F.r, F.b, k);
    return S('rect', { x: a[0], y: a[1], width: b[0] - a[0], height: b[1] - a[1], 'class': cls }, g);
  }
  function sq(g, x, y, s) { S('rect', { x: x - s / 2, y: y - s / 2, width: s, height: s, 'class': 'm-sq' }, g); }

  window.VL_HERO_SVG = function (sv, o) {
    var W = o.W, H = o.H, F = o.F, VP = o.VP, narrow = W < 720;
    while (sv.firstChild) sv.removeChild(sv.firstChild);
    sv.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var g = S('g', { 'class': 'm-draw' }, sv);
    var KB = 0.2, ks = [0.72, 0.5, 0.34];

    // 画框与后墙
    S('rect', { x: F.l, y: F.t, width: F.r - F.l, height: F.b - F.t, 'class': 'm-l' }, g);
    rect(g, VP, F, KB, 'm-l');
    [[F.l, F.t], [F.r, F.t], [F.l, F.b], [F.r, F.b]].forEach(function (c) { line(g, c, at(VP, c[0], c[1], KB), 'm-l'); });
    [0.55, 0.34].forEach(function (k) { rect(g, VP, F, k, 'm-d'); });

    // 地面与侧墙
    for (var j = 1; j < 8; j++) {
      var x = F.l + (F.r - F.l) * j / 8;
      line(g, [x, F.b], at(VP, x, F.b, KB), 'm-f');
    }
    ks.forEach(function (k) {
      line(g, at(VP, F.l, F.b, k), at(VP, F.r, F.b, k), 'm-f');
      line(g, at(VP, F.l, F.t, k), at(VP, F.l, F.b, k), 'm-f');
      line(g, at(VP, F.r, F.t, k), at(VP, F.r, F.b, k), 'm-f');
    });

    // 天花：64 条射线，即数据流的轨道
    o.rays.forEach(function (r) { line(g, [r.x0, r.y0], [r.x1, r.y1], 'm-ray'); });

    // 灭点
    var R = Math.min(W, H) * 0.36;
    S('circle', { cx: VP.x, cy: VP.y, r: R, 'class': 'm-d' }, g);
    S('circle', { cx: VP.x, cy: VP.y, r: 9, 'class': 'm-l' }, g);
    line(g, [VP.x - 16, VP.y], [VP.x + 16, VP.y], 'm-l');
    line(g, [VP.x, VP.y - 16], [VP.x, VP.y + 16], 'm-l');

    // 六十四卦标尺
    for (var i = 0; i < 64; i++) {
      var cx = F.l + F.step * (i + 0.5);
      VL.hexagram(g, i, cx - F.gw / 2, F.ry, F.gw, F.gap, 'm-hex');
      if (i % 8 === 0 || i === 63) {
        if (!narrow || i === 0 || i === 63) T(g, cx, F.t - 7, VL.bin6(i), 'm-t', narrow ? (i ? 'end' : 'start') : 'middle');
      }
    }

    // 标注
    var lt = 'm-t';
    if (!narrow) {
      T(g, F.l, F.t - 22, '先天六十四卦 · 阴爻 0 / 阳爻 1 · 000000 → 111111', lt);
      T(g, F.r, F.t - 22, 'z = 0', lt, 'end');
    }
    var bw = at(VP, F.l, F.t, KB), bwr = at(VP, F.r, F.b, KB);
    T(g, bw[0] + 4, bw[1] - 6, 'z = 0.20', lt);
    if (!narrow) {
      [0.55, 0.34].forEach(function (k) { var a = at(VP, F.r, F.b, k); T(g, a[0] - 4, a[1] - 6, 'z = ' + k.toFixed(2), lt, 'end'); });
      T(g, VP.x + 14, VP.y + 24, 'VP (' + Math.round(VP.x) + ', ' + Math.round(VP.y) + ')', lt);
      var lx = o.P.x + o.P.w + 18;
      line(g, [o.rays[63].x0, o.peakY], [lx - 4, o.peakY], 'm-l');
      T(g, lx, o.peakY + 4, 'ink → bit · 16 bit / 字', 'm-t m-tk');
      T(g, lx, o.peakY + 18, o.chars + ' 字 → ' + o.bits + ' bit', lt);
      T(g, F.l + 6, F.b - 8, '(0, ' + Math.round(F.b) + ')', lt);
      T(g, F.r - 6, F.b - 8, '(' + Math.round(F.r) + ', ' + Math.round(F.b) + ')', lt, 'end');
    }
    sq(g, bw[0], bw[1], 6); sq(g, bwr[0], bwr[1], 6);
    sq(g, bwr[0], bw[1], 4); sq(g, bw[0], bwr[1], 4);
    [11, 52].forEach(function (k) {
      var r = o.rays[k], t = 0.62;
      sq(g, r.x0 + (r.x1 - r.x0) * t, r.y0 + (r.y1 - r.y0) * t, 5);
    });
    VL.reveal(sv, 0);
  };
})();
