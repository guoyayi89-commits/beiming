(function () {
  'use strict';

  // 原文竖排，"胡蝶"二字标为机器蓝
  var vt = document.getElementById('butterflyText');
  if (vt && window.TEXTS) {
    TEXTS.butterfly.text.split('胡蝶').forEach(function (part, i) {
      if (i > 0) {
        var b = document.createElement('span');
        b.className = 'hl';
        b.textContent = '胡蝶';
        vt.appendChild(b);
      }
      vt.appendChild(document.createTextNode(part));
    });
  }

  var fig = document.getElementById('dreamFig');
  var canvas = document.getElementById('bflyCanvas');
  var mode = 'zhou';

  // 模型对画面的"笃定"描述
  var captions = {
    zhou: [
      ['画中一人倚石而眠，梦见了一只蝴蝶。', 0.97, '无法确定画中人是否在做梦'],
      ['左上题字为「庄周梦蝶·明陆治·嘉靖二十九年」。', 0.91, '题字只有「夢蝶」二字'],
      ['画中共有三只蝴蝶、一位书童和一只白鹤。', 0.88, '无法核实'],
      ['此人醒来后，会知道自己是庄周。', 0.84, '原文说的是「不知」']
    ],
    die: [
      ['画中一只蝴蝶倚石而眠，梦见自己是人。', 0.96, '无法排除'],
      ['这幅画是蝴蝶画的。', 0.73, '无法核实'],
      ['画中人物是蝴蝶在梦中的样子。', 0.89, '无法排除'],
      ['蝴蝶醒来后，会知道自己是蝴蝶。', 0.82, '无法核实']
    ]
  };
  var capText = document.getElementById('hallucText');
  var capConf = document.getElementById('hallucConf');
  var ci = 0, capTimer = null;

  function typeCaption() {
    var list = captions[mode];
    var c = list[ci % list.length];
    ci++;
    capConf.innerHTML = '';
    var i = 0;
    (function step() {
      capText.textContent = c[0].slice(0, ++i);
      if (i < c[0].length && !BM.reduced) { capTimer = setTimeout(step, 45); return; }
      capText.textContent = c[0];
      capConf.innerHTML = '置信度 ' + c[1].toFixed(2) + ' · <b>核实：' + c[2] + '</b>';
      capTimer = setTimeout(typeCaption, 4200);
    })();
  }

  document.querySelectorAll('.toggle button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      mode = btn.dataset.who;
      document.querySelectorAll('.toggle button').forEach(function (b) { b.classList.toggle('on', b === btn); });
      fig.classList.toggle('die', mode === 'die');
      clearTimeout(capTimer);
      ci = 0;
      typeCaption();
    });
  });
  var grid = document.querySelector('.dream-grid');
  if (grid) BM.onceVisible(grid, typeCaption, 0.2);

  // 画上飞舞的蝴蝶：庄周视角是蓝色的机器蝴蝶，蝴蝶视角里反转为墨色
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var flies = [];
    for (var k = 0; k < 7; k++) {
      flies.push({ x: Math.random(), y: Math.random(), a: Math.random() * 6.28, s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.28 });
    }
    var resize = function () {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();

    var drawFly = function (f, t) {
      var flap = Math.abs(Math.sin(t * 0.012 * f.s + f.ph));
      var size = 7 + f.s * 5;
      ctx.save();
      ctx.translate(f.x * W, f.y * H);
      ctx.rotate(f.a + Math.PI / 2);
      ctx.fillStyle = mode === 'die' ? '#111' : '#2f5cff';
      ctx.globalAlpha = 0.85;
      [-1, 1].forEach(function (side) {
        ctx.save();
        ctx.scale(side * (0.25 + flap * 0.75), 1);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(size * 1.3, -size * 1.2, size * 0.9, size * 0.1);
        ctx.quadraticCurveTo(size * 0.9, size * 0.9, 0, size * 0.25);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    };

    var visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
    } else visible = true;

    var loop = function (t) {
      requestAnimationFrame(loop);
      if (!visible) return;
      ctx.clearRect(0, 0, W, H);
      flies.forEach(function (f) {
        if (!BM.reduced) {
          f.a += (Math.sin(t * 0.0007 + f.ph) * 0.03);
          f.x += Math.cos(f.a) * 0.0009 * f.s;
          f.y += Math.sin(f.a) * 0.0009 * f.s;
          if (f.x < 0.05 || f.x > 0.95) f.a = Math.PI - f.a;
          if (f.y < 0.05 || f.y > 0.95) f.a = -f.a;
          f.x = BM.clamp(f.x, 0.04, 0.96); f.y = BM.clamp(f.y, 0.04, 0.96);
        }
        drawFly(f, t);
      });
    };
    requestAnimationFrame(loop);
  }

  // 让模型在《百合蝴蝶》中"找蝴蝶"
  var btn = document.getElementById('lilyBtn');
  var boxes = document.getElementById('lilyBoxes');
  var res = document.getElementById('lilyRes');
  if (btn) {
    btn.addEventListener('click', function () {
      boxes.innerHTML = '';
      res.textContent = '我在找……';
      var n = 5 + Math.floor(Math.random() * 4);
      var sum = 0;
      for (var i = 0; i < n; i++) {
        var conf = 0.86 + Math.random() * 0.13;
        sum += conf;
        var s = document.createElement('span');
        var w = 9 + Math.random() * 10;
        s.style.left = (6 + Math.random() * (88 - w)) + '%';
        s.style.top = (6 + Math.random() * 86) + '%';
        s.style.width = w + '%';
        s.style.height = (w * 0.4) + '%';
        s.dataset.l = '蝴蝶 ' + conf.toFixed(2);
        boxes.appendChild(s);
        (function (el, d) { setTimeout(function () { el.classList.add('on'); }, d); })(s, 250 + i * 260);
      }
      setTimeout(function () {
        res.innerHTML = '我找到了 ' + n + ' 只蝴蝶，平均置信度 ' + (sum / n).toFixed(2) + '。<br><b>我很确定。可这些框里有几只是真的？请你凑近看看。</b>';
      }, 300 + n * 260);
      btn.textContent = '再找一次';
    });
  }
})();
