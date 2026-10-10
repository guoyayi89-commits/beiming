// 首页水面：透视横线（越近越疏）+ 月光倒影的碎亮线
(function () {
  'use strict';
  var LINES = 18, ROWS = 26;
  var seeds = [];
  for (var r = 0; r < ROWS; r++) {
    var row = [];
    for (var j = 0; j < 6; j++) row.push({ p: Math.random() * 6.283, o: Math.random() * 2 - 1, l: Math.random(), s: 0.5 + Math.random() });
    seeds.push(row);
  }
  var grad = null, gradW = 0;

  function draw(ctx, W, H, waterY, cx, R, t, reduced) {
    var depth = H - waterY;
    if (depth <= 0) return;
    if (!grad || gradW !== W) {
      grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(241,240,236,0)');
      grad.addColorStop(0.5, 'rgba(241,240,236,1)');
      grad.addColorStop(1, 'rgba(241,240,236,0)');
      gradW = W;
    }

    // 透视横线：u^1.9 分布，近处（下方）间距大
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    for (var k = 0; k <= LINES; k++) {
      var u = k / LINES, y = Math.round(waterY + depth * Math.pow(u, 1.9)) + 0.5;
      ctx.globalAlpha = k === 0 ? 0.16 : 0.035 + 0.06 * (1 - u);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 月光倒影：月亮正下方，越往近处越宽、越碎
    ctx.fillStyle = 'rgb(241,240,236)';
    var T = reduced ? 0 : t;
    for (var r = 0; r < ROWS; r++) {
      var v = (r + 0.5) / ROWS, ry = waterY + 3 + depth * Math.pow(v, 1.5);
      var half = R * (0.22 + 0.75 * v), row = seeds[r];
      for (var j = 0; j < row.length; j++) {
        var sd = row[j];
        var x = cx + half * (sd.o + 0.18 * Math.sin(T * 0.7 * sd.s + sd.p));
        var len = (4 + 30 * sd.l * (0.4 + v)) * (0.6 + 0.4 * Math.sin(T * 1.3 * sd.s + sd.p * 2));
        if (len < 2) continue;
        var edge = 1 - Math.min(1, Math.abs(x - cx) / (half * 1.05));
        ctx.globalAlpha = (0.12 + 0.55 * edge) * (1 - 0.55 * v);
        ctx.fillRect(Math.round(x - len / 2), Math.round(ry), Math.round(len), 1.5);
      }
    }
    ctx.restore();
  }

  window.HOME_WATER = { draw: draw };
})();
