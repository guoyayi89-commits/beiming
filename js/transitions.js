(function () {
  'use strict';

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }

  // 满屏转场：下一章的底色从屏幕中心（鲲的眼睛、句点或月亮）扩散开
  document.querySelectorAll('.tr').forEach(function (tr) {
    var reveal = tr.querySelector('.tr-reveal');
    var ring = tr.querySelector('.tr-ring');
    var pre = tr.querySelector('.tr-pre');
    var post = tr.querySelector('.tr-post');
    var img = reveal.querySelector('img');
    var r0 = parseFloat(tr.dataset.r0 || 0);

    BM.onScroll(function () {
      if (!BM.inView(tr, 200)) return;
      var p = BM.stageProgress(tr);
      var W = window.innerWidth, H = window.innerHeight;
      var diag = Math.hypot(W, H) / 2 + 4;
      var start = r0 * Math.min(W, H) / 100;
      var k = smooth(clamp01((p - 0.18) / 0.67));
      var r = start + (diag - start) * (img ? Math.pow(k, 1.6) : k);
      if (!start && k === 0) r = 0;

      reveal.style.clipPath = 'circle(' + r.toFixed(1) + 'px at 50% 50%)';
      if (ring) {
        ring.style.width = ring.style.height = (r * 2) + 'px';
        ring.style.opacity = k > 0 && k < 1 ? 1 - k * 0.6 : 0;
      }
      if (img) {
        img.style.width = img.style.height = (r * 2.25) + 'px';
        img.style.opacity = 1 - clamp01((p - 0.6) / 0.28);
      }
      if (pre) pre.style.opacity = 1 - clamp01((p - 0.24) / 0.16);
      if (post) post.style.opacity = clamp01((p - 0.68) / 0.14);
    });
  });
})();
