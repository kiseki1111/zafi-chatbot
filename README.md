# PropertiKu - AI Agent & RBAC Management System

PropertiKu adalah ekosistem aplikasi tingkat industri yang memadukan sistem **Role-Based Access Control (RBAC)**, **Frontend Dashboard (Next.js)**, dan **AI Agent (Telegram & WhatsApp)** untuk otomasi pemasaran dan manajemen agen properti.

Sistem ini dirancang menggunakan arsitektur berlapis yang kokoh dengan **NestJS**, **Prisma ORM**, dan database **PostgreSQL**.

---

## Struktur Proyek

Proyek ini menggunakan struktur monorepo sederhana yang terbagi menjadi dua bagian utama:
1. **Backend (`/`)**: Berisi core API NestJS, integrasi AI, integrasi Telegram/WhatsApp, dan manajemen database Prisma.
2. **Frontend (`/ui`)**: Berisi aplikasi dashboard berbasis **Next.js** (Tailwind CSS & Shadcn UI) untuk memonitor percakapan AI, mengatur properti, dan manajemen agen/RBAC.

---

## Fitur Utama

### 1. AI Customer Service Agent (Luna)
- **Multi-Channel**: Berjalan otomatis di Telegram dan WhatsApp (menggunakan WAHA).
- **RAG Knowledge Base**: AI merespon berdasarkan database pintar yang bisa di-*update* secara dinamis melalui Google Sheets atau file lokal.
- **Image Handling**: AI dapat mendeteksi properti yang diminta dan otomatis mengirimkan denah / foto wujud rumah langsung ke *customer* lengkap dengan *caption* teks.

### 2. Role-Based Access Control (RBAC) 
- Sistem manajemen akses pengguna yang granular (Super Admin, Admin, Agent).
- Keamanan tinggi dengan *Mass Assignment Protection*, *Cryptographic Credential Hashing* (Bcrypt), dan JWT Authentication.
- Perlindungan *Brute Force* (Rate Limiting).

### 3. Ekosistem Frontend (Next.js)
- Dashboard pemantauan *real-time* untuk seluruh aktivitas chat AI.
- Manajemen properti, input *knowledge base*, dan CRM *(Customer Relationship Management)*.
- Desain antarmuka modern yang estetik menggunakan *glassmorphism* dan *dark mode*.

---

## Panduan Instalasi (Development)

Berikut adalah panduan lengkap menjalankan proyek ini di mesin lokal:

### A. Persiapan Backend (NestJS)
1. **Install Dependensi:**
   ```bash
   npm install
   ```
2. **Pengaturan Lingkungan (.env):**
   Pastikan Anda telah mengisi file `.env` dengan kredensial yang tepat (seperti `DATABASE_URL`, `OPENAI_API_KEY`, dan `TELEGRAM_BOT_TOKEN`).
3. **Migrasi Database:**
   ```bash
   npx prisma db push
   ```
4. **Jalankan Server Backend:**
   ```bash
   npm run start:dev
   ```
   *Backend akan berjalan di `http://localhost:3000`*

### B. Persiapan Frontend (Next.js)
1. **Masuk ke folder UI dan install dependensi:**
   ```bash
   cd ui
   npm install
   ```
2. **Jalankan Server Frontend:**
   ```bash
   npm run dev
   ```
   *Frontend akan berjalan di `http://localhost:3001`*

---

## Ekspor & Impor Database

Untuk mempermudah sinkronisasi data antar *developer*, Anda dapat menggunakan *script* bawaan:

- **Ekspor Database**:
  ```bash
  node scripts/export-db.js
  ```
  *(Akan menghasilkan file `database-backup.json` / `.sql`)*

- **Impor Database**:
  ```bash
  node scripts/import-db.js
  ```
  *(Memasukkan seluruh data, termasuk embedding vektor AI ke lokal Anda)*

---

## Kredensial Bawaan (Super Admin)

Gunakan akun ini untuk masuk ke dalam Dashboard Frontend pertama kali:
- **Email:** superadmin@gmail.com
- **Password:** rahasia123

---
*Dibuat oleh Tim Pengembang PropertiKu | 2026*
