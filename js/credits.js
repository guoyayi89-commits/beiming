(function () {
  'use strict';

  var CMA = 'Cleveland Museum of Art';
  var MET = 'The Metropolitan Museum of Art';
  var WM = 'Wikimedia Commons';
  var WMF = 'https://commons.wikimedia.org/wiki/File:';

  // 与 CREDITS.md 一致
  var rows = [
    ['thinker.jpg', '罗丹《思想者》（放大版）（The Thinker, 1880–81）', CMA, 'https://clevelandart.org/art/1917.42', 'CC0'],
    ['thinker_small.jpg', '罗丹《思想者》（The Thinker, c. 1880）', CMA, 'https://clevelandart.org/art/1979.138', 'CC0'],
    ['head_youth.jpg', '古罗马 少年头像（Portrait Head of a Youth, 1–100 CE）', CMA, 'https://clevelandart.org/art/1947.188', 'CC0'],
    ['head_aphrodite.jpg', '古罗马 阿佛洛狄忒头像（Head of Aphrodite, c. 100–200 CE）', CMA, 'https://clevelandart.org/art/1926.53', 'CC0'],
    ['head_alexander.jpg', '古希腊 亚历山大头像（Head of Alexander the Great, c. 300–200 BCE）', CMA, 'https://clevelandart.org/art/1927.209', 'CC0'],
    ['head_kore.jpg', '古希腊 少女头像（Head of a Kore, c. 480–460 BCE）', CMA, 'https://clevelandart.org/art/1924.538', 'CC0'],
    ['streams_mountains.jpg', '北宋《溪山无尽图》（Streams and Mountains without End, 1100–1150）', CMA, 'https://clevelandart.org/art/1953.126', 'CC0'],
    ['wu_gorge.jpg', '明《巫峡云涛》（Clouds and Waves at the Wu Gorge, c. 1547–67）', CMA, 'https://clevelandart.org/art/1968.213', 'CC0'],
    ['mountains_immortals.jpg', '元《仙山图》（Mountains of the Immortals, 1300–1370）', CMA, 'https://clevelandart.org/art/1997.95', 'CC0'],
    ['lily_butterflies.jpg', '元《百合蝴蝶》（Lily and Butterflies, 1300s）', CMA, 'https://clevelandart.org/art/1971.132', 'CC0'],
    ['drinking_moonlight.jpg', '南宋《月下饮酒》（Drinking in the Moonlight, late 1100s–early 1200s）', CMA, 'https://clevelandart.org/art/1997.89', 'CC0'],
    ['red_cliff_scroll.jpg', '明 张瑞图《后赤壁赋图》（Illustration of Su Shi’s “Second Rhapsody on Red Cliff”, dated 1628）', MET, 'https://www.metmuseum.org/art/collection/search/48969', 'CC0'],
    ['red_cliff_fan.jpg', '元/明 佚名《后赤壁赋图》团扇（Illustration of Su Shi’s “Second Rhapsody on Red Cliff”, late 14th–early 15th century）', MET, 'https://www.metmuseum.org/art/collection/search/44451', 'CC0'],
    ['descartes.jpg', '弗兰斯·哈尔斯《笛卡尔像》（Frans Hals - Portret van René Descartes.jpg）', WM, WMF + 'Frans_Hals_-_Portret_van_Ren%C3%A9_Descartes.jpg', 'Public domain'],
    ['leibniz_hexagrams.jpg', '莱布尼茨收藏的伏羲六十四卦图（Diagram of I Ching hexagrams owned by Gottfried Wilhelm Leibniz, 1701.jpg）', WM, WMF + 'Diagram_of_I_Ching_hexagrams_owned_by_Gottfried_Wilhelm_Leibniz,_1701.jpg', 'Public domain'],
    ['earthrise.jpg', '从月球看地球升起（NASA）（Earthrise over Compton crater -LRO full res.jpg）', WM, WMF + 'Earthrise_over_Compton_crater_-LRO_full_res.jpg', 'Public domain'],
    ['moon.jpg', '满月（NASA）（WAC nearside 24000.tif）', WM, WMF + 'WAC_nearside_24000.tif', 'Public domain'],
    ['zhuangzi_dream.jpg', '明 陆治《梦蝶图》（Dschuang-Dsi-Schmetterlingstraum-Zhuangzi-Butterfly-Dream.jpg）', WM, WMF + 'Dschuang-Dsi-Schmetterlingstraum-Zhuangzi-Butterfly-Dream.jpg', 'Public domain'],
    ['zhuangzi_dream_zeshin.jpg', '日本 柴田是真《庄周梦蝶》（\'Zhuangzi Dreaming of a Butterfly\' by Shibata Zeshin, 1888, Honolulu Museum of Art, 13879.1.JPG）', WM, WMF + '%27Zhuangzi_Dreaming_of_a_Butterfly%27_by_Shibata_Zeshin,_1888,_Honolulu_Museum_of_Art,_13879.1.JPG', 'Public domain'],
    ['laozi_ox.jpg', '明 张路《老子骑牛图》（老子骑牛轴.明.张路画.纸本浅设色.台北故宫博物院藏.tif）', WM, WMF + '%E8%80%81%E5%AD%90%E9%AA%91%E7%89%9B%E8%BD%B4.%E6%98%8E.%E5%BC%A0%E8%B7%AF%E7%94%BB.%E7%BA%B8%E6%9C%AC%E6%B5%85%E8%AE%BE%E8%89%B2.%E5%8F%B0%E5%8C%97%E6%95%85%E5%AE%AB%E5%8D%9A%E7%89%A9%E9%99%A2%E8%97%8F.tif', 'Public domain'],
    ['marey_walking.jpg', '马雷 连续摄影《负重行走的人》（Gehender Mann ein Gewicht tragend 1885.jpg）', WM, WMF + 'Gehender_Mann_ein_Gewicht_tragend_1885.jpg', 'Public domain'],
    ['creation_of_adam_3d.png', '米开朗基罗《创造亚当》局部，转灰阶、压暗四周（Michelangelo - Creation of Adam (cropped).jpg）', WM, WMF + 'Michelangelo_-_Creation_of_Adam_(cropped).jpg', 'Public domain']
  ];

  var note = document.getElementById('footNote');
  if (note) {
    note.innerHTML = '<span class="zhu">虚构展览</span>，灵感来自 DeepSeek，与官方无关。' +
      '<br>以下图片除注明外均为公有领域或 CC0 授权。';
  }

  var box = document.getElementById('creditsTable');
  if (!box) return;

  var table = document.createElement('table');
  var head = table.createTHead().insertRow();
  ['文件', '作品', '来源', '授权'].forEach(function (h) {
    var th = document.createElement('th');
    th.textContent = h;
    head.appendChild(th);
  });
  var tb = table.createTBody();
  rows.forEach(function (r) {
    var tr = tb.insertRow();
    tr.insertCell().textContent = r[0];
    tr.insertCell().textContent = r[1];
    var src = tr.insertCell();
    if (r[3]) {
      var a = document.createElement('a');
      a.href = r[3];
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = r[2];
      src.appendChild(a);
    } else src.textContent = r[2];
    tr.insertCell().textContent = r[4];
  });
  box.appendChild(table);

  var extra = document.createElement('div');
  extra.className = 'credits-extra';
  extra.innerHTML =
    '<p><code>assets/cutouts/</code> 里是上表雕塑照片的去底版本（rembg 自动抠图）。</p>' +
    '<p><code>assets/texts.js</code> 里的古文原文（《庄子》逍遥游、齐物论、秋水，苏轼前后《赤壁赋》）来自' +
    '<a href="https://zh.wikisource.org/" target="_blank" rel="noopener">维基文库</a>，公有领域，已转为简体。</p>';
  box.appendChild(extra);
})();
