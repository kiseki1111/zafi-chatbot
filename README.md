# Role-Based Access Control (RBAC) Identity & Access Management Service

Sistem manajemen identitas dan kontrol akses berbasis peran granular (*Role-Based Access Control*) tingkat industri yang dibangun menggunakan kerangka kerja **NestJS**, **Prisma ORM**, dan database **PostgreSQL**. Proyek ini menerapkan arsitektur berlapis (*layered architecture*) yang kokoh, dilengkapi sistem keamanan otomatis, pencatatan forensik, serta mekanisme rotasi token ganda (*dual-token rotation*).

---

## 🛠️ Arsitektur & Fitur Keamanan Sistem

Sistem ini dirancang dengan mengutamakan aspek keamanan data dan ketahanan infrastruktur melalui penerapan instrumen berikut:
1. **HTTP Security Headers (Helmet)**: Melindungi aplikasi dari celah eksploitasi standar peramban seperti *Cross-Site Scripting* (XSS) dan *Clickjacking*.
2. **Strict CORS Whitelist**: Membatasi hak akses lintas domain secara ketat hanya untuk domain frontend resmi yang terdaftar.
3. **Mass Assignment Protection**: Mengunci gerbang validasi data masuk menggunakan `ValidationPipe` global dikombinasikan dengan DTO (*Data Transfer Object*) berbasis `class-validator` untuk membuang properti ilegal secara otomatis.
4. **Security-First Rate Limiting**: Membatasi lalu lintas permintaan jaringan pada ambang batas aman (maksimal 100 permintaan per 15 menit) untuk memitigasi serangan tebak kata sandi (*Brute Force*).
5. **Cryptographic Credential Hashing**: Mengamankan kata sandi pengguna menggunakan algoritma Bcrypt dengan tingkat kekuatan 12 putaran (*rounds*) sebelum disimpan ke media penyimpanan fisik.
6. **Integritas Data Historis (Soft Delete)**: Menghindari kehilangan data permanen pada entitas pengguna dengan memanfaatkan mekanisme stempel waktu `deletedAt`.
7. **Automated Audit Logging**: Mencatat setiap insiden penolakan hak akses (`ACCESS_DENIED`) secara mandiri ke dalam tabel forensik bersama metadata perangkat klien (IP Address & User Agent).

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

Ikuti urutan komando terminal berikut secara berurutan untuk menyiapkan lingkungan pengembangan lokal:

### 1. Pemasangan Dependensi Pustaka
Unduh seluruh pustaka pendukung yang diperlukan oleh kerangka kerja aplikasi:
```bash
npm install
```

### 2. Sinkronisasi Skema Database Fisik
Pastikan service PostgreSQL Anda di Docker/Lokal sudah menyala, lalu jalankan migrasi terstruktur Prisma untuk membentuk tabel fisik:
```bash
npx prisma migrate dev
```

### 3. Penyemaian Data Awal (Database Seeding)
Jalankan skrip penyemaian untuk mendaftarkan akun penguasa tertinggi (Super Admin), daftar peran, dan hak akses granular dasar:
```bash
npx prisma db seed
```
**Kredensial Akun Master:**
- **Email:** superadmin@gmail.com
- **Password:** rahasia123

### 4. Menjalankan Server Lokal
Nyalakan server NestJS dalam mode pengembangan (development mode):
```bash
npm run start:dev
```
Server akan berjalan secara lokal pada tautan: `http://localhost:3000`

---

## 🛣️ Dokumentasi Struktur URL Endpoint API (v1)
Seluruh jalur komunikasi antarmuka wajib menggunakan awalan konteks `/api/v1`.

### 1. Modul Otentikasi (Authentication)
| Method | Endpoint URL | Fungsi Operasional | Proteksi Gerbang |
|--------|-------------|-------------------|------------------|
| POST | `/api/v1/auth/login` | Penyerahan kredensial untuk mendapatkan Access Token | Publik (`@Public`) |
| POST | `/api/v1/auth/logout` | Penghancuran sesi dan penghapusan Refresh Token | `JwtAuthGuard` |
| POST | `/api/v1/auth/refresh` | Pembaruan Access Token lewat mekanisme rotasi tunggal | `JwtAuthGuard` |

### 2. Modul Pengguna (User CRUD)
| Method | Endpoint URL | Fungsi Operasional | Izin Granular (Permissions) |
|--------|-------------|-------------------|-----------------------------|
| GET | `/api/v1/users` | Menampilkan seluruh daftar pengguna aktif | `user:read` |
| GET | `/api/v1/users/:id` | Mengambil data satu pengguna berdasarkan ID | `user:read` |
| POST | `/api/v1/users` | Membuat rekor data pengguna baru di sistem | `user:create` |
| PATCH | `/api/v1/users/:id` | Memperbarui baris data pengguna spesifik | `user:update` |
| DELETE | `/api/v1/users/:id` | Menandai pengguna dengan status *soft delete* | `user:delete` |

### 3. Modul Peran (Role CRUD)
| Method | Endpoint URL | Fungsi Operasional | Izin Granular (Permissions) |
|--------|-------------|-------------------|-----------------------------|
| GET | `/api/v1/roles` | Menampilkan seluruh rekor jabatan sistem | `role:read` |
| GET | `/api/v1/roles/:id` | Mengambil data satu peran berdasarkan ID | `role:read` |
| POST | `/api/v1/roles` | Membuat peran baru (Format: UPPERCASE/snake_case) | `role:create` |
| PATCH | `/api/v1/roles/:id` | Memperbarui data peran (Proteksi khusus SUPER_ADMIN) | `role:update` |
| DELETE | `/api/v1/roles/:id` | Menghapus peran (Proteksi khusus SUPER_ADMIN) | `role:delete` |

### 4. Modul Izin (Permission CRUD)
| Method | Endpoint URL | Fungsi Operasional | Izin Granular (Permissions) |
|--------|-------------|-------------------|-----------------------------|
| GET | `/api/v1/permissions` | Menampilkan seluruh izin granular sistem | `permission:read` |
| GET | `/api/v1/permissions/:id` | Mengambil data satu izin berdasarkan ID | `permission:read` |
| POST | `/api/v1/permissions` | Membuat izin baru terikat aturan unik ganda | `permission:create` |

### 5. Modul Penugasan (Assignment via Junction Table)
| Method | Endpoint URL | Request Body (JSON) | Fungsi Operasional |
|--------|-------------|---------------------|-------------------|
| POST | `/api/v1/user-roles` | `{ "userId": "CUID", "roleId": "UUID" }` | Menugaskan jabatan peran kepada pengguna |
| POST | `/api/v1/role-permissions` | `{ "roleId": "UUID", "permissionId": "UUID" }` | Menempelkan hak akses izin kepada jabatan peran |

---

## 🧪 Metode Pengujian Validasi Sistem (Postman)
Koleksi berkas pengujian API telah diekspor dan dilampirkan pada direktori proyek: `docs/postman/koleksi_api_v1.json`.

**Skenario Verifikasi Kekebalan Otorisasi (RBAC Penetration Test)**
1. Lakukan request `POST /api/v1/auth/login` menggunakan akun non-admin yang telah dibuat.
2. Salin string `accessToken` dari respon sukses, lalu sematkan pada tab **Authorization** Postman dengan tipe **Bearer Token**.
3. Eksekusi permintaan `GET /api/v1/users` menggunakan token non-admin tersebut.

**Hasil yang Diharapkan:** Server menolak secara absolut dengan kode status `403 Forbidden` dan mengembalikan respon JSON terstandardisasi:
```json
{
  "statusCode": 403,
  "message": [
    "Anda tidak memiliki hak akses yang cukup untuk mengeksekusi aksi ini."
  ]
}
```
Periksa tabel `audit_logs` di database, pastikan rekor log percobaan peretasan tersebut telah terekam secara otomatis demi kebutuhan investigasi forensik.

---

### Singkatan Teknis Terdaftar dalam Obrolan Ini
* **RBAC**: Role-Based Access Control
* **ORM**: Object-Relational Mapping
* **CRUD**: Create, Read, Update, Delete
* **DTO**: Data Transfer Object
* **JWT**: JSON Web Token
* **JSON**: JavaScript Object Notation
* **URL**: Uniform Resource Locator
* **API**: Application Programming Interface
* **HTTP**: Hypertext Transfer Protocol
* **XSS**: Cross-Site Scripting
* **CUID**: Collision-Resistant Unique Identifier
* **UUID**: Universally Unique Identifier