# PropertiKu - AI Agent & RBAC Management System

PropertiKu adalah ekosistem aplikasi tingkat industri yang memadukan sistem **Role-Based Access Control (RBAC)**, **Frontend Dashboard (Next.js)**, dan **AI Agent (Telegram & WhatsApp)** untuk otomasi pemasaran dan manajemen agen properti.

Sistem ini dirancang menggunakan arsitektur berlapis yang kokoh dengan **NestJS**, **Prisma ORM**, dan database **PostgreSQL**.

---

## Struktur Proyek (NPM Workspace Monorepo)

Proyek ini telah dikonfigurasi ulang menjadi sebuah arsitektur *Monorepo* modern menggunakan NPM Workspaces:
1. **`apps/backend`**: Berisi core API NestJS, integrasi AI, integrasi Telegram/WhatsApp, dan manajemen database Prisma (Port 3030).
2. **`apps/web`**: Berisi aplikasi dashboard berbasis **Next.js** (Tailwind CSS & Shadcn UI) untuk memonitor percakapan AI dan mengatur properti (Port 3001).

---

## Panduan Instalasi & Menjalankan Lokal

Karena ini adalah sistem *Monorepo*, Anda tidak perlu masuk ke folder satu-per-satu. Semua dapat dikendalikan dari *root* folder:

### 1. Install Dependensi
```bash
npm install
```
*(Perintah ini akan secara otomatis meng-install dependensi untuk Backend dan Web sekaligus)*

### 2. Pengaturan Lingkungan (.env)
Pastikan Anda telah mengisi file `.env` di folder `apps/backend/` dengan benar.

### 3. Generate Prisma & Migrasi Database
Masuk sebentar ke backend untuk setup database:
```bash
cd apps/backend
npx prisma generate
npx prisma db push
cd ../..
```

### 4. Jalankan Aplikasi
Tersedia *script* cepat di *root* direktori untuk menjalankan aplikasi secara langsung:
- Menjalankan Backend: `npm run dev:backend` (Akses di http://localhost:3030)
- Menjalankan Frontend: `npm run dev:web` (Akses di http://localhost:3001)

---

## CI/CD & Docker Deployment (Panel Komodo)

Repositori ini sudah terintegrasi secara penuh dengan **GitHub Actions** dan **Panel Komodo** untuk keperluan *Automated Deployment*.

1. **Pemisahan Pipeline**: Proses *build* (*Continuous Integration*) telah dipisah antara *frontend* dan *backend* melalui file `.github/workflows/deploy.yml` dan `deploy-web.yml`. Apabila ada perubahan di folder `apps/web`, maka hanya *Image* frontend yang akan dibangun, dan sebaliknya.
2. **GitHub Container Registry (GHCR)**: Semua *Image* Docker diproses (di-*build*) menggunakan server GitHub Actions, lalu disimpan di dalam *GitHub Packages (ghcr.io)*. 
3. **Docker Compose**: Pada tahap produksi (Server VPS), sistem *deployment* menggunakan `docker-compose.yml` yang akan langsung melakukan *pull Image* dari GHCR. Dengan demikian, VPS Anda tidak perlu melakukan proses *compile* yang berat (seperti npm install atau prisma generate), membuat server tetap sangat ringan dan stabil.

---

## Ekspor & Impor Database

Untuk mempermudah sinkronisasi data antar *developer*, Anda dapat menggunakan *script* bawaan:

- **Ekspor Database**: `node apps/backend/scripts/export-db.js`
- **Impor Database**: `node apps/backend/scripts/import-db.js`

---

## Kredensial Bawaan (Super Admin)
   
Gunakan akun ini untuk masuk ke dalam Dashboard Frontend pertama kali:
- **Email:** superadmin@gmail.com
- **Password:** rahasia123

---
*Dibuat oleh Tim Pengembang PropertiKu | 2026*
