from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.on('console', lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
    page.on('pageerror', lambda err: print(f"PAGE ERROR: {err}"))
    page.goto('http://127.0.0.1:3001')
    page.wait_for_timeout(5000)
    print("Page URL:", page.url)
    print("Inputs found:", page.locator('input').count())
    page.screenshot(path='temp_screenshots/debug_rendered.png')
    browser.close()
