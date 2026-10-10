// 鲸的游迹：头在"水"里走过的路（含翻滚角）。身体按弧长沿这条路排开，
// 于是转弯走弧线，翻身从头一节节传到尾。
(function () {
  'use strict';
  var X = [], Y = [], Z = [], R = [];

  function clear() { X.length = Y.length = Z.length = R.length = 0; }

  function push(x, y, z, r) { X.push(x); Y.push(y); Z.push(z); R.push(r); }

  // 头在 (x,y,z)，朝向 (hx,hy,hz)：身后铺一条直路
  function reset(x, y, z, hx, hy, hz, r, len) {
    clear();
    for (var k = 24; k >= 1; k--) {
      var d = len * 1.4 * k / 24;
      push(x - hx * d, y - hy * d, z - hz * d, r);
    }
  }

  // 头每移动 len/50 记一个点；只保留身后约 1.6 个身长
  function step(x, y, z, r, len) {
    var n = X.length;
    if (n) {
      var dx = x - X[n - 1], dy = y - Y[n - 1], dz = z - Z[n - 1];
      if (dx * dx + dy * dy + dz * dz < len * len / 2500) return;
    }
    push(x, y, z, r);
    var acc = 0, i;
    for (i = X.length - 1; i > 0; i--) {
      acc += Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1], Z[i] - Z[i - 1]);
      if (acc > len * 1.6) break;
    }
    if (i > 1) { X.splice(0, i - 1); Y.splice(0, i - 1); Z.splice(0, i - 1); R.splice(0, i - 1); }
  }

  function shift(dx, dy) {
    for (var i = 0; i < X.length; i++) { X[i] += dx; Y[i] += dy; }
  }

  // 从头 (hx,hy,hz,hr) 沿路往后，取 K+1 个等距站点（0 = 吻端，K = 尾根）
  // out: px py pz 位置，tx ty tz 朝头的切线，rl 翻滚角
  function sample(hx, hy, hz, hr, len, K, out) {
    var i = X.length - 1, ax = hx, ay = hy, az = hz, ar = hr, acc = 0;
    var bx = i >= 0 ? X[i] : hx, by = i >= 0 ? Y[i] : hy, bz = i >= 0 ? Z[i] : hz, br = i >= 0 ? R[i] : hr;
    var seg = Math.hypot(ax - bx, ay - by, az - bz);
    var ex = 1, ey = 0, ez = 0;
    for (var j = 0; j <= K; j++) {
      var d = len * j / K;
      while (acc + seg < d && i > 0) {
        acc += seg; ax = bx; ay = by; az = bz; ar = br; i--;
        bx = X[i]; by = Y[i]; bz = Z[i]; br = R[i];
        seg = Math.hypot(ax - bx, ay - by, az - bz);
      }
      if (seg > 1e-6) { ex = (ax - bx) / seg; ey = (ay - by) / seg; ez = (az - bz) / seg; }
      var u = d - acc;
      out.px[j] = ax - ex * u; out.py[j] = ay - ey * u; out.pz[j] = az - ez * u;
      out.rl[j] = seg > 1e-6 && u <= seg ? ar + (br - ar) * (u / seg) : br;
    }
    for (j = 0; j <= K; j++) {
      var a = Math.max(0, j - 1), b = Math.min(K, j + 1);
      var tx = out.px[a] - out.px[b], ty = out.py[a] - out.py[b], tz = out.pz[a] - out.pz[b];
      var l = Math.hypot(tx, ty, tz) || 1;
      out.tx[j] = tx / l; out.ty[j] = ty / l; out.tz[j] = tz / l;
    }
  }

  window.KUN_TRAIL = { reset: reset, step: step, shift: shift, sample: sample, clear: clear };
})();
