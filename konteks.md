# Konteks & Tujuan Proyek: Chatbot + CMS Platform

## 🎯 Tujuan Utama
Proyek ini adalah platform **Chatbot + Website CMS** yang memungkinkan pemilik UMKM untuk mengelola chatbot WhatsApp mereka melalui dashboard web. Website bertindak sebagai **CMS** untuk konfigurasi dan monitoring, sementara chatbot menangani interaksi langsung dengan pelanggan melalui WhatsApp.

## 🎯 Target Pengguna
- Pemilik UMKM yang membutuhkan bot WhatsApp otomatis untuk menjawab pertanyaan pelanggan
- Admin/Operator yang mengelola bot dan melihat riwayat chat melalui dashboard

## 🏗️ Arsitektur
```
rbac-service/
├── apps/
│   ├── backend/               ← NestJS API Server
│   │   └── src/
│   │       ├── core/          ← Prisma, OpenAI, Omnichannel
│   │       ├── features/      ← Fitur per domain (web-dashboard)
│   │       └── modules/       ← Integrasi: WAHA, Telegram, Chat, FollowUp
│   └── web/                   ← Next.js Frontend (CMS Dashboard)
└── docker-compose.yml         ← PostgreSQL + WAHA containers
```

## 🤖 Bot & Fitur Inti

### 1. Bot CS (Customer Service)
Bot yang berinteraksi langsung dengan pelanggan UMKM melalui WhatsApp (via WAHA).
- Menangani pertanyaan, pemesanan, dan informasi produk
- Mengarahkan pesanan ke owner/dashboard

### 2. Auto Follow-Up
Fitur otomatis untuk menjaga engagement pelanggan:
- Mendeteksi kontak yang tidak aktif >24 jam
- Mengirim pesan follow-up otomatis pukul 9 pagi
- Setiap nomor hanya di-follow-up sekali (防 duplicate)

## 📦 Teknologi
- **Backend:** NestJS (Node.js), TypeScript, Prisma ORM + PostgreSQL
- **AI Engine:** OpenAI untuk kecerdasan bot
- **WhatsApp Engine:** WAHA (WhatsApp HTTP API)
- **Frontend:** Next.js (CMS Dashboard)

## 📊 Status Progress

### ✅ Sudah Tersedia
- Autentikasi: Login, Register, JWT
- Integrasi WAHA: Webhook, instance management, message handling
- Schema database: User, Tenant, Contact, Conversation, Message, WhatsappInstance
- Bot CS & Bot Asisten: Backend logic tersedia
- Omnichannel Queue: Pesanan diproses via queue
- Role-Based Access Control (RBAC) infrastruktur

### 🔜 Fitur Lanjutan
- Auto Follow-Up (mendapatkan implementasi)
- Dashboard monitoring real-time
- Multi-role RBAC (Admin, Operator)

---

## 📌 Ringkasan
Proyek ini berfokus pada **chatbot WhatsApp** yang dikelola melalui **dashboard web CMS**. Backend NestJS menangani logika bot, integrasi WAHA, dan otomasi termasuk auto follow-up, sementara frontend Next.js menyediakan antarmuka manajemen untuk pemilik UMKM.
