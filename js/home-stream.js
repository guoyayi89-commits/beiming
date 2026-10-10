(function () {
  'use strict';
  var home = document.getElementById('home');
  var cv = document.getElementById('homeStream');
  var moon = document.getElementById('homeMoon');
  if (!home || !cv || !moon || !window.TEXTS) return;

  var ctx = cv.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 按句读断开，标点本身不落下
  var phrases = TEXTS.xiaoyao.text.split(/[\s，。；：？！、「」『』“”‘’《》（）]+/)
    .filter(Boolean).map(function (p) { return Array.from(p); });

  var W = 0, H = 0, cx = 0, cy = 0, R = 0, waterY = 0, oy = 0, span = 0, narrow = false;
  var cols = [], ripples = [], running = false, last = 0;
  var G = 12, gw = 0, gh = 0, cnt = null, sumX = null, kunOn = false;
  var mouse = { x: 0, y: 0, in: false, v: 0, t: 0 };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function hex(ch) { return 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'); }
  // 字从月亮下缘出现；月亮两侧的列从屏幕顶端落下
  var titleBox = null;
  function topAt(x) {
    var dx = Math.abs(x - cx);
    var y = dx < R ? cy + Math.sqrt(R * R - dx * dx) : (narrow ? H * 0.2 : H * 0.03);
    // 标题正下方的列，从标题下沿开始
    if (titleBox && x < titleBox.right + 14) y = Math.max(y, titleBox.bottom + 14);
    return y;
  }
  function gap(c) { return c.step * rnd(3, 8); }

  // 每列从下往上逐句倒着取，于是任何时刻整列从上往下读都是顺的
  function group(c, bottom) {
    var p = phrases[c.idx];
    c.idx = (c.idx - 1 + phrases.length) % phrases.length;
    var g = { y: bottom - p.length * c.step, chars: p.map(function (ch) {
      return { ch: ch, code: hex(ch), off: 0, hot: 0, gone: false };
    }) };
    c.groups.push(g);
    return g;
  }

  function layout() {
    var cr = cv.getBoundingClientRect(), mr = moon.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cr.width; H = cr.height; narrow = W < 720;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = mr.left + mr.width / 2 - cr.left;
    cy = mr.top + mr.height / 2 - cr.top;
    R = mr.width * 0.485;
    var tt = home.querySelector('.home-title');
    if (tt) {
      var tr = tt.getBoundingClientRect();
      titleBox = { right: tr.right - cr.left, bottom: tr.bottom - cr.top };
    }
    waterY = H * (narrow ? 0.8 : 0.86);
    span = Math.min(W * 0.9, R * (narrow ? 2.5 : 2.5));
    gw = Math.ceil(W / G) + 1; gh = Math.ceil(H / G) + 1;
    cnt = new Uint16Array(gw * gh); sumX = new Float32Array(gw * gh);
    build();
  }

  function build() {
    cols = []; ripples = [];
    var n = Math.max(10, Math.round(span / (narrow ? 19 : 27)));
    var start = Math.floor(Math.random() * phrases.length);
    for (var i = 0; i < n; i++) {
      var d = Math.random(), x = cx - span / 2 + (i + 0.5) * span / n + rnd(-4, 4);
      var size = Math.round((narrow ? 9 : 10) + (narrow ? 10 : 15) * d);
      var c = {
        x: x, d: d, size: size, step: size * 1.18, top: topAt(x),
        alpha: 0.16 + 0.74 * Math.pow(d, 1.3),
        speed: reduced ? 0 : (18 + 58 * d) * rnd(0.7, 1.3),
        idx: (start + i * 13) % phrases.length, groups: []
      };
      c.font = (d > 0.72 ? 700 : 400) + ' ' + size + 'px "Noto Serif SC","Songti SC","SimSun",serif';
      var y = waterY - rnd(0, c.step * 10);
      while (y > c.top - c.step * 9) { var g = group(c, y); y = g.y - gap(c); }
      cols.push(c);
    }
  }

  // 把鲲的点阵落到网格里，字据此判断要不要让开
  function field() {
    kunOn = false;
    if (!window.KUN || !KUN.field) return;
    var f = KUN.field();
    if (f.alpha < 0.05) return;
    cnt.fill(0); sumX.fill(0);
    for (var i = 0; i < f.n; i++) {
      var x = f.pts[i * 2], y = f.pts[i * 2 + 1] - oy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      var k = Math.floor(y / G) * gw + Math.floor(x / G);
      cnt[k]++; sumX[k] += x;
    }
    kunOn = true;
  }

  function near(x, y) {
    var ix = Math.floor(x / G), iy = Math.floor(y / G), n = 0, sx = 0;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var gx = ix + dx, gy = iy + dy;
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
      var k = gy * gw + gx;
      n += cnt[k]; sx += sumX[k];
    }
    return n ? { n: n, ax: sx / n } : null;
  }

  // 鲲经过只拨开字；鼠标碰到的字才变蓝
  function touch(ch, c, y, dt) {
    var t = kunOn ? near(c.x, y) : null;
    if (t && t.n >= 3) {
      var dir = c.x >= t.ax ? 1 : -1, target = dir * Math.min(1, t.n / 6) * c.size * 1.6;
      ch.off += (target - ch.off) * Math.min(1, dt * 8);
    } else {
      ch.off += -ch.off * Math.min(1, dt * 2.2);
    }
    if (mouse.in && Math.abs(c.x + ch.off - mouse.x) < c.size * 0.75 && Math.abs(y - mouse.y) < c.size * 0.7) ch.hot = 1;
    else ch.hot = Math.max(0, ch.hot - dt * 0.5);
  }

  function ripple(x, c) {
    if (reduced) return;
    ripples.push({ x: x, t: 0, max: c.size * rnd(1.4, 2.6), a: c.alpha * 0.7 });
    if (ripples.length > 200) ripples.shift();
  }

  // 告诉鲲它的水域（月下到水面之间）和鼠标；怎么游由 kun-swim.js 决定
  function steer(dt) {
    if (!window.KUN || !KUN.steer) return;
    var cr = cv.getBoundingClientRect();
    mouse.v *= Math.exp(-dt * 6);
    KUN.steer({
      area: { l: cr.left + W * 0.04, r: cr.left + W * 0.96, t: oy + Math.max(cy + R * 0.2, H * 0.12), b: oy + waterY - H * 0.02 },
      mouse: { x: cr.left + mouse.x, y: oy + mouse.y, in: mouse.in, v: mouse.v }
    });
  }

  function color(h) {
    return Math.round(241 - 180 * h) + ',' + Math.round(240 - 133 * h) + ',' + Math.round(236 + 19 * h);
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    oy = cv.getBoundingClientRect().top;
    steer(dt);
    field();
    ctx.clearRect(0, 0, W, H);
    if (window.HOME_WATER) HOME_WATER.draw(ctx, W, H, waterY, cx, R, now / 1000, reduced);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var labels = [];

    for (var ci = 0; ci < cols.length; ci++) {
      var c = cols[ci], top = null;
      ctx.font = c.font;
      for (var gi = c.groups.length - 1; gi >= 0; gi--) {
        var g = c.groups[gi], alive = false;
        g.y += c.speed * dt;
        if (!top || g.y < top.y) top = g;
        for (var k = 0; k < g.chars.length; k++) {
          var ch = g.chars[k];
          if (ch.gone) continue;
          var y = g.y + (k + 0.5) * c.step;
          if (y > waterY) { ch.gone = true; ripple(c.x + ch.off, c); continue; }
          alive = true;
          if (y < c.top - c.size * 0.5) continue;
          touch(ch, c, y, dt);
          var h = ch.hot, a = c.alpha + (1 - c.alpha) * h;
          a *= Math.min(1, (y - c.top) / (c.step * 1.5) + 0.35);
          a *= Math.min(1, (waterY - y) / (c.step * 3));
          ctx.fillStyle = 'rgba(' + color(h) + ',' + Math.max(0, a).toFixed(3) + ')';
          ctx.fillText(ch.ch, c.x + ch.off, y);
          if (h > 0.5 && labels.length < 4) labels.push([ch.ch + ' ' + ch.code, c.x + ch.off + c.size * 0.9, y, h]);
        }
        if (!alive && g.y > c.top) c.groups.splice(gi, 1);
      }
      if (!top || top.y > c.top - c.step * 9) group(c, (top ? top.y : c.top) - gap(c));
    }

    if (labels.length) {
      ctx.font = '400 12px "IBM Plex Mono", "Noto Sans SC", Consolas, monospace';
      ctx.textAlign = 'left';
      labels.forEach(function (l) {
        ctx.fillStyle = 'rgba(61,107,255,' + Math.min(1, l[3] * 1.2).toFixed(3) + ')';
        ctx.fillText(l[0], l[1], l[2]);
      });
    }

    ctx.lineWidth = 1;
    for (var i = ripples.length - 1; i >= 0; i--) {
      var r = ripples[i];
      r.t += dt;
      var u = r.t / 1.8;
      if (u >= 1) { ripples.splice(i, 1); continue; }
      var rad = r.max * Math.pow(u, 0.5);
      ctx.strokeStyle = 'rgba(241,240,236,' + (r.a * (1 - u)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(r.x, waterY + 1, rad, rad * 0.16, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (u > 0.2) {
        ctx.beginPath();
        ctx.ellipse(r.x, waterY + 1, rad * 0.6, rad * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function start() {
    if (running) return;
    running = true; last = 0;
    requestAnimationFrame(frame);
  }

  home.addEventListener('pointermove', function (e) {
    var cr = cv.getBoundingClientRect(), x = e.clientX - cr.left, y = e.clientY - cr.top;
    var t = performance.now(), gap = (t - mouse.t) / 1000;
    if (mouse.in && gap > 0.004 && gap < 0.2) {
      var sp = Math.hypot(x - mouse.x, y - mouse.y) / gap;
      mouse.v = Math.max(mouse.v * 0.6, sp * 0.5 + mouse.v * 0.5);
    }
    mouse.t = t; mouse.x = x; mouse.y = y;
    mouse.in = y >= 0 && y < H;
  });
  home.addEventListener('pointerleave', function () { mouse.in = false; });

  layout();
  window.addEventListener('resize', layout);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) start();
      else { running = false; if (window.KUN && KUN.steer) KUN.steer(null); }
    }).observe(home);
  } else start();
})();
