(function () {
  'use strict';

  function words(text) {
    if (window.Intl && Intl.Segmenter) {
      var seg = new Intl.Segmenter('zh', { granularity: 'word' });
      return Array.from(seg.segment(text)).map(function (s) { return s.segment; })
        .filter(function (s) { return s.trim(); });
    }
    var out = [], cs = chars(text);
    for (var i = 0; i < cs.length; i += 2) out.push(cs.slice(i, i + 2).join(''));
    return out;
  }

  function chars(text) {
    return Array.from(text).filter(function (c) { return c.trim(); });
  }

  // 把一个字画到画布上，按连通区域切成"笔画"
  function parts(ch, size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    g.fillStyle = '#000';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 ' + Math.round(size * 0.84) + 'px "Noto Serif SC","Songti SC","SimSun",serif';
    g.fillText(ch, size / 2, size / 2 + size * 0.04);
    var data = g.getImageData(0, 0, size, size).data;
    var n = size * size, lab = new Int32Array(n).fill(-1), comps = [];

    for (var p = 0; p < n; p++) {
      if (lab[p] >= 0 || data[p * 4 + 3] < 90) continue;
      var q = [p], list = [];
      lab[p] = comps.length;
      while (q.length) {
        var v = q.pop(), vx = v % size, vy = (v - vx) / size;
        list.push(v);
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var nx = vx + dx, ny = vy + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          var w = ny * size + nx;
          if (lab[w] < 0 && data[w * 4 + 3] >= 90) { lab[w] = comps.length; q.push(w); }
        }
      }
      comps.push(list);
    }
    comps = comps.filter(function (l) { return l.length > 6; });

    // 连成一片的字，沿较长的方向对半切开，直到至少四块
    var guard = 0;
    while (comps.length && comps.length < 4 && guard++ < 6) {
      comps.sort(function (a, b) { return b.length - a.length; });
      var big = comps.shift(), bb = box(big, size);
      var horiz = bb.w >= bb.h, mid = horiz ? bb.x + bb.w / 2 : bb.y + bb.h / 2;
      var A = [], B = [];
      big.forEach(function (v) {
        var x = v % size, y = (v - x) / size;
        ((horiz ? x : y) < mid ? A : B).push(v);
      });
      if (A.length) comps.push(A);
      if (B.length) comps.push(B);
    }

    return comps.map(function (list) {
      var b = box(list, size), pc = document.createElement('canvas');
      pc.width = b.w; pc.height = b.h;
      var pg = pc.getContext('2d'), img = pg.createImageData(b.w, b.h);
      list.forEach(function (v) {
        var x = v % size, y = (v - x) / size, o = ((y - b.y) * b.w + (x - b.x)) * 4;
        img.data[o] = 11; img.data[o + 1] = 11; img.data[o + 2] = 12;
        img.data[o + 3] = data[v * 4 + 3];
      });
      pg.putImageData(img, 0, 0);
      return { canvas: pc, x: b.x, y: b.y, w: b.w, h: b.h };
    });
  }

  function box(list, size) {
    var x0 = size, y0 = size, x1 = 0, y1 = 0;
    list.forEach(function (v) {
      var x = v % size, y = (v - x) / size;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    });
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  function code(ch) {
    var cp = ch.codePointAt(0);
    var bytes = window.TextEncoder ? Array.from(new TextEncoder().encode(ch)) : [cp & 255];
    return {
      u: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
      bits: bytes.map(function (b) { return b.toString(2).padStart(8, '0'); })
    };
  }

  window.GLYPH = { words: words, chars: chars, parts: parts, code: code };
})();
