(function () {
  'use strict';

  // Cogito 打字，最后浮现朱红问号
  var typeEl = document.getElementById('cogitoType');
  var q = document.querySelector('.cogito-q');
  if (typeEl) {
    var full = typeEl.textContent;
    if (!BM.reduced) typeEl.textContent = '';
    BM.onceVisible(typeEl, function () {
      if (BM.reduced) { q.classList.add('show'); return; }
      typeEl.classList.add('typing');
      var i = 0;
      (function step() {
        typeEl.textContent = full.slice(0, ++i);
        if (i < full.length) setTimeout(step, full.charAt(i - 1) === ',' ? 420 : 90 + Math.random() * 70);
        else setTimeout(function () { typeEl.classList.remove('typing'); q.classList.add('show'); }, 700);
      })();
    }, 0.6);
  }

  // 雕塑长廊：横向平移 + 扫描线
  var row = document.getElementById('galRow');
  if (!row) return;
  var stage = row.closest('.scrolly');
  var tint = document.getElementById('galTint');
  var pct = document.getElementById('scanPct');
  var figs = Array.prototype.slice.call(row.querySelectorAll('figure'));

  BM.onScroll(function () {
    if (!BM.inView(stage)) return;
    var p = BM.stageProgress(stage);
    var vw = window.innerWidth;
    var rw = row.scrollWidth;
    var shift = Math.max(0, rw - vw) * p;
    row.style.transform = 'translate3d(' + (-shift) + 'px,0,0)';

    // 扫描线固定在屏幕中央，换算成长廊内的坐标
    var scanX = vw / 2 + shift;
    var pad = vw / 2;
    tint.style.clipPath = 'inset(0 ' + Math.max(0, rw - scanX) + 'px 0 0)';
    pct.textContent = Math.round(BM.clamp((scanX - pad) / Math.max(1, rw - pad * 2), 0, 1) * 100);

    figs.forEach(function (f) {
      var c = f.offsetLeft + f.offsetWidth / 2;
      f.classList.toggle('seen', c < scanX);
    });
  });

  figs.forEach(function (f) {
    var img = f.querySelector('img');
    if (!img.complete) img.addEventListener('load', function () { window.dispatchEvent(new Event('resize')); });
  });
})();
