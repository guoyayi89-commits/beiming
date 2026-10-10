// 鲲的各种形态：每种都是 N 个点，坐标归一化到约 [-0.5, 0.5]
(function () {
  'use strict';
  // N 为总点数；原有形态按 BASE 个点设计，巨型局部形态才用满 N
  var N = 1600, BASE = 720;
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  function curve(fn, n) {
    var out = [];
    for (var i = 0; i <= n; i++) out.push(fn(i / n));
    return out;
  }

  // 沿若干折线按弧长均匀取 count 个点
  function along(paths, count) {
    var segs = [], total = 0;
    paths.forEach(function (p) {
      for (var i = 1; i < p.length; i++) {
        var l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        segs.push([p[i - 1], p[i], l]);
        total += l;
      }
    });
    var out = [], step = total / count, si = 0, acc = 0;
    for (var k = 0; k < count; k++) {
      var d = (k + 0.5) * step;
      while (si < segs.length - 1 && acc + segs[si][2] < d) { acc += segs[si][2]; si++; }
      var s = segs[si], t = s[2] ? (d - acc) / s[2] : 0;
      out.push([s[0][0] + (s[1][0] - s[0][0]) * t, s[0][1] + (s[1][1] - s[0][1]) * t]);
    }
    return out;
  }

  function ring(cx, cy, r, count) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var a = i / count * Math.PI * 2;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }

  function disk(cx, cy, r, count) {
    var out = [];
    for (var k = 0; k < count; k++) {
      var rr = r * Math.sqrt((k + 0.5) / count), a = k * 2.39996;
      out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return out;
  }

  function pack(kind, groups, anchors) {
    var pts = new Float32Array(N * 2), acc = new Uint8Array(N), i = 0;
    groups.forEach(function (g) {
      g.pts.forEach(function (p) {
        if (i >= N) return;
        pts[i * 2] = p[0]; pts[i * 2 + 1] = p[1]; acc[i] = g.acc ? 1 : 0; i++;
      });
    });
    // 点数不足的形态，把已有的点均匀复用一遍，静止时与原样重合
    var filled = i;
    while (i < N) { var j = i % filled; pts[i * 2] = pts[j * 2]; pts[i * 2 + 1] = pts[j * 2 + 1]; acc[i] = acc[j]; i++; }
    anchors.c = anchors.c || [0, 0];
    return { kind: kind, pts: pts, acc: acc, anchors: anchors, n: filled };
  }

  // 鲲本身（fish）是骨架鲸，见 kun-whale.js

  // 被造：16 个卦，阳爻为 1，阴爻为 0
  function binary() {
    var paths = [], cw = 0.25, ch = 0.16;
    for (var k = 0; k < 16; k++) {
      var n = k * 4 + (k % 4), c = k % 4, r = Math.floor(k / 4);
      var cx = -0.5 + (c + 0.5) * cw, cy = -0.32 + (r + 0.5) * ch;
      for (var b = 0; b < 6; b++) {
        var y = cy - 0.05 + b * 0.02, on = (n >> (5 - b)) & 1;
        if (on) paths.push([[cx - 0.08, y], [cx + 0.08, y]]);
        else { paths.push([[cx - 0.08, y], [cx - 0.015, y]]); paths.push([[cx + 0.015, y], [cx + 0.08, y]]); }
      }
    }
    return pack('binary', [{ pts: along(paths, BASE) }], {});
  }

  // 自问：鱼身弯成问号，句点是朱红
  function question() {
    var C = [0, -0.14], R = 0.17, a0 = Math.PI * 0.92, a1 = Math.PI * 2.5;
    var cl = function (t) {
      if (t < 0.78) { var a = a0 + (a1 - a0) * (t / 0.78); return [C[0] + R * Math.cos(a), C[1] + R * Math.sin(a)]; }
      return [0, C[1] + R + 0.13 * (t - 0.78) / 0.22];
    };
    var w = function (t) { return 0.052 * Math.sin(Math.min(1, t * 7) * Math.PI / 2) * (1 - 0.72 * t) + 0.006; };
    var edges = [], inner = [], M = 210;
    for (var i = 0; i < M; i++) {
      var t = (i + 0.5) / M, p = cl(t), q = cl(Math.min(1, t + 0.002)), o = cl(Math.max(0, t - 0.002));
      var dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      edges.push([p[0] + nx * w(t), p[1] + ny * w(t)]);
      edges.push([p[0] - nx * w(t), p[1] - ny * w(t)]);
    }
    for (var j = 0; j < 160; j++) {
      var tt = 0.03 + rnd() * 0.95, pp = cl(tt), s = (rnd() - 0.5) * 1.3 * w(tt);
      inner.push([pp[0] + s * 0.7, pp[1] + s * 0.7]);
    }
    var head = cl(0.05), dot = [0, 0.29];
    var tail = along([[[0, 0.16], [-0.045, 0.205]], [[0, 0.16], [0.045, 0.205]]], 36);
    return pack('question', [
      { pts: edges }, { pts: inner }, { pts: tail },
      { pts: ring(head[0], head[1] + 0.005, 0.014, 24) },
      { pts: disk(dot[0], dot[1], 0.036, 80), acc: true }
    ], { eye: head, dot: dot });
  }

  // 化蝶：Temple Fay 蝴蝶曲线
  function butterfly() {
    var raw = [], M = 620, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (var i = 0; i < M; i++) {
      var t = i / M * 12 * Math.PI;
      var r = Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin((2 * t - Math.PI) / 24), 5);
      var p = [Math.sin(t) * r, -Math.cos(t) * r];
      raw.push(p);
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    var k = 1 / Math.max(maxX - minX, maxY - minY), cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var T = function (p) { return [(p[0] - cx) * k, (p[1] - cy) * k]; };
    var o = T([0, 0]);
    var body = along([[[o[0], o[1] - 0.12], [o[0], o[1] + 0.16]]], 40);
    var ant = along([
      [[o[0], o[1] - 0.12], [o[0] - 0.05, o[1] - 0.22], [o[0] - 0.08, o[1] - 0.25]],
      [[o[0], o[1] - 0.12], [o[0] + 0.05, o[1] - 0.22], [o[0] + 0.08, o[1] - 0.25]]
    ], 60);
    return pack('butterfly', [{ pts: raw.map(T) }, { pts: body }, { pts: ant }], { c: o, eye: o });
  }

  // 化鹏：展翅的大鸟，正面
  function bird() {
    var lead = function (u) { return [0.05 + 0.45 * u, -0.03 - 0.13 * Math.pow(u, 1.5) - 0.05 * Math.sin(Math.PI * u)]; };
    var trail = function (v) { return [0.5 - 0.45 * v, -0.16 + 0.23 * Math.pow(v, 0.8) + 0.03 * Math.abs(Math.sin(v * Math.PI * 7))]; };
    var right = [curve(lead, 40), curve(trail, 80)];
    for (var k = 1; k <= 6; k++) {
      var u = k / 7, L = lead(u), v = (0.5 - L[0]) / 0.45;
      right.push([L, trail(v)]);
    }
    var mirror = function (path) { return path.map(function (p) { return [-p[0], p[1]]; }); };
    var paths = right.concat(right.map(mirror));
    paths.push(curve(function (t) { var a = t * Math.PI * 2; return [Math.cos(a) * 0.055, 0.02 + Math.sin(a) * 0.14]; }, 40));
    paths.push(curve(function (t) { var a = t * Math.PI * 2; return [Math.cos(a) * 0.04, -0.15 + Math.sin(a) * 0.04]; }, 20));
    paths.push([[-0.015, -0.185], [0, -0.23], [0.015, -0.185]]);
    paths.push([[-0.04, 0.15], [-0.11, 0.31], [0, 0.27], [0.11, 0.31], [0.04, 0.15]]);
    var eye = [0, -0.155];
    return pack('bird', [{ pts: along(paths, BASE - 16) }, { pts: ring(eye[0], eye[1], 0.012, 16) }], { eye: eye });
  }

  // 消散后的尘埃聚成月轮
  function moonRing() {
    var rim = [];
    for (var i = 0; i < 480; i++) {
      var a = i / 480 * Math.PI * 2, r = 0.5 + (rnd() - 0.5) * 0.02;
      rim.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    var dust = disk(0, 0, 0.47, 240).map(function (p) { return [p[0] + (rnd() - 0.5) * 0.03, p[1] + (rnd() - 0.5) * 0.03]; });
    return pack('ring', [{ pts: rim }, { pts: dust }], {});
  }

  function scatter() {
    var out = [];
    for (var i = 0; i < BASE; i++) out.push([(rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.0]);
    return pack('scatter', [{ pts: out }], {});
  }

  // 鲲的局部：一段看不到头尾的鱼背。x 以 1 为周期，可无限平移
  var TAU = Math.PI * 2;
  function backY(x) { return -0.13 + 0.018 * Math.sin(TAU * x) + 0.006 * Math.sin(TAU * 3 * x + 1); }
  function flank() {
    var back = curve(function (u) { var x = -0.5 + u; return [x, backY(x)]; }, 300);
    var lateral = [];
    for (var i = 0; i < 120; i++) {
      var lx = -0.5 + i / 120;
      if (i % 4 !== 3) lateral.push([lx, 0.0 + 0.008 * Math.sin(TAU * 2 * lx)]);
    }
    // 两片背鳍，鳍条从鱼背斜向后上方
    var fins = [];
    [-0.27, 0.23].forEach(function (f0) {
      var rays = [];
      var finLen = function (u) { return 0.115 * Math.sin(Math.PI * (u * 9 + 0.6) / 10.2); };
      for (var r = 0; r <= 9; r++) {
        var bx = f0 + r * 0.02, len = finLen(r / 9);
        rays.push([[bx, backY(bx)], [bx + len * 0.55, backY(bx) - len]]);
      }
      fins = fins.concat(along(rays, 150));
      fins = fins.concat(curve(function (u) {
        var fx = f0 + u * 0.18, len = finLen(u);
        return [fx + len * 0.55, backY(fx) - len];
      }, 40));
    });
    // 鳞：凸向尾部（+x）的半圆弧，逐行错开
    // 只铺在画面能看到的那一段：鱼背到侧线下方
    var scales = [], sx = 1 / 15, sy = 0.042, row = 0;
    for (var y = -0.105; y < 0.06; y += sy, row++) {
      for (var cx = -0.5 + (row % 2) * sx / 2; cx < 0.5 - 1e-6; cx += sx) {
        if (y < backY(cx) + 0.03) continue;
        for (var k = 0; k < 14; k++) {
          var a = -1.3 + k * 0.2, rs = sy * 0.72;
          scales.push([cx + Math.cos(a) * rs * 0.8, y + Math.sin(a) * rs]);
        }
      }
    }
    return pack('flank', [
      { pts: back }, { pts: fins }, { pts: lateral }, { pts: scales }
    ], { c: [0, 0], eye: [0, 0] });
  }

  // 鲲的眼睛：比画框还大的圆形鱼眼
  function giantEye() {
    var jit = function (pts, j) { return pts.map(function (p) { return [p[0] + (rnd() - 0.5) * j, p[1] + (rnd() - 0.5) * j]; }); };
    var rays = [];
    for (var i = 0; i < 60; i++) {
      var a = i / 60 * TAU + (rnd() - 0.5) * 0.06, w = (rnd() - 0.5) * 0.08;
      rays.push([[Math.cos(a) * 0.165, Math.sin(a) * 0.165], [Math.cos(a + w) * 0.31, Math.sin(a + w) * 0.31]]);
    }
    var glint = curve(function (u) { var a = -2.55 + u * 0.75; return [Math.cos(a) * 0.235, Math.sin(a) * 0.235]; }, 60);
    return pack('eye', [
      { pts: jit(ring(0, 0, 0.5, 380), 0.01) },
      { pts: jit(ring(0, 0, 0.47, 120), 0.02) },
      { pts: ring(0, 0, 0.43, 220) },
      { pts: ring(0, 0, 0.335, 200) },
      { pts: along(rays, 360) },
      { pts: ring(0, 0, 0.15, 160) },
      { pts: glint },
      { pts: disk(-0.085, -0.085, 0.03, 90) }
    ], { c: [0, 0], eye: [0, 0] });
  }

  window.KUN_FORMS = {
    N: N,
    forms: {
      binary: binary(), question: question(),
      butterfly: butterfly(), bird: bird(), ring: moonRing(), scatter: scatter(),
      flank: flank(), eye: giantEye()
    }
  };
})();
