from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto('http://127.0.0.1:3001')
    page.wait_for_timeout(3000)
    print("INNER TEXT:", repr(page.locator('body').inner_text()))
    browser.close()
