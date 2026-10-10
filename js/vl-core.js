// 视觉语言共用工具：人文 = 灰色水墨，机器 = 克莱因蓝细线
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, cls, anchor) {
    var t = svg('text', { x: x, y: y, 'class': cls || 'm-t', 'text-anchor': anchor || 'start' }, parent);
    t.textContent = str;
    return t;
  }

  function chars(str) { return str.replace(/\s/g, '').split(''); }
  // 每个字取 UTF-16 码位，16 bit，高位在前
  function bits(str) {
    var cs = chars(str), out = new Uint8Array(cs.length * 16);
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i].charCodeAt(0);
      for (var b = 0; b < 16; b++) out[i * 16 + b] = (c >> (15 - b)) & 1;
    }
    return out;
  }
  function code(ch) { return 'U+' + ch.charCodeAt(0).toString(16).toUpperCase(); }
  function bin16(ch) {
    var s = ch.charCodeAt(0).toString(2);
    while (s.length < 16) s = '0' + s;
    return s.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
  function bin6(n) { var s = n.toString(2); while (s.length < 6) s = '0' + s; return s; }

  function hash(x, y, seed) {
    var h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return h - Math.floor(h);
  }
  // 平滑值噪声，size 为格距（px）
  function noise(seed, size) {
    return function (x, y) {
      x /= size; y /= size;
      var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var a = hash(i, j, seed), b = hash(i + 1, j, seed), c = hash(i, j + 1, seed), d = hash(i + 1, j + 1, seed);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  // 图片在自身盒子里的缩放与偏移（object-fit: cover 居中；比例一致时等同普通缩放）
  function fit(img) {
    var r = img.getBoundingClientRect(), nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
    var s = Math.max(r.width / nw, r.height / nh);
    return { s: s, ox: (r.width - nw * s) / 2, oy: (r.height - nh * s) / 2, rect: r, nw: nw, nh: nh };
  }

  // 墨色密度网格（0 = 纸，1 = 最浓的墨）。本地 file:// 打开时画布会被污染，返回 null
  function inkGrid(img, sx, sy, sw, sh, cols, rows) {
    try {
      var c = document.createElement('canvas');
      c.width = cols; c.height = rows;
      var x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
      var d = x.getImageData(0, 0, cols, rows).data, n = cols * rows, out = new Float32Array(n);
      var lo = 1, hi = 0, i;
      for (i = 0; i < n; i++) {
        var v = 1 - (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
        out[i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
      var span = Math.max(0.05, hi - lo);
      for (i = 0; i < n; i++) out[i] = (out[i] - lo) / span;
      return out;
    } catch (e) { return null; }
  }
  // 取样失败时，用噪声模拟一张"墨色"分布
  function fakeInk(cols, rows, seed) {
    var n1 = noise(seed, 7), n2 = noise(seed + 9, 2.5), out = new Float32Array(cols * rows);
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      out[y * cols + x] = Math.max(0, Math.min(1, n1(x, y) * 0.8 + n2(x, y) * 0.35 - 0.1));
    }
    return out;
  }
  function percentile(arr, q) {
    var a = Array.prototype.slice.call(arr).sort(function (p, r) { return p - r; });
    return a[Math.floor(a.length * q)] || 0;
  }

  function isDark(el) {
    var c = el.closest('.dark, .light');
    return !c || c.classList.contains('dark');
  }
  function ready(img, fn) {
    if (img.complete && img.naturalWidth) fn();
    else img.addEventListener('load', fn, { once: true });
  }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms || 160); };
  }
  // 线条进入视野后描画一次
  function reveal(el, threshold) {
    if (window.BM) BM.onceVisible(el, function (t) { t.classList.add('in'); }, threshold == null ? 0.2 : threshold);
    else el.classList.add('in');
  }

  // 六爻：自下而上，阳爻 = 1；n 的最高位在初爻
  function hexagram(parent, n, x, y, w, gap, cls) {
    var d = '', seg = w * 0.42;
    for (var k = 0; k < 6; k++) {
      var yy = y + (5 - k) * gap, yang = (n >> (5 - k)) & 1;
      d += yang ? 'M' + x + ' ' + yy + 'h' + w : 'M' + x + ' ' + yy + 'h' + seg + 'M' + (x + w - seg) + ' ' + yy + 'h' + seg;
    }
    return svg('path', { d: d, 'class': cls || 'm-hex' }, parent);
  }

  window.VL = {
    svg: svg, text: text, chars: chars, bits: bits, code: code, bin16: bin16, bin6: bin6,
    noise: noise, rng: rng, hash: hash, smooth: smooth, fit: fit, inkGrid: inkGrid, fakeInk: fakeInk,
    percentile: percentile, isDark: isDark, ready: ready, debounce: debounce, reveal: reveal, hexagram: hexagram,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
})();
