// 在页面渲染前决定是否播放开场：只播一次，网址带 ?intro 可重播
(function () {
  var force = /[?&]intro\b/.test(location.search);
  var seen = false;
  try { seen = localStorage.getItem('beiming-intro') === '1'; } catch (e) {}
  if (force || !seen) {
    document.documentElement.classList.add('intro-on');
    window.KUN_HOLD = true;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }
})();
