from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://127.0.0.1:3001')
    page.wait_for_timeout(3000)
    html = page.content()
    with open('rendered.html', 'w', encoding='utf-8') as f:
        f.write(html)
    browser.close()
print("Saved rendered.html")
