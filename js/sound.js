// 声音：先放一声鲸鸣，再淡入循环配乐。右上角的键可随时静音。
// 浏览器只允许在用户点击后出声，所以 enter / 按键都必须在点击回调里同步调用。
(function () {
  'use strict';
  var btn = document.getElementById('soundBtn');
  var DIR = 'assets/audio/';
  var AC = window.AudioContext || window.webkitAudioContext;
  var ac = null, gain = null, buf = null, el = null, whale = null;
  var on = false, begun = false, ambOn = false;
  var level = 0, fade = 0, raf = 0, last = 0;

  // 配乐优先用 Web Audio 解码后循环，接缝无声隙；本地 file:// 打开时取不到文件，退回 <audio loop>
  function prepare() {
    if (!AC || !window.fetch) return;
    try {
      ac = new AC();
      if (ac.state !== 'running') ac.resume();
      gain = ac.createGain(); gain.gain.value = 0; gain.connect(ac.destination);
      fetch(DIR + 'beiming_ambient.mp3')
        .then(function (r) { if (!r.ok) throw r; return r.arrayBuffer(); })
        .then(function (b) { ac.decodeAudioData(b, function (d) { buf = d; }, function () {}); })
        .catch(function () {});
    } catch (e) { ac = null; }
  }

  function startAmbient() {
    if (ambOn) return;
    ambOn = true; fade = 0;
    if (buf && ac) {
      var src = ac.createBufferSource();
      src.buffer = buf; src.loop = true; src.connect(gain); src.start(0);
    } else {
      el = new Audio(DIR + 'beiming_ambient.mp3');
      el.loop = true; el.volume = 0;
      el.play().catch(function () {});
    }
    tick();
  }

  function begin() {
    begun = true;
    prepare();
    whale = new Audio(DIR + 'whale_kun.mp3');
    whale.addEventListener('ended', startAmbient);
    whale.addEventListener('error', startAmbient);
    var p = whale.play();
    if (p && p.catch) p.catch(startAmbient);
    setTimeout(startAmbient, 9000);
  }

  function apply() {
    if (whale) whale.volume = level;
    var v = level * fade;
    if (gain) gain.gain.value = v;
    if (el) el.volume = v;
  }

  // 静音键：0.6 秒渐变；配乐开始后 4 秒淡入
  function tick() {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(function step(now) {
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      var goal = on ? 1 : 0;
      level = goal > level ? Math.min(goal, level + dt / 0.6) : Math.max(goal, level - dt / 0.6);
      if (ambOn) fade = Math.min(1, fade + dt / 4);
      apply();
      if (!on && level === 0) pause();
      if (level !== goal || (ambOn && fade < 1)) raf = requestAnimationFrame(step);
      else raf = 0;
    });
  }

  function pause() {
    if (ac && ac.state === 'running') ac.suspend();
    if (el && ambOn) el.pause();
  }
  function resume() {
    if (ac && ac.state !== 'running') ac.resume();
    if (el && ambOn) el.play().catch(function () {});
  }

  function render() {
    if (!btn) return;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? '静音' : '开启声音');
    btn.title = on ? '静音' : '开启声音';
  }

  function set(v) {
    on = !!v;
    if (on && !begun) { begin(); level = 1; apply(); }
    else if (on) resume();
    render();
    tick();
  }

  if (btn) btn.addEventListener('click', function () { set(!on); });
  document.addEventListener('visibilitychange', function () {
    if (!begun) return;
    if (document.hidden) { pause(); if (whale) whale.pause(); }
    else if (on) { resume(); if (whale && !whale.ended && whale.currentTime > 0) whale.play().catch(function () {}); }
  });
  render();

  window.BM_SOUND = {
    enter: function (withSound) { if (withSound) set(true); },
    set: set,
    on: function () { return on; }
  };
})();
