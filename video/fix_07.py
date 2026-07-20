"""修复镜头 07：用 JS evaluate 直接操作 DOM，绕过 Playwright 可见性判定。"""
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).parent.resolve()
SHOTS = BASE / "shots"

# JS：点击浮动导游按钮（用 aria-label 精确定位）
JS_CLICK_FLOAT = """
() => {
  const btns = [...document.querySelectorAll('button')];
  const target = btns.find(b => b.getAttribute('aria-label') === '打开导游') ||
    btns.find(b => (b.className||'').includes('fixed') && (b.textContent||'').includes('红山朋友'));
  if (target) { target.click(); return 'CLICKED'; }
  return 'NOT_FOUND';
}
"""

# JS：填入问题并提交表单
JS_FILL_SUBMIT = """
() => {
  const inputs = [...document.querySelectorAll('input[type="text"]')];
  if (inputs.length === 0) return 'NO_INPUT';
  const input = inputs[inputs.length - 1];
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, '可以喂它吗？');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  const form = input.closest('form');
  if (form) {
    if (form.requestSubmit) form.requestSubmit();
    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return 'SUBMITTED';
  }
  return 'NO_FORM';
}
"""

# JS：读取所有消息气泡内容
JS_READ_MSGS = """
() => {
  const bubbles = [...document.querySelectorAll('div')]
    .filter(d => (d.className||'').includes('rounded-2xl') && d.textContent && d.textContent.trim().length > 3);
  return bubbles.map(d => d.textContent.trim());
}
"""

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width":1280,"height":720}, device_scale_factor=1)
        page = ctx.new_page()

        page.goto("http://localhost:3001/")
        page.wait_for_timeout(2500)

        # 1. 点击浮动导游按钮
        r1 = page.evaluate(JS_CLICK_FLOAT)
        print(f"[1] 点击浮动按钮: {r1}")
        page.wait_for_timeout(1500)

        # 2. 填入问题并提交
        r2 = page.evaluate(JS_FILL_SUBMIT)
        print(f"[2] 提交问题: {r2}")
        page.wait_for_timeout(3500)

        # 3. 读取消息
        msgs = page.evaluate(JS_READ_MSGS)
        print(f"[3] 消息气泡内容: {msgs}")

        # 4. 截图
        out = SHOTS / "07.png"
        page.screenshot(path=str(out), clip={"x":0,"y":0,"width":1280,"height":720})
        print(f"[SHOT] 07.png saved ({out.stat().st_size//1024} KB)")

        browser.close()

if __name__ == "__main__":
    main()
