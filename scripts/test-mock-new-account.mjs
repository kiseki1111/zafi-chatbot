/**
 * Skenario Pengujian Mock End-to-End:
 * 1. Pendaftaran / Pembuatan Customer Baru dari ZAF Console API
 * 2. Pembuatan Akun Portal Baru (Email + Password unik)
 * 3. Aktivasi 3 Langganan Produk (HRIS, CHATBOT, ACCOUNTING)
 * 4. Pendaftaran Whitelist Nomor WhatsApp Khusus untuk Akun Baru Ini
 * 5. Injeksi & Sinkronisasi Data Karyawan Dummy HRIS untuk Akun Baru Ini
 * 6. Verifikasi Login SSO ke Chatbot Dashboard menggunakan Akun Baru Tersebut
 * 7. Simulasi Query WhatsApp Asisten AI dari Nomor Baru -> Response dari HRIS
 */

import { execSync } from 'child_process';

const CONSOLE_API = 'http://127.0.0.1:17342';
const CHATBOT_API = 'http://127.0.0.1:3030';

// Generate kredensial acak unik untuk pengujian mock
const UNIQUE_ID = Date.now().toString().slice(-4);
const MOCK_USER = {
  slug: `nusantara-${UNIQUE_ID}`,
  companyName: `PT Nusantara Solusi ${UNIQUE_ID}`,
  email: `direktur${UNIQUE_ID}@nusantara.test`,
  password: 'PasswordBaru123!',
  phone: `628551234${UNIQUE_ID}`,
  picName: `Bapak Hendra ${UNIQUE_ID}`,
  employee: {
    nik: `EMP${UNIQUE_ID}`,
    nama: `Staf Uji ${UNIQUE_ID}`,
    no_hp: `08551234${UNIQUE_ID}`,
  }
};

let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${label} \x1b[90m${detail ? `(${detail})` : ''}\x1b[0m`);
  } else {
    failed++;
    console.log(`  \x1b[31m✖ FAIL:\x1b[0m ${label} \x1b[33m[${detail}]\x1b[0m`);
  }
}

async function runMockTest() {
  console.log('\n================================================================');
  console.log('🧪 MOCK TEST: PEMBUATAN AKUN BARU & SUNTIK DATA HRIS/CHATBOT');
  console.log('================================================================\n');

  console.log(`Identitas Akun Uji Baru:`);
  console.log(`  Perusahaan: ${MOCK_USER.companyName} (slug: ${MOCK_USER.slug})`);
  console.log(`  Email     : ${MOCK_USER.email}`);
  console.log(`  Password  : ${MOCK_USER.password}`);
  console.log(`  Nomor WA  : +${MOCK_USER.phone}\n`);

  // -------------------------------------------------------------
  // LANGKAH 1: BUAT CUSTOMER BARU & AKUN PORTAL DI CONSOLE
  // -------------------------------------------------------------
  console.log('\x1b[36m[LANGKAH 1] Buat Akun & Langganan Baru di ZAF Console DB\x1b[0m');
  try {
    const cmd = `docker exec zafi_console_api node seed-mock-helper.js "${MOCK_USER.slug}" "${MOCK_USER.companyName}" "${MOCK_USER.email}" "${MOCK_USER.password}" "${MOCK_USER.phone}"`;
    const out = execSync(cmd).toString();
    assert(out.includes('SUCCESS_CREATED'), 'Akun Baru & 3 Produk Langganan Berhasil Dibuat di Console');
  } catch (e) {
    assert(false, 'Pembuatan Akun di Console', e.message);
  }

  // -------------------------------------------------------------
  // LANGKAH 2: SUNTIK DATA KARYAWAN DUMMY BARU KE HRIS
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[LANGKAH 2] Suntik Data Karyawan Baru ke Database HRIS (Laravel)\x1b[0m');
  try {
    const cmd = `php seed-mock-karyawan.php "${MOCK_USER.employee.nik}" "${MOCK_USER.employee.nama}" "${MOCK_USER.employee.no_hp}"`;
    const out = execSync(cmd, { cwd: 'D:\\Semester 7\\Zafi\\presensi-app' }).toString();
    assert(out.includes('SUCCESS_HRIS_INJECT'), `Data Karyawan Baru (${MOCK_USER.employee.nama} - NIK: ${MOCK_USER.employee.nik}) Tersuntik ke HRIS`);
  } catch (e) {
    assert(false, 'Suntik Data ke HRIS', e.message);
  }

  // -------------------------------------------------------------
  // LANGKAH 3: VERIFIKASI LOGIN CONSOLE & SESI PORTAL
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[LANGKAH 3] Verifikasi Login Akun Baru ke ZAF Console Portal\x1b[0m');
  let portalCookie = '';
  try {
    const res = await fetch(`${CONSOLE_API}/api/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MOCK_USER.email, password: MOCK_USER.password }),
    });
    const json = await res.json();
    portalCookie = res.headers.get('set-cookie') || '';
    assert(res.status === 200 && json.ok === true && portalCookie.includes('zc_portal'), 'Login Akun Baru ke Portal Console Berhasil', `${MOCK_USER.email}`);
  } catch (e) {
    assert(false, 'Login Portal Console', e.message);
  }

  // -------------------------------------------------------------
  // LANGKAH 4: VERIFIKASI LOGIN CHATBOT (FEDERASI SSO AUTO-PROVISION)
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[LANGKAH 4] Verifikasi Login SSO Akun Baru ke Chatbot Dashboard\x1b[0m');
  try {
    const res = await fetch(`${CHATBOT_API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MOCK_USER.email, passwordPlain: MOCK_USER.password }),
    });
    const json = await res.json();
    const token = json?.data?.accessToken;
    const tenantId = json?.data?.user?.tenantId;
    assert(res.status === 200 && Boolean(token) && Boolean(tenantId), 'Chatbot Berhasil Memvalidasi ke Console & Menerbitkan Sesi Baru', `Tenant Otomatis: ${tenantId}`);
  } catch (e) {
    assert(false, 'Login Chatbot Akun Baru', e.message);
  }

  // -------------------------------------------------------------
  // LANGKAH 5: PENGUJIAN QUERY WHATSAPP DARI NOMOR AKUN BARU INI
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[LANGKAH 5] Pengujian Query WhatsApp Asisten AI dari Nomor Akun Baru\x1b[0m');
  try {
    const res = await fetch(`${CONSOLE_API}/api/integration/v1/assistant/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer dev-only-assistant-channel-key-not-for-production',
      },
      body: JSON.stringify({
        phone: MOCK_USER.phone,
        text: 'Halo asisten, tolong cek rekapitulasi presensi harian kantor kita.',
      }),
    });
    const json = await res.json();
    const isHandled = json.handled === true && typeof json.reply === 'string' && json.reply.includes('total_karyawan');
    assert(isHandled, 'Nomor Akun Baru Diakui Whitelist & Asisten Mengambil Data Nyata HRIS', `${json?.reply?.slice(0, 75)}...`);
  } catch (e) {
    assert(false, 'Query Asisten WhatsApp Nomor Baru', e.message);
  }

  // -------------------------------------------------------------
  // RINGKASAN MOCK TEST
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 HASIL MOCK TEST AKHIR: ${passed} LULUS, ${failed} GAGAL`);
  console.log(`Kesimpulan: ${failed === 0 ? '\x1b[32mSKENARIO AKUN BARU & SUNTIK DATA 100% SUKSES DAN TERHUBUNG!\x1b[0m' : '\x1b[31mADA KEGAGALAN\x1b[0m'}`);
  console.log('================================================================\n');
}

runMockTest().catch(console.error);
