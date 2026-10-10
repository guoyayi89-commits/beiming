// 机器看古画：细线框住局部，框内墨色溶解为点云或竖向数据流，数据是该章原文的二进制
// 用法：<div data-scan="chibi" data-scan-box="x y w h; …" data-scan-mode="cloud stream" data-scan-note="r l"><img></div>
// box 为相对宿主的比例；mode、note（标注在框的左/右）按框依次取用
(function () {
  'use strict';
  if (!window.VL || !window.TEXTS || !window.BM) return;
  var CELL = 4, GX = 11, GY = 10, DUR = 2600;
  var hosts = [];

  function make(tag, cls, parent) { var e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; }

  function setup(host, hi) {
    var img = host.querySelector('img'), T = TEXTS[host.dataset.scan];
    if (!img || !T || !host.dataset.scanBox) return;
    var H = { host: host, img: img, T: T, bits: VL.bits(T.text), n: VL.chars(T.text).length, frames: [], ok: false };
    var boxes = host.dataset.scanBox.split(';').map(function (s) { return s.trim().split(/\s+/).map(Number); });
    var modes = (host.dataset.scanMode || 'cloud').split(/\s+/);
    var notes = (host.dataset.scanNote || 'r').split(/\s+/);
    var tag = host.dataset.scanId || ('0' + (hi + 1)).slice(-2);
    host.classList.add('scan-host');
    if (!VL.isDark(host)) host.classList.add('scan-light');

    boxes.forEach(function (b, i) {
      var gh = make('i', 'scan-guide h', host), gv = make('i', 'scan-guide v', host);
      gh.style.top = b[1] * 100 + '%';
      gv.style.left = (b[0] + b[2]) * 100 + '%';
      var el = make('div', 'scan note-' + notes[i % notes.length], host);
      el.style.cssText = 'left:' + b[0] * 100 + '%;top:' + b[1] * 100 + '%;width:' + b[2] * 100 + '%;height:' + b[3] * 100 + '%';
      var F = {
        el: el, cv: make('canvas', 'scan-cv', el), bar: make('i', 'scan-bar', el), note: make('div', 'scan-note mono', el),
        mode: modes[i % modes.length], id: 'SCAN ' + tag + '·' + 'ABCDEF'.charAt(i), seed: hi * 10 + i + 1,
        state: 0, p: 0, lastMask: 0
      };
      F.mask = document.createElement('canvas');
      H.frames.push(F);
    });
    hosts.push(H);
    VL.ready(img, function () { H.ok = true; layout(H); });
  }

  function layout(H) {
    var ir = H.img.getBoundingClientRect(), f = VL.fit(H.img);
    if (ir.width < 2) return;
    H.frames.forEach(function (F) {
      var fr = F.el.getBoundingClientRect();
      F.x = Math.round(fr.left - ir.left); F.y = Math.round(fr.top - ir.top);
      F.w = Math.max(8, Math.round(fr.width)); F.h = Math.max(8, Math.round(fr.height));
      F.cols = Math.ceil(F.w / CELL); F.rows = Math.ceil(F.h / CELL);
      var sx = (F.x - f.ox) / f.s, sy = (F.y - f.oy) / f.s, sw = F.w / f.s, sh = F.h / f.s;
      var ink = VL.inkGrid(H.img, sx, sy, sw, sh, F.cols, F.rows) || VL.fakeInk(F.cols, F.rows, F.seed);
      var thr = VL.percentile(ink, 0.5), nz = VL.noise(F.seed, 6), r = VL.rng(F.seed), cnt = 0;
      F.gone = new Uint8Array(F.cols * F.rows);
      for (var j = 0; j < F.rows; j++) for (var i = 0; i < F.cols; i++) {
        var fx = (i + 0.5) / F.cols, fy = (j + 0.5) / F.rows, k = j * F.cols + i;
        var pr = F.mode === 'stream' ? 1.08 - fy : 1 - Math.hypot(fx - 0.5, fy - 0.5) * 1.5;
        if (ink[k] > thr && pr + (nz(i, j) - 0.5) * 0.6 + (r() - 0.5) * 0.2 > 0.35) { F.gone[k] = 1; cnt++; }
      }
      F.ratio = cnt / F.gone.length;
      F.mask.width = F.w; F.mask.height = F.h;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      F.dpr = dpr; F.cv.width = F.w * dpr; F.cv.height = F.h * dpr;
      F.note.innerHTML = '<b>' + F.id + '</b><span>x ' + Math.round(sx) + ' · y ' + Math.round(sy) + '</span>' +
        '<span>' + Math.round(sw) + ' × ' + Math.round(sh) + ' px</span>' +
        '<span>' + H.T.title.replace(/^.*?(《.*》).*$/, '$1') + ' ' + H.n + ' 字 · ' + H.bits.length + ' bit</span>' +
        '<span class="scan-pct">ink → bit　<em>0</em>%</span>';
      F.pct = F.note.querySelector('em');
      if (F.state > 0) { drawMask(F); applyMask(H); paint(H, F); }
    });
  }

  function scanned(F, j) {
    return F.mode === 'stream' ? j >= F.rows * (1 - F.p) : j < F.rows * F.p;
  }

  function drawMask(F) {
    var x = F.mask.getContext('2d');
    x.clearRect(0, 0, F.w, F.h);
    x.fillStyle = '#000';
    for (var j = 0; j < F.rows; j++) {
      if (!scanned(F, j)) continue;
      for (var i = 0; i < F.cols; i++) if (F.gone[j * F.cols + i]) x.fillRect(i * CELL, j * CELL, CELL, CELL);
    }
    F.url = F.mask.toDataURL();
  }

  // 框内的掩膜与整张图做异或：框里被选中的格子挖空，其余照常显示
  function applyMask(H) {
    var im = [], pos = [], size = [];
    H.frames.forEach(function (F) {
      if (!F.url) return;
      im.push('url(' + F.url + ')'); pos.push(F.x + 'px ' + F.y + 'px'); size.push(F.w + 'px ' + F.h + 'px');
    });
    if (!im.length) return;
    im.push('linear-gradient(#000,#000)'); pos.push('0 0'); size.push('100% 100%');
    var s = H.img.style;
    s.webkitMaskImage = im.join(','); s.webkitMaskPosition = pos.join(','); s.webkitMaskSize = size.join(',');
    s.webkitMaskRepeat = 'no-repeat'; s.webkitMaskComposite = im.map(function () { return 'xor'; }).join(',');
    s.maskImage = im.join(','); s.maskPosition = pos.join(','); s.maskSize = size.join(',');
    s.maskRepeat = 'no-repeat'; s.maskComposite = 'exclude';
  }

  function paint(H, F) {
    var x = F.cv.getContext('2d'), B = H.bits, n = B.length, k = 0;
    x.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
    x.clearRect(0, 0, F.w, F.h);
    x.fillStyle = x.strokeStyle = H.host.classList.contains('scan-light') ? '#002fa7' : '#3d6bff';
    if (F.mode === 'cloud') {
      for (var j = 0; j < F.rows; j++) {
        if (!scanned(F, j)) continue;
        for (var i = 0; i < F.cols; i++) {
          if (!F.gone[j * F.cols + i]) continue;
          var b = B[k++ % n], s = b ? 2.4 : 1.2;
          var jx = (VL.hash(i, j, F.seed) - 0.5) * 2, jy = (VL.hash(j, i, F.seed) - 0.5) * 2;
          x.globalAlpha = b ? 0.95 : 0.55;
          x.fillRect(i * CELL + CELL / 2 - s / 2 + jx, j * CELL + CELL / 2 - s / 2 + jy, s, s);
        }
      }
    } else {
      // 竖排，自右向左读，与古籍同序
      var gc = Math.floor(F.w / GX), gr = Math.floor(F.h / GY);
      x.font = '500 8.5px "IBM Plex Mono", Consolas, monospace';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      for (var c = gc - 1; c >= 0; c--) {
        var cx = c * GX + GX / 2 + (F.w - gc * GX) / 2, y0 = -1, y1 = -1;
        for (var r = 0; r < gr; r++) {
          var cy = r * GY + GY / 2, ci = Math.floor(cx / CELL), cj = Math.floor(cy / CELL);
          if (!scanned(F, cj) || !F.gone[cj * F.cols + ci]) continue;
          var bit = B[k++ % n];
          x.globalAlpha = bit ? 1 : 0.42;
          x.fillText(bit ? '1' : '0', cx, cy);
          if (y0 < 0) y0 = cy; y1 = cy;
        }
        if (y1 - y0 > GY * 2) {
          x.globalAlpha = 0.22; x.lineWidth = 1;
          x.beginPath(); x.moveTo(cx + GX / 2 - 0.5, y0 - 4); x.lineTo(cx + GX / 2 - 0.5, y1 + 4); x.stroke();
        }
      }
    }
    x.globalAlpha = 1;
    F.bar.style.top = (F.mode === 'stream' ? 1 - F.p : F.p) * 100 + '%';
    F.pct.textContent = Math.round(F.ratio * F.p * 100);
  }

  function run(H, F) {
    F.state = 1;
    F.el.classList.add('on');
    var ts = performance.now();
    (function step(now) {
      var t = VL.reduced ? 1 : Math.min(1, (now - ts) / DUR);
      F.p = 1 - Math.pow(1 - t, 2);
      if (t === 1 || now - F.lastMask > 90) { F.lastMask = now; drawMask(F); applyMask(H); }
      paint(H, F);
      if (t < 1) requestAnimationFrame(step);
      else { F.state = 2; F.el.classList.add('done'); }
    })(ts);
  }

  function check() {
    var vw = window.innerWidth, vh = window.innerHeight;
    hosts.forEach(function (H) {
      if (!H.ok) return;
      H.frames.forEach(function (F) {
        if (F.state) return;
        var r = F.el.getBoundingClientRect();
        if (r.left < vw * 0.85 && r.right > vw * 0.15 && r.top < vh * 0.82 && r.bottom > vh * 0.18) run(H, F);
      });
    });
  }

  document.querySelectorAll('[data-scan]').forEach(setup);
  BM.onScroll(check);
  window.addEventListener('resize', VL.debounce(function () { hosts.forEach(function (H) { if (H.ok) layout(H); }); }, 200));
  window.VL_SCAN = { relayout: function () { hosts.forEach(function (H) { if (H.ok) layout(H); }); } };
})();
