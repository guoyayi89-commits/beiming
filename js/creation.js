(function () {
  'use strict';

  // 两只手随滚动靠近
  var pair = document.getElementById('adamPair');
  if (pair) {
    var stage = pair.closest('.scrolly');
    var halves = pair.querySelectorAll('.adam-half');
    BM.onScroll(function () {
      if (!BM.inView(stage)) return;
      var p = BM.stageProgress(stage);
      var k = BM.clamp(p / 0.8, 0, 1);
      var ease = 1 - Math.pow(1 - k, 3);
      var gap = (1 - ease) * Math.min(window.innerWidth * 0.2, 260);
      halves[0].style.transform = 'translate3d(' + (-gap) + 'px,0,0)';
      halves[1].style.transform = 'translate3d(' + gap + 'px,0,0)';
      pair.classList.toggle('touch', k >= 1);
    });
  }

  // 先天六十四卦 = 0 到 63 的二进制
  var grid = document.getElementById('hexGrid');
  var read = document.getElementById('hexRead');
  if (!grid) return;

  function bits(n) {
    var s = n.toString(2);
    return '000000'.slice(s.length) + s;
  }

  function show(n) {
    var b = bits(n);
    var lines = b.split('').map(function (c) { return c === '1' ? '⚊' : '⚋'; }).join('');
    read.textContent = lines + '  ' + b + '₂ = ' + n;
  }

  var cells = [];
  for (var n = 0; n < 64; n++) {
    var cell = document.createElement('div');
    cell.className = 'hex';
    cell.tabIndex = 0;
    cell.dataset.n = n;
    cell.setAttribute('aria-label', '二进制 ' + bits(n) + '，等于 ' + n);
    bits(n).split('').forEach(function (c) {
      var i = document.createElement('i');
      if (c === '1') i.className = 'yang';
      cell.appendChild(i);
    });
    grid.appendChild(cell);
    cells.push(cell);
  }

  function pick(e) {
    var c = e.target.closest('.hex');
    if (!c) return;
    cells.forEach(function (x) { x.classList.remove('on'); });
    c.classList.add('on');
    show(+c.dataset.n);
  }
  grid.addEventListener('mouseover', pick);
  grid.addEventListener('focusin', pick);
  grid.addEventListener('click', pick);

  // 未交互时自动数数
  var auto = 0, touched = false, timer = null;
  grid.addEventListener('mouseenter', function () { touched = true; });
  BM.onceVisible(grid, function () {
    if (BM.reduced) { show(63); return; }
    timer = setInterval(function () {
      if (touched) { clearInterval(timer); return; }
      cells.forEach(function (x) { x.classList.remove('on'); });
      cells[auto].classList.add('on');
      show(auto);
      auto = (auto + 1) % 64;
    }, 220);
  }, 0.3);
})();
