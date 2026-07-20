"""用 Playwright headless 截取所有 9 张分镜画面。视口 1280x720。"""
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).parent.resolve()
SHOTS = BASE / "shots"
STATIC = BASE / "static"
SHOTS.mkdir(exist_ok=True)

def file_url(p: Path) -> str:
    return p.as_uri()

def shot(page, name: str):
    out = SHOTS / f"{name}.png"
    page.screenshot(path=str(out), clip={"x":0,"y":0,"width":1280,"height":720})
    print(f"[SHOT] {name}.png saved ({out.stat().st_size//1024} KB)")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width":1280,"height":720}, device_scale_factor=1)
        page = ctx.new_page()

        # ===== 静态 HTML（file:// 协议，Playwright 原生支持）=====
        for name, html in [("01","title.html"),("02","terminal.html"),("03","report.html"),("09","ending.html")]:
            page.goto(file_url(STATIC / html))
            page.wait_for_timeout(800)
            shot(page, name)
            print(f"  -> {html} OK")

        # ===== 前端交互画面 =====
        page.goto("http://localhost:3001/")
        page.wait_for_timeout(2500)
        shot(page, "04")
        print("  -> 首屏 OK")

        # 05 规划：点「生成路线」按钮
        try:
            btn = page.locator("button:has-text('生成')").first
            btn.wait_for(timeout=3000)
            btn.click()
            print("  -> 点击生成路线按钮")
        except Exception as e:
            print(f"  -> 生成按钮定位失败: {e}，尝试备用选择器")
            page.locator("button", has_text="路线").first.click()
        page.wait_for_timeout(2500)
        shot(page, "05")
        print("  -> 规划路线 OK")

        # 06 陪逛 tab
        page.locator("button:has-text('陪逛')").first.click()
        page.wait_for_timeout(1800)
        shot(page, "06")
        print("  -> 陪逛 tab OK")

        # 07 导游面板问答（关键镜头）
        # 点右下角浮动按钮（含「红山朋友」文字 + fixed 定位）
        try:
            float_btn = page.locator("button.fixed:has-text('红山朋友')").first
            float_btn.wait_for(timeout=3000)
            float_btn.click()
            print("  -> 点击浮动导游按钮")
        except Exception as e:
            print(f"  -> 浮动按钮定位失败: {e}")
        page.wait_for_timeout(1200)

        # 在输入框填入问题并提交
        try:
            inp = page.locator("input[type='text']").last
            inp.wait_for(timeout=3000)
            inp.fill("可以喂它吗？")
            page.wait_for_timeout(300)
            # 提交表单
            page.locator("form button[type='submit']").last.click()
            print("  -> 提交问题：可以喂它吗？")
        except Exception as e:
            print(f"  -> 输入提交失败: {e}")
        # 等待立场拒绝回复生成（同步逻辑，但 React 渲染 + loading 态需时间）
        page.wait_for_timeout(3500)
        shot(page, "07")
        # 打印回复内容用于核对
        try:
            msgs = page.locator(".rounded-2xl").all_inner_texts()
            print(f"  -> 导游面板消息: {msgs}")
        except Exception:
            pass
        print("  -> 导游面板 OK")

        # 08 手账 tab
        page.locator("button:has-text('手账')").first.click()
        page.wait_for_timeout(1800)
        shot(page, "08")
        print("  -> 手账 tab OK")

        browser.close()
        print("\n=== 全部 9 张截图完成 ===")

if __name__ == "__main__":
    main()
