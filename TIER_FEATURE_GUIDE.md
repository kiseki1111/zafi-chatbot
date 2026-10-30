# 📘 MASTER GUIDE: SPESIFIKASI TIER, BENEFIT, ADD-ON & FEATURE GATING
**Platform Multi-Tenant AI WhatsApp Chatbot & Omnichannel CRM**  
*Single Source of Truth (SSOT) – Panduan teknis dan bisnis komprehensif implementasi seluruh tier, batasan fitur (feature gating), add-on, aturan kuota anti-limit, dan tahapan rilis bertahap.*

---

## 📌 PRINSIP & ATURAN UTAMA PRODUK (KEPUTUSAN STAKEHOLDER)
1. **5 Tier Resmi Platform:**
   Platform memiliki 5 tier resmi: **LITE**, **BRONZE**, **SILVER**, **GOLD**, dan **ENTERPRISE** (serta opsi **Kustom** bila ada penyesuaian khusus).
2. **Aturan Tanda `-` (Fitur Terkunci / Feature Gating):**
   Tanda `-` pada matriks fitur berarti fitur tersebut **tidak tersedia / terkunci** pada tier tersebut. Pada UI aplikasi, fitur ini akan ditampilkan dalam keadaan terkunci (*disabled*) dengan prompt peningkatan (*"Tingkatkan ke paket Silver untuk membuka fitur ini"*).
3. **Mekanisme Batas Kuota (Soft Limit 110%):**
   Sistem menerapkan **soft limit** (bukan pemutusan keras di 100%). Kontak baru tetap dilayani hingga batas tenggang **110%** dari kuota MAU (*grace period 10%*). Kelebihan kuota akan dicatat dan ditagihkan pada invoice berikutnya.
4. **Definisi Status "Belum Terverifikasi":**
   Fitur yang bertanda **Belum Terverifikasi** adalah fitur yang **akan dibuat di kemudian hari (bukan sekarang / backlog fase berikutnya)**. Fitur ini tidak boleh dijanjikan ke klien sebelum selesai dan diverifikasi secara menyeluruh.
5. **Pembayaran Gateway & Integrasi Lanjutan:**
   Top-up instan via QRIS/VA otomatis dan pemilihan bot pengirim notifikasi kuota ditunda ke fase berikutnya. Untuk tahap sekarang, penetapan paket dan penambahan kuota dilakukan secara fleksibel oleh Superadmin.

---

## 📑 DAFTAR ISI
1. [Matriks 5 Tier Resmi Platform](#1-matriks-5-tier-resmi-platform)
2. [Katalog Top-Up & Paket Booster](#2-katalog-top-up--paket-booster)
3. [Katalog Add-On Tambahan](#3-katalog-add-on-tambahan)
4. [Kalkulasi Upgrade vs Top-Up](#4-kalkulasi-upgrade-vs-top-up)
5. [Aturan Kuota & Sistem Anti-Limit di Tengah Jalan](#5-aturan-kuota--sistem-anti-limit)
6. [Matriks Hak Akses Fitur per Modul (Feature Gating)](#6-matriks-hak-akses-fitur-per-modul)
7. [Fitur Masa Depan (Status: Belum Terverifikasi / Roadmap)](#7-fitur-masa-depan-status-belum-terverifikasi--roadmap)
8. [Pembagian Tahapan Implementasi Bertahap (Roadmap Fase 1 - 6)](#8-pembagian-tahapan-implementasi-bertahap)

---

## 1. MATRIKS 5 TIER RESMI PLATFORM

| Komponen | LITE (UMKM) | BRONZE (Starter) | SILVER (Pro) | GOLD (Business) | ENTERPRISE (Corporate) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Harga Bulanan** | Rp 249.000 | Rp 499.000 | Rp 999.000 | Rp 1.999.000 | **Custom / Kontak Sales** |
| **Harga Tahunan (per bln)** | Rp 209.000 | Rp 429.000 | Rp 849.000 | Rp 1.699.000 | **Custom** |
| **Hemat Tahunan** | **16.1%** | **14.0%** | **15.0%** | **15.0%** | **Sesuai Kontrak** |
| **Kuota Respons AI / bln** | 1.000 pesan | 4.000 pesan | 10.000 pesan | 24.000 pesan | **Custom (Kapasitas Besar)** |
| **MAU (Kontak Unik / bln)** | 300 kontak | 1.000 kontak | 2.500 kontak | 6.000 kontak | **Custom (Skala Korporat)** |
| **Rata-rata Respons AI/MAU** | 3.3 respons/kontak | 4.0 respons/kontak | 4.0 respons/kontak | 4.0 respons/kontak | **5.0 respons/kontak** |
| **Jumlah Nomor WhatsApp** | 1 nomor | 1 nomor | 2 nomor | 4 nomor | **Custom (Sesuai kebutuhan)** |
| **Perumahan / Proyek Siteplan** | 1 proyek | 1 proyek | 3 proyek | 8 proyek | **Custom (Multi-cluster/PT)** |
| **Jumlah User (Admin / Sales)** | 1 user | 3 user | 6 user | 12 user | **Custom (Sesuai struktur tim)** |
| **Biaya Setup per Proyek** | Rp 0 | Rp 500.000 | Rp 500.000 | Rp 0 | **Custom** |
| **Setup bila Bayar Tahunan** | Tidak ada setup | **Gratis** | **Gratis** | **Gratis** | **Custom** |
| **Trial Gratis** | 14 hari | 14 hari | 14 hari | 14 hari | **POC 30 hari** |
| **Dukungan (Support)** | Panduan & email | WhatsApp, 2x24 jam | WhatsApp, 1x24 jam | Dedicated PIC + SLA 4 jam | **Dedicated PIC + SLA 2 jam** |
| **Onboarding** | Self-service | Self-service + video | 1x sesi online | 3x sesi online | **Full project assistance** |

> 👑 **Tier Khusus: Developer Mode (`developer`)**  
> Disediakan khusus untuk akun perusahaan internal pemilik platform SaaS. Memiliki akses root, seluruh fitur terbuka penuh, dan kuota tidak terbatas (*unlimited*: MAU 999.999.999, AI 999.999.999, WA 999, Proyek 999, User 999, tanpa batasan kedaluwarsa).

---

## 2. KATALOG TOP-UP & PAKET BOOSTER

### A. Top-Up MAU (Kontak Unik Tambahan)
*Masa berlaku: Berlaku sampai akhir bulan siklus tagihan berjalan.*

| Paket Top-Up | Tambahan MAU | Harga Jual | Harga per MAU | Biaya Pokok | Margin | Masa Berlaku |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **MAU S** | +500 MAU | Rp 90.000 | Rp 180 | Rp 10.000 | 88.9% | Sampai akhir bulan tagihan |
| **MAU M** | +1.000 MAU | Rp 150.000 | Rp 150 | Rp 20.000 | 86.7% | Sampai akhir bulan tagihan |
| **MAU L** | +2.500 MAU | Rp 325.000 | Rp 130 | Rp 50.000 | 84.6% | Sampai akhir bulan tagihan |

### B. Top-Up Respons AI
*Masa berlaku: **TIDAK HANGUS** (Roll-over selamanya sampai habis digunakan).*

| Paket Top-Up | Tambahan AI | Harga Jual | Harga per Respons | Biaya Pokok | Margin | Masa Berlaku |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **AI S** | +1.000 respons | Rp 60.000 | Rp 60 | Rp 30.000 | 50.0% | **Tidak hangus** |
| **AI M** | +5.000 respons | Rp 200.000 | Rp 40 | Rp 150.000 | 25.0% | **Tidak hangus** |
| **AI L** | +10.000 respons | Rp 400.000 | Rp 40 | Rp 300.000 | 25.0% | **Tidak hangus** |

### C. Paket Booster (Bundling MAU + Respons AI)
*Paket paling hemat dan paling direkomendasikan saat lonjakan trafik promosi/iklan.*

| Paket Booster | Tambahan MAU | Tambahan AI | Harga Booster | Jika Beli Terpisah | Penghematan | Rekomendasi Kasus Penggunaan |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Booster S** | +500 MAU | +2.000 AI | **Rp 160.000** | Rp 210.000 | **Hemat Rp 50.000** | Klien Bronze yang mulai ramai di akhir bulan |
| **Booster M** | +1.000 MAU | +4.000 AI | **Rp 290.000** | Rp 350.000 | **Hemat Rp 60.000** | Kampanye iklan berbayar / promo bulanan |
| **Booster L** | +2.500 MAU | +10.000 AI | **Rp 650.000** | Rp 725.000 | **Hemat Rp 75.000** | Pameran properti / peluncuran cluster baru |

---

## 3. KATALOG ADD-ON TAMBAHAN

| Jenis Add-On | Harga | Satuan | Deskripsi & Catatan |
| :--- | :---: | :---: | :--- |
| **Setup Proyek Tambahan** | Rp 500.000 | per proyek | Jasa input data siteplan, tipe rumah, pricelist, dan pelatihan knowledge base |
| **Tambah Nomor WhatsApp** | Rp 150.000 | per nomor / bln | Menambah slot sesi instance WhatsApp di luar jatah kuota paket |
| **Tambah User Staf** | Rp 50.000 | per user / bln | Menambah akun login staf admin/sales di luar jatah kuota paket |
| **Migrasi WhatsApp API** | Rp 750.000 | sekali bayar | Integrasi Business Manager, verifikasi bisnis Meta, Cloud API, template WA |
| **Pendampingan Centang Biru (OBA)** | Rp 1.500.000 | sekali bayar | Proses pengajuan centang hijau/biru resmi Meta. **Refund 50% bila ditolak 2x.** |

---

## 4. KALKULASI UPGRADE VS TOP-UP

| Perpindahan Paket | Selisih Harga / Bln | Ekstra MAU Upgrade | Ekstra AI Upgrade | Biaya Jika Top-Up Setara | Keputusan Terbaik |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Lite → Bronze** | Rp 250.000 | +700 MAU | +3.000 AI | Rp 330.000 | **NAIK PAKET** (Lebih hemat Rp 80.000 + ekstra 2 user) |
| **Bronze → Silver** | Rp 500.000 | +1.500 MAU | +6.000 AI | Rp 630.000 | **NAIK PAKET** (Lebih hemat Rp 130.000 + 2 WA & 3 proyek) |
| **Silver → Gold** | Rp 1.000.000 | +3.500 MAU | +14.000 AI | Rp 1.200.000 | **NAIK PAKET** (Lebih hemat Rp 200.000 + 4 WA & 8 proyek) |

---

## 5. ATURAN KUOTA & SISTEM ANTI-LIMIT

```
[Interaksi Chatbot Berjalan]
          │
          ├── Pemakaian MAU/AI mencapai 80% ─> Peringatan Kuota (Status Waspada di Dashboard)
          │
          ├── Pemakaian MAU/AI mencapai 100%
          │         │
          │         ├── Soft Limit MAU (100% s.d 110%):
          │         │   └── Kontak baru tetap dilayani (Grace Period 10%)
          │         │   └── Kelebihan kontak ditandai untuk ditagihkan (MAU S)
          │         │
          │         └── Respons AI Habis (0):
          │             └── Bot berhenti membalas otomatis (Bot tidak boleh diam/error)
          │             └── Chat baru dialihkan ke admin + Label 'Butuh balasan manual'
          │             └── Leads baru tetap disimpan utuh di CRM
          │
          └── Melebihi 110% (Batas Kritis):
                    └── Auto-responder darurat: "Admin kami akan segera menghubungi Anda"
```

---

## 6. MATRIKS HAK AKSES FITUR PER MODUL (FEATURE GATING)

> **Keterangan:**
> - `✓` = Fitur Aktif / Termasuk
> - `-` = **Fitur Terkunci (Tidak Tersedia untuk Tier Tersebut)**
> - `Dasar` = Fitur aktif dalam batasan standar default
> - `Add-on` = Fitur dapat dibeli terpisah

| Grup Modul | Fitur | Lite | Bronze | Silver | Gold | Enterprise |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Bot WhatsApp** | Balas chat otomatis AI 24 jam | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Inbox chat + filter Bot / Admin / Belum dibaca | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Ambil alih chat oleh admin (bot berhenti) | ✓ | ✓ | ✓ | ✓ | ✓ |
| | AI kirim lokasi Google Maps & nomor sales | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Kirim pesan / tempel screenshot dari inbox | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Multi chatbot (Tambah Chatbot Baru) | ✓ | ✓ | ✓ | ✓ | ✓ |
| | **Kapasitas Nomor WhatsApp** | **1** | **1** | **2** | **4** | **Custom** |
| **CRM Pelanggan** | Database leads otomatis dari chat WA | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Data perumahan, tipe unit & harga per leads | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Pipeline Follow-Up → Survey → SLIK → Booking | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Catatan ringkasan kebutuhan leads | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Buka riwayat chat langsung dari CRM | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Tambah & unduh data pelanggan (Excel/CSV) | ✓ | ✓ | ✓ | ✓ | ✓ |
| | **Kapasitas MAU (Kontak Unik / Bulan)** | **300** | **1.000** | **2.500** | **6.000** | **Custom** |
| **Siteplan** | **Jumlah Perumahan / Proyek** | **1** | **1** | **3** | **8** | **Custom** |
| | Grid unit & warna status (Tersedia/Booking/Bank/Terjual) | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Rekap unit & acuan tipe harga per perumahan | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Jenis unit: rumah, tanah, paket | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Generate batch unit kaveling sekaligus | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Knowledge cluster (Spesifikasi, Fasilitas, Promo) | ✓ | ✓ | ✓ | ✓ | ✓ |
| | **Galeri Foto & Video Properti** *(Gated)* | **-** | **-** | **✓** | **✓** | **✓** |
| **Knowledge Base** | Materi teks untuk jawaban AI | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Upload media / file pendukung | ✓ | ✓ | ✓ | ✓ | ✓ |
| | **Ekstrak Dokumen dengan AI (OCR Brosur/Pricelist)** *(Gated)* | **-** | **-** | **✓** | **✓** | **✓** |
| | Pencarian instan materi / file | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Follow-Up** | Follow-up otomatis ke prospek | Dasar | Dasar | ✓ | ✓ | ✓ |
| | Jeda kirim 12 jam / 1 / 2 / 3 hari | ✓ | ✓ | ✓ | ✓ | ✓ |
| | **Pilihan Jam Kirim (Pagi / Siang / Sore / Malam)** *(Gated)* | **-** | **-** | **✓** | **✓** | **✓** |
| | **Antrean Manual + Trigger Sekarang** *(Gated)* | **-** | **-** | **✓** | **✓** | **✓** |
| **Dashboard** | Dashboard ringkas (sesi WA, knowledge, pesan) | ✓ | ✓ | ✓ | ✓ | ✓ |
| | AI Success Rate & profil asisten | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Pengaturan Bot** | Persona, jam operasional, prompt, dark mode, PWA | ✓ | ✓ | ✓ | ✓ | ✓ |
| | Nomor WA pengalihan ke admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| **User & Akses** | **Jumlah User Staf (Admin / Sales)** | **1** | **3** | **6** | **12** | **Custom** |
| | Role Manager & pencarian cepat (Ctrl+K) | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Koneksi WA** | WhatsApp Web (Scan QR via WAHA) | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 7. FITUR MASA DEPAN (STATUS: BELUM TERVERIFIKASI / ROADMAP)

> 💡 **Ketentuan:**  
> Seluruh fitur di bawah ini berstatus **Belum Terverifikasi / Roadmap**, artinya merupakan fitur yang **akan dibuat di kemudian hari (bukan pada tahap sekarang)**:

1. **Notifikasi Peringatan Kuota Otomatis via WhatsApp (80% & 100%)** *(Ditunda)*
2. **Payment Gateway Pembayaran Top-Up Otomatis (QRIS / Virtual Account)** *(Ditunda)*
3. **Auto Top-Up Booster S saat 100% Kuota** *(Ditunda)*
4. **Laporan Performa Per Staf Sales & Efektivitas Sumber Leads** *(Roadmap)*
5. **Laporan Mingguan Owner Otomatis via WhatsApp** *(Roadmap)*
6. **Koneksi Resmi WhatsApp Cloud API Meta & Broadcast Berbayar** *(Roadmap)*
7. **Distribusi Leads Otomatis ke Sales (Round-Robin)** *(Roadmap)*
8. **Tracking Iklan Click-to-WhatsApp (Pelacakan Sumber & Biaya Leads)** *(Roadmap)*
9. **Integrasi HRIS Zafi (Perhitungan Komisi Marketing Properti)** *(Roadmap)*
10. **Integrasi Accounting Properti (DP, Cicilan Bertahap, Piutang KPR)** *(Roadmap)*

---

## 8. PEMBAGIAN TAHAPAN IMPLEMENTASI BERTAHAP (ROADMAP IMPLEMENTASI)

Agar pengembangan berjalan teratur, stabil, dan teruji tanpa menimbulkan regresi pada sistem yang sudah berjalan, implementasi dibagi menjadi **6 Fase**:

```
[FASE 1: Fondasi Tier & Kapasitas] ──> [FASE 2: Feature Gating Modul]
                │                                    │
[FASE 4: Katalog Top-Up & Add-On]  <── [FASE 3: Fallback Bot & Soft Limit]
                │
[FASE 5: Otomasi Notifikasi WA]    ──> [FASE 6: Integrasi Lanjutan & Gateway]
```

### 🚀 FASE 1: Fondasi 5 Tier Resmi & Limitasi Kapasitas (SELESAI & TERVERIFIKASI)
**Target:** Menetapkan 5 tier resmi dan memvalidasi batas kapasitas riil per tenant.
- [x] Reset paket tenant lama ke status `plan: null` (Tanpa Paket) agar Superadmin dapat mengatur secara mandiri.
- [x] Membuat model dan tampilan kartu resmi **Enterprise** di Superadmin bersama Lite, Bronze, Silver, Gold, dan Developer Mode.
- [x] Validasi kapasitas penambahan entitas di Backend & Frontend:
  - **Nomor WhatsApp:** Pembatasan penambahan sesi WhatsApp sesuai kuota paket (`WahaController.createInstance`).
  - **Proyek Siteplan:** Pembatasan penambahan proyek/perumahan sesuai paket (`AvailabilityService.createGroup`).
  - **User Staf:** Pembatasan penambahan staf admin/sales sesuai kuota paket (`TenantService.createTenantStaff`).
- [x] Unit test (`tenant.service.spec.ts`, `availability.service.spec.ts`) & E2E suite (`test/tier-phase-1-capacity-limits.e2e-spec.ts`).

### 🔒 FASE 2: Feature Gating (Penguncian Fitur `-` untuk Lite & Bronze) (SELESAI & TERVERIFIKASI)
**Target:** Mengunci fitur yang tidak tersedia di Lite & Bronze dengan UI yang elegan.
- [x] **Galeri Foto & Video Properti:**
  - Kunci form upload video di modul Siteplan & Knowledge untuk tier Lite dan Bronze.
  - Tampilkan badge / banner: *"Galeri foto & video properti tersedia di paket Silver ke atas"*.
- [x] **Ekstrak Dokumen dengan AI (OCR Brosur & Pricelist):**
  - Untuk Lite & Bronze, penolakan ekstraksi OCR gambar di backend (`KnowledgeService.createFile`) + badge lock `Silver+` di UI.
- [x] **Automated Follow-Up Kustom:**
  - Kunci opsi pemilihan jam kirim (pagi/siang/sore/malam) dan tombol "Trigger Sekarang" di backend (`FollowUpService`) + badge `Silver+` di UI.
- [x] Unit test (`follow-up.service.spec.ts`, `knowledge.service.spec.ts`) & E2E suite (`test/tier-phase-2-feature-gating.e2e-spec.ts`).

### 🛡️ FASE 3: Mekanisme Soft-Limit Kuota & Auto-Toggle Human Takeover (SELESAI & TERVERIFIKASI)
**Target:** Menghindari bot mati mendadak saat trafik ramai dan mengalihkan ke admin manusia saat kuota habis tanpa redirect nomor.
- [x] **Mekanisme Soft-Limit MAU (110%):**
  - Kontak unik ke-100% s.d 110% tetap dibalas oleh bot AI (status: Grace Period aktif).
  - Dashboard tenant menampilkan indikator visual: *"Tenggang 110%"*.
- [x] **Auto-Toggle Mode Human Takeover saat Over-Quota:**
  - Saat AI responses habis ATAU MAU melampaui 110%, `OmnichannelQueueService` otomatis mengubah `conversation.mode` menjadi `'human'`.
  - Bot AI 100% skip/jeda tanpa memanggil LLM (menghemat biaya dan kuota).
  - Pesan pelanggan tetap masuk dan tersimpan utuh di Inbox & CRM untuk dijawab oleh admin manusia via web dashboard.
- [x] E2E test suite (`test/tier-phase-3-overquota-takeover.e2e-spec.ts` - 3 passed).

### 💳 FASE 4: Modul Manajemen Top-Up, Booster & Add-On (SELESAI & TERVERIFIKASI)
**Target:** Memberikan sarana bagi Superadmin untuk menjual & menginjeksi saldo kuota tambahan.
- [x] Katalog resmi Top-Up MAU (S/M/L), AI (S/M/L), Booster (S/M/L), dan Add-on kapasitas di backend (`TOPUP_CATALOG` & endpoint `/api/v1/tenant/topup/catalog`).
- [x] Pengelolaan saldo ekstra pada metadata Tenant:
  - Saldo kuota AI Top-Up: `extraAiResponses` permanen / tidak hangus (*carry-over*).
  - Saldo kuota MAU Top-Up: `extraMau` menambahkan batas kapasitas MAU.
  - Saldo add-on kapasitas: `extraWhatsapp`, `extraUsers`, `extraProjects` mengekspansi limit entitas secara instan.
- [x] Superadmin dapat menginjeksi paket Top-Up langsung via modal di Dashboard Klien (`POST /api/v1/tenant/clients/:tenantId/topup`).
- [x] Tampilan riwayat transaksi Top-Up & saldo aktif pada tab Kuota Klien di frontend.
- [x] Unit test (`tenant.service.spec.ts`: 14 passed) & E2E suite (`test/tier-phase-4-topup-addon.e2e-spec.ts`: 4 passed).

### 📲 FASE 5: Otomasi Notifikasi WhatsApp Kuota (80% & 100%)
**Target:** Peringatan proaktif ke nomor WhatsApp pemilik bisnis.
- [ ] Trigger otomatis pengiriman pesan WhatsApp ke Owner saat pemakaian MAU atau AI menyentuh 80% dan 100%.
- [ ] Opsi toggle Auto Top-Up Booster S untuk tier Silver & Gold.

### 🌐 FASE 6: Integrasi Lanjutan & Fitur Masa Depan (Backlog / Roadmap)
**Target:** Fitur skala enterprise dan ekspansi ekosistem.
- [ ] Integrasi Payment Gateway instan (QRIS, VA, E-Wallet).
- [ ] WhatsApp Cloud API resmi Meta & Template pesan massal terverifikasi.
- [ ] Distribusi leads sales otomatis (Round-Robin).
- [ ] Tracking analitik iklan Click-to-WhatsApp.
- [ ] Integrasi sistem HRIS komisi dan Accounting properti Zafi.

---
*Dokumen ini diperbarui secara berkala dan menjadi referensi tetap selama proses implementasi.*
