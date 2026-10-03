import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("mobile_screenshots")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
BASE_URL = "http://localhost:3001"

def save_shot(page, filename):
    data = page.screenshot()
    out = OUTPUT_DIR / filename
    try:
        if out.exists():
            out.unlink()
    except Exception:
        pass
    out.write_bytes(data)
    print(f"[+] Saved: {filename}")

def nav_click(page, label):
    # Target tombol navigasi bawah mobile
    btn = page.locator(f"nav[aria-label='Navigasi Bawah Mobile'] button:has-text('{label}')")
    btn.click()
    page.wait_for_timeout(1200)

def drawer_click(page, label):
    # Buka menu Lainnya dulu
    nav_click(page, "Lainnya")
    page.wait_for_timeout(800)
    # Klik item di dalam drawer sheet
    item = page.locator(f"[data-slot='sheet-content'] button:has-text('{label}')")
    item.click()
    page.wait_for_timeout(1200)

def run():
    print(f"[*] Starting Native User-Interaction Mobile Capture (Skill: webapp-testing)...")
    print(f"[*] Output directory: {OUTPUT_DIR.resolve()}")

    with sync_playwright() as p:
        # Resolusi standar global iPhone 14 (390 x 844)
        device = p.devices["iPhone 14"]
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**device, locale="id-ID")
        page = context.new_page()

        # 1. Login
        print("[-] 01_login_mobile.png")
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_timeout(1000)
        save_shot(page, "01_login_mobile.png")

        # Click Demo Manajer
        page.locator("button:has-text('Demo Manajer')").click()
        page.wait_for_timeout(2000)

        # 2. Overview (Beranda)
        print("[-] 02_overview_mobile.png")
        save_shot(page, "02_overview_mobile.png")

        # 3. Chat Bot
        print("[-] 03_chatbot_mobile.png")
        nav_click(page, "Chat Bot")
        save_shot(page, "03_chatbot_mobile.png")

        # 4. Pelanggan / CRM
        print("[-] 04_crm_mobile.png")
        nav_click(page, "Pelanggan")
        save_shot(page, "04_crm_mobile.png")

        # 5. CRM Detail Bottom Sheet
        print("[-] 05_crm_mobile_detail.png")
        first_contact = page.locator("[role='button']:has-text('Budi Santoso')").first
        if first_contact.is_visible():
            first_contact.click()
            page.wait_for_timeout(1000)
            save_shot(page, "05_crm_mobile_detail.png")
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)

        # 6. Knowledge
        print("[-] 06_knowledge_mobile.png")
        nav_click(page, "Knowledge")
        save_shot(page, "06_knowledge_mobile.png")

        # 7. Lainnya Drawer Menu
        print("[-] 07_more_drawer_mobile.png")
        nav_click(page, "Lainnya")
        page.wait_for_timeout(800)
        save_shot(page, "07_more_drawer_mobile.png")
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        # 8. Follow-Up
        print("[-] 08_followup_mobile.png")
        drawer_click(page, "Follow-Up")
        save_shot(page, "08_followup_mobile.png")

        # 9. Siteplan
        print("[-] 09_siteplan_mobile.png")
        drawer_click(page, "Siteplan")
        save_shot(page, "09_siteplan_mobile.png")

        # 10. Denah Bus
        print("[-] 10_bus_layout_mobile.png")
        drawer_click(page, "Denah Kursi Bus")
        save_shot(page, "10_bus_layout_mobile.png")

        # 11. Pengaturan
        print("[-] 11_settings_mobile.png")
        drawer_click(page, "Pengaturan Akun & Bot")
        save_shot(page, "11_settings_mobile.png")

        # 12. Superadmin Flow
        print("[-] Switching to Superadmin role...")
        nav_click(page, "Lainnya")
        page.wait_for_timeout(600)
        page.locator("[data-slot='sheet-content'] button:has-text('Keluar dari Akun')").click()
        page.wait_for_timeout(1500)

        demo_sa = page.locator("button:has-text('Demo Superadmin')").first
        if demo_sa.is_visible():
            demo_sa.click()
            page.wait_for_timeout(2000)

            print("[-] 12_superadmin_platform_overview_mobile.png")
            save_shot(page, "12_superadmin_platform_overview_mobile.png")

            print("[-] 13_superadmin_clients_mobile.png")
            nav_click(page, "Klien")
            save_shot(page, "13_superadmin_clients_mobile.png")

            print("[-] 14_superadmin_waha_monitor_mobile.png")
            nav_click(page, "Sesi WA")
            save_shot(page, "14_superadmin_waha_monitor_mobile.png")

            print("[-] 15_superadmin_quota_monitor_mobile.png")
            nav_click(page, "Kuota")
            save_shot(page, "15_superadmin_quota_monitor_mobile.png")

        browser.close()
        print(f"\n[+] SELESAI! Seluruh screenshot mobile tersimpan di:\n{OUTPUT_DIR.resolve()}")

if __name__ == "__main__":
    run()
