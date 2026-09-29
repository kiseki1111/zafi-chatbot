from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto('http://localhost:3001')
    page.wait_for_timeout(3000)
    print("PAGE HTML LENGTH:", len(page.content()))
    print("H1 COUNT:", page.locator('h1').count())
    if page.locator('h1').count() > 0:
        print("H1 TEXT:", page.locator('h1').all_inner_texts())
    page.screenshot(path='temp_screenshots/localhost_test.png')
    browser.close()
