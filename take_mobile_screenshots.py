from playwright.sync_api import sync_playwright
import os

os.makedirs('temp_screenshots', exist_ok=True)

with sync_playwright() as p:
    # Emulate iPhone 14 Pro
    iphone_14 = p.devices['iPhone 14 Pro']
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(**iphone_14)
    page = context.new_page()

    # 1. Login page
    page.goto('http://127.0.0.1:3001')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='temp_screenshots/01_login.png')

    # Click quick preset 2 (Zafi)
    button = page.locator("button:has-text('2. Zafi (Properti)')")
    if button.is_visible():
        button.click()
        page.wait_for_timeout(2000)

    # 2. Overview mobile view
    page.screenshot(path='temp_screenshots/02_overview.png')

    # 3. CRM mobile view
    page.goto('http://127.0.0.1:3001/?view=crm')
    page.wait_for_timeout(1500)
    page.screenshot(path='temp_screenshots/03_crm.png')

    # 4. Chatbot mobile view
    page.goto('http://127.0.0.1:3001/?view=chatbot')
    page.wait_for_timeout(1500)
    page.screenshot(path='temp_screenshots/04_chatbot.png')

    # 5. Knowledge mobile view
    page.goto('http://127.0.0.1:3001/?view=knowledge')
    page.wait_for_timeout(1500)
    page.screenshot(path='temp_screenshots/05_knowledge.png')

    # 6. Settings mobile view
    page.goto('http://127.0.0.1:3001/?view=settings')
    page.wait_for_timeout(1500)
    page.screenshot(path='temp_screenshots/06_settings.png')

    browser.close()
print("Screenshots taken successfully!")
