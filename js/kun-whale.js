// 鲲：点阵座头鲸。细点轮廓（每帧按视线求出的身体剪影）+ 体表错落点阵 + 鳍与尾叶，没有网格线。
// 每个点存为身体坐标（s 沿脊柱 0 尾 1 吻，y 腹向，z 侧向，单位为身长）。
// 每帧沿游迹排出 K 节脊柱，按各节自己的翻滚角立起截面，再带轻微透视投到屏幕。
(function () {
  'use strict';
  var F = window.KUN_FORMS, TR = window.KUN_TRAIL, SW = window.KUN_SWIM;
  if (!F || !TR || !SW) return;
  var N = F.N, TAU = Math.PI * 2, PI = Math.PI;
  var LEN = 0.9, K = 24, FIN_S = 0.68, FIN_L = 0.3, BANK0 = SW.BANK0;

  function R(s) {
    if (s >= 0.6) { var u = (s - 0.6) / 0.4; return 0.118 * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.4))); }
    var v = (0.6 - s) / 0.6;
    return 0.111 * Math.pow(1 - v * v, 1.15) + 0.007;
  }

  // TY：0 体表点（NY NZ 为截面法向）· 1 胸鳍（Z 存左右）· 2 尾叶 · 3 剪影（Z 存左右）· 4 背鳍
  //     5 眼与嘴线（同体表点，但转到背面就几乎看不见）
  var S = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N);
  var NY = new Float32Array(N), NZ = new Float32Array(N), P1 = new Float32Array(N), P2 = new Float32Array(N);
  var TY = new Int8Array(N), n = 0, q, u, s;
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function add(ty, s, y, z, ny, nz) {
    if (n >= N) return;
    TY[n] = ty; S[n] = s; Y[n] = y; Z[n] = z; NY[n] = ny; NZ[n] = nz; n++;
  }
  function surf(s, th, ty) {
    var r = R(s), c = Math.cos(th), a = r * (c > 0 ? 1.12 : 0.9), b = r * 0.85;
    var ny = c / a, nz = Math.sin(th) / b, l = Math.hypot(ny, nz) || 1;
    add(ty || 0, s, c * a, Math.sin(th) * b, ny / l, nz / l);
  }

  // 剪影：两侧各 150 点
  [-1, 1].forEach(function (sg) {
    for (q = 0; q < 150; q++) add(3, 0.004 + 0.994 * (q + 0.5) / 150, 0, sg, 0, 0);
  });
  // 体表点阵：低差异序列铺开，按截面周长取舍，匀而不成行
  var placed = 0, k = 0;
  while (placed < 820 && k < 20000) {
    k++;
    s = 0.02 + 0.97 * ((0.5 + 0.7548776662 * k) % 1);
    if (R(s) / 0.118 < rnd()) continue;
    surf(s, ((0.5 + 0.5698402910 * k) % 1) * TAU);
    placed++;
  }
  // 眼睛：两侧各一圈眼眶加瞳孔
  var eS = 0.84, eTh = 1.2;
  [-1, 1].forEach(function (sg) {
    var r = R(eS), a = r * 1.12, b = r * 0.85, c = Math.cos(eTh), sn = Math.sin(eTh) * sg;
    var ny = c / a, nz = sn / b, l = Math.hypot(ny, nz);
    for (q = 0; q < 64; q++) { u = q / 64 * TAU; add(5, eS + Math.cos(u) * 0.014, c * a + Math.sin(u) * 0.014, sn * b, ny / l, nz / l); }
    for (q = 0; q < 14; q++) { u = q / 14 * TAU; add(5, eS + Math.cos(u) * 0.006, c * a + Math.sin(u) * 0.006, sn * b, ny / l, nz / l); }
  });
  var EYE_Y = Math.cos(eTh) * R(eS) * 1.12, EYE_Z = Math.sin(eTh) * R(eS) * 0.85;
  // 嘴线
  [-1, 1].forEach(function (sg) {
    for (q = 0; q < 16; q++) { u = q / 15; surf(0.99 - 0.19 * u, sg * (1.05 + 0.3 * u), 5); }
  });
  // 背上的小背鳍
  for (q = 0; q < 14; q++) {
    u = q / 13; s = 0.36 - 0.08 * u;
    add(4, s, -R(s) * 0.9 - 0.03 * Math.sin(PI * Math.pow(u, 0.6)), 0, 0, 0);
  }
  // 胸鳍：座头鲸的长鳍，前缘有结节
  function finW(u) { return (0.014 + 0.042 * Math.sin(PI * Math.pow(u, 0.65))) * Math.pow(1 - u, 0.3); }
  function fin(sg, l, w) { if (n < N) { TY[n] = 1; Z[n] = sg; P1[n] = l; P2[n] = w; n++; } }
  [-1, 1].forEach(function (sg) {
    for (q = 0; q < 30; q++) { u = q / 29; fin(sg, u * FIN_L, -0.005 * Math.abs(Math.sin(u * 26))); }
    for (q = 0; q < 30; q++) { u = (q + 0.5) / 30; fin(sg, u * FIN_L, finW(u)); }
    for (q = 0; q < 8; q++) { u = (q + 0.5) / 8; fin(sg, u * FIN_L * 0.9, finW(u) * 0.45); }
  });
  // 尾鳍：两叶，后缘带锯齿，中间有缺口
  function fluke(b, z) { if (n < N) { TY[n] = 2; P1[n] = b; P2[n] = z; n++; } }
  [-1, 1].forEach(function (sg) {
    for (q = 0; q < 28; q++) { u = q / 27; fluke(0.12 * Math.pow(u, 1.5), sg * (0.012 + 0.19 * u)); }
    for (q = 1; q < 32; q++) {
      u = q / 31;
      fluke(0.12 - 0.035 * u + 0.022 * Math.sin(PI * u) + 0.005 * Math.sin(u * 30), sg * 0.202 * (1 - u));
    }
  });
  var filled = n;
  for (; n < N; n++) {
    var j = n % filled;
    TY[n] = TY[j]; S[n] = S[j]; Y[n] = Y[j]; Z[n] = Z[j]; NY[n] = NY[j]; NZ[n] = NZ[j]; P1[n] = P1[j]; P2[n] = P2[j];
  }

  window.KUN_WHALE_GEO = {
    N: N, K: K, LEN: LEN, FIN_S: FIN_S, BANK0: BANK0, R: R, filled: filled,
    S: S, Y: Y, Z: Z, NY: NY, NZ: NZ, P1: P1, P2: P2, TY: TY, EYE: [eS, EYE_Y, EYE_Z]
  };
})();
