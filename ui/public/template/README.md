# PropertiKu Agent — Template UI

Paket template UI multi-halaman (HTML terpisah per halaman) untuk aplikasi **PropertiKu Agent** — asisten properti AI berbasis WhatsApp (Waha). Dibangun 100% dengan teknologi CDN, tanpa build step, tanpa npm.

## Deskripsi

Template ini memecah aplikasi single-file `public/ui.html` menjadi **12 halaman HTML terpisah** yang berbagi aset umum di folder `assets/`. Setiap halaman dapat dibuka secara standalone di browser. Cocok untuk demo, prototype, atau sebagai starter template untuk integrasi ke backend nyata.

## Tech Stack (semua via CDN)

| Teknologi | Fungsi | URL |
|-----------|--------|-----|
| **Tailwind CSS** | Styling (Play CDN) | `https://cdn.tailwindcss.com` |
| **Lucide Icons** | Ikon | `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js` |
| **Chart.js 4** | Grafik | `https://cdn.jsdelivr.net/npm/chart.js@4.4.1` |
| **Vanilla JS** | State & rendering | (no framework) |
| **Inter Font** | Tipografi | Google Fonts |

> Tidak ada build step. Buka langsung file HTML di browser. Butuh koneksi internet saat pertama kali (untuk CDN).

## Struktur File

```
public/template/
├── index.html                  ← Gallery/landing: 12 kartu + role selector
├── login.html                  ← Auth: login (6 tombol quick-login per role)
├── register.html               ← Auth: pendaftaran
├── forgot-password.html        ← Auth: lupa password (email → sukses)
├── dashboard.html              ← Dashboard: KPI role-aware + grafik + funnel
├── chatbot.html                ← Chatbot WhatsApp Waha (3-kolom)
├── contacts.html               ← CRM kontak & leads (pipeline + kartu/tabel)
├── properties.html             ← Listing properti (grid)
├── orders.html                 ← Order (tabel + kanban)
├── marketing.html              ← Marketing (3 tab: kampanye/template/broadcast)
├── finance.html                ← Keuangan (grafik + tabel invoice + PPN)
├── users.html                  ← Manajemen pengguna (RBAC matrix + tabel)
├── settings.html               ← Pengaturan (4 tab)
├── assets/
│   ├── shared.css              ← Scrollbar, chat bubble, animasi, tema
│   ├── tailwind-config.js      ← Konfigurasi Tailwind (warna, darkMode, radius)
│   ├── data.js                 ← Mock data + formatCurrency()
│   ├── rbac.js                 ← ROLES, MENU_ITEMS, ROLE_THEME, canAccess()
│   ├── auth.js                 ← State localStorage, login/logout, requireAuth()
│   ├── layout.js               ← Sidebar, topbar, modal, toast helpers
│   ├── ui-helpers.js           ← Badge meta maps (status, tag, type) + helpers
│   └── charts.js               ← Chart.js helpers (revenue/donut/bar/finance)
└── README.md                   ← Dokumen ini
```

## Cara Pakai

### 1. Buka gallery
Buka `index.html` di browser (atau akses via dev server di `/template/index.html`). Gallery menampilkan semua 12 halaman + tombol quick-login per role.

### 2. Pilih role lalu klik halaman
- Klik salah satu role di bagian "Pilih Role untuk Login Cepat" (mis. `Superadmin`, `Marketing`, dst.). Ini menulis user ke `localStorage` dan menampilkan toast.
- Lalu klik kartu halaman mana saja (mis. `Dashboard`) → halaman terbuka dengan RBAC bekerja.

### 3. Atau lewat halaman login
- Buka `login.html` → masukkan email/password demo (lihat di bawah) atau klik tombol role di bagian bawah form.
- Setiap halaman dashboard memanggil `requireAuth()` di load. Jika belum login → redirect ke `login.html`.
- Jika role tidak punya akses ke halaman → redirect ke `dashboard.html` dengan toast error.

### 4. Setiap halaman bisa dibuka standalone
Buka langsung mis. `chatbot.html` → jika sudah login (localStorage ada), tampil penuh; jika belum, redirect ke login.

## Demo Accounts

Email/password berikut dapat dipakai di halaman `login.html` (password sama untuk semua: `demo1234`):

| Role       | Email                          | Nama            |
|------------|--------------------------------|-----------------|
| Superadmin | `superadmin@propertiku.id`     | Andi Pratama    |
| Admin      | `admin@propertiku.id`          | Budi Santoso    |
| Operator   | `operator@propertiku.id`       | Citra Lestari   |
| Manager    | `manager@propertiku.id`        | Dewi Anggraini  |
| Marketing  | `marketing@propertiku.id`      | Eka Wijaya      |
| Keuangan   | `keuangan@propertiku.id`       | Fajar Nugroho   |

Atau ketik email apa saja + password ≥4 karakter → otomatis login sebagai **Operator**.

## Kustomisasi

### Ganti data mock
Edit `assets/data.js` — semua array `DEMO_ACCOUNTS`, `ALL_USERS`, `CONTACTS`, `PROPERTIES`, `ORDERS`, `CAMPAIGNS`, `INVOICES`, `WA_SESSIONS`, `MESSAGE_TEMPLATES`, `REVENUE_TREND`, `LEAD_SOURCE`, `FUNNEL_DATA` ada di sana.

### Ubah hak akses / menu RBAC
Edit `assets/rbac.js` — modifikasi array `MENU_ITEMS` (kolom `roles` per item) atau `ROLES` (label/deskripsi).

### Ubah warna tema
- Warna role: `ROLE_THEME` di `rbac.js`.
- Token desain (background, primary, border): `:root` dan `.dark` di `assets/shared.css`.
- Konfigurasi Tailwind: `assets/tailwind-config.js`.

### Tambah halaman baru
1. Salin salah satu halaman module (mis. `properties.html`) sebagai template.
2. Ubah `activeView` di `renderLayoutShell(...)` dan `requireAccess(...)` ke key view yang sesuai.
3. Tambah entry baru di `MENU_ITEMS` (rbac.js) + `VIEW_FILE` + `VIEW_TITLES` jika ingin muncul di sidebar.

## Cross-page behavior

- **Auth state**: `localStorage` key `propertiku-auth` (object user). Setiap halaman dashboard memanggil `requireAuth()`.
- **Theme**: `localStorage` key `propertiku-theme` (`light`/`dark`). Diterapkan sebelum render (anti flash).
- **Navigasi**: link sidebar pakai `<a href="...html">` biasa. Active item dihighlight berdasarkan `activeView` yang diteruskan ke `renderLayoutShell`.
- **Logout**: tombol di kartu user (sidebar) dan menu user (topbar) → clear localStorage → redirect ke `login.html`.
- **Akses ditolak**: `requireAccess(view)` cek `canAccess(role, view)`; jika false → toast + redirect ke `dashboard.html`.

## RBAC Matrix

| Menu                 | superadmin | admin | operator | manager | marketing | keuangan |
|----------------------|:----------:|:-----:|:--------:|:-------:|:---------:|:--------:|
| Dashboard            | ✓          | ✓     | ✓        | ✓       | ✓         | ✓        |
| Chatbot WhatsApp     | ✓          | ✓     | ✓        | —       | ✓         | —        |
| Kontak & Leads       | ✓          | ✓     | ✓        | ✓       | ✓         | —        |
| Properti             | ✓          | ✓     | ✓        | ✓       | ✓         | —        |
| Order                | ✓          | ✓     | ✓        | ✓       | —         | ✓        |
| Marketing            | ✓          | ✓     | —        | ✓       | ✓         | —        |
| Keuangan             | ✓          | ✓     | —        | ✓       | —         | ✓        |
| Manajemen Pengguna   | ✓          | ✓     | —        | —       | —         | —        |
| Pengaturan           | ✓          | ✓     | ✓        | ✓       | ✓         | ✓        |

## Catatan

- Aplikasi ini demo — semua data mock, tidak ada backend nyata. Mutasi (tambah user, tandai invoice lunas, dll.) hanya di memory halaman; refresh akan reset.
- Untuk integrasi backend nyata, ganti fungsi `login()`/`register()` di `auth.js` dan fungsi render di tiap halaman untuk memanggil API.
- Integrasi WhatsApp (Waha) di `settings.html` hanya tampilan — tombol "Test Koneksi" mensimulasikan sukses.
- Chart.js butuh canvas terlihat untuk render. Pastikan container chart punya tinggi eksplisit (`h-60`/`h-64`).

---

© 2025 PropertiKu Agent — Template UI. Ditenagai oleh Waha WhatsApp API.
