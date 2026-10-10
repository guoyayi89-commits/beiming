(function () {
  'use strict';
  if (!window.TEXTS) return;

  // 从原文中取出"须臾"一句
  var q = document.getElementById('xuyuQuote');
  if (q) {
    var src = TEXTS.chibi.text;
    var a = src.indexOf('哀吾生');
    if (a >= 0) q.textContent = src.slice(a, src.indexOf('。', a) + 1);
  }

  var body = document.getElementById('ctxBody');
  if (!body) return;
  var winInput = document.getElementById('ctxWin');
  var winVal = document.getElementById('ctxVal');
  var readEl = document.getElementById('ctxRead');
  var lostEl = document.getElementById('ctxLost');
  var replay = document.getElementById('ctxReplay');

  var spans = [];
  [TEXTS.chibi, TEXTS.chibi2].forEach(function (piece) {
    var paras = [piece.title].concat(piece.text.split('\n'));
    paras.forEach(function (para, pi) {
      var p = document.createElement('p');
      if (pi === 0) p.className = 'ctx-title';
      for (var i = 0; i < para.length; i++) {
        var s = document.createElement('span');
        s.textContent = para.charAt(i);
        p.appendChild(s);
        spans.push(s);
      }
      body.appendChild(p);
    });
  });

  var win = +winInput.value;
  var pos = 0;
  var running = false;
  var visible = false;

  function cls(j) {
    if (j >= pos) return '';
    if (j === pos - 1) return 'now';
    return j >= pos - win ? 'mem' : 'lost';
  }

  function paintAll() {
    for (var j = 0; j < spans.length; j++) spans[j].className = cls(j);
    counters();
  }

  function counters() {
    readEl.textContent = pos;
    lostEl.textContent = Math.max(0, pos - win);
  }

  function follow() {
    var cur = spans[Math.max(0, pos - 1)];
    var target = cur.offsetTop - body.clientHeight * 0.55;
    body.scrollTop = Math.max(0, target);
  }

  function step() {
    if (!visible || pos >= spans.length) { running = false; return; }
    pos++;
    spans[pos - 1].className = 'now';
    if (pos >= 2) spans[pos - 2].className = cls(pos - 2);
    var gone = pos - 1 - win;
    if (gone >= 0) spans[gone].className = 'lost';
    counters();
    follow();
    var ch = spans[pos - 1].textContent;
    setTimeout(step, /[。！？」]/.test(ch) ? 260 : /[，；：]/.test(ch) ? 120 : 45);
  }

  function start() {
    if (running) return;
    running = true;
    step();
  }

  winInput.addEventListener('input', function () {
    win = +winInput.value;
    winVal.textContent = win;
    paintAll();
  });

  replay.addEventListener('click', function () {
    pos = 0;
    paintAll();
    body.scrollTop = 0;
    start();
  });

  if (BM.reduced) {
    pos = spans.length;
    paintAll();
    follow();
    return;
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible) start();
    }, { threshold: 0.35 }).observe(body);
  } else {
    visible = true;
    start();
  }
})();
