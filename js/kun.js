(function () {
  'use strict';
  var F = window.KUN_FORMS, STORY = window.KUN_STORY, WH = window.KUN_WHALE;
  var cv = document.getElementById('kunCanvas');
  if (!F || !STORY || !WH || !cv) return;

  var N = F.N, ctx = cv.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, M = 1, dpr = 1;
  var cur = new Float32Array(N * 2);
  var drift = new Float32Array(N * 2), phase = new Float32Array(N), rr = new Float32Array(N);
  var keys = [];
  var t0 = performance.now();
  var lastClear = false;
  var vel = new Float32Array(N * 2), ptx = new Float32Array(N);
  var collapseEl = null, collapseT = 0;
  var lastNow = 0, fs = 1;
  var wp = new Float32Array(N * 2), wl = new Float32Array(N);
  // 首页：字流脚本每帧给出水域与鼠标（视口像素），鲸据此自己游
  var homeInfo = null, homeT = 0, lastAlpha = 0;
  // 按 60fps 定义的平滑系数，换算到实际帧间隔
  function ease(k) { return fs === 1 ? k : 1 - Math.pow(1 - k, fs); }

  for (var i = 0; i < N; i++) {
    var a = Math.random() * Math.PI * 2, m = 0.25 + Math.random() * 0.75;
    drift[i * 2] = Math.cos(a) * m;
    drift[i * 2 + 1] = Math.sin(a) * m - 0.35;
    phase[i] = Math.random() * 6.283;
    rr[i] = Math.random();
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight; M = Math.min(W, H);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 鲲从屏幕下方的"北冥"游上来
  function seed() {
    for (var i = 0; i < N; i++) {
      cur[i * 2] = W * (0.35 + Math.random() * 0.65);
      cur[i * 2 + 1] = H * (1.1 + Math.random() * 0.5);
    }
  }

  var INHERIT = ['f', 'x', 'y', 's', 'a', 'd', 'fx', 'tone', 'an', 'fit', 'fitK', 'wide'];

  function build() {
    var prev = { f: 'fish', x: 0.5, y: 0.5, s: 0.4, a: 1, d: 0, fx: 1, tone: 0, an: 'c', fit: null, fitK: 1, wide: false };
    var vh = window.innerHeight, list = [];
    STORY.forEach(function (k, idx) {
      var el = document.querySelector(k.sel);
      if (!el) return;
      var top = el.getBoundingClientRect().top + window.scrollY, h = el.offsetHeight;
      var pos = ('p' in k) ? top + k.p * Math.max(0, h - vh) : top + k.at * h - vh * (k.v == null ? 0.5 : k.v);
      var o = {};
      INHERIT.forEach(function (n) { o[n] = (n in k) ? k[n] : prev[n]; });
      if (!('fit' in k) && ('x' in k || 'y' in k || 's' in k)) o.fit = null;
      o.mx = k.mx; o.my = k.my; o.ms = k.ms; o.steer = !!k.steer;
      o.pos = Math.max(0, pos);
      o.idx = idx;
      list.push(o);
      prev = o;
    });
    list.sort(function (p, q) { return p.pos - q.pos || p.idx - q.idx; });
    keys = list;
  }

  function resolve(k) {
    var x = k.x, y = k.y, s = k.s, a = k.a;
    if (k.fit) {
      var el = document.querySelector(k.fit);
      if (el) {
        var r = el.getBoundingClientRect();
        x = (r.left + r.width / 2) / W; y = (r.top + r.height / 2) / H;
        s = Math.max(0.02, r.width / M * (k.fitK || 1));
      }
    }
    if (W < 860) {
      if (k.mx != null) x = k.mx;
      if (k.my != null) y = k.my;
      if (k.ms != null) s = k.ms;
    }
    // wide：s 表示占视口宽度的倍数
    if (k.wide) s = s * W / M;
    var fxv = k.fx;
    if (W < 860 && !k.fit && (x > 0.86 || x < 0.14)) {
      x = x > 0.5 ? 0.88 : 0.12; s *= 0.6; a *= 0.45;
    }
    var anc = F.forms[k.f].anchors[k.an] || F.forms[k.f].anchors.c;
    return { x: x, y: y, s: Math.max(0.01, s), a: a, d: k.d, fx: fxv, tone: k.tone, ax: anc[0], ay: anc[1], eye: k.an === 'eye' ? 1 : 0 };
  }

  function smooth(t) { return t * t * (3 - 2 * t); }
  function lerp(p, q, t) { return p + (q - p) * t; }

  function sample() {
    var y = window.scrollY, n = keys.length;
    if (!n) return null;
    if (y <= keys[0].pos) return { A: keys[0], B: keys[0], t: 0 };
    if (y >= keys[n - 1].pos) return { A: keys[n - 1], B: keys[n - 1], t: 0 };
    for (var i = 0; i < n - 1; i++) {
      if (y < keys[i + 1].pos) {
        var span = keys[i + 1].pos - keys[i].pos;
        return { A: keys[i], B: keys[i + 1], t: span > 0 ? smooth((y - keys[i].pos) / span) : 1 };
      }
    }
    return { A: keys[n - 1], B: keys[n - 1], t: 0 };
  }

  // 每种形态自己的动态
  var ox = 0, oy = 0;
  function anim(form, i, T) {
    var x = form.pts[i * 2], y = form.pts[i * 2 + 1];
    if (!reduced) {
      switch (form.kind) {
        case 'bird': var f = Math.sin(T * 2.3), ax = Math.abs(x); y -= f * 0.55 * ax * ax; break;
        case 'butterfly': x = form.anchors.c[0] + (x - form.anchors.c[0]) * (0.25 + 0.75 * Math.abs(Math.cos(T * 4.2))); break;
        case 'question': y += Math.sin(T * 1.6) * 0.008; break;
        case 'ring': var c = Math.cos(T * 0.05), s = Math.sin(T * 0.05), nx = x * c - y * s; y = x * s + y * c; x = nx; break;
        case 'flank':
          x -= T * 0.014; x -= Math.floor(x + 0.5);
          y += Math.sin(6.283 * x + T * 0.5) * 0.005;
          break;
        case 'eye': var br = 1 + 0.025 * Math.sin(T * 0.7) * (Math.hypot(x, y) < 0.34 ? 1 : 0.2); x *= br; y *= br; break;
        case 'scatter': x += Math.sin(T * 0.4 + i) * 0.02; y += Math.cos(T * 0.37 + i * 1.3) * 0.02; break;
      }
    }
    ox = x; oy = y;
  }

  var BLUE_DARK = [61, 107, 255], BLUE_LIGHT = [0, 47, 167];

  function frame(now) {
    requestAnimationFrame(frame);
    fs = lastNow ? Math.min(4, Math.max(0.1, (now - lastNow) / 16.667)) : 1;
    lastNow = now;
    lastAlpha = 0;
    if (window.KUN_HOLD) { ctx.clearRect(0, 0, W, H); return; }
    if (collapseEl) { drawCollapse(now); return; }
    var st = sample();
    if (!st) return;
    var T = (now - t0) / 1000;
    var A = resolve(st.A), B = resolve(st.B), t = st.t;
    var fa = F.forms[st.A.f], fb = F.forms[st.B.f];
    var wB = st.A.f === st.B.f ? 0 : t;

    var x = lerp(A.x, B.x, t) * W, y = lerp(A.y, B.y, t) * H;
    var size = Math.exp(lerp(Math.log(A.s), Math.log(B.s), t)) * M;
    var alpha = lerp(A.a, B.a, t), d = lerp(A.d, B.d, t), fx = lerp(A.fx, B.fx, t);
    var tone = lerp(A.tone, B.tone, t), ax = lerp(A.ax, B.ax, t), ay = lerp(A.ay, B.ay, t);

    if (alpha < 0.01) {
      if (!lastClear) { ctx.clearRect(0, 0, W, H); lastClear = true; }
      return;
    }
    lastClear = false;
    lastAlpha = alpha;
    ctx.clearRect(0, 0, W, H);

    var col = BLUE_DARK.map(function (c, k) { return Math.round(lerp(c, BLUE_LIGHT[k], tone)); });
    var blue = 'rgb(' + col.join(',') + ')';
    var dot = Math.max(1.5, Math.min(2.8, size * 0.0045));
    var intro = reduced ? 1 : Math.min(1, (now - t0) / 3200);
    var spread = d * 0.9;
    var wrapping = fa.kind === 'flank' || fb.kind === 'flank';
    var wa = fa.kind === 'whale', wb = wB > 0 && fb.kind === 'whale';
    if (wa || wb) {
      var hw = lerp(st.A.steer ? 1 : 0, st.B.steer ? 1 : 0, t);
      var live = homeInfo && now - homeT < 300;
      WH.pose(wp, wl, {
        x: x, y: y, size: size, fx: fx, eye: lerp(A.eye, B.eye, t),
        T: T, dt: fs / 60, now: now / 1000, home: live && hw > 0.5 ? homeInfo : null,
        vis: alpha, reduced: reduced
      });
    }
    var lastFill = '';

    for (var i = 0; i < N; i++) {
      var tx, ty, lum = 1;
      if (wa) { tx = wp[i * 2]; ty = wp[i * 2 + 1]; lum = wl[i]; }
      else { anim(fa, i, T); tx = x + (ox - ax) * fx * size; ty = y + (oy - ay) * size; }
      if (wB > 0) {
        var bx, by, bl = 1;
        if (wb) { bx = wp[i * 2]; by = wp[i * 2 + 1]; bl = wl[i]; }
        else { anim(fb, i, T); bx = x + (ox - ax) * fx * size; by = y + (oy - ay) * size; }
        tx = lerp(tx, bx, wB); ty = lerp(ty, by, wB); lum = lerp(lum, bl, wB);
      }
      if (d > 0) {
        tx += spread * size * (drift[i * 2] * 0.5 + Math.sin(T * 0.6 + phase[i]) * 0.06);
        ty += spread * size * (drift[i * 2 + 1] * 0.5 + Math.cos(T * 0.5 + phase[i]) * 0.06);
      }
      // 鱼背纹理绕回时，点随目标一起跳到另一端，不横穿屏幕
      var jump = tx - ptx[i];
      ptx[i] = tx;
      if (wrapping && Math.abs(jump) > W * 0.5) cur[i * 2] += jump;
      var k = reduced ? 1 : ease(lerp(0.012 + 0.03 * rr[i], 0.22, intro));
      if (vel[i * 2] || vel[i * 2 + 1]) {
        cur[i * 2] += vel[i * 2] * fs; cur[i * 2 + 1] += vel[i * 2 + 1] * fs;
        var damp = Math.pow(0.93, fs);
        vel[i * 2] *= damp; vel[i * 2 + 1] *= damp;
        if (Math.abs(vel[i * 2]) + Math.abs(vel[i * 2 + 1]) < 0.05) vel[i * 2] = vel[i * 2 + 1] = 0;
      }
      cur[i * 2] += (tx - cur[i * 2]) * k;
      cur[i * 2 + 1] += (ty - cur[i * 2 + 1]) * k;

      var cx = cur[i * 2], cy = cur[i * 2 + 1];
      if (cx < -10 || cy < -10 || cx > W + 10 || cy > H + 10) continue;
      var vis = lerp(i < fa.n ? 1 : 0, i < fb.n ? 1 : 0, wB);
      if (vis < 0.02) continue;
      var accent = lerp(fa.acc[i], fb.acc[i], wB) > 0.5;
      ctx.globalAlpha = alpha * vis * lum * (1 - d * rr[i] * 0.85);
      var fill = accent ? '#e0301e' : blue;
      if (fill !== lastFill) { ctx.fillStyle = fill; lastFill = fill; }
      ctx.fillRect(cx - dot / 2, cy - dot / 2, dot, dot);
    }
    ctx.globalAlpha = 1;
  }

  // 终章：所有点汇成一横，然后熄灭
  function drawCollapse(now) {
    var r = collapseEl.getBoundingClientRect();
    var fade = Math.max(0, 1 - (now - collapseT - 2000) / 1200);
    ctx.clearRect(0, 0, W, H);
    if (fade <= 0) return;
    var dot = 2, k = reduced ? 1 : 0.035 + 0.04 * rr[0];
    ctx.fillStyle = 'rgb(' + BLUE_LIGHT.join(',') + ')';
    for (var i = 0; i < N; i++) {
      var tx = r.left + r.width * (0.08 + 0.84 * (i / N)), ty = r.top + r.height * (0.5 + (rr[i] - 0.5) * 0.06);
      var kk = reduced ? 1 : ease(k + 0.03 * rr[i]);
      cur[i * 2] += (tx - cur[i * 2]) * kk;
      cur[i * 2 + 1] += (ty - cur[i * 2 + 1]) * kk;
      ctx.globalAlpha = fade * (0.5 + 0.5 * rr[i]);
      ctx.fillRect(cur[i * 2] - dot / 2, cur[i * 2 + 1] - dot / 2, dot, dot);
    }
    ctx.globalAlpha = 1;
  }

  // 开屏：光标散成点阵
  function release(rect) {
    for (var i = 0; i < N; i++) {
      cur[i * 2] = rect.left + Math.random() * rect.width;
      cur[i * 2 + 1] = rect.top + Math.random() * Math.max(2, rect.height);
      var a = Math.random() * Math.PI * 2, sp = reduced ? 0 : 2 + Math.random() * 16;
      vel[i * 2] = Math.cos(a) * sp;
      vel[i * 2 + 1] = Math.sin(a) * sp * 0.6;
    }
    t0 = performance.now();
    window.KUN_HOLD = false;
  }

  function collapse(el) {
    collapseEl = el || null;
    collapseT = performance.now();
    if (!el) t0 = performance.now() - 1600;
  }

  resize();
  seed();
  build();
  window.addEventListener('resize', function () { resize(); build(); });
  window.addEventListener('load', build);
  if ('ResizeObserver' in window) new ResizeObserver(function () { build(); }).observe(document.body);
  requestAnimationFrame(frame);

  window.KUN = {
    rebuild: build, release: release, collapse: collapse,
    // info: { area: {l,t,r,b}, mouse: {x,y,in,v} }，视口像素；传 null 停止
    steer: function (info) { homeInfo = info || null; homeT = performance.now(); },
    field: function () { return { pts: cur, n: N, alpha: lastAlpha }; }
  };
})();
