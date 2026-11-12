/**
 * Script Uji Komprehensif Integrasi 3 Layanan (Federated SSO & Data Mesh):
 * 1. ZAF Console (Port 17341 Web / 17342 API) -> Identity Provider, Customer, & Whitelist Hub
 * 2. HRIS Presensi Laravel 10 (Port 8000) -> Master Data Karyawan, Presensi, Cuti, Slip Gaji
 * 3. Chatbot Backend & WAHA (Port 3030 API / 3001 Web / 3000 WAHA) -> Federated Login, WhatsApp Checker, Tool Caller
 */

const CONSOLE_API = 'http://127.0.0.1:17342';
const CONSOLE_WEB = 'http://localhost:17341';
const HRIS_API = 'http://127.0.0.1:8000';
const CHATBOT_API = 'http://127.0.0.1:3030';
const CHATBOT_WEB = 'http://localhost:3001';

const TEST_ACCOUNT = {
  email: 'zafi@properti.com',
  password: 'Password123!',
  phone: '6281649433281',
  sampleNik: '250100001',
};

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message} ${details ? `\x1b[90m(${details})\x1b[0m` : ''}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✖ FAIL:\x1b[0m ${message} ${details ? `\x1b[33m[${details}]\x1b[0m` : ''}`);
  }
}

async function runSuite() {
  console.log('\n================================================================');
  console.log('🚀 SUITE PENGUJIAN INTEGRASI LENGKAP: CONSOLE + HRIS + CHATBOT');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST SUITE 1: HEALTHCHECK & AVAILABILITY INFRASTRUKTUR
  // -------------------------------------------------------------
  console.log('\x1b[36m[SUITE 1] Pemeriksaan Status Server & Service Health\x1b[0m');

  // 1.1 Console API Health
  try {
    const s = Date.now();
    const res = await fetch(`${CONSOLE_API}/api/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok' && data.database === 'up', 'ZAF Console API & DB PostgreSQL (Port 17342)', `${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'ZAF Console API (Port 17342)', e.message);
  }

  // 1.2 Console Web Portal
  try {
    const s = Date.now();
    const res = await fetch(`${CONSOLE_WEB}/healthz`);
    assert(res.status === 200, 'ZAF Console Web Portal (Port 17341)', `${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'ZAF Console Web Portal (Port 17341)', e.message);
  }

  // 1.3 HRIS Presensi Service
  try {
    const s = Date.now();
    const res = await fetch(`${HRIS_API}/api/assistant/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'CONNECTED', 'HRIS Laravel 10 Health (Port 8000)', `${data.total_karyawan_aktif} karyawan, ${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'HRIS Laravel 10 (Port 8000)', e.message);
  }

  // 1.4 Chatbot Backend NestJS
  try {
    const s = Date.now();
    const res = await fetch(`${CHATBOT_API}/api/v1/waha/contacts/check-exists?phone=081649433281`);
    assert(res.status === 200, 'Chatbot Backend API (Port 3030)', `${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'Chatbot Backend API (Port 3030)', e.message);
  }

  // 1.5 Chatbot Web Dashboard
  try {
    const s = Date.now();
    const res = await fetch(`${CHATBOT_WEB}`);
    assert(res.status === 200, 'Chatbot Next.js Web Dashboard (Port 3001)', `${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'Chatbot Next.js Web Dashboard (Port 3001)', e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: CENTRAL FEDERATED AUTHENTICATION (1 AKUN UNTUK SEMUA)
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[SUITE 2] Autentikasi Terpadu & Sesi Single Sign-On (SSO)\x1b[0m');

  let portalCookie = '';
  // 2.1 Login Akun ke ZAF Console Portal (/akun)
  try {
    const s = Date.now();
    const res = await fetch(`${CONSOLE_API}/api/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_ACCOUNT.email, password: TEST_ACCOUNT.password }),
    });
    const data = await res.json();
    portalCookie = res.headers.get('set-cookie') || '';
    assert(res.status === 200 && data.ok === true && portalCookie.includes('zc_portal'), 'Login Akun ke Portal Console Pelanggan', `Email: ${TEST_ACCOUNT.email}, ${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'Login Akun ke Portal Console Pelanggan', e.message);
  }

  // 2.2 Verifikasi Langganan Aktif 3 Produk di Console
  try {
    const s = Date.now();
    const res = await fetch(`${CONSOLE_API}/api/portal/overview`, {
      headers: { Cookie: portalCookie },
    });
    const data = await res.json();
    const prods = data.subscriptions.map((s) => s.productCode);
    const hasAllThree = prods.includes('HRIS') && prods.includes('CHATBOT') && prods.includes('ACCOUNTING');
    assert(hasAllThree, '3 Produk Aktif Terikat di Akun Console', `Produk: [${prods.join(', ')}], Customer: ${data.customer.name}`);
  } catch (e) {
    assert(false, 'Verifikasi 3 Produk Aktif di Akun Console', e.message);
  }

  // 2.3 Login Menggunakan Kredensial Console ke Dashboard Chatbot
  let chatbotToken = '';
  try {
    const s = Date.now();
    const res = await fetch(`${CHATBOT_API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_ACCOUNT.email, passwordPlain: TEST_ACCOUNT.password }),
    });
    const data = await res.json();
    chatbotToken = data?.data?.accessToken;
    const emailMatch = data?.data?.user?.email === TEST_ACCOUNT.email;
    const hasTenant = Boolean(data?.data?.user?.tenantId);
    assert(res.status === 200 && emailMatch && hasTenant && chatbotToken, 'Chatbot Memverifikasi Password ke Console & Terhubung ke Tenant Lama', `TenantId: ${data?.data?.user?.tenantId}`);
  } catch (e) {
    assert(false, 'Login Chatbot dengan Akun Console', e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 3: INTEGRASI DATA HRIS DARI CHATBOT BACKEND
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[SUITE 3] Pengujian Pintu Data & Function Calling HRIS\x1b[0m');

  // 3.1 Lookup Data Karyawan via Phone
  try {
    const s = Date.now();
    const res = await fetch(`${CHATBOT_API}/api/v1/hris/karyawan/lookup?phone=${TEST_ACCOUNT.phone}`);
    const data = await res.json();
    assert(res.status === 200, 'Endpoint Lookup Karyawan via Phone di Chatbot Gateway', `${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'Endpoint Lookup Karyawan via Phone', e.message);
  }

  // 3.2 Cek Sisa Cuti Karyawan Riil dari HRIS
  try {
    const s = Date.now();
    const res = await fetch(`${CHATBOT_API}/api/v1/hris/karyawan/${TEST_ACCOUNT.sampleNik}/cuti`);
    const json = await res.json();
    const payload = json?.data !== undefined ? json.data : json;
    const inner = payload?.data !== undefined ? payload.data : payload;
    const valid = payload.success === true && typeof inner.sisa_cuti === 'number';
    assert(valid, 'Eksekusi Tool Cek Sisa Cuti (Data Nyata HRIS)', `Karyawan: ${inner?.nama}, Sisa: ${inner?.sisa_cuti} hari, ${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'Tool Cek Sisa Cuti', e.message);
  }

  // 3.3 Rekap Presensi Karyawan Riil dari HRIS
  try {
    const s = Date.now();
    const res = await fetch(`${CHATBOT_API}/api/v1/hris/karyawan/${TEST_ACCOUNT.sampleNik}/presensi`);
    const json = await res.json();
    const payload = json?.data !== undefined ? json.data : json;
    const inner = payload?.data !== undefined ? payload.data : payload;
    const valid = payload.success === true && typeof inner?.rekap_bulan_ini?.hadir === 'number';
    assert(valid, 'Eksekusi Tool Rekap Presensi Bulan Berjalan', `Status Hari Ini: ${inner?.hari_ini?.status}, Total Hadir: ${inner?.rekap_bulan_ini?.hadir} hari`);
  } catch (e) {
    assert(false, 'Tool Rekap Presensi', e.message);
  }

  // 3.4 Slip Gaji Terkini dari HRIS
  try {
    const s = Date.now();
    const res = await fetch(`${CHATBOT_API}/api/v1/hris/karyawan/${TEST_ACCOUNT.sampleNik}/slip-gaji`);
    const json = await res.json();
    const payload = json?.data !== undefined ? json.data : json;
    const inner = payload?.data !== undefined ? payload.data : payload;
    const valid = payload.success === true && inner?.status_slip;
    assert(valid, 'Eksekusi Tool Informasi Slip Gaji Terkini', `Periode: ${inner?.periode}, Status: ${inner?.status_slip}`);
  } catch (e) {
    assert(false, 'Tool Slip Gaji Terkini', e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 4: WHATSAPP NUMBER VALIDATION & CHECKER (WAHA GATEWAY)
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[SUITE 4] Pengujian Validasi Nomor WhatsApp Asisten & Whitelist\x1b[0m');

  // 4.1 Cek Nomor Valid (Nomor Terdaftar)
  try {
    const s = Date.now();
    const res = await fetch(`${CHATBOT_API}/api/v1/waha/contacts/check-exists?phone=081649433281`);
    const json = await res.json();
    const payload = json?.data !== undefined ? json.data : json;
    assert(res.status === 200 && payload.exists === true, 'Pengecekan Nomor Terdaftar di WhatsApp (Live WAHA)', `Phone: 081649433281, JID: ${payload.jid}, Durasi: ${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'Pengecekan Nomor Terdaftar di WhatsApp', e.message);
  }

  // 4.2 Cek Nomor Tidak Terdaftar
  try {
    const s = Date.now();
    const res = await fetch(`${CHATBOT_API}/api/v1/waha/contacts/check-exists?phone=08123456789`);
    const json = await res.json();
    const payload = json?.data !== undefined ? json.data : json;
    assert(res.status === 200 && payload.exists === false, 'Pengecekan Nomor Tidak Terdaftar di WhatsApp', `Phone: 08123456789 -> exists: false, Durasi: ${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'Pengecekan Nomor Tidak Terdaftar', e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 5: END-TO-END FLOW ASISTEN WHATSAPP DARI CONSOLE HUB
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[SUITE 5] Simulasi End-to-End Chatbot WhatsApp -> Hub Console -> HRIS\x1b[0m');

  // 5.1 Pengirim Terdaftar di Whitelist Bertanya Presensi Harian
  try {
    const s = Date.now();
    const res = await fetch(`${CONSOLE_API}/api/integration/v1/assistant/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer dev-only-assistant-channel-key-not-for-production',
      },
      body: JSON.stringify({
        phone: TEST_ACCOUNT.phone,
        text: 'Halo asisten, tolong cek rekapitulasi presensi harian kantor kita.',
      }),
    });
    const data = await res.json();
    const isHandled = data.handled === true && typeof data.reply === 'string' && data.reply.includes('total_karyawan');
    assert(isHandled, 'Pesan WhatsApp Diproses Hub Console, Memanggil HRIS, & Mengembalikan Data', `${data.reply.slice(0, 80)}... (${Date.now() - s}ms)`);
  } catch (e) {
    assert(false, 'Simulasi WhatsApp Message End-to-End', e.message);
  }

  // 5.2 Pengirim Tidak Terdaftar di Whitelist (Harus Ditolak / Ignored)
  try {
    const s = Date.now();
    const res = await fetch(`${CONSOLE_API}/api/integration/v1/assistant/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer dev-only-assistant-channel-key-not-for-production',
      },
      body: JSON.stringify({
        phone: '6289999999999',
        text: 'Berapa gaji karyawan bulan ini?',
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.handled === false, 'Proteksi Whitelist: Nomor Tidak Terdaftar Ditolak Otomatis', `handled: false, Durasi: ${Date.now() - s}ms`);
  } catch (e) {
    assert(false, 'Proteksi Whitelist Nomor Tidak Dikenal', e.message);
  }

  // -------------------------------------------------------------
  // RINGKASAN AKHIR
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 HASIL PENGUJIAN AKHIR: ${passed} LULUS, ${failed} GAGAL`);
  console.log(`Status Integrasi: ${failed === 0 ? '\x1b[32mSEMUA LAYANAN TERINTEGRASI SEMPURNA (100% OK)\x1b[0m' : '\x1b[31mADA KEGAGALAN\x1b[0m'}`);
  console.log('================================================================\n');
}

runSuite().catch(console.error);
