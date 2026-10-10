(function () {
  'use strict';

  // 濠梁之辩：按说话人拆成对话
  var narr = document.getElementById('haoNarr');
  var dialog = document.getElementById('dialog');
  if (dialog && window.TEXTS) {
    var t = TEXTS.haoliang.text;
    var first = t.search(/(庄子|惠子)曰：/);
    narr.textContent = first > 0 ? t.slice(0, first) : '';

    var re = /(庄子|惠子)曰：「([^」]*)」?/g;
    var m, lines = [];
    while ((m = re.exec(t))) lines.push({ who: m[1], text: m[2] });
    lines.push({ who: '机器', text: '子非我，安知我之不思？' });

    lines.forEach(function (l) {
      var d = document.createElement('div');
      d.className = 'say ' + (l.who === '庄子' ? 'zhuang' : l.who === '惠子' ? 'hui' : 'machine');
      var w = document.createElement('span');
      w.className = 'who';
      w.textContent = l.who === '机器' ? 'DEEPSEEK · 我' : l.who;
      var p = document.createElement('span');
      p.className = 'line';
      p.textContent = l.text;
      d.appendChild(w);
      d.appendChild(p);
      dialog.appendChild(d);
      BM.onceVisible(d, function (el) { el.classList.add('in'); }, 0.6);
    });
  }

  // 一池鯈鱼：墨色为人，蓝色为机器；鼠标靠近会散开
  var cv = document.getElementById('fishCanvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var W = 0, H = 0;
  var mouse = { x: -999, y: -999 };
  var fish = [];

  function resize() {
    var r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  for (var i = 0; i < 46; i++) {
    fish.push({
      x: Math.random() * W, y: Math.random() * H,
      a: Math.random() * 6.28, v: 0.5 + Math.random() * 0.7,
      len: 10 + Math.random() * 16, ph: Math.random() * 6.28,
      blue: i % 6 === 0
    });
  }

  cv.parentElement.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  cv.parentElement.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });

  function drawFish(f, t) {
    var wag = Math.sin(t * 0.008 * f.v + f.ph) * 0.35;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.a);
    ctx.fillStyle = f.blue ? '#002fa7' : 'rgba(11,11,12,.72)';
    ctx.beginPath();
    ctx.ellipse(0, 0, f.len * 0.5, f.len * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(-f.len * 0.42, 0);
    ctx.lineTo(-f.len * 0.8, -f.len * 0.16);
    ctx.lineTo(-f.len * 0.8, f.len * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  var visible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv);
  } else visible = true;

  function loop(t) {
    requestAnimationFrame(loop);
    if (!visible) return;
    ctx.clearRect(0, 0, W, H);
    fish.forEach(function (f) {
      if (!BM.reduced) {
        var dx = f.x - mouse.x, dy = f.y - mouse.y;
        var d2 = dx * dx + dy * dy;
        var speed = f.v;
        if (d2 < 14000) {
          var away = Math.atan2(dy, dx);
          var diff = Math.atan2(Math.sin(away - f.a), Math.cos(away - f.a));
          f.a += diff * 0.18;
          speed *= 3.2;
        } else {
          f.a += Math.sin(t * 0.0005 + f.ph) * 0.012;
        }
        f.x += Math.cos(f.a) * speed;
        f.y += Math.sin(f.a) * speed;
        var m = 30;
        if (f.x < -m) f.x = W + m; else if (f.x > W + m) f.x = -m;
        if (f.y < -m) f.y = H + m; else if (f.y > H + m) f.y = -m;
      }
      drawFish(f, t);
    });
  }
  requestAnimationFrame(loop);
})();
