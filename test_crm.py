from playwright.sync_api import sync_playwright
import json

auth_state = {
    "state": {
        "user": {
            "id": "54bcc682-7ae9-497f-97da-3e41ba1b2ee5",
            "name": "Zafi Property Manager",
            "email": "zafi@properti.com",
            "role": "manager",
            "tenantId": "4a023464-c66a-4edf-8926-9a08a05ea221",
            "status": "active"
        },
        "isAuthenticated": True,
        "authView": "login"
    },
    "version": 0
}

with sync_playwright() as p:
    iphone = p.devices['iPhone 14 Pro']
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(**iphone)
    page = context.new_page()

    # Pre-populate localStorage
    page.goto('http://127.0.0.1:3001')
    page.evaluate(f"localStorage.setItem('umkm-auth', '{json.dumps(auth_state)}')")
    
    # Reload page with localStorage
    page.goto('http://127.0.0.1:3001/?view=crm')
    page.wait_for_timeout(3000)

    print("URL:", page.url)
    print("Content preview:", page.locator('body').inner_text()[:200])
    page.screenshot(path='temp_screenshots/crm_mobile.png')
    browser.close()
print("CRM screenshot saved!")
