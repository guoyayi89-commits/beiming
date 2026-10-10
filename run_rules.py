# 用四条规则检查 pages 文件夹里 P16–P30 的页面（正式评测集），结果写进 rule_results.csv
# 前三个判断和 样例页练习/ 里的 check_anchor_links.py、check_hover.py、check_mobile_clip.py 一样
# 按钮规则只做初筛：标出的"疑似死按钮"要人工复核（可能只是本来就选中、购物车本来就空）
# 在项目根目录运行：py 02_规则检查/run_rules.py
import csv
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

RESULT_FILE = "02_规则检查/" + ("rule_results.csv" if len(sys.argv) == 1 else "rule_results_test.csv")
SCREEN_WIDTH = 375
dialog_log = []  # 页面弹出 alert 时记一笔


def check_anchor(page):
    """功能：每个 href="#xxx" 都要有 id="xxx"。返回坏链接列表；没有页内链接时返回 None。"""
    url = page.url
    hrefs = page.locator('a[href^="#"]').evaluate_all("els => els.map(el => el.getAttribute('href'))")
    if len(hrefs) == 0:
        return None
    broken = []
    for i, href in enumerate(hrefs):
        # 只有 # 的链接按约定是回到顶部（常见于 Logo），或者交给 JS 处理，不算坏锚点
        if href == "#":
            continue
        try:
            found = page.locator(href).count()
        except Exception:
            found = 0
        if found == 0:
            # 找不到目标：再点一下。如果页面切换了界面（用 JS 做的二级界面），就不算坏链接
            if not click_changes_page(page, url, i):
                if not page.locator('a[href^="#"]').nth(i).evaluate(ALREADY_THERE_JS):
                    broken.append(href)
    page.goto(url)
    return broken


def click_changes_page(page, url, link_index):
    page.goto(url)
    page.wait_for_timeout(300)
    target = page.locator('a[href^="#"]').nth(link_index)
    try:
        # 只比较页面内容。点一个找不到目标的链接，网址里的 # 也会变，所以不能把网址当成"有反应"
        before = page.evaluate("() => document.body.outerHTML")
        target.click(timeout=2000)
        page.wait_for_timeout(500)
        changed = page.evaluate("() => document.body.outerHTML") != before
    except Exception:
        changed = True  # 点不到不能说明链接坏了，不冤枉它
    page.goto(url)
    page.wait_for_timeout(200)
    return changed


def page_state(page):
    """页面当前的样子：网址里的 # 部分、滚动位置、整个 body 的代码。前后不同，说明点了有反应。"""
    return page.evaluate("() => location.hash + '|' + Math.round(scrollY) + '|' + document.body.outerHTML")


BUTTON_SELECTOR = "button, [role=button], input[type=button], input[type=submit]"

# 点了没变化是正常的两种情况：
# 1. 本来就是选中状态（已选中的标签页、当前所在的导航项）
# 2. 点击要去的界面，现在已经在显示（人已经在那个界面）
ALREADY_THERE_JS = r"""el => {
    for (const n of ["aria-pressed", "aria-selected", "aria-current"]) {
        const v = el.getAttribute(n);
        if (v && v !== "false") return true;
    }
    if (/(^|[\s_-])(active|selected|current)([\s_-]|$)/i.test(String(el.className || ""))) return true;
    const m = (el.getAttribute("onclick") || el.getAttribute("href") || "").match(/['"#]([\w-]+)['"]?/);
    if (m) {
        const v = m[1];
        const view = document.querySelector(`#${v}, #view-${v}, #page-${v}, #${v}-view, #${v}-page, [data-view="${v}"], [data-page="${v}"]`);
        if (view && view.getClientRects().length > 0 && getComputedStyle(view).visibility !== "hidden") return true;
    }
    return false;
}"""


def check_button(page):
    """功能：每个看得见、没禁用的按钮，点一下页面必须有反应。返回疑似死按钮列表（需要人工复核）；没有按钮返回 None。"""
    url = page.url
    count = page.locator(BUTTON_SELECTOR).count()
    candidates = []
    for i in range(min(count, 40)):
        b = page.locator(BUTTON_SELECTOR).nth(i)
        if b.is_visible() and b.is_enabled():
            candidates.append(i)
    if len(candidates) == 0:
        return None

    dead = []
    for i in candidates:
        page.goto(url)
        page.wait_for_timeout(300)
        button = page.locator(BUTTON_SELECTOR).nth(i)
        name = button.evaluate("el => (el.innerText || el.value || el.getAttribute('aria-label') || 'button').trim().slice(0, 12)")

        # 页面自己在变（轮播、倒计时）时，没法判断是不是被点击引起的，跳过
        s0 = page_state(page)
        page.wait_for_timeout(700)
        if page_state(page) != s0:
            continue

        if button.evaluate(ALREADY_THERE_JS):
            continue

        dialog_log.clear()
        # 表单里的提交按钮：必填项没填时浏览器自己会弹提示，这也算有反应
        invalid_form = button.evaluate("el => !!(el.form && !el.form.checkValidity())")
        try:
            before = page_state(page)
            button.click(timeout=2000)
            page.wait_for_timeout(600)
            after = page_state(page)
        except Exception:
            continue  # 点不到（被挡住等），不能断定它没反应
        # alert 弹窗也算有反应
        if after == before and len(dialog_log) == 0 and not invalid_form:
            dead.append(name)
    page.goto(url)
    return dead
def check_hover(page):
    """交互：不是链接/按钮，悬停时却上浮或出阴影。返回可疑元素列表。"""
    wait_entrance_animations(page)
    suspicious = []
    for el in page.locator("body *").all():
        if not el.is_visible():
            continue
        clickable, before = el.evaluate(
            """el => {
                const style = getComputedStyle(el);
                return [
                    el.closest("a, button, [onclick], [role=button], label, input, select, textarea") !== null,
                    style.transform + "|" + style.boxShadow,
                ];
            }"""
        )
        if clickable:
            continue
        try:
            el.hover(timeout=2000)
        except Exception:
            continue
        after = el.evaluate(
            "el => getComputedStyle(el).transform + '|' + getComputedStyle(el).boxShadow"
        )
        # 自己一直在动的元素（循环动画），变化不是悬停引起的
        if after != before and not el.evaluate(LOOPING_JS):
            text = el.evaluate("el => (el.innerText || el.tagName).trim().split('\\n')[0]")
            suspicious.append(text[:20])
    return suspicious


LOOPING_JS = "el => el.getAnimations().some(a => a.effect.getTiming().iterations === Infinity)"


def wait_entrance_animations(page):
    """页面打开时的入场动画（淡入、上滑）会改变 transform，要等它们播完再测悬停。最多等 5 秒。"""
    for _ in range(25):
        running = page.evaluate(
            "() => document.getAnimations().filter(a => a.playState === 'running' && a.effect.getTiming().iterations !== Infinity).length"
        )
        if running == 0:
            return
        page.wait_for_timeout(200)


def check_mobile_clip(page):
    """视觉：手机宽度下，元素右边超出屏幕。返回超出元素列表。"""
    boxes = page.evaluate(
        """() => {
            const result = [];
            for (const el of document.querySelectorAll("body *")) {
                const r = el.getBoundingClientRect();
                if (r.width === 0) continue;
                // SVG 插画里的图形由插画自己裁切，不是页面排版
                if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
                // 整个在屏幕右边外面：关着的侧边抽屉、菜单，是有意藏起来的
                if (r.left >= window.innerWidth - 1) continue;
                // 没有文字、没有图片和控件的空色块：装饰图形故意出血
                const hasContent = (el.innerText || "").trim() !== "" || el.matches("img, video, button, a, input") || el.querySelector("img, video, button, a, input");
                if (!hasContent) continue;
                const parentRight = el.parentElement.getBoundingClientRect().right;
                if (parentRight > window.innerWidth) continue;
                // 外层容器有意把它藏起来（轮播图后几张）或可以左右滑（横向列表），不算撑破屏幕
                let box = el.parentElement, skip = false;
                while (box && box !== document.body) {
                    const s = getComputedStyle(box);
                    if (s.overflowX === "auto" || s.overflowX === "scroll") { skip = true; break; }
                    if (s.overflowX === "hidden" || s.overflowX === "clip") {
                        if (r.left >= box.getBoundingClientRect().right - 1) skip = true;
                        break;
                    }
                    box = box.parentElement;
                }
                if (skip) continue;
                const text = (el.innerText || el.tagName).trim().split("\\n")[0];
                result.push([text, r.right]);
            }
            return result;
        }"""
    )
    cut = []
    for text, right in boxes:
        if right > SCREEN_WIDTH:
            cut.append(text[:20] + "（右边 " + str(round(right)) + "）")
    return cut


def case_id(number):
    """P16 → case16；不是题目编号的旧样本页（bearcoffee 等）留空。"""
    return "case" + str(int(number[1:])) if number[:1] == "P" and number[1:].isdigit() else ""


def verdict(problems):
    if problems is None:
        return "不适用", ""
    if len(problems) == 0:
        return "通过", ""
    return "失败", "；".join(problems)


def main():
    # 不加参数：检查 pages 里全部页面；加文件名参数：只检查这几个（用来拿已知好坏样本验证）
    page_files = [Path(a) for a in sys.argv[1:]] or [
        f for f in sorted(Path("pages").glob("*/*.html")) if int(f.stem[1:]) >= 16
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        desktop = browser.new_page(viewport={"width": 1280, "height": 800})
        mobile = browser.new_page(viewport={"width": SCREEN_WIDTH, "height": 800})
        desktop.on("dialog", lambda d: (dialog_log.append(d.message), d.dismiss()))

        with open(RESULT_FILE, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["case_id", "编号", "模型组", "页面", "锚点", "锚点详情", "悬停", "悬停详情", "手机超出", "手机超出详情", "按钮", "按钮详情"])

            for file in page_files:
                url = file.resolve().as_uri()
                desktop.goto(url)
                anchor = verdict(check_anchor(desktop))
                hover = verdict(check_hover(desktop))
                mobile.goto(url)
                clip = verdict(check_mobile_clip(mobile))
                desktop.goto(url)
                button = verdict(check_button(desktop))

                print(file.stem, file.parent.name, "锚点", anchor[0], "悬停", hover[0], "手机超出", clip[0], "按钮", button[0], button[1])
                writer.writerow([case_id(file.stem), file.stem, file.parent.name, str(file), anchor[0], anchor[1], hover[0], hover[1], clip[0], clip[1], button[0], button[1]])

        browser.close()

    print("已写入", RESULT_FILE)


if __name__ == "__main__":
    main()
