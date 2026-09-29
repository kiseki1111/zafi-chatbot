from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    iphone_14 = p.devices['iPhone 14 Pro']
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(**iphone_14)
    page.on('console', lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on('pageerror', lambda exc: print(f"PAGE ERROR: {exc}"))

    res = page.goto('http://127.0.0.1:3001')
    print("STATUS:", res.status)
    page.wait_for_timeout(3000)
    print("TITLE:", page.title())
    print("BODY LENGTH:", len(page.content()))
    browser.close()
