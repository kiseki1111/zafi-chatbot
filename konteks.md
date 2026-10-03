# Konteks & Dokumentasi Arsitektur Proyek: Multi-Tenant AI Chatbot & Omnichannel CRM Platform

---

## 1. 🎯 Visi & Tujuan Utama Proyek
Proyek ini adalah platform **Multi-Tenant AI WhatsApp Chatbot & Omnichannel CRM Dashboard** tingkat produksi. Platform dirancang untuk melayani dua tingkatan pengguna:
1. **Superadmin (Platform Owner):** Mengelola operasional multi-tenant, memantau utilisasi token AI, mengawasi kesehatan seluruh sesi WAHA (WhatsApp HTTP API), mengatur pricing tier, serta mengonfigurasi model AI global dan log audit sistem.
2. **Klien / Tenant Bisnis (UMKM, Real Estate/Properti, Travel/PO Bus, Retail):** Mengotomasi interaksi pelanggan di WhatsApp menggunakan Agen AI pintar berbasis RAG (*Retrieval-Augmented Generation*), memantau percakapan secara *real-time*, melakukan *human takeover*, mengelola inventaris/unit ketersediaan, serta menjalankan *automated follow-up*.

---

## 2. 🏗️ Arsitektur Monorepo & Layanan

```
iqbal-backend/
├── apps/
│   ├── backend/                     ← NestJS API Server (Port 3030)
│   │   ├── src/
│   │   │   ├── core/                ← Prisma ORM, pgvector, OpenAI Client, Omnichannel Queue, Shared Agent Service
│   │   │   ├── features/            ← Domain bisnis utama
│   │   │   │   ├── agent-cs/        ← Logika Customer Service AI & pemrosesan pesan WhatsApp
│   │   │   │   ├── agent-assistant/ ← Asisten internal (tool calling: record_sale, cek stok, bulk update)
│   │   │   │   ├── knowledge-ingest/← Multi-modal ingestion (PDF, DOCX, XLSX, Image Vision, Text)
│   │   │   │   ├── simulator/       ← Sandbox testing percakapan sebelum live ke WA
│   │   │   │   └── web-dashboard/   ← Auth (JWT, refresh token), Tenant management, Onboarding
│   │   │   ├── modules/             ← Modul integrasi & operasional
│   │   │   │   ├── waha/            ← Integrasi WAHA (webhook, multi-session, QR, auto follow-up)
│   │   │   │   ├── chats/           ← Riwayat chat, message delivery, SSE/Stream
│   │   │   │   ├── contacts/        ← Manajemen kontak CRM, tags, notes
│   │   │   │   ├── availability/    ← Manajemen unit siteplan kavling & denah kursi bus
│   │   │   │   └── platform/        ← Modul manajemen global Superadmin
│   │   │   └── common/              ← Guards (JWT, RBAC), Decorators, Interceptors, Filters
│   │   └── test/                    ← Infrastruktur E2E & Integration Testing
│   └── web/                         ← Next.js 16 CMS & PWA Frontend (Port 3001)
│       ├── src/
│       │   ├── app/                 ← App Router (Layout, manifest PWA, globals)
│       │   ├── components/          ← UI Components (Tailwind v4, Radix, Shadcn)
│       │   │   ├── modules/         ← Halaman modul (Superadmin, Overview, CRM, Chatbot, dll.)
│       │   │   └── dashboard/       ← Shell layout, Topbar, Sidebar, Bottom-nav mobile
│       │   └── lib/                 ← Zustand store, RBAC definitions, API clients, Types
├── docker-compose.yml               ← Konfigurasi orkestrasi container produksi (Coolify Network)
├── docker-compose.db.yml            ← PostgreSQL + pgvector container
├── docker-compose.waha.yml          ← WAHA WhatsApp Gateway container
└── PHASE-3-4-PLAN.md                ← Rencana peningkatan kualitas produksi & matriks testing
```

---

## 3. 👥 Role-Based Access Control (RBAC) & Persona

Sistem membedakan izin akses berdasarkan tingkatan role:
* **Superadmin:** Akses penuh ke *Ringkasan Platform, Kelola Klien, Semua Sesi WAHA, Monitor Kuota & Token AI, Paket & Harga, Konfigurasi Model AI, dan Log Audit Sistem*.
* **Manager:** Akses penuh operasional tenant (dashboard analitik, CRM, chatbot, knowledge base, availability, pengaturan tenant & nomor WAHA).
* **Administrator:** Manajemen konten tenant, produk/unit, dokumen knowledge base, dan konfigurasi auto follow-up.
* **Operator / CS:** Akses live chat CRM, balas chat langsung (*Human Takeover*), manajemen tag kontak dan riwayat percakapan.
* **Marketing:** Akses broadcast, riwayat kontak, lead status, dan analisis performa kampanye pesan.

---

## 4. 🚀 Fitur Unggulan Platform

### 4.1. Dual AI Engine (Customer Service & Internal Assistant)
* **Agent CS (Luna):** Menjawab pertanyaan pelanggan WhatsApp 24/7 secara kontekstual menggunakan data knowledge base tenant dan riwayat chat sebelumnya. Mampu mengekstrak pesanan otomatis.
* **Agent Assistant:** Menggunakan *Function Calling / Tools*:
  * `record_sale`: Mengurangi stok produk dan mencatat riwayat penjualan secara atomik (`$transaction`).
  * `check_stock`: Memeriksa ketersediaan barang secara *real-time*.
  * `bulk_update_price`: Penyesuaian harga massal persentase atau nominal tetap dengan proteksi parameter SQL.
* **Simulator Interaktif:** Antarmuka web untuk mencoba simulasi obrolan pelanggan vs bot sebelum instance WhatsApp dipublikasikan.

### 4.2. Omnichannel Live Chat & Human Takeover Mode
* Switch transparan antara mode **Bot** dan **Human**: saat operator mengirim pesan manual dari web dashboard atau WA Web, bot secara otomatis beralih ke mode diam (tidur) agar tidak terjadi konflik respon ganda.
* Manajemen kontak komprehensif: status prospek (NEW, CONTACTED, QUALIFIED, WON, LOST), label, catatan internal tim (*Notes*), dan *conversation assignment*.

### 4.3. Multi-Modal Knowledge Ingestion (RAG)
* **Dokumen:** Parsing file `.pdf`, `.docx`, dan `.txt`.
* **Katalog & Stok:** Sinkronisasi massal via spreadsheet `.xlsx`.
* **Visual:** Ekstraksi informasi dari gambar menggunakan model visi OpenAI.
* **Penyimpanan:** Vektorisasi embedding disimpan di PostgreSQL dengan ekstensi `pgvector`.

### 4.4. Solusi Spesifik Vertikal (Vertical Modules)
* **Denah Kursi Bus (`bus_layout`):** Khusus bisnis travel & transportasi untuk melihat tata letak kursi bus, ketersediaan, serta pemesanan tiket.
* **Siteplan Properti (`availability`):** Khusus pengembang perumahan / kavling properti dengan denah visual, status unit (AVAILABLE, RESERVED, SOLD), serta rincian spesifikasi tipe rumah.

### 4.5. Automated Follow-Up Engine
* Background scheduler (Cron Job) yang berjalan otomatis setiap pukul 09:00 WIB.
* Mendeteksi kontak yang pasif/inaktif selama batas waktu yang ditentukan (default >24 jam).
* Menghasilkan pesan penawaran personalisasi berbasis AI.
* Mekanisme *anti-duplicate* untuk memastikan satu kontak tidak menerima follow-up berulang kali.

### 4.6. WAHA Multi-Session Connector
* Setiap tenant memiliki sesi WhatsApp terisolasi.
* Manajemen QR Code langsung dari browser web dashboard.
* Webhook sinkronisasi status pengiriman (`SENT`, `DELIVERED`, `READ`, `ERROR`).

---

## 5. 🛠️ Stack Teknologi

| Komponen | Teknologi |
|---|---|
| **Backend Framework** | NestJS 11 (Node.js, TypeScript) |
| **ORM & Database** | Prisma 6, PostgreSQL 15/16 + ekstensi `pgvector` |
| **AI LLM & Vision** | OpenAI API (GPT-4o, GPT-4o-mini, Vision, Text Embeddings) |
| **WhatsApp Gateway** | WAHA (WhatsApp HTTP API Core/Plus) |
| **Frontend Framework**| Next.js 16 (React 19, TypeScript, App Router) |
| **Styling & UI Kit** | Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Shadcn UI |
| **State & Data Client**| Zustand (App & Auth Store), TanStack Query v5, TanStack Table |
| **Deployment** | Docker, Docker Compose, Coolify, N8N Integration |
| **Testing Suite** | Jest (Unit & Integration), Supertest (API E2E), k6 (Load Testing), Playwright (UI E2E) |

---

## 6. 🧪 Matriks & Strategi Pengujian Komprehensif

Platform diuji melalui pendekatan piramida pengujian multi-layer:
1. **Unit Testing:** Pengujian logika bisnis murni tanpa dependensi I/O (Service methods, sanitasi DTO, utilitas enkripsi).
2. **Integration Testing:** Pengujian interaksi modul NestJS dengan PostgreSQL mock/test database dan middleware.
3. **API E2E Testing (Supertest):** Pengujian siklus penuh HTTP request, proteksi token JWT, transaksi database, dan response serialization.
4. **Stress & Load Testing (k6):** Simulasi webhook WAHA dan lonjakan traffic pesan chat untuk mengukur *p95 latency*, *throughput*, dan *error rate*.
5. **Frontend Web UI Testing (Playwright):** Otomasi skenario interaksi pengguna pada dashboard CMS, navigasi multi-role, dan simulator chatbot.
6. **Security & Data Isolation Testing:** Pengujian ketat untuk memastikan tenant tidak dapat mengakses data tenant lain (pencegahan IDOR).
