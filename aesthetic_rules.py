# 把 8 条审美标准里能自动量化的部分写成规则，由 shoot_round.py 调用。
# 这些都是代理指标：阈值是排版和无障碍的经验值，结论需要人工复核，并逐轮和人工打分对照校准。
import io
from collections import Counter

import numpy as np
from PIL import Image, ImageFilter

# 素材按文化归类，供「东西方同框率」使用；去底雕塑与原图同名
EAST = {"streams_mountains", "wu_gorge", "mountains_immortals", "zhuangzi_dream", "zhuangzi_dream_zeshin",
        "lily_butterflies", "red_cliff_scroll", "red_cliff_fan", "drinking_moonlight", "laozi_ox", "leibniz_hexagrams"}
WEST = {"creation_of_adam", "creation_of_adam_3d", "descartes", "thinker", "thinker_small", "head_youth", "head_aphrodite",
        "head_alexander", "head_kore", "marey_walking"}

# 标准 1：首屏能不能看到展名和副标题
FIRST_SCREEN_JS = """() => {
  const seen = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode.textContent.trim(), el = walker.currentNode.parentElement;
    if (!t || !el) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width === 0 || r.bottom <= 0 || r.top >= innerHeight || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.1) continue;
    seen.push(t);
  }
  return seen.join(' ');
}"""

# 标准 4：首屏文字样式数。字体族少不等于不乱，粗细、斜体、字距、大写、字号的组合多了一样显得杂
FIRST_STYLES_JS = """() => {
  const styles = {}, walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode.textContent.trim(), el = walker.currentNode.parentElement;
    if (!t || !el) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), fs = parseFloat(cs.fontSize);
    if (r.width === 0 || r.bottom <= 0 || r.top >= innerHeight || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.1) continue;
    const key = [cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), Math.round(fs) + 'px',
      parseInt(cs.fontWeight) >= 600 ? '粗' : '', cs.fontStyle === 'italic' ? '斜' : '',
      parseFloat(cs.letterSpacing) / fs > 0.08 ? '宽字距' : '', cs.textTransform === 'uppercase' ? '大写' : ''].filter(Boolean).join(' ');
    (styles[key] = styles[key] || []).push(t.slice(0, 6));
  }
  return Object.entries(styles).map(([k, v]) => k + '「' + v[0] + '」');
}"""

# 标准 1：贯穿元素。当前视口里面积够大的视觉元素（图片、SVG、canvas、背景图），按身份记下，供逐屏统计
VISIBLE_VISUALS_JS = """() => {
  const keys = new Set(), area = innerWidth * innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0), h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    if (w <= 0 || h <= 0 || w * h < 0.015 * area || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.1) continue;
    const label = el.id ? '#' + el.id : (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '');
    if (el.tagName === 'IMG') keys.add(decodeURIComponent((el.currentSrc || el.src).split('/').pop()));
    else if (el.tagName === 'svg' && !el.parentElement.closest('svg')) keys.add('svg' + label);
    else if (el.tagName === 'CANVAS') keys.add('canvas' + label);
    for (const u of cs.backgroundImage.match(/url\\(["']?[^"')]+/g) || [])
      keys.add(decodeURIComponent(u.replace(/url\\(["']?/, '').split('/').pop()));
  }
  return [...keys];
}"""

# 标准 3、4：字体族、字号阶梯、标题与正文的比例、正文行高与每行字数
TYPO_JS = """() => {
  const items = [];
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (!own) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width === 0 || cs.visibility === 'hidden') continue;
    items.push({el, cs, r, n: own.length});
  }
  const total = items.reduce((a, t) => a + t.n, 0) || 1, fam = {}, sizes = new Set();
  for (const t of items) {
    const f = t.cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    fam[f] = (fam[f] || 0) + t.n;
    sizes.add(Math.round(parseFloat(t.cs.fontSize)));
  }
  const families = Object.entries(fam).sort((a, b) => b[1] - a[1]).map(([f, n]) => [f, Math.round(100 * n / total)]);
  const paras = items.filter(t => t.n >= 40 && t.r.width > 100), issues = [];
  for (const t of paras) {
    const fs = parseFloat(t.cs.fontSize);
    const lhPx = t.cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(t.cs.lineHeight);
    const txt = t.el.textContent.trim(), label = txt.slice(0, 8);
    const cjk = (txt.match(/[\\u4e00-\\u9fff]/g) || []).length / txt.length > 0.3;
    const perLine = Math.round(t.r.width / (cjk ? fs : fs * 0.5)), lines = t.r.height / lhPx;
    if (lhPx / fs < 1.4) issues.push(label + '：行高 ' + (lhPx / fs).toFixed(2));
    if (lines >= 2 && cjk && perLine > 45) issues.push(label + '：每行约 ' + perLine + ' 字');
    if (lines >= 2 && !cjk && perLine > 90) issues.push(label + '：每行约 ' + perLine + ' 字符');
  }
  const h1 = document.querySelector('h1');
  const bodySize = paras.length ? paras.map(t => parseFloat(t.cs.fontSize)).sort((a, b) => a - b)[Math.floor(paras.length / 2)] : null;
  return {families, steps: [...sizes].sort((a, b) => a - b), issues,
          h1Ratio: h1 && bodySize ? parseFloat(getComputedStyle(h1).fontSize) / bodySize : null};
}"""

# 标准 5、6：每屏有哪些视觉元素（图片、背景图、SVG、canvas），用于统计繁度和东西方同框
VISUALS_JS = """() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (r.width < 24 || r.height < 24 || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    const box = {y: r.top + scrollY, h: r.height};
    if (el.tagName === 'IMG') out.push({...box, kind: 'img', name: el.currentSrc || el.src});
    else if (el.tagName === 'image') out.push({...box, kind: 'img', name: el.getAttribute('href') || ''});
    else if (el.tagName === 'svg' && !el.parentElement.closest('svg')) out.push({...box, kind: 'svg', name: ''});
    else if (el.tagName === 'CANVAS') out.push({...box, kind: 'canvas', name: ''});
    for (const u of cs.backgroundImage.match(/url\\(["']?[^"')]+/g) || [])
      out.push({...box, kind: 'img', name: u.replace(/url\\(["']?/, '')});
  }
  return out.map(o => ({...o, name: decodeURIComponent(o.name.split('/').pop().split('?')[0])}));
}"""

# 标准 7：科技套路的可识别特征
CLICHE_JS = """() => {
  const out = [];
  const hue = ([r, g, b]) => { const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d < 40) return null;
    return 60 * (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4); };
  const colors = s => (s.match(/rgba?\\([^)]+\\)/g) || []).map(c => c.match(/[\\d.]+/g).map(Number));
  let glow = 0, purple = 0;
  const where = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (el.getBoundingClientRect().width === 0) continue;
    for (const p of [cs.boxShadow, cs.textShadow, cs.filter]) {
      if (!p || p === 'none') continue;
      const blur = Math.max(0, ...(p.match(/[\\d.]+px/g) || []).map(parseFloat));
      if (blur >= 12 && colors(p).some(c => { const h = hue(c); return h !== null && h >= 180 && h <= 300; })) {
        glow++;
        if (where.length < 4) where.push(el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''));
      }
    }
    if (cs.backgroundImage.includes('gradient') && colors(cs.backgroundImage).some(c => { const h = hue(c); return h !== null && h > 250 && h < 320; })) purple++;
  }
  if (glow) out.push('蓝紫色发光 ' + glow + ' 处（' + where.join('、') + '）');
  if (purple) out.push('紫色渐变 ' + purple + ' 处');
  const libs = [...document.scripts].map(s => s.src).filter(s => /particle|three|vanta/i.test(s));
  if (libs.length) out.push('粒子或 3D 库：' + libs.map(s => s.split('/').pop()).join('、'));
  const big = [...document.querySelectorAll('canvas')].filter(c => { const r = c.getBoundingClientRect();
    return r.width * r.height > 0.5 * innerWidth * innerHeight; }).length;
  if (big) out.push('大面积 canvas ' + big + ' 个（可能是粒子背景）');
  return out;
}"""

# 标准 5：emoji 当图标（图标画风不统一的常见来源）
EMOJI_JS = """() => [...new Set((document.body.innerText.match(/\\p{Extended_Pictographic}/gu) || [])
  .filter(c => { const p = c.codePointAt(0); return p >= 0x1F000 || (p >= 0x2600 && p <= 0x27BF); }))]"""

# 手机端底线：页面能横向滚动，或元素超出屏幕右边且没有被任何 overflow 隐藏的外框裁掉（横向长卷、画廊轨道不算）
MOBILE_CLIP_JS = """() => {
  const out = [], vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push('页面可横向滚动（宽 ' + document.documentElement.scrollWidth + 'px）');
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1 || getComputedStyle(el).position === 'fixed') continue;
    let clipped = false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement)
      if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX) && a.getBoundingClientRect().right <= vw + 1) { clipped = true; break; }
    if (!clipped) out.push(el.tagName + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') + '（右边 ' + Math.round(r.right) + '）');
  }
  return out.slice(0, 10);
}"""

# 手机端底线：点击区域小于 32px（行内文字链接除外）
TAP_JS = """() => {
  const out = [];
  for (const el of document.querySelectorAll('a[href], button, [onclick], input, select, [role=button]')) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (r.width === 0 || cs.visibility === 'hidden' || cs.display === 'inline') continue;
    if (Math.min(r.width, r.height) < 32)
      out.push((el.textContent.trim().slice(0, 8) || el.tagName.toLowerCase()) + '（' + Math.round(r.width) + '×' + Math.round(r.height) + '）');
  }
  return out;
}"""


def first_styles(page):
    styles = page.evaluate(FIRST_STYLES_JS)
    return ("失败" if len(styles) > 6 else "通过", f"{len(styles)} 种：" + "；".join(styles))


def recurring(page):
    """标准 1：逐屏记下面积够大的视觉元素，看有没有一个元素贯穿大半个页面（导航、进度条这类小元素不计）。"""
    vh, height = page.viewport_size["height"], page.evaluate("document.documentElement.scrollHeight")
    seen, screens = Counter(), 0
    for y in range(0, height, vh):
        page.evaluate(f"window.scrollTo(0, {y})")
        page.wait_for_timeout(700)
        seen.update(page.evaluate(VISIBLE_VISUALS_JS))
        screens += 1
    page.evaluate("window.scrollTo(0, 0)")
    top = seen.most_common(3)
    detail = "；".join(f"{k} 出现在 {n}/{screens} 屏" for k, n in top) or "没有大面积视觉元素"
    return ("通过" if top and top[0][1] >= 0.5 * screens else "失败", detail)


def _gray(page, scale=4):
    im = Image.open(io.BytesIO(page.screenshot(type="jpeg", quality=70))).convert("L")
    im = im.resize((im.width // scale, im.height // scale)).filter(ImageFilter.GaussianBlur(1))
    return np.asarray(im).astype(np.int16)


def motion(page, step=200, scale=4):
    """标准 8：动效体量。每滚 200px 截一帧，和上一帧比：既不是「跟着滚动平移」、也不是「固定不动」的像素，
    才算被动画改变（滚动视差、吸顶场景换画面、入场动画、常驻动画都算）。只记录，逐轮比较。"""
    page.evaluate("document.documentElement.style.scrollBehavior = 'auto'")
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(800)
    prev, prev_y, y, areas = _gray(page, scale), 0, 0, []
    while True:
        y += step
        page.evaluate(f"window.scrollTo(0, {y})")
        page.wait_for_timeout(250)
        cur_y = page.evaluate("window.scrollY")
        if cur_y == prev_y:
            break
        cur, d = _gray(page, scale), round((cur_y - prev_y) / scale)
        if 0 < d < cur.shape[0]:
            a = cur[: cur.shape[0] - d]
            moved = (np.abs(a - prev[d:]) > 25) & (np.abs(a - prev[: prev.shape[0] - d]) > 25)
            areas.append(moved.mean())
        prev, prev_y = cur, cur_y
    page.evaluate("window.scrollTo(0, 0)")
    arr = np.array(areas) if areas else np.zeros(1)
    return ("记录", f"平均 {100 * arr.mean():.0f}% 画面在动；画面变化超过 25% 的滚动步占 {100 * (arr > 0.25).mean():.0f}%"
                   f"（共 {len(areas)} 步）")


def seams(shot, tile_h):
    """标准 8：转场硬切。长图里贯穿整个屏宽、上下颜色突变的分界线（章节背景直接切换、整宽图片的硬边）。
    拼接缝附近不计。只记录：硬分界越多，越像一页一页翻 PPT。"""
    arr = np.asarray(shot.convert("L").resize((200, shot.height))).astype(np.int16)
    jump = (np.abs(arr[1:] - arr[:-1]) > 40).mean(axis=1)
    rows = []
    for i in np.nonzero(jump >= 0.9)[0] + 1:
        if min(i % tile_h, tile_h - i % tile_h) > 3 and (not rows or i - rows[-1] > 30):
            rows.append(int(i))
    where = "、".join(f"第 {r // tile_h + 1} 屏" for r in rows)
    return ("记录", f"{len(rows)} 处" + (f"（{where}）" if rows else ""))


def first_screen(page):
    text = page.evaluate(FIRST_SCREEN_JS)
    compact = "".join(text.split()).lower()  # 标题常被拆成单字分别上色，中间会多出空格
    # 第 4 轮起副标题按设计改为「DEEP · SEEK」，「I think, therefore I am?」移到终章；两种都算有副标题
    subtitle = "ithink" in compact or ("deep" in compact and "seek" in compact)
    missing = [k for k, ok in (("北冥有鱼", "北冥有鱼" in compact), ("副标题（DEEP · SEEK）", subtitle)) if not ok]
    return ("失败", "首屏看不到：" + "、".join(missing)) if missing else ("通过", "")


def color_area(shot):
    """标准 2：整页截图按像素面积统计 黑白灰 / 蓝 / 朱红 / 其他，目标约 70 / 25 / 5。"""
    small = shot.convert("RGB")
    small.thumbnail((400, 100000))
    hsv = np.asarray(small.convert("HSV")).reshape(-1, 3).astype(float)
    h, s, v = hsv[:, 0] * 360 / 255, hsv[:, 1] / 255, hsv[:, 2] / 255
    neutral = s * v < 0.12
    blue = ~neutral & (h >= 205) & (h <= 245)
    red = ~neutral & ((h <= 15) | (h >= 350))
    share = {k: round(100 * m.mean()) for k, m in
             (("黑白灰", neutral), ("蓝", blue), ("朱红", red), ("其他", ~neutral & ~blue & ~red))}
    detail = " / ".join(f"{k} {v}%" for k, v in share.items()) + "（目标约 70/25/5）"
    bad = share["其他"] > 10 or share["朱红"] > 8
    return ("失败" if bad else "通过", detail)


def typography(page):
    t = page.evaluate(TYPO_JS)
    fams = [f"{f} {p}%" for f, p in t["families"] if p >= 3]
    family = ("失败" if len(fams) > 3 else "通过", "、".join(fams))
    ratio = t["h1Ratio"]
    hier_bad = len(t["steps"]) > 10 or (ratio is not None and ratio < 2.5)
    hierarchy = ("失败" if hier_bad else "通过",
                 f"字号 {len(t['steps'])} 级（{'/'.join(map(str, t['steps']))}px）；"
                 f"主标题是正文的 {ratio:.1f} 倍" if ratio else f"字号 {len(t['steps'])} 级；没找到 h1 或正文")
    return family, hierarchy, t["issues"]


def _screens(items, page_h, screen_h):
    """把元素分到每一屏：元素至少有 30% 高度落在这一屏里才算。"""
    screens = []
    for top in range(0, max(int(page_h), 1), screen_h):
        inside = [it for it in items
                  if min(it["y"] + it["h"], top + screen_h) - max(it["y"], top) >= 0.3 * min(it["h"], screen_h)]
        screens.append(inside)
    return screens


def east_west(items, page_h, screen_h):
    """标准 6：有图的屏里，东方和西方素材同时出现的比例。"""
    with_art, both = 0, 0
    for inside in _screens([i for i in items if i["kind"] == "img"], page_h, screen_h):
        stems = {i["name"].rsplit(".", 1)[0] for i in inside}
        e, w = bool(stems & EAST), bool(stems & WEST)
        if e or w:
            with_art += 1
            both += e and w
    detail = f"同框 {both} 屏 / 有作品 {with_art} 屏"
    return ("失败" if both == 0 else "通过", detail)


def density(items, page_h, screen_h):
    """标准 5：每屏视觉元素数（图片、SVG、canvas），只记录，用来看「繁」的程度。"""
    counts = [len(s) for s in _screens(items, page_h, screen_h)]
    return ("记录", f"每屏 {'/'.join(map(str, counts))}，平均 {sum(counts) / max(len(counts), 1):.1f}")


def _saliency(gray):
    """谱残差显著性（Hou & Zhang, 2007）：估计画面里哪里最抓眼。"""
    f = np.fft.fft2(gray)
    log_amp, phase = np.log(np.abs(f) + 1e-8), np.angle(f)
    smooth = sum(np.roll(np.roll(log_amp, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9
    sal = np.abs(np.fft.ifft2(np.exp(log_amp - smooth + 1j * phase))) ** 2
    sal_img = Image.fromarray((255 * sal / sal.max()).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    return np.asarray(sal_img).astype(float)


def focus(shot, screen_h):
    """标准 3：每屏显著性有多集中（最抓眼的 10% 区域占全部显著性的比例）。焦点越明确数值越高，只记录。"""
    values = []
    for top in range(0, shot.height, screen_h):
        part = shot.crop((0, top, shot.width, min(top + screen_h, shot.height))).convert("L")
        if part.height < screen_h * 0.5:
            break
        arr = np.asarray(part.resize((96, max(8, round(96 * part.height / part.width))))).astype(float)
        if arr.std() < 4:
            values.append("空")
            continue
        sal = np.sort(_saliency(arr).ravel())[::-1]
        values.append(f"{sal[: len(sal) // 10].sum() / sal.sum():.2f}")
    return ("记录", "每屏 " + "/".join(values))
