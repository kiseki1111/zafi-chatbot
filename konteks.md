# Konteks & Tujuan Proyek: UMKM AI Agent Platform

## 🎯 Tujuan Utama
Proyek ini adalah sebuah **Platform Digital (SaaS) berbasis Web** yang dirancang khusus untuk membantu para pemilik UMKM (Usaha Mikro, Kecil, dan Menengah) dalam mengelola operasional bisnis mereka secara cerdas dan otomatis. 

Fokus utama dari platform ini adalah memungkinkan pemilik UMKM untuk **membuat, mengatur, dan mengelola Asisten AI (Bot)** mereka sendiri tanpa perlu keahlian pemrograman (No-Code/Low-Code), yang dapat langsung dihubungkan ke saluran komunikasi bisnis seperti WhatsApp dan Telegram.

## 🎯 Target Pengguna & Batasan Desain

### Profil UMKM Target
Platform ini **bukan** untuk pedagang kecil tanpa kehadiran digital (misal: penjual somay keliling). Target utamanya adalah UMKM yang sudah memiliki:
- Akun sosial media aktif (Instagram, Facebook, TikTok) sebagai etalase.
- Nomor WhatsApp bisnis yang digunakan untuk menerima pesanan dari pelanggan.
- Katalog produk (10–100 item) dengan harga tetap atau bervariasi.
- Kebutuhan nyata untuk mengotomasi balasan chat yang repetitif.

Contoh: toko dimsum online, toko baju Instagram, reseller sepatu, toko kue rumahan dengan menu harian.

### Prinsip Kompleksitas UI
- **Catat, jangan manage.** Transaksi adalah catatan penjualan sederhana (siapa, apa, berapa, kapan), bukan sistem *order management* multi-status seperti marketplace.
- **Bahasa manusia.** Hindari istilah teknis (Knowledge Base → "Ajari Bot", Vektor Database → "Bot sudah belajar").
- **Data masuk otomatis.** Alur utama adalah data masuk dari percakapan Bot di WhatsApp. Input manual (via dashboard) adalah *fallback*, bukan jalur utama.

---

## 🤖 Alur & Arsitektur Bot (Agent System)
Platform ini memiliki dua kategori bot utama yang bekerja secara spesifik untuk menangani pelanggan (Customer) dan membantu pemilik toko (Owner).

### 1. Bot CS (Customer Service)
Bot ini ditujukan langsung untuk berinteraksi dengan pelanggan UMKM. 
- **Fungsi Utama:** Menghandle semua pertanyaan dan pesan yang masuk dari pelanggan (misal: tanya stok, harga, atau jam buka).
- **Alur Pemesanan (Order Flow):** Jika pelanggan mengonfirmasi ingin membuat pesanan, Bot CS akan otomatis memberikan format formulir pesanan (seperti detail *item*, waktu pengambilan, alamat, dll). Setelah diisi oleh pelanggan, pesanan tersebut akan langsung diteruskan kepada Owner atau masuk ke *dashboard* pesanan.

### 2. Bot Asisten (Owner Assistant)
Bot ini bertindak sebagai "karyawan virtual" khusus bagi Owner UMKM. Bot Asisten didesain menggunakan arsitektur *Multi-Agent* di mana setiap tugas spesifik ditangani oleh *Agent* yang berbeda:

1. **Agent Asisten (Database CRUD) - *[Tersedia]***
   Agen yang terintegrasi langsung dengan *database* sistem. Jika Owner meminta laporan penjualan (report), memperbarui harga barang, mengecek stok, atau tugas lain yang berhubungan langsung dengan data UMKM, Bot Asisten akan otomatis mengalihkannya ke agen ini.
2. **Agent Knowledge - *[Tersedia]***
   Agen yang bertugas mengelola basis pengetahuan (*knowledge base*). Jika Owner ingin menambahkan produk baru ke katalog atau menyuntikkan informasi baru (seperti promo atau aturan toko), agen ini yang akan memproses dan mempelajarinya.
3. **Agent Design - *[Mendatang]***
   Agen grafis yang berfungsi membantu Owner membuat desain visual, seperti pamflet promosi, poster diskon, atau materi *marketing* lainnya secara otomatis.
4. **Agent Research - *[Mendatang]***
   Agen konsultan yang berfungsi membantu Owner dalam sesi *brainstorming*, mencari ide produk baru, menganalisis tren pasar, atau merancang strategi promosi.

*(Catatan: Saat ini sistem difokuskan pada penyelesaian Agent 1 dan 2 terlebih dahulu, sedangkan Agent 3 dan 4 akan menyusul di fase pengembangan selanjutnya.)*

---

## 🚀 Fitur Pendukung Lainnya
- **Omnichannel & Integrasi Komunikasi:** Menghubungkan bot secara otomatis ke **WhatsApp** (via WAHA) dan **Telegram**. Fitur QRIS WA/Telegram mempermudah *pairing* (menghubungkan) nomor UMKM ke mesin bot secara instan.
- **Manajemen Operasional UMKM:** Dashboard sentral untuk mengelola katalog produk, manajemen pesanan (Sales), dan CRM (Customer Relationship Management).
- **Role-Based Access Control (RBAC):** Sistem dibekali struktur akses bertingkat (Owner, Admin, Operator) agar pemilik UMKM dapat mendelegasikan tugas ke stafnya dengan aman.

---

## 📦 Pendekatan Katalog Produk
Setiap UMKM memiliki jenis produk yang sangat beragam (makanan, pakaian, jasa, dll.), sehingga tidak mungkin membuat struktur tabel yang kaku untuk semua jenis variasi. Solusinya:
- **Kolom inti tetap (fixed):** `nama`, `harga`, `stok`, `kategori` — ini universal untuk semua UMKM.
- **Kolom variasi (fleksibel):** Menggunakan kolom bertipe `JSON` untuk menampung atribut spesifik tiap produk yang berbeda antar UMKM (misal: ukuran S/M/L untuk baju, rasa untuk dimsum, warna untuk sepatu). Struktur JSON-nya ditentukan sendiri oleh Owner saat mengisi data.
- Bot AI akan membaca kolom JSON ini secara dinamis untuk menjawab pertanyaan pelanggan mengenai variasi produk.

### Dukungan Format Input Data
Banyak UMKM yang sudah menyimpan data produk mereka dalam format digital sederhana. Platform mendukung input katalog dari:
- **Upload file Excel (.xlsx, .csv)** — diproses oleh AI untuk memetakan kolom secara otomatis.
- **Input manual via dashboard** — form sederhana untuk tambah produk satu per satu.
- **Via chat Bot Asisten** — Owner cukup kirim pesan seperti "tambah produk baru: Dimsum Ayam, harga 25rb, stok 50" dan Agent Knowledge akan memproses.

---

## 🖥️ Halaman Dashboard Web

Dashboard web adalah panel kontrol utama bagi Owner UMKM. Berikut daftar halaman beserta fungsinya:

| Halaman | Fungsi | Data Utama |
|---------|--------|------------|
| **Dashboard (Overview)** | Ringkasan harian performa toko & bot | Omset hari ini, barang terjual, stok menipis, chat dibalas bot, insight AI |
| **Laporan Bot CS** | Kinerja Bot Customer Service | Pesan masuk, pesan dibalas bot, pesanan via bot, pelanggan baru, tren pesan 7 hari |
| **Customer Service** | Monitoring & takeover chat pelanggan | Daftar chat WA, status bot (aktif/butuh bantuan), bubble chat, tombol ambil alih |
| **Transaksi** | Catatan penjualan (bukan order management) | Tabel: waktu, pelanggan, produk, qty, total. Export Excel |
| **Katalog & Stok** | CRUD produk toko | Tabel produk (nama, kategori, harga, stok, variasi JSON), upload Excel, tambah manual |
| **Otak AI (Knowledge)** | Kelola pengetahuan bot | Daftar fakta/info yang sudah diajarkan ke bot, tambah info baru |
| **Pengaturan** | Konfigurasi bot & toko | Identitas Bot CS, identitas Bot Asisten, koneksi WhatsApp (WAHA), profil admin |

### Onboarding
Saat Owner pertama kali mendaftar, sistem menampilkan flow **Onboarding** yang memandu pengisian: nama toko, kategori, nomor telepon, alamat, nama bot, gaya bahasa bot, dan koneksi WhatsApp.

---

## 💻 Arsitektur & Teknologi (Stack)

### Struktur Proyek (Monorepo)
```
rbac-service/                  ← Root monorepo (npm workspaces)
├── apps/
│   ├── backend/               ← NestJS API Server
│   │   └── src/
│   │       ├── core/          ← Prisma, OpenAI, Omnichannel
│   │       ├── features/      ← Fitur per domain
│   │       │   └── web-dashboard/
│   │       │       ├── auth/  ← Login, Register, JWT, Google OAuth
│   │       │       ├── tenant/ ← Dashboard API, Onboarding, CRUD
│   │       │       └── users/ ← Manajemen user
│   │       └── modules/       ← Integrasi: WAHA, Telegram, Chat
│   └── web/                   ← Next.js Frontend
│       └── src/
│           ├── app/           ← Route & layout
│           ├── components/
│           │   ├── auth/      ← Login & Register UI
│           │   ├── dashboard/ ← Shell, Sidebar, Topbar
│           │   └── modules/   ← Halaman per fitur (overview, cs, catalog, dll)
│           └── lib/           ← Auth store, App store, RBAC config, Types
└── docker-compose.yml         ← PostgreSQL + WAHA containers
```

### Teknologi
- **Frontend:** Next.js (React), TailwindCSS, Zustand (State Management), shadcn/ui, Recharts (grafik).
- **Backend:** NestJS (Node.js), TypeScript, JWT (access + refresh token dengan hashing).
- **Database:** PostgreSQL dengan Prisma ORM. Menggunakan ekstensi `pgvector` untuk embedding AI (RAG).
- **AI Engine:** Integrasi dengan OpenAI (atau LLM setara) untuk kecerdasan bot dan logika *routing agent*.
- **WhatsApp Engine:** WAHA (WhatsApp HTTP API) di dalam Docker container.

### Cara Menjalankan
```bash
# Jalankan service database dan waha via docker
docker-compose -f docker-compose.local.yml up -d

# Install dependencies (dari root)
npm install

# Jalankan backend (NestJS)
npm run dev:backend

# Jalankan frontend (Next.js)
npm run dev:web

# Generate Prisma Client (jika schema berubah)
npm run prisma:generate
```

---

## 📊 Status Progress Saat Ini

### ✅ Sudah Tersedia
- Autentikasi: Login, Register, Google OAuth, JWT (access + refresh token), Logout
- Dashboard Overview: KPI cards (omset, barang terjual, stok menipis) dengan data real dari API
- Laporan Bot CS: KPI cards + chart (dummy data, belum terhubung API)
- Katalog & Stok: Tabel produk dari API, upload Excel, tambah manual (UI ready)
- Transaksi: Tabel penjualan dari API, export Excel (UI ready)
- Knowledge Base: CRUD fakta/info toko dari API
- Customer Service: UI chat list + bubble (dummy, belum real-time)
- Pengaturan: Form identitas Bot CS & Bot Asisten, tab koneksi WA (UI ready)
- Onboarding: Multi-step wizard
- Bot CS & Bot Asisten (Agent 1 & 2): Backend logic tersedia
- Integrasi WAHA (WhatsApp): Webhook, instance management
- Schema database: Lengkap (User, Tenant, Product, SalesRecord, KnowledgeBase, Conversation, Message, AiSession, Contact, dll)
- RBAC: Infrastruktur tersedia, saat ini hanya role `owner` yang aktif

### 🔜 Belum Tersedia / Fase Selanjutnya
- Multi-role RBAC aktif (Admin, Operator) — infrastruktur sudah ada, belum diimplementasi di UI
- CRM / Leads management — model `Contact` sudah ada di schema, belum ada halaman khusus
- Koneksi Telegram di dashboard — backend tersedia, UI belum
- Agent Design & Agent Research — belum dimulai
- Real-time chat WebSocket di halaman CS — saat ini masih dummy
- Notifikasi push / alert ke Owner

---

## 📌 Ringkasan
Secara keseluruhan, proyek ini memposisikan diri sebagai sistem operasi digital 24/7 bagi para pelaku UMKM. Dengan platform ini, operasional *Customer Service* diotomatisasi dengan form terstruktur, sementara sang *Owner* dimanjakan dengan *Multi-Agent Assistant* untuk urusan *database*, *knowledge*, hingga desain dan riset ke depannya.
