# 每轮迭代后运行：给网页截图、跑规则检查，并备份当轮代码，供报告逐轮对比。
# 用法：py 10_笔试/shoot_round.py 3 [项目] [网站文件夹]
#       （3 是轮次；项目默认 beiming，旧的穆夏是 mucha；补跑旧轮次时把那一轮的代码和素材放到别处，传第三个参数）
# 输出：10_笔试/rounds_<项目>/R03/ 下的 开屏.png（有开屏时）、首屏.png、整页.png、手机.png、手机整页.png、规则检查.txt、代码/
#       10_笔试/rounds_<项目>/规则汇总.csv 每轮一行
import csv
import io
import shutil
import sys
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "02_规则检查"))
import run_rules as rules  # noqa: E402

import aesthetic_rules as ar  # noqa: E402

PROJECT = sys.argv[2] if len(sys.argv) > 2 else "beiming"
SITE = Path(sys.argv[3]) if len(sys.argv) > 3 else Path.home() / "Desktop" / {"beiming": "beiming", "mucha": "mucha_exhibition"}[PROJECT]
ROUNDS = Path(__file__).parent / f"rounds_{PROJECT}"
ROUND = int(sys.argv[1])
OUT = ROUNDS / f"R{ROUND:02d}"
URL = (SITE / "index.html").as_uri()

# 名字, 视口宽, 视口高, 是否整页
SHOTS = [
    ("首屏", 1440, 900, False),
    ("整页", 1440, 900, True),
    ("手机", 375, 812, False),
    ("手机整页", 375, 812, True),
]

# 开屏只播一次（看过后页面在 localStorage 记 beiming-intro=1）；拍正文和跑规则前先记上，直接进正文
SKIP_INTRO_JS = "try { localStorage.setItem('beiming-intro', '1'); } catch (e) {}"

# 页面图片是滚动到才加载、加载完才淡入的，整页截图前要滚一遍并等图片加载完
LOAD_ALL_JS = """async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await sleep(150); }
  const t0 = Date.now();
  while (Date.now() - t0 < 20000 && ![...document.images].every(i => i.complete)) await sleep(200);
  scrollTo(0, 0);
}"""

# 新增的三条：图片加载失败、图片被拉伸变形（object-fit 为 fill 时比例不对）、图片被裁掉较多、文字小于 12px
IMAGE_JS = """() => {
  const broken = [], stretched = [], cropped = [];
  for (const img of document.images) {
    const r = img.getBoundingClientRect();
    if (r.width < 20 || r.height < 20) continue;
    const name = (img.getAttribute('src') || '').split('/').pop();
    if (!img.naturalWidth) { broken.push(name); continue; }
    const natural = img.naturalWidth / img.naturalHeight, shown = r.width / r.height;
    const diff = Math.abs(shown - natural) / natural;
    const fit = getComputedStyle(img).objectFit;
    if (fit === 'fill' && diff > 0.03) stretched.push(name);
    if (fit === 'cover' && diff > 0.15) cropped.push(name + '（约裁掉 ' + Math.round(100 * (1 - Math.min(shown, natural) / Math.max(shown, natural))) + '%）');
  }
  return {broken, stretched, cropped};
}"""

SMALL_TEXT_JS = """() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || getComputedStyle(el).visibility === 'hidden') continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12) out.push(own.slice(0, 12) + '（' + size + 'px）');
  }
  return out;
}"""


# 标准 2「颜色语义」的可自动部分：页面上所有文字、背景、边框、渐变、SVG 颜色归成 黑白灰 / 蓝 / 朱红 / 其他。
# canvas 里画的颜色看不到，图片颜色由 image_saturation 另查。
PALETTE_JS = """() => {
  const parse = s => (s.match(/rgba?\\([^)]+\\)/g) || []).map(c => c.match(/[\\d.]+/g).map(Number));
  const kind = ([r, g, b, a = 1]) => {
    if (a < 0.05) return null;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d < 24) return '黑白灰';
    let h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h >= 205 && h <= 245) return '蓝';
    if (h <= 15 || h >= 350) return '朱红';
    return '其他';
  };
  const count = {'黑白灰': 0, '蓝': 0, '朱红': 0, '其他': 0}, others = {};
  for (const el of document.querySelectorAll('body, body *')) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') continue;
    const props = [cs.backgroundColor, cs.backgroundImage, cs.boxShadow, cs.textShadow];
    if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) props.push(cs.color);
    if (parseFloat(cs.borderTopWidth) > 0) props.push(cs.borderTopColor);
    if (el instanceof SVGElement) props.push(cs.fill, cs.stroke);
    for (const p of props) for (const c of parse(p)) {
      const k = kind(c);
      if (!k) continue;
      count[k]++;
      if (k === '其他') { const key = 'rgb(' + c.slice(0, 3).join(',') + ')'; others[key] = (others[key] || 0) + 1; }
    }
  }
  return {count, others: Object.entries(others).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => c + '×' + n)};
}"""

# 标准 6「文字可读」的可自动部分：WCAG 对比度，正文要 ≥4.5，大字 ≥3。背景是图片或渐变时算不准，跳过留给人工。
CONTRAST_JS = """() => {
  const rgb = s => { const m = s.match(/[\\d.]+/g); return m ? m.map(Number) : null; };
  const lum = c => { const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
                     return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const bgOf = el => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') return null;
      const c = rgb(cs.backgroundColor);
      if (c && (c[3] ?? 1) > 0.5) return c;
    }
    return [255, 255, 255];
  };
  const out = [];
  let skipped = 0;
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (!own) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width === 0 || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const bg = bgOf(el);
    if (!bg) { skipped++; continue; }
    const fg = rgb(cs.color), a = fg[3] ?? 1, mix = [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a));
    const l1 = lum(mix), l2 = lum(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(cs.fontSize), big = size >= 24 || (parseInt(cs.fontWeight) >= 700 && size >= 18.66);
    if (ratio < (big ? 3 : 4.5)) out.push(own.slice(0, 10) + '（' + ratio.toFixed(2) + '）');
  }
  return {low: out, skipped};
}"""

IMAGE_BOXES_JS = """() => [...document.images].map(img => {
  const r = img.getBoundingClientRect();
  return {name: (img.getAttribute('src') || '').split('/').pop(), x: r.left + scrollX, y: r.top + scrollY,
          w: r.width, h: r.height};
}).filter(b => b.w >= 40 && b.h >= 40)"""


def image_saturation(page, shot):
    """标准 2 的图片部分：在整页截图上量每张图「实际显示出来」的饱和度（已包含滤镜、混合模式的效果）。"""
    boxes = page.evaluate(IMAGE_BOXES_JS)
    shot = shot.convert("HSV")
    colorful = []
    for b in boxes:
        box = (int(b["x"]), int(b["y"]), int(b["x"] + b["w"]), int(b["y"] + b["h"]))
        region = shot.crop(box)
        if region.width == 0 or region.height == 0:
            continue
        region.thumbnail((200, 200))
        h, s, v = (ch.tobytes() for ch in region.split())
        lit = [(hh, ss) for hh, ss, vv in zip(h, s, v) if vv > 40]
        if not lit:
            continue
        sat = sum(ss for _, ss in lit) / len(lit) / 255
        if sat > 0.2:
            hue = sorted(hh for hh, ss in lit if ss > 50)
            blue = hue and 145 <= hue[len(hue) // 2] <= 175  # PIL 色相 0–255，克莱因蓝约 158
            colorful.append(f"{b['name']}（饱和度 {sat:.2f}{'，偏蓝' if blue else ''}）")
    return colorful


def scroll_capture(page):
    """一屏一屏滚动、等动画播完再截，最后拼成长图。滚动触发和吸顶场景较多的页面，一次性整页截图会大片空白。"""
    page.evaluate("document.documentElement.style.scrollBehavior = 'auto'")
    vh = page.viewport_size["height"]
    tiles, y = [], 0
    while y < page.evaluate("document.documentElement.scrollHeight"):
        page.evaluate(f"window.scrollTo(0, {y})")
        page.wait_for_timeout(900)
        offset = y - page.evaluate("window.scrollY")  # 到底时浏览器停在最大滚动位置，只取新露出的部分
        tile = Image.open(io.BytesIO(page.screenshot())).convert("RGB")
        tiles.append(tile.crop((0, offset, tile.width, tile.height)))
        y += vh
    long = Image.new("RGB", (tiles[0].width, sum(t.height for t in tiles)))
    top = 0
    for t in tiles:
        long.paste(t, (0, top))
        top += t.height
    page.evaluate("window.scrollTo(0, 0)")
    return long


def shoot_intro(browser):
    """开屏只播一次，带 ?intro 强制重播：打字过程按时间截帧，再点击进入，拍光标散开，拼成一张带时间的总览。"""
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(URL + "?intro")
    if not page.query_selector("#intro"):
        page.close()
        return
    frames, t = [], 0.0
    for at in (0.5, 1.5, 2.5, 4):
        page.wait_for_timeout(int((at - t) * 1000))
        t = at
        frames.append((f"{at:.1f}s", page.screenshot()))
    page.mouse.click(720, 450)
    t = 0.0
    for at in (0.15, 0.3, 0.45, 0.6, 0.8, 1.2, 2, 3.5):
        page.wait_for_timeout(int((at - t) * 1000))
        t = at
        frames.append((f"点击后 {at:.1f}s", page.screenshot()))
    page.close()
    cell_w, cell_h, cols = 480, 300, 4
    sheet = Image.new("RGB", (cols * cell_w, -(-len(frames) // cols) * (cell_h + 28)), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("msyh.ttc", 18)
    for i, (label, png) in enumerate(frames):
        x, y = (i % cols) * cell_w, (i // cols) * (cell_h + 28)
        sheet.paste(Image.open(io.BytesIO(png)).convert("RGB").resize((cell_w - 6, cell_h)), (x, y + 28))
        draw.text((x + 4, y + 3), label, fill=(220, 0, 0), font=font)
    sheet.save(OUT / "开屏.png")


def shoot(browser):
    for name, w, h, full in SHOTS:
        page = browser.new_page(viewport={"width": w, "height": h})
        page.add_init_script(SKIP_INTRO_JS)
        page.goto(URL)
        page.wait_for_load_state("networkidle")
        if full:
            page.evaluate(LOAD_ALL_JS)
            scroll_capture(page).save(OUT / f"{name}.png")
        else:
            page.wait_for_timeout(1200)
            page.screenshot(path=str(OUT / f"{name}.png"))
        page.close()


def check(browser):
    desktop = browser.new_page(viewport={"width": 1280, "height": 800})
    mobile = browser.new_page(viewport={"width": rules.SCREEN_WIDTH, "height": 812})
    for p in (desktop, mobile):
        p.add_init_script(SKIP_INTRO_JS)
        p.on("dialog", lambda d: (rules.dialog_log.append(d.message), d.dismiss()))
    results = {}  # 键名前缀：「底线」或对应的标准编号，方便报告按标准汇总

    desktop.goto(URL)
    desktop.wait_for_timeout(2000)
    results["1概念·首屏展名（桌面）"] = ar.first_screen(desktop)
    mobile.goto(URL)
    mobile.wait_for_timeout(2000)
    results["1概念·首屏展名（手机）"] = ar.first_screen(mobile)
    results["1叙事·贯穿元素"] = ar.recurring(desktop)

    desktop.goto(URL)
    desktop.evaluate(LOAD_ALL_JS)
    shot = scroll_capture(desktop)
    page_h, screen_h = desktop.evaluate("document.documentElement.scrollHeight"), desktop.viewport_size["height"]

    palette = desktop.evaluate(PALETTE_JS)
    results["2颜色·色板外颜色"] = rules.verdict(palette["others"])
    results["2颜色·面积比例"] = ar.color_area(shot)
    results["2颜色·彩色图片（人工看是否该去色）"] = rules.verdict(image_saturation(desktop, shot))

    family, hierarchy, para_issues = ar.typography(desktop)
    results["3层级·字号阶梯与标题比例"] = hierarchy
    results["3层级·每屏焦点集中度"] = ar.focus(shot, screen_h)
    results["4字体·字体族（不超过3种）"] = family
    desktop.evaluate("window.scrollTo(0, 0)")
    desktop.wait_for_timeout(800)
    results["4字体·首屏文字样式数（不超过6种）"] = ar.first_styles(desktop)
    results["4字体·正文行高与行宽"] = rules.verdict(para_issues)
    contrast = desktop.evaluate(CONTRAST_JS)
    low = [t + (f"×{n}" if n > 1 else "") for t, n in Counter(contrast["low"]).items()]
    total = len(contrast["low"])
    results["4字体·对比度不足"] = rules.verdict(low[:15] + ([f"共 {total} 处"] if total > len(low[:15]) else []))
    results["4字体·小于12px"] = rules.verdict(desktop.evaluate(SMALL_TEXT_JS))

    visuals = desktop.evaluate(ar.VISUALS_JS)
    results["5拼贴·每屏视觉元素数"] = ar.density(visuals, page_h, screen_h)
    results["5拼贴·emoji当图标"] = rules.verdict(desktop.evaluate(ar.EMOJI_JS))
    img = desktop.evaluate(IMAGE_JS)
    results["5拼贴·图片变形"] = rules.verdict(img["stretched"])
    results["5拼贴·图片裁切较多（人工看是否裁到脸或题字）"] = rules.verdict(img["cropped"])
    results["6东西方·同框率"] = ar.east_west(visuals, page_h, screen_h)
    results["7套路·发光/紫色渐变/粒子"] = rules.verdict(desktop.evaluate(ar.CLICHE_JS))

    desktop.goto(URL)
    results["8交互·锚点"] = rules.verdict(rules.check_anchor(desktop))
    desktop.goto(URL)
    desktop.evaluate(LOAD_ALL_JS)  # 先触发全部滚动入场动画，否则悬停时撞上上滑动画会误报
    desktop.wait_for_timeout(1500)
    results["8交互·悬停误导"] = rules.verdict(rules.check_hover(desktop))
    desktop.goto(URL)
    results["8交互·死按钮"] = rules.verdict(rules.check_button(desktop))
    desktop.goto(URL)
    desktop.wait_for_timeout(1500)
    results["8动效·动效面积"] = ar.motion(desktop)
    results["8动效·转场硬切"] = ar.seams(shot, screen_h)

    results["底线·图片加载失败"] = rules.verdict(img["broken"])
    mobile.goto(URL)
    mobile.wait_for_timeout(1500)
    results["底线·手机超出"] = rules.verdict(mobile.evaluate(ar.MOBILE_CLIP_JS))
    mobile.goto(URL)
    mobile.evaluate(LOAD_ALL_JS)
    results["底线·手机点击区域小于32px"] = rules.verdict(mobile.evaluate(ar.TAP_JS))
    results["记录·对比度未测"] = ("记录", f"{contrast['skipped']} 处文字背景是图片或渐变，需人工看")
    return results


OUT.mkdir(parents=True, exist_ok=True)
CODE = OUT / "代码"
for f in SITE.rglob("*"):
    if f.suffix in (".html", ".css", ".js", ".svg", ".md") and "assets" not in f.relative_to(SITE).parts:
        (CODE / f.relative_to(SITE)).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(f, CODE / f.relative_to(SITE))

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    print("截图中……")
    shoot_intro(browser)
    shoot(browser)
    print("规则检查中……（悬停检查要逐个元素试，可能要一两分钟）")
    results = check(browser)
    browser.close()

lines = [f"{k}：{v[0]}" + (f"  {v[1]}" if v[1] else "") for k, v in results.items()]
(OUT / "规则检查.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\n".join(lines))

summary = ROUNDS / "规则汇总.csv"
rows = list(csv.reader(open(summary, encoding="utf-8-sig"))) if summary.exists() else []
head = ["轮次"] + list(results)
rows = [r for r in rows[1:] if r and r[0] != f"R{ROUND:02d}"]
rows.append([f"R{ROUND:02d}"] + [v[0] if not v[1] else f"{v[0]}：{v[1]}" for v in results.values()])
rows.sort(key=lambda r: r[0])
with open(summary, "w", encoding="utf-8-sig", newline="") as f:
    csv.writer(f).writerows([head] + rows)
print("已保存：", OUT)
