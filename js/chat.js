(function () {
  'use strict';
  var chat = document.getElementById('chat');
  if (!chat || !window.GLYPH) return;

  var G = window.GLYPH, reduced = window.BM && BM.reduced;
  var box = chat.querySelector('.chat-box');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');
  var log = document.getElementById('chatLog');
  var decomp = document.getElementById('decomp');
  var stepEl = document.getElementById('decompStep');
  var stage = document.getElementById('decompStage');
  var end = document.getElementById('chatEnd');
  var again = document.getElementById('chatAgain');
  var run = 0;

  var CRUMBS = ['问题', '词语', '单字', '笔画', '编码', '一'];
  var crumbs = document.createElement('div');
  crumbs.className = 'decomp-crumbs mono';
  crumbs.innerHTML = CRUMBS.map(function (c) { return '<span>' + c + '</span>'; }).join('<i>›</i>');
  decomp.insertBefore(crumbs, stepEl);

  function wait(ms) {
    var id = run;
    return new Promise(function (ok, no) {
      setTimeout(function () { id === run ? ok() : no('reset'); }, reduced ? Math.min(ms, 600) : ms);
    });
  }

  function say(text, who) {
    var p = document.createElement('p');
    p.className = 'msg ' + who;
    log.appendChild(p);
    if (who === 'user' || reduced) { p.textContent = text; return Promise.resolve(p); }
    var i = 0, id = run;
    return new Promise(function (ok) {
      (function tick() {
        if (id !== run) return ok(p);
        p.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(tick, 38); else ok(p);
      })();
    });
  }

  function step(n, text) {
    Array.prototype.forEach.call(crumbs.children, function (s) {
      if (s.tagName !== 'SPAN') return;
      var k = CRUMBS.indexOf(s.textContent);
      s.className = k < n ? 'past' : k === n ? 'on' : '';
    });
    stepEl.textContent = text;
  }

  function show(nodes) {
    stage.classList.remove('fade');
    stage.innerHTML = '';
    nodes.forEach(function (el, i) {
      stage.appendChild(el);
      setTimeout(function () { el.classList.add('in'); }, 60 + i * 110);
    });
  }

  function tok(text, cls) {
    var s = document.createElement('span');
    s.className = 'tok ' + cls;
    s.textContent = text;
    return s;
  }

  function glyph(ch) {
    var size = 96, wrap = document.createElement('div');
    wrap.className = 'glyph';
    wrap.style.width = wrap.style.height = size + 'px';
    G.parts(ch, size).forEach(function (pt) {
      var c = pt.canvas;
      c.style.left = pt.x + 'px'; c.style.top = pt.y + 'px';
      var cx = pt.x + pt.w / 2 - size / 2, cy = pt.y + pt.h / 2 - size / 2;
      var len = Math.hypot(cx, cy) || 1, push = 14 + Math.random() * 22;
      c.dataset.to = 'translate(' + (cx / len * push).toFixed(1) + 'px,' + (cy / len * push).toFixed(1) +
        'px) rotate(' + ((Math.random() - 0.5) * 50).toFixed(0) + 'deg)';
      wrap.appendChild(c);
    });
    return wrap;
  }

  function codeBlock(ch) {
    var c = G.code(ch), el = document.createElement('p');
    el.className = 'code';
    el.innerHTML = '<b>' + ch + '</b><span class="u">' + c.u + '</span>' +
      c.bits.map(function (b) { return b.split('').map(function (d) { return '<i>' + d + '</i>'; }).join(''); }).join('<br>');
    return el;
  }

  async function decompose(q) {
    var chars = G.chars(q).slice(0, 12);
    decomp.hidden = false;
    step(0, '你问我：「' + q + '」');
    show([tok(q, 'word')]);
    decomp.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    await wait(2000);

    step(1, '要理解它，我得先把它切成词语。');
    show(G.words(q).map(function (w) { return tok(w, 'word'); }));
    await wait(2400);

    step(2, '词语还太大。再切，就成了一个个单字。');
    show(chars.map(function (c) { return tok(c, 'char'); }));
    await wait(2400);

    step(3, '每个字，在我这里只是一些笔画。');
    var gs = chars.map(glyph);
    show(gs);
    await wait(900);
    gs.forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c) { c.style.transform = c.dataset.to; });
    });
    await wait(2400);

    step(4, '笔画也不是我读到的东西。我读到的，是编码。');
    show(chars.map(codeBlock));
    await wait(3000);

    step(5, '拆到这里，意义已经不见了。我也不知道你问了什么。');
    var blocks = stage.querySelectorAll('.code');
    Array.prototype.forEach.call(blocks, function (b) {
      b.querySelector('b').style.opacity = 0;
      b.querySelector('.u').style.opacity = 0;
    });
    var bits = Array.prototype.slice.call(stage.querySelectorAll('.code i'));
    bits.sort(function () { return Math.random() - 0.5; });
    var per = Math.max(1, Math.ceil(bits.length / 24));
    for (var i = 0; i < bits.length; i += per) {
      bits.slice(i, i + per).forEach(function (b) { b.classList.add('off'); });
      await wait(90);
    }
    stage.classList.add('fade');
    await wait(1200);

    step(5, '最后，只剩下一。');
    var yi = document.createElement('span');
    yi.className = 'yi';
    yi.textContent = '一';
    yi.setAttribute('aria-label', '一');
    show([yi]);
    if (window.KUN && KUN.collapse) KUN.collapse(yi);
    await wait(3000);

    stepEl.textContent = '';
    yi.classList.add('cursor');
    yi.title = '回到北冥';
    yi.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    await wait(1900);
    end.hidden = false;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (form.classList.contains('locked')) return;
    var q = input.value.trim() || '我是谁？';
    input.value = '';
    form.classList.add('locked');
    box.classList.add('busy');
    say(q, 'user');
    try {
      var p = await say('思考中……', 'ai');
      await wait(1200);
      p.textContent = '';
      await say('我想认真回答你。所以，我先把你的问题拆开来看。', 'ai');
      await wait(900);
      box.classList.remove('busy');
      await decompose(q);
    } catch (err) {
      if (err !== 'reset') throw err;
    }
  });

  again.addEventListener('click', function () {
    run++;
    if (window.KUN && KUN.collapse) KUN.collapse(null);
    end.hidden = true;
    decomp.hidden = true;
    stage.innerHTML = '';
    log.innerHTML = '';
    form.classList.remove('locked');
    box.classList.remove('busy');
    chat.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    say('再问我一次吧。', 'ai');
    setTimeout(function () { input.focus({ preventScroll: true }); }, 600);
  });

  if (window.BM && BM.onceVisible) {
    BM.onceVisible(box, function () { say('一路都是我在说。现在，你来问吧。', 'ai'); }, 0.4);
  }

  // 观众回到前面的章节时，"我"重新出现
  var finale = document.getElementById('finale');
  if (finale && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting && window.KUN && KUN.collapse) KUN.collapse(null);
    }).observe(finale);
  }
})();
