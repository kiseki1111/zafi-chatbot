# Multi-Tenant AI Chatbot & Omnichannel CRM Platform

Platform produksi **Multi-Tenant WhatsApp AI Chatbot** dan **Web CMS Dashboard** yang dirancang untuk mengotomasi layanan pelanggan, manajemen prospek (CRM), serta integrasi inventaris bisnis (UMKM, Real Estate/Properti, Travel/PO Bus).

---

## 🌟 Fitur Utama

- 🤖 **Dual AI Engine:**
  - **Bot CS (Customer Service):** Menjawab pertanyaan pelanggan WhatsApp 24/7 menggunakan RAG (*Retrieval-Augmented Generation*) dari dokumen dan katalog produk tenant.
  - **Bot Asisten Internal:** Mendukung *tool calling* (pencatatan penjualan atomik, cek stok barang secara langsung, dan pembaruan harga massal).
  - **Simulator Interaktif:** Sandbox pada dashboard web untuk menguji respon bot sebelum dipublikasikan.
- 💬 **Omnichannel CRM & Live Chat:**
  - Riwayat obrolan pelanggan *real-time* via WAHA (WhatsApp HTTP API).
  - Peralihan otomatis **Bot vs Human Takeover** saat operator membalas chat secara manual.
  - Manajemen kontak, tagging, pemberian catatan internal (*internal notes*), dan delegasi percakapan.
- 📚 **Multi-Modal Knowledge Ingestion:**
  - Ekstraksi otomatis dari dokumen `.pdf`, `.docx`, dan teks bebas.
  - Sinkronisasi massal data inventaris/produk via file spreadsheet `.xlsx`.
  - Ekstraksi gambar menggunakan model visi OpenAI.
  - Penyimpanan vektor embedding menggunakan PostgreSQL + ekstensi `pgvector`.
- 🏢 **Solusi Vertikal Spesifik:**
  - **Siteplan Kavling / Properti (`availability`):** Visualisasi ketersediaan unit rumah/kavling tanah (Available, Reserved, Sold).
  - **Denah Kursi Bus (`bus_layout`):** Visualisasi tata letak kursi bus untuk bisnis travel & transportasi.
- ⏰ **Automated Follow-Up Engine:**
  - Penjadwalan otomatis harian (default: 09:00 WIB) untuk menghubungi kembali pelanggan pasif (>24 jam) dengan pesan personalisasi AI dan pencegahan pesan ganda (*anti-duplicate*).
- 👑 **Superadmin Platform Control:**
  - Monitoring semua sesi WAHA aktif, penggunaan kuota token AI, manajemen paket & harga klien, serta log audit sistem.

---

## 🏗️ Struktur Proyek

Platform ini menggunakan arsitektur monorepo:

```
├── apps/
│   ├── backend/             # NestJS API Server (Port 3030)
│   │   ├── src/             # Logika bisnis, Prisma, integrasi WAHA & OpenAI
│   │   └── test/            # Unit, integration, dan E2E test suite
│   └── web/                 # Next.js 16 Web CMS & PWA (Port 3001)
│       └── src/             # Dashboard UI (Tailwind v4, Shadcn, Zustand)
├── docker-compose.yml       # Konfigurasi container produksi (Coolify network)
├── docker-compose.local.yml # Container lokal PostgreSQL + pgvector
├── docker-compose.waha.yml  # Container WAHA WhatsApp Gateway
├── konteks.md               # Dokumentasi detail konteks dan arsitektur
└── PHASE-3-4-PLAN.md        # Rencana aksi perbaikan kualitas dan pengujian
```

---

## 📋 Prasyarat Sistem

- **Node.js:** Versi >= 20.x
- **Docker & Docker Compose:** Versi terbaru
- **PostgreSQL:** Versi 15+ dengan ekstensi `pgvector`
- **WAHA (WhatsApp HTTP API):** Server WAHA lokal atau cloud
- **OpenAI API Key:** Untuk engine AI, Vision, dan Vector Embeddings

---

## 🚀 Panduan Memulai Cepat (Pengembangan Lokal)

### 1. Salin Pengaturan Lingkungan
Duplikasi file `.env.example` atau sesuaikan `.env` pada folder root dan `apps/backend/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:secret_password@127.0.0.1:5432/rbac_api_db?schema=public"

# Backend
PORT=3030
JWT_SECRET="your-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# WAHA (WhatsApp Gateway)
WAHA_API_URL="http://localhost:3000"
WAHA_API_KEY="your-waha-key"
WHATSAPP_API_KEY="your-waha-key"

# OpenAI
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxx"
```

### 2. Jalankan Database Lokal
Jalankan PostgreSQL dengan ekstensi `pgvector` melalui Docker:

```bash
docker compose -f docker-compose.local.yml up -d
```

### 3. Migrasi & Seed Database
Jalankan migrasi database dan pembuat data awal (seed):

```bash
npm run prisma:generate
cd apps/backend
npx prisma migrate dev
npx prisma db seed
cd ../..
```

### 4. Jalankan Aplikasi
Jalankan backend API dan web frontend secara bersamaan:

```bash
# Terminal 1 - Backend NestJS (http://localhost:3030)
npm run dev:backend

# Terminal 2 - Frontend Next.js (http://localhost:3001)
npm run dev:web
```

---

## 🧪 Strategi & Pelaksanaan Pengujian (Testing)

Proyek ini menerapkan pengujian multi-layer komprehensif:

### 1. Unit & Integration Testing (Jest)
Menjalankan pengujian logika service, controller, dan integrasi modul:

```bash
# Dari root atau folder apps/backend
cd apps/backend
npm test

# Menjalankan pengujian dengan laporan cakupan (coverage)
npm run test:cov
```

### 2. End-to-End (E2E) API Testing (Supertest)
Menguji alur API lengkap dari autentikasi, manajemen knowledge base, hingga alur follow-up:

```bash
cd apps/backend
npm run test:e2e
```

### 3. Load & Stress Testing (k6)
Menguji ketahanan endpoint webhook dan respon bot saat menerima lonjakan pesan bersamaan:

```bash
# Menjalankan load test skenario webhook
k6 run tests/load/webhook-load-test.js
```

### 4. Frontend Web UI Testing (Playwright)
Menguji alur kerja antarmuka pengguna pada dashboard CMS:

```bash
cd apps/web
npx playwright test
```

---

## 🚢 Panduan Deployment (Produksi)

Aplikasi telah disiapkan untuk deployment berbasis Docker / Coolify menggunakan `docker-compose.yml`:

```bash
# Build dan jalankan container backend & frontend
docker compose up -d --build
```

Pastikan variabel `DATABASE_URL` dan `WAHA_API_URL` terhubung pada network container yang sesuai (`coolify-network` atau bridge khusus).

---

## 📄 Lisensi
Hak Cipta © 2026. Seluruh hak cipta dilindungi undang-undang.
