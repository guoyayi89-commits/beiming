(function () {
  'use strict';
  var stage = document.getElementById('kun');
  var box = document.getElementById('kunText');
  var img = document.getElementById('kunBand');
  var band = document.getElementById('kunRoll') || img;
  if (!stage || !box || !window.TEXTS) return;

  var text = TEXTS.kun.text;
  var birdAt = text.indexOf('化而为鸟');
  box.setAttribute('aria-label', text);

  var frag = document.createDocumentFragment();
  var spans = [];
  for (var i = 0; i < text.length; i++) {
    var s = document.createElement('span');
    s.textContent = text.charAt(i);
    s.setAttribute('aria-hidden', 'true');
    if (birdAt >= 0 && i >= birdAt) s.className = 'bird';
    frag.appendChild(s);
    spans.push(s);
  }
  box.appendChild(frag);

  var lastLit = -1;
  BM.onScroll(function () {
    if (!BM.inView(stage)) return;
    var p = BM.stageProgress(stage);

    // 长卷两端是装裱，只在中间 4%–96% 之间平移
    var w = band.getBoundingClientRect().width;
    var vw = window.innerWidth;
    if (w > vw) {
      var from = w * 0.04, to = w * 0.96 - vw;
      band.style.transform = 'translate3d(' + (-(from + (to - from) * p)) + 'px,0,0)';
    }

    var n = Math.round(BM.clamp(p / 0.85, 0, 1) * spans.length);
    if (n === lastLit) return;
    for (var i = 0; i < spans.length; i++) spans[i].classList.toggle('lit', i < n);
    lastLit = n;
  });

  img.addEventListener('load', function () { window.dispatchEvent(new Event('resize')); });
})();
