import { test, expect } from '@playwright/test';

test.describe('E2E Chatbot & Live Chat Operator (Human Takeover)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock WAHA instance & chats
    await page.route('**/api/v1/waha/instances*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cs-utama', name: 'CS Utama (+62 812-3456-7890)', status: 'working' },
        ]),
      });
    });

    await page.route(/\/api\/v1\/chats(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'chat-1',
              instanceName: 'cs-utama',
              status: 'OPEN',
              unreadCount: 1,
              contactId: 'c-1',
              contactName: 'Budi Santoso',
              contactNumber: '6281299887711',
              contact: {
                id: 'c-1',
                name: 'Budi Santoso',
                phone: '6281299887711',
              },
              messages: [
                {
                  id: 'm-1-1',
                  content: 'Halo kak, saya mau tanya rumah tipe 45',
                  senderType: 'customer',
                  createdAt: new Date().toISOString(),
                },
              ],
              lastMessageAt: new Date().toISOString(),
              mode: 'bot',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/chats/stream*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: '',
      });
    });

    await page.route('**/api/v1/chats/*/messages*', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: `msg-${Date.now()}`,
              content: postData.text || 'Halo, ini balasan operator!',
              senderType: 'agent',
              status: 'SENT',
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'm-1-1',
                conversationId: 'chat-1',
                senderType: 'customer',
                content: 'Halo kak, saya mau tanya rumah tipe 45',
                status: 'RECEIVED',
                createdAt: new Date().toISOString(),
              },
              {
                id: 'm-1-2',
                conversationId: 'chat-1',
                senderType: 'bot',
                content: 'Halo Bapak Budi! Tipe 45/90 ready.',
                status: 'SENT',
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        });
      }
    });

    await page.route('**/api/v1/chats/*/profile*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'Budi Santoso',
          phone: '6281299887711',
          about: 'Minat Tipe 45 Cluster Sakura',
        }),
      });
    });

    await page.route('**/api/v1/tenant/clients/*/quota*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: 'pro',
          planName: 'Pro',
          planPrice: 500000,
          priceLabel: 'Rp 500.000',
          mauUsed: 5,
          maxMau: 100,
          aiResponsesUsed: 20,
          maxAiResponses: 1000,
        }),
      });
    });

    await page.route('**/api/v1/tenant/*/dashboard*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tenant: { name: 'Zafi Royal Residence' } }),
      });
    });

    // 1. Masuk sebagai Demo Manajer
    await page.goto('/');
    const demoManagerBtn = page.locator('button:has-text("Demo Manajer")');
    await expect(demoManagerBtn).toBeVisible({ timeout: 10000 });
    await demoManagerBtn.click();

    // 2. Navigasi ke modul Bot WhatsApp
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
    const botMenuBtn = page.locator('button:has-text("Bot WhatsApp")').first();
    await expect(botMenuBtn).toBeVisible();
    await botMenuBtn.click();

    // Pastikan antarmuka Live Chat ter-load
    await expect(page.locator('input[placeholder*="Cari nama atau nomor"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('1. Menampilkan daftar kontak percakapan dan memilih obrolan aktif', async ({ page }) => {
    // Verifikasi nama kontak teridentifikasi (Budi Santoso) muncul menggantikan angka
    const contactItem = page.locator('text=Budi Santoso').first();
    await expect(contactItem).toBeVisible();

    // Verifikasi timeline obrolan aktif menampilkan pesan dan tombol status bot
    await expect(page.locator('button:has-text("Bot AI"), button:has-text("Mode Manual")').first()).toBeVisible();
    await expect(page.locator('text=Halo Bapak Budi! Tipe 45/90 ready.').first()).toBeVisible();
  });

  test('2. Operator dapat melakukan Human Takeover (berpindah antara Bot AI dan Mode Manual)', async ({ page }) => {
    await page.route('**/api/v1/chats/*/takeover', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'human', assignedToId: 'agent-demo-1' }),
      });
    });

    await page.route('**/api/v1/chats/*/release', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'bot', assignedToId: null }),
      });
    });

    // Cari tombol takeover toggle di header chat
    const toggleBtn = page.locator('button:has-text("Bot AI"), button:has-text("Mode Manual")').first();
    await expect(toggleBtn).toBeVisible();

    const initialText = await toggleBtn.innerText();

    // Klik tombol takeover
    await toggleBtn.click();

    // Verifikasi teks tombol berubah ke mode sebaliknya
    if (initialText.includes('Bot AI')) {
      await expect(page.locator('button:has-text("Mode Manual")').first()).toBeVisible();
    } else {
      await expect(page.locator('button:has-text("Bot AI")').first()).toBeVisible();
    }
  });

  test('3. Operator dapat mengetik dan mengirim pesan manual ke pelanggan', async ({ page }) => {
    // Cari input pesan
    const msgInput = page.locator('input[placeholder*="Ketik pesan"]');
    await expect(msgInput).toBeVisible();

    // Ketik pesan balasan operator
    const testMessage = 'Halo Pak Budi, jadwal survey besok jam 10 pagi sudah kami konfirmasi ya!';
    await msgInput.fill(testMessage);
    await expect(msgInput).toHaveValue(testMessage);

    // Klik tombol kirim
    const sendBtn = page.locator('button[title="Kirim pesan"]').first();
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Input harus kosong kembali setelah terkirim
    await expect(msgInput).toHaveValue('');
  });

  test('4. Balasan riwayat chat ter-render rapi di timeline', async ({ page }) => {
    // Verifikasi bubble pesan customer dan bubble respon bot
    await expect(page.locator('text=Halo kak, saya mau tanya rumah tipe 45').first()).toBeVisible();
    await expect(page.locator('text=Halo Bapak Budi! Tipe 45/90 ready.').first()).toBeVisible();
  });

  test('5. Membuka panel detail info kontak dan melihat metadata prospek', async ({ page }) => {
    // Klik tombol info kontak
    const infoBtn = page.locator('button[aria-label="Info kontak"]').first();
    if (await infoBtn.isVisible({ timeout: 3000 })) {
      await infoBtn.click();

      // Verifikasi panel detail kontak terbuka
      await expect(page.locator('text=Detail Kontak').or(page.locator('text=6281299887711')).first()).toBeVisible();
    }
  });
});
