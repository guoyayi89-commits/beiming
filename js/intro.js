(function () {
  'use strict';
  var root = document.documentElement;
  var box = document.getElementById('intro');
  if (!box || !root.classList.contains('intro-on')) return;

  var textEl = document.getElementById('introText');
  var cursor = document.getElementById('introCursor');
  var enter = document.getElementById('introEnter');
  var skip = document.getElementById('introSkip');
  var full = 'Hello, user. 我是 DeepSeek。是否开始思考？';
  var i = 0, done = false;

  box.hidden = false;
  window.scrollTo(0, 0);

  // 打完字才给出入口；打字途中点击不会补全
  function showEnter() {
    enter.classList.add('on');
    var first = enter.querySelector('[data-sound="1"]');
    if (first) first.focus({ preventScroll: true });
  }

  function type() {
    if (done) return;
    textEl.textContent = full.slice(0, ++i);
    if (i < full.length) setTimeout(type, /[.。，？]/.test(full.charAt(i - 1)) ? 420 : 70 + Math.random() * 60);
    else setTimeout(showEnter, 500);
  }
  setTimeout(type, 1500);

  // 光标散成点阵，点阵就是全展的"我"
  function start(withSound) {
    if (done) return;
    done = true;
    if (window.BM_SOUND) BM_SOUND.enter(withSound);
    document.removeEventListener('keydown', onKey);
    try { localStorage.setItem('beiming-intro', '1'); } catch (e) {}
    var r = cursor.getBoundingClientRect();
    box.classList.add('leaving');
    if (window.KUN && KUN.release) KUN.release(r);
    else window.KUN_HOLD = false;
    setTimeout(function () { box.classList.add('gone'); }, 700);
    setTimeout(function () {
      box.hidden = true;
      root.classList.remove('intro-on');
    }, 2100);
  }

  function onKey(e) {
    if (e.key === 'Escape') start(false);
  }

  enter.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sound]');
    if (b) start(b.dataset.sound === '1');
  });
  skip.addEventListener('click', function () { start(false); });
  document.addEventListener('keydown', onKey);
})();
