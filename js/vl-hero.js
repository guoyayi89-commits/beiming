// 首屏：纵深山水视差；中景尖峰的扫描框内，水墨按列溶解，化作竖向细线上升
(function () {
  'use strict';
  var hero = document.getElementById('hero');
  var mid = document.getElementById('heroMid');
  var box = document.getElementById('heroScan');
  var cv = document.getElementById('heroLines');
  if (!hero || !mid || !box || !cv || !window.VL) return;

  // ---------- 视差：远慢近快 ----------
  var layers = Array.prototype.map.call(hero.querySelectorAll('[data-speed]'), function (el) {
    return { el: el, k: 1 - parseFloat(el.getAttribute('data-speed')) };
  });
  var ticking = false;
  function parallax() {
    ticking = false;
    var s = Math.max(0, -hero.getBoundingClientRect().top);
    if (s > hero.offsetHeight * 1.2) return;
    layers.forEach(function (l) { l.el.style.transform = 'translate3d(0,' + (s * l.k).toFixed(1) + 'px,0)'; });
  }
  if (!VL.reduced) {
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
    }, { passive: true });
    parallax();
  }

  // ---------- 溶解：框内按列切开，前沿参差，前沿上方留几缕墨丝 ----------
  var ctx = cv.getContext('2d'), dpr = 1;
  var bx, by, bw, bh, colW, cut = [], segs = [], src = null;
  var BLUE = '61,107,255';

  function geometry() {
    bx = box.offsetLeft + box.clientLeft; by = box.offsetTop + box.clientTop;
    bw = box.clientWidth; bh = box.clientHeight;
    var n = Math.max(6, Math.floor(bw / 3)), n1 = VL.noise(5, 5), r = VL.rng(23);
    colW = bw / n; cut = [];
    for (var i = 0; i < n; i++) {
      var c = 0.6 + (n1(i, 0) - 0.5) * 0.3 + (r() - 0.5) * 0.08;
      cut.push(bh * Math.max(0.34, Math.min(0.86, c)));
    }
  }

  function buildMask() {
    var iw = Math.round(mid.offsetWidth), ih = Math.round(mid.offsetHeight);
    if (iw < 4 || ih < 4) return;
    var c = document.createElement('canvas'); c.width = iw; c.height = ih;
    var x = c.getContext('2d'), r = VL.rng(41);
    x.fillStyle = '#000'; x.fillRect(0, 0, iw, ih);
    x.clearRect(bx, by, bw, bh);
    cut.forEach(function (cy, i) {
      var X = bx + i * colW, Y = by + cy;
      var g = x.createLinearGradient(0, Y - 16, 0, Y + 6);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000');
      x.fillStyle = g; x.fillRect(X, Y - 16, colW + 0.4, by + bh - Y + 16);
      if (r() < 0.45) {
        var len = bh * (0.04 + r() * 0.18);
        x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(X + r() * (colW - 1), Y - len, 1, len);
      }
    });
    var url = 'url(' + c.toDataURL() + ')';
    mid.style.webkitMaskImage = url; mid.style.maskImage = url;
    mid.style.webkitMaskSize = mid.style.maskSize = '100% 100%';
  }

  // 每列取前沿下方几行墨色，竖向拉伸到框顶：这一列有墨，才有线升起
  function buildSource() {
    var sc = mid.naturalWidth / mid.offsetWidth;
    src = document.createElement('canvas');
    src.width = Math.ceil(bw * dpr); src.height = Math.ceil(bh * dpr);
    var a = src.getContext('2d');
    a.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var pass = 0; pass < 2; pass++) {
      cut.forEach(function (cy, i) {
        var X = i * colW;
        a.drawImage(mid, (bx + X) * sc, (by + cy + 1) * sc, colW * sc, 6 * sc, X, 0, colW, cy + 2);
      });
    }
  }

  function spawn(s, init) {
    var i = Math.floor(Math.random() * cut.length);
    s.i = i;
    s.x = i * colW + Math.random() * Math.max(0, colW - 1);
    s.len = 10 + Math.random() * 46;
    s.v = 12 + Math.random() * 30;
    s.y = init ? Math.random() * cut[i] : cut[i];
  }
  function seed() {
    segs = [];
    for (var k = 0, n = cut.length * 4; k < n; k++) { var s = {}; spawn(s, true); segs.push(s); }
  }

  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, bw, bh);
    ctx.fillStyle = '#fff';
    for (var k = 0; k < segs.length; k++) {
      var s = segs[k], front = cut[s.i];
      s.y -= s.v * dt;
      if (s.y + s.len < 0) spawn(s, false);
      var h = Math.min(s.len, front - s.y);
      if (h <= 0) continue;
      ctx.globalAlpha = VL.smooth(0, bh * 0.2, s.y) * VL.smooth(front, front - 18, s.y);
      ctx.fillRect(s.x, s.y, 1, h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(src, 0, 0, bw, bh);
    // 升得越高越蓝：水墨 → 机器
    ctx.globalCompositeOperation = 'source-atop';
    var g = ctx.createLinearGradient(0, bh * 0.62, 0, bh * 0.22);
    g.addColorStop(0, 'rgba(' + BLUE + ',0)');
    g.addColorStop(1, 'rgba(' + BLUE + ',.95)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, bw, bh);
    ctx.globalCompositeOperation = 'source-over';
  }

  var running = false, last = 0;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    draw(dt);
  }

  function setup() {
    geometry();
    if (bw < 4 || bh < 4) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.ceil(bw * dpr); cv.height = Math.ceil(bh * dpr);
    buildMask();
    buildSource();
    seed();
    draw(0);
    box.classList.add('on');
  }

  VL.ready(mid, function () {
    setup();
    window.addEventListener('resize', VL.debounce(function () { setup(); if (!VL.reduced) parallax(); }, 200));
    if (VL.reduced) return;
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      if (vis && !running) { running = true; last = 0; requestAnimationFrame(frame); }
      else if (!vis) running = false;
    }).observe(hero);
  });
})();
