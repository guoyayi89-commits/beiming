// 鲸在展厅里留意的事：页面停了多久、哪块图文刚进画面、读者下一步该看哪里
(function () {
  'use strict';
  var W = window.KUN_WATCH = { pending: null, scrollT: 0, look: look };
  var els = [], seen = typeof WeakSet === 'function' ? new WeakSet() : null;
  var lookCache = null, lookT = -1;

  function now() { return performance.now() / 1000; }

  window.addEventListener('scroll', function () { W.scrollT = now(); }, { passive: true });

  function collect() {
    els = Array.prototype.slice.call(document.querySelectorAll('main .rv, main figure'))
      .filter(function (el) { return !el.closest('.sticky') && !el.closest('.chat'); });
  }

  // 新进画面的图文：顶边越过视口 72% 时记下，同一块只记一次
  function observe() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting || (seen && seen.has(e.target))) return;
        if (seen) seen.add(e.target);
        io.unobserve(e.target);
        if (e.target.offsetHeight < 60) return;
        W.pending = { el: e.target, t: now() };
      });
    }, { rootMargin: '0px 0px -28% 0px', threshold: 0 });
    els.forEach(function (el) { io.observe(el); });
  }

  // 下一步要看处：视口中线以下、最先到来的那块图文
  function look() {
    var t = now();
    if (t - lookT < 0.25) return lookCache;
    lookT = t;
    var H = window.innerHeight, best = null, bestTop = Infinity;
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.height < 40 || r.width < 40) continue;
      if (r.top > H * 0.45 && r.top < H * 1.8 && r.top < bestTop) { bestTop = r.top; best = r; }
    }
    lookCache = best ? {
      x: best.left + best.width / 2,
      y: Math.min(best.top + Math.min(best.height, H) * 0.3, H * 1.1)
    } : null;
    return lookCache;
  }

  collect();
  observe();
})();
