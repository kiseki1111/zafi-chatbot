from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto('http://127.0.0.1:3001')
    page.wait_for_selector('h1')
    print("Found h1:", page.locator('h1').inner_text())
    page.screenshot(path='temp_screenshots/login_test.png')
    browser.close()
