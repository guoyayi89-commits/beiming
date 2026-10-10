// 鲲的摆姿：把游迹排成脊柱，各节立起截面，求剪影，再投到屏幕。替换 KUN_FORMS 里的 fish。
(function () {
  'use strict';
  var F = window.KUN_FORMS, G = window.KUN_WHALE_GEO, TR = window.KUN_TRAIL, SW = window.KUN_SWIM;
  if (!F || !G || !TR || !SW) return;
  var N = G.N, K = G.K, PI = Math.PI, R = G.R, FIN_S = G.FIN_S;
  var TY = G.TY, S = G.S, Y = G.Y, Z = G.Z, NY = G.NY, NZ = G.NZ, P1 = G.P1, P2 = G.P2;
  var FRY = R(FIN_S) * 0.62, FRZ = R(FIN_S) * 0.55;

  function arr() { return new Float32Array(K + 1); }
  var src = { px: arr(), py: arr(), pz: arr(), tx: arr(), ty: arr(), tz: arr(), rl: arr() };
  var PX = arr(), PY = arr(), PZ = arr(), TX = arr(), TYv = arr(), TZ = arr();
  var UX = arr(), UY = arr(), UZ = arr(), LX = arr(), LY = arr(), LZ = arr();
  var tmpP = new Float32Array(N * 2), tmpL = new Float32Array(N);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // 每节的背向 U：切线在屏幕上的法向绕切线转过该节的翻滚角；侧向 = 切线 × U。
  // 再沿 U 加上摆尾的波（鲸尾上下摆），越近尾越大
  function frames(amp, ph, L) {
    for (var j = 0; j <= K; j++) {
      var tx = src.tx[j], ty = src.ty[j], tz = src.tz[j];
      var a = ty, b = -tx, l = Math.hypot(a, b);
      if (l < 1e-4) { a = 0; b = -1; } else { a /= l; b /= l; }
      var ux0 = b * tz, uy0 = -a * tz, uz0 = a * ty - b * tx;
      var c = Math.cos(src.rl[j]), sn = Math.sin(src.rl[j]);
      var ux = c * a + sn * ux0, uy = c * b + sn * uy0, uz = sn * uz0;
      UX[j] = ux; UY[j] = uy; UZ[j] = uz;
      LX[j] = ty * uz - tz * uy; LY[j] = tz * ux - tx * uz; LZ[j] = tx * uy - ty * ux;
      TX[j] = tx; TYv[j] = ty; TZ[j] = tz;
      var t = j / K, w = amp * L * t * t * Math.sin(ph - t * 3.2);
      PX[j] = src.px[j] + ux * w; PY[j] = src.py[j] + uy * w; PZ[j] = src.pz[j] + uz * w;
    }
  }

  // 取 s 处的节：位置 fp*，切线 ft*，背向 fu*，侧向 fl*；超出头尾沿切线外推
  var fpx, fpy, fpz, ftx, fty, ftz, fux, fuy, fuz, flx, fly, flz;
  function at(s) {
    var f = (1 - s) * K, i = Math.min(K - 1, Math.max(0, f | 0)), v = f - i, o = 0;
    if (f < 0) { v = 0; o = f; } else if (f > K) { i = K - 1; v = 1; o = f - K; }
    var w = 1 - v, p = i + 1;
    ftx = TX[i] * w + TX[p] * v; fty = TYv[i] * w + TYv[p] * v; ftz = TZ[i] * w + TZ[p] * v;
    var step = -o * curL / K;
    fpx = PX[i] * w + PX[p] * v + ftx * step; fpy = PY[i] * w + PY[p] * v + fty * step; fpz = PZ[i] * w + PZ[p] * v + ftz * step;
    fux = UX[i] * w + UX[p] * v; fuy = UY[i] * w + UY[p] * v; fuz = UZ[i] * w + UZ[p] * v;
    flx = LX[i] * w + LX[p] * v; fly = LY[i] * w + LY[p] * v; flz = LZ[i] * w + LZ[p] * v;
  }

  var curL = 1, qx, qy, qz;
  function body(s, y, z) {
    at(s);
    qx = fpx + (-fux * y + flx * z) * curL;
    qy = fpy + (-fuy * y + fly * z) * curL;
    qz = fpz + (-fuz * y + flz * z) * curL;
  }

  // 写出全部点：轻透视（相机距约 3.2 身长）· 受光：体表朝向镜头的亮，背面的透出一点
  var MX = 0, MY = 0, MZ = 0;
  function emit(out, lum, L, phi, fp, ox, oy) {
    curL = L;
    var m = K >> 1; MX = PX[m]; MY = PY[m]; MZ = PZ[m];
    var D = 3.2 * L, cph = Math.cos(phi), sph = Math.sin(phi), cfp = Math.cos(fp), sfp = Math.sin(fp);
    for (var i = 0; i < N; i++) {
      var t = TY[i], lm;
      if (t === 0 || t === 5) {
        body(S[i], Y[i], Z[i]);
        var nz = Math.max(0, -fuz * NY[i] + flz * NZ[i]);
        lm = t === 0 ? 0.3 + 0.7 * nz : 0.04 + 0.96 * Math.sqrt(nz);
      } else if (t === 3) {
        at(S[i]);
        var r = R(S[i]), aa = r * 1.01, bb = r * 0.85, al = -fuz / aa, be = flz / bb, nl = Math.hypot(al, be);
        var c = nl > 1e-6 ? be / nl : 0, sn = nl > 1e-6 ? -al / nl : 1;
        if (Z[i] < 0) { c = -c; sn = -sn; }
        body(S[i], c * r * (c > 0 ? 1.12 : 0.9), sn * bb);
        lm = 1;
      } else if (t === 1) {
        var l = P1[i], sg = Z[i];
        body(FIN_S - 0.38 * l - P2[i], FRY + cph * l, sg * (FRZ + sph * l));
        lm = 0.75;
      } else if (t === 2) {
        body(0, 0, 0);
        var a = -P1[i] * cfp * L, b = P1[i] * sfp * L, z = P2[i] * L;
        at(0);
        qx += ftx * a - fux * b + flx * z; qy += fty * a - fuy * b + fly * z; qz += ftz * a - fuz * b + flz * z;
        lm = 0.8;
      } else { body(S[i], Y[i], 0); lm = 0.8; }
      var dz = qz - MZ, f = clamp(D / (D - dz), 0.6, 1.8);
      out[i * 2] = MX + (qx - MX) * f + ox;
      out[i * 2 + 1] = MY + (qy - MY) * f + oy;
      lum[i] = lm * clamp(0.9 + dz / L * 0.5, 0.55, 1.15);
    }
  }

  // 投影单个身体点（用于眼睛定位）
  function projBody(s, y, z, L) {
    curL = L; body(s, y, z);
    var D = 3.2 * L, f = clamp(D / (D - (qz - MZ)), 0.6, 1.8);
    return [MX + (qx - MX) * f, MY + (qy - MY) * f, qz];
  }

  // 定住的鲸：身体伸直，侧身朝 fx，只轻轻摆尾
  function lockSrc(fx, L) {
    var d = fx < 0 ? -1 : 1, rl = d > 0 ? G.BANK0 : PI - G.BANK0;
    for (var j = 0; j <= K; j++) {
      src.px[j] = -d * (j / K) * L; src.py[j] = 0; src.pz[j] = 0;
      src.tx[j] = d; src.ty[j] = 0; src.tz[j] = 0; src.rl[j] = rl;
    }
  }
  function nearEye(L) {
    var a = projBody(G.EYE[0], G.EYE[1], G.EYE[2], L), b = projBody(G.EYE[0], G.EYE[1], -G.EYE[2], L);
    return a[2] >= b[2] ? a : b;
  }
  function lockPose(out, lum, L, x, y, fx, eyeW, T, rd) {
    lockSrc(fx, L);
    frames(rd ? 0 : 0.03, T * 2.2, L);
    var m = K >> 1; MX = PX[m]; MY = PY[m]; MZ = PZ[m];
    var e = nearEye(L), ax = MX + (e[0] - MX) * eyeW, ay = MY + (e[1] - MY) * eyeW;
    emit(out, lum, L, rd ? 0.85 : 0.85 + 0.25 * Math.sin(T * 1.6), rd ? 0 : 0.3 * Math.sin(T * 2.2 - 4.4), x - ax, y - ay);
  }

  // o: x y 落点 · size 视口尺寸像素 · fx · eye 0 自游 / 1 以眼睛定住 · T dt now 秒 · home · vis · reduced
  function pose(out, lum, o) {
    var L = o.size * G.LEN, lw = o.reduced ? 1 : clamp(o.eye || 0, 0, 1);
    if (lw < 0.999) {
      SW.update({ x: o.x, y: o.y, L: L, fx: o.fx, T: o.T, dt: o.dt, now: o.now, home: o.home, vis: o.vis });
      var st = SW.state;
      TR.sample(st.x, st.y, st.z, st.hr, L, K, src);
      for (var j = 0; j <= K; j++) { src.px[j] += st.cx; src.py[j] += st.cy; }
      frames(st.amp, st.ph, L);
      var sp = Math.min(3, st.v / L);
      emit(out, lum, L, 0.85 - 0.15 * sp + 0.3 * Math.sin(o.T * 1.6), clamp(st.amp * 10, 0, 0.75) * Math.cos(st.ph - 3.2), 0, 0);
    }
    if (lw > 0.001) {
      var full = lw >= 0.999;
      lockPose(full ? out : tmpP, full ? lum : tmpL, L, o.x, o.y, o.fx, o.eye || 0, o.T, o.reduced);
      if (!full) {
        for (var i = 0; i < N; i++) {
          out[i * 2] += (tmpP[i * 2] - out[i * 2]) * lw;
          out[i * 2 + 1] += (tmpP[i * 2 + 1] - out[i * 2 + 1]) * lw;
          lum[i] += (tmpL[i] - lum[i]) * lw;
        }
      }
    }
  }

  // 静止形态：给其他形态做插值参照
  var pts = new Float32Array(N * 2), pl = new Float32Array(N);
  lockPose(pts, pl, G.LEN, 0, 0, 1, 0, 0, true);
  var eye = nearEye(G.LEN);
  F.forms.fish = {
    kind: 'whale', pts: pts, acc: new Uint8Array(N), n: G.filled,
    anchors: { c: [0, 0], eye: [eye[0], eye[1]] }
  };

  window.KUN_WHALE = { pose: pose };
})();
