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

### 4. Menyalakan Database Lokal (Wajib)
Aplikasi *backend* membutuhkan PostgreSQL. Anda bisa menyalakannya dengan mudah tanpa perlu *install* PostgreSQL di komputer, yaitu dengan menggunakan fasilitas Docker:
```bash
docker-compose up rbac-db -d
```
*(Perintah ini hanya akan menyalakan database di *background* pada port 5432, tanpa menyalakan aplikasi versi Docker).*

### 5. Jalankan Aplikasi
Tersedia *script* cepat di *root* direktori untuk menjalankan aplikasi secara langsung:
- Menjalankan Backend: `npm run dev:backend` (Akses di http://localhost:3030)
- Menjalankan Frontend: `npm run dev:web` (Akses di http://localhost:3001)

---

## 🚀 Panduan Deployment ke VPS (Panel Komodo)

Repositori ini sudah dirancang sempurna untuk *Automated Deployment* menggunakan kombinasi **GitHub Actions** dan **Panel Komodo**. 

**Konsep Arsitektur (Sesuai Standar Industri):**
1. **GitHub Actions (Sebagai "Pemasak")**: Memisahkan *pipeline build* antara *frontend* dan *backend* (menggunakan `deploy.yml` & `deploy-web.yml`). Server GitHub akan bekerja keras melakukan kompilasi kodenya menjadi *Image* Docker, lalu menyimpannya di GHCR (GitHub Packages).
2. **Panel Komodo (Sebagai "Penyaji")**: VPS Anda sama sekali **TIDAK** melakukan proses *build*. Melalui instruksi di `docker-compose.yml`, VPS hanya perlu melakukan *pull* (mengunduh) *Image* yang sudah matang dari GHCR. Hal ini menjamin beban CPU/RAM VPS Anda tetap sangat ringan dan stabil dari ancaman *crash*.

**Langkah-Langkah Praktis Setup di Komodo (Untuk Mentor/Admin):**
1. **Tambahkan Repo**: Buka Panel Komodo -> Menu **Repos** -> Masukkan URL GitHub repositori ini. *(Jika repo private, masukkan Personal Access Token di kolom password).*
2. **Buat Stack Baru**: Masuk ke menu **Stacks** -> *Create Stack* -> Beri nama bebas (misal: `zafi-app-monorepo`).
3. **Hubungkan ke Git**: Pada bagian *Choose Mode*, pilih **Git Repo**. Pilih repo GitHub ini, isi *branch* dengan `main`, dan letak file konfigurasi dengan `docker-compose.yml`.
4. **Penting! (Konfigurasi `.env`)**: File `docker-compose.yml` telah diinstruksikan untuk membaca rahasia dari `apps/backend/.env`. Pastikan Anda sudah membuat file ini secara manual di direktori VPS Anda, atau menyuntikkan *Environment Variables*-nya langsung melalui UI Panel Komodo.
5. **Dapatkan Webhook**: Setelah Stack disimpan (*Save*), *scroll* ke paling bawah halaman untuk menemukan dan menyalin **URL Webhook** (serta *Secret* jika ada).
6. **Pasang Webhook di GitHub**: Masukkan URL tadi ke pengaturan repositori GitHub Anda di menu **Settings -> Secrets and variables -> Actions** dengan nama `KOMODO_WEBHOOK_URL` dan `KOMODO_WEBHOOK_SECRET`. 
7. **Beri Izin Akses Upload**: Tambahkan satu rahasia lagi bernama `GH_PAT` (Berisi *GitHub Personal Access Token* *Classic* dengan centang `write:packages` dan `repo`) agar mesin GitHub bisa mengunggah *Image* ke GHCR.

---

## Ekspor & Impor Database

Untuk mempermudah sinkronisasi data antar *developer*, Anda dapat menggunakan *script* bawaan:

- **Ekspor Database**: `node apps/backend/scripts/export-db.js`
- **Impor Database**: `node apps/backend/scripts/import-db.js`

---
*Dibuat oleh Tim Pengembang PropertiKu | 2026*
