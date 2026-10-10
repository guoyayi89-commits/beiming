// 鲸怎么游：头的速度、转向、俯仰与翻滚，以及首页和展厅里的几种行为。
// 位置单位是屏幕像素；头在"水"坐标里游，cx cy 是水流偏移，用来让它悬停在落点附近。
(function () {
  'use strict';
  var TR = window.KUN_TRAIL, WT = window.KUN_WATCH;
  if (!TR) return;
  var TAU = Math.PI * 2, PI = Math.PI, BANK0 = 0.38;

  var S = {
    x: 0, y: 0, z: 0, cx: 0, cy: 0, h: 0, e: 0, v: 0, w: 0, roll: BANK0, hr: BANK0, right: true,
    ph: 0, amp: 0.05, last: -1, mode: '', mt: 0, dur: 6, nextDart: true, wp: null, orb: null,
    flee: 0, fx: 0, fy: 0, turn: 0, diveDone: false, scrollSeen: 0, coolT: 0
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrap(a) { return a - TAU * Math.floor((a + PI) / TAU); }
  function ex(k, dt) { return 1 - Math.exp(-k * dt); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function hx() { return S.x + S.cx; }
  function hy() { return S.y + S.cy; }
  function mid(L) { return [hx() - Math.cos(S.h) * 0.45 * L, hy() - Math.sin(S.h) * 0.45 * L]; }
  function dist(p, q) { return Math.hypot(p[0] - q[0], p[1] - q[1]); }

  // 不贴边：身体整条留在边框里
  function safe(l, t, r, b, L) {
    var o = { l: l + L * 0.55, t: t + L * 0.4, r: r - L * 0.55, b: b - L * 0.4 };
    if (o.l > o.r) o.l = o.r = (l + r) / 2;
    if (o.t > o.b) o.t = o.b = (t + b) / 2;
    return o;
  }
  function inR(p, R) { return [clamp(p[0], R.l, R.r), clamp(p[1], R.t, R.b)]; }

  // 绕 c 游（椭圆 rx ry）：目标取在当前方位角前方一段弧上，dir 为 +1 顺时针
  function orbit(c, rx, ry, dir, L) {
    var ux = (hx() - c[0]) / rx, uy = (hy() - c[1]) / ry, d = Math.hypot(ux, uy);
    var th = Math.atan2(uy, ux), ahead = dir * clamp(0.9 * L / ((rx + ry) / 2), 0.3, 1) * (d > 2 ? 0.5 : 1);
    return { x: c[0] + rx * Math.cos(th + ahead), y: c[1] + ry * Math.sin(th + ahead), th: th, d: d };
  }
  function orbitDir(c) {
    var cr = Math.cos(S.h) * (c[1] - hy()) - Math.sin(S.h) * (c[0] - hx());
    return cr >= 0 ? 1 : -1;
  }
  function orbitAcc(o, th, d) {
    if (o.th0 != null && d < 1.5) o.acc += wrap(th - o.th0);
    o.th0 = th;
  }

  function pick(R, L) {
    var p = null;
    for (var k = 0; k < 6; k++) {
      p = [rnd(R.l, R.r), rnd(R.t, R.b)];
      if (dist(p, [hx(), hy()]) > 2 * L) break;
    }
    return p;
  }

  // ---------- 首页：绕鼠标游圈，被快扫就逃；无鼠标时慢游、冲刺、打圈 ----------
  function homeGoal(info, T, L) {
    var a = info.area, R = safe(a.l, a.t, a.r, a.b, L), m = info.mouse, c = mid(L);
    if (!/^(cruise|dart|circle)$/.test(S.mode)) { S.mode = 'cruise'; S.mt = T; S.dur = rnd(4, 7); S.wp = null; S.orb = null; }
    if (m && m.in && m.v > 1100 && T > S.flee) {
      var tail = [hx() - Math.cos(S.h) * L, hy() - Math.sin(S.h) * L];
      var dm = Math.min(dist([m.x, m.y], [hx(), hy()]), dist([m.x, m.y], c), dist([m.x, m.y], tail));
      if (dm < 0.8 * L) {
        var dx = c[0] - m.x, dy = c[1] - m.y, l = Math.hypot(dx, dy) || 1;
        S.flee = T + 1.4; S.fx = dx / l; S.fy = dy / l; S.orb = null;
      }
    }
    if (T < S.flee) return { x: hx() + S.fx * 3 * L, y: hy() + S.fy * 3 * L, v: 3.2, acc: 6, boost: 0.03, R: R };
    if (m && m.in) {
      var cc = inR([m.x, m.y], R), r = 0.55 * L;
      if (!S.orb || S.orb.kind !== 'mouse') S.orb = { kind: 'mouse', dir: orbitDir(cc), acc: 0 };
      var o = orbit(cc, r, r, S.orb.dir, L);
      return { x: o.x, y: o.y, v: o.d > 2 ? 2 : 1.25, acc: 3, R: R };
    }
    if (S.orb && S.orb.kind === 'mouse') S.orb = null;

    var age = T - S.mt;
    if (S.mode === 'cruise' && age > S.dur) {
      S.mode = S.nextDart ? 'dart' : 'circle'; S.nextDart = !S.nextDart; S.mt = T; age = 0;
      var sd = Math.random() < 0.5 ? -1 : 1;
      if (S.mode === 'dart') {
        var ang = S.h + sd * rnd(0.9, 1.9);
        S.wp = inR([hx() + Math.cos(ang) * 3.5 * L, hy() + Math.sin(ang) * 3.5 * L], R);
      } else {
        var oc = inR([hx() + Math.cos(S.h + sd * PI / 2) * 0.75 * L, hy() + Math.sin(S.h + sd * PI / 2) * 0.75 * L], R);
        S.orb = { kind: 'loop', c: oc, dir: orbitDir(oc), acc: 0 };
      }
    }
    if (S.mode === 'dart') {
      if (dist(S.wp, [hx(), hy()]) < 0.8 * L || age > 1.8) toCruise(T);
      else return { x: S.wp[0], y: S.wp[1], v: 3, acc: 5, boost: 0.03, R: R };
    }
    if (S.mode === 'circle') {
      var lo = orbit(S.orb.c, 0.75 * L, 0.75 * L, S.orb.dir, L);
      orbitAcc(S.orb, lo.th, lo.d);
      if (Math.abs(S.orb.acc) > TAU || age > 7) toCruise(T);
      else return { x: lo.x, y: lo.y, v: 1.1, acc: 2.5, R: R };
    }
    if (!S.wp || dist(S.wp, [hx(), hy()]) < 0.8 * L) S.wp = pick(R, L);
    return { x: S.wp[0], y: S.wp[1], v: 0.55, acc: 1.6, R: R };
  }
  function toCruise(T) { S.mode = 'cruise'; S.mt = T; S.dur = rnd(5, 8); S.wp = null; S.orb = null; }

  // ---------- 展厅：悬在落点，头朝下一步要看处；新图文入画先绕一圈；停滚 2 秒往下游再回 ----------
  function showGoal(o, T, L, now) {
    var W = window.innerWidth, H = window.innerHeight, R = safe(W * 0.03, H * 0.05, W * 0.97, H * 0.95, L);
    var A = inR([o.x, o.y], R), c = mid(L), age = T - S.mt;
    if (!/^(settle|visit|dive)$/.test(S.mode)) { S.mode = 'settle'; S.orb = null; }
    if (WT && WT.scrollT !== S.scrollSeen) { S.scrollSeen = WT.scrollT; S.diveDone = false; }
    var idle = WT ? now - WT.scrollT : 0, dA = dist(c, A);

    if (S.mode === 'settle' && WT) {
      var pd = WT.pending;
      if (pd && now - pd.t < 2.5 && now > S.coolT && o.vis > 0.3) {
        WT.pending = null;
        var pr = pd.el.getBoundingClientRect();
        if (pr.bottom > H * 0.1 && pr.top < H * 0.9) { S.mode = 'visit'; S.mt = T; age = 0; S.orb = { kind: 'visit', el: pd.el, dir: 0, acc: 0 }; }
      } else if (idle > 2 && !S.diveDone && dA < 1.2 * L) {
        S.diveDone = true; S.mode = 'dive'; S.mt = T; age = 0;
        S.wp = [A[0] + rnd(-0.3, 0.3) * L, Math.min(R.b, A[1] + Math.max(H * 0.28, L * 1.5))];
      }
    }
    if (S.mode === 'visit') {
      var r = S.orb.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || age > 11) { S.mode = 'settle'; S.coolT = now + 3; }
      else {
        var rx = Math.min(r.width / 2 + 0.45 * L, (R.r - R.l) / 2), ry = Math.min(r.height / 2 + 0.45 * L, (R.b - R.t) / 2);
        var cc = [clamp(r.left + r.width / 2, R.l + rx, R.r - rx), clamp(r.top + r.height / 2, R.t + ry, R.b - ry)];
        if (!S.orb.dir) S.orb.dir = orbitDir(cc);
        var ot = orbit(cc, rx, ry, S.orb.dir, L);
        orbitAcc(S.orb, ot.th, ot.d);
        if (Math.abs(S.orb.acc) > TAU - 0.2) { S.mode = 'settle'; S.coolT = now + 3; }
        else return { x: ot.x, y: ot.y, v: clamp(PI * (rx + ry) / 4.5 / L, 1.4, 4), acc: 3, R: R };
      }
    }
    if (S.mode === 'dive') {
      if (dist(S.wp, [hx(), hy()]) < 0.7 * L || age > 3.5) S.mode = 'settle';
      else return { x: S.wp[0], y: S.wp[1], v: 1, acc: 2, R: R };
    }
    if (dA > 0.9 * L) {
      return { x: A[0], y: A[1], v: clamp(0.8 + dA / L * 0.6, 0.8, 3.4), acc: 2.5, hold: dA > 2 * L ? Math.min(3, (dA / L - 2) * 0.8) : 0, aim: A, R: R };
    }
    var lk = WT && WT.look(), lh = c[0] < W / 2 ? 0 : PI;
    if (lk) lh = Math.atan2(lk.y - c[1], lk.x - c[0]);
    var side = Math.abs(Math.cos(lh)) < 0.2 ? (S.right ? 0 : PI) : (Math.cos(lh) > 0 ? 0 : PI);
    lh = side + clamp(wrap(lh - side), -0.9, 0.9) + 0.12 * Math.sin(T * 0.5);
    return { look: lh, v: 0.32, acc: 1.5, hold: 1.4, aim: [A[0] + 0.15 * L * Math.sin(T * 0.31), A[1] + 0.1 * L * Math.sin(T * 0.47)], R: R };
  }

  // 掉头时不原地镜像：取经过下方（靠下时经过上方）的那一侧，走一段弧
  function chooseTurn(R) {
    var via = R && hy() > (R.t + R.b) / 2 ? -PI / 2 : PI / 2;
    return wrap(via - S.h) >= 0 ? 1 : -1;
  }

  // o: x y 落点 · L 身长像素 · fx 初始朝向 · T dt now 秒 · home 首页信息 · vis 透明度
  function update(o) {
    var dt = clamp(o.dt, 0.001, 0.05), T = o.T, L = o.L;
    var reset = S.last < 0 || T - S.last > 0.5 || T < S.last;
    if (!reset) {
      var c0 = mid(L);
      if (Math.hypot(c0[0] - o.x, c0[1] - o.y) > Math.hypot(window.innerWidth, window.innerHeight) * 1.1) reset = true;
    }
    if (reset) {
      S.right = o.fx >= 0; S.h = S.right ? 0 : PI; S.roll = S.hr = S.right ? BANK0 : PI - BANK0;
      S.x = o.x + Math.cos(S.h) * 0.5 * L; S.y = o.y; S.z = 0; S.cx = S.cy = 0;
      S.e = 0; S.w = 0; S.v = 0.5 * L; S.mode = ''; S.orb = null; S.wp = null; S.flee = 0; S.turn = 0;
      TR.reset(S.x, S.y, 0, Math.cos(S.h), Math.sin(S.h), 0, S.roll, L);
    }
    S.last = T;

    var g = o.home ? homeGoal(o.home, T, L) : showGoal(o, T, L, o.now);
    var px = hx(), py = hy(), R = g.R;
    var hd = g.look != null ? g.look : Math.atan2(g.y - py, g.x - px);
    if (R) {
      var m = 0.25 * L;
      var ix = px < R.l - m ? 1 : px > R.r + m ? -1 : 0, iy = py < R.t - m ? 1 : py > R.b + m ? -1 : 0;
      if (ix || iy) hd = Math.atan2(Math.sin(hd) + 1.6 * iy, Math.cos(hd) + 1.6 * ix);
    }
    var err = wrap(hd - S.h);
    if (Math.abs(err) > 2.3) { if (!S.turn) S.turn = chooseTurn(R); err = S.turn * Math.abs(err); }
    else S.turn = 0;

    // 转弯半径不小于三分之一身长，所以路线总是弧
    var wmax = Math.min(3.6, Math.max(0.7, S.v / (0.33 * L)));
    S.w += (clamp(err * 2.6, -wmax, wmax) - S.w) * ex(6, dt);
    S.h += S.w * dt;
    S.v += (g.v * L - S.v) * ex(g.acc || 2, dt);
    // 急转时身体朝镜头扭过来，之后回到画面里
    var et = clamp(clamp(Math.abs(S.w) / 2.4, 0, 1) * 0.65 - S.z / (1.2 * L), -0.8, 0.8);
    S.e += (et - S.e) * ex(2.5, dt);
    var ce = Math.cos(S.e);
    S.x += Math.cos(S.h) * ce * S.v * dt;
    S.y += Math.sin(S.h) * ce * S.v * dt;
    S.z += Math.sin(S.e) * S.v * dt;
    if (g.hold && g.aim) {
      var c = mid(L), k = ex(g.hold, dt);
      S.cx += (g.aim[0] - c[0]) * k; S.cy += (g.aim[1] - c[1]) * k;
    }

    // 朝向越过竖直方向就翻身，让背重新朝上；翻滚角记进游迹，从头传到尾
    var ch = Math.cos(S.h);
    if (S.right && ch < -0.3) S.right = false;
    else if (!S.right && ch > 0.3) S.right = true;
    var dr = (S.right ? BANK0 : PI - BANK0) - S.roll;
    S.roll += clamp(dr * ex(3.2, dt), -4 * dt, 4 * dt);
    S.hr = S.roll + clamp(S.w * 0.22, -0.5, 0.5);
    TR.step(S.x, S.y, S.z, S.hr, L);

    var sp = S.v / L;
    S.ph += dt * (2.2 + 2.6 * Math.min(3, sp));
    S.amp += (0.045 + 0.022 * Math.min(2.2, sp) + (g.boost || 0) - S.amp) * ex(3, dt);
  }

  window.KUN_SWIM = { state: S, update: update, BANK0: BANK0 };
})();
