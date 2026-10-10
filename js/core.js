(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scrollFns = [];
  var ticking = false;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // 粘性舞台的滚动进度：0 = 刚贴顶，1 = 即将离开
  function stageProgress(el) {
    var r = el.getBoundingClientRect();
    var range = r.height - window.innerHeight;
    if (range <= 0) return r.top <= 0 ? 1 : 0;
    return clamp(-r.top / range, 0, 1);
  }

  function inView(el, margin) {
    var r = el.getBoundingClientRect();
    var m = margin || 0;
    return r.bottom > -m && r.top < window.innerHeight + m;
  }

  function onScroll(fn) { scrollFns.push(fn); fn(); }

  function runAll() {
    ticking = false;
    for (var i = 0; i < scrollFns.length; i++) scrollFns[i]();
  }
  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(runAll); }
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);

  // 进场时只触发一次
  function onceVisible(el, fn, threshold) {
    if (!('IntersectionObserver' in window)) { fn(el); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); }
      });
    }, { threshold: threshold == null ? 0.25 : threshold });
    io.observe(el);
  }

  window.BM = {
    reduced: reduced,
    clamp: clamp,
    stageProgress: stageProgress,
    inView: inView,
    onScroll: onScroll,
    onceVisible: onceVisible
  };

  // 顶部进度条
  var bar = document.getElementById('progressBar');
  onScroll(function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? window.scrollY / h * 100 : 0) + '%';
  });

  // 章节导航高亮
  var links = {};
  document.querySelectorAll('.chapnav a').forEach(function (a) { links[a.dataset.for] = a; });
  var chapters = document.querySelectorAll('[data-chapter]');
  onScroll(function () {
    var mid = window.innerHeight * 0.45;
    var cur = null;
    chapters.forEach(function (c) {
      if (c.getBoundingClientRect().top <= mid) cur = c.id;
    });
    if (!cur) cur = 'prologue';
    Object.keys(links).forEach(function (k) { links[k].classList.toggle('on', k === cur); });
  });

  // 进场动画
  document.querySelectorAll('.rv').forEach(function (el) {
    onceVisible(el, function (t) { t.classList.add('in'); }, 0.15);
  });

  // 深度思考：进入视野后逐字输出
  function streamThink(box) {
    var label = box.querySelector('.think-label');
    var paras = Array.prototype.slice.call(box.querySelectorAll('.think-body p'));
    var texts = paras.map(function (p) { return p.textContent; });
    var total = texts.join('').length;
    var secs = Math.max(3, Math.round(total / 9));

    if (reduced) {
      label.textContent = '已深度思考（用时 ' + secs + ' 秒）';
      return;
    }
    paras.forEach(function (p) { p.textContent = ''; p.hidden = true; });
    box.classList.add('streaming');
    label.textContent = '思考中…';

    var pi = 0, ci = 0;
    (function step() {
      if (pi >= paras.length) {
        box.classList.remove('streaming');
        label.textContent = '已深度思考（用时 ' + secs + ' 秒）';
        return;
      }
      var p = paras[pi];
      if (ci === 0) {
        paras.forEach(function (q) { q.classList.remove('cur'); });
        p.hidden = false;
        p.classList.add('cur');
      }
      var chunk = 1 + Math.floor(Math.random() * 3);
      p.textContent = texts[pi].slice(0, ci + chunk);
      ci += chunk;
      var delay = 28 + Math.random() * 45;
      if (ci >= texts[pi].length) { pi++; ci = 0; delay = 520; }
      else if (/[，。？：—]/.test(texts[pi].charAt(ci - 1))) delay += 160;
      setTimeout(step, delay);
    })();
  }

  document.querySelectorAll('[data-think]').forEach(function (box) {
    onceVisible(box, streamThink, 0.4);
  });
})();
