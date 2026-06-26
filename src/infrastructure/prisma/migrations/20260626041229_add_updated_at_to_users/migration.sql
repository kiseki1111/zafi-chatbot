/*
  Berkas Migrasi Kontrol Otorisasi Terpusat
  Kegunaan: Menambahkan kolom rekam jejak pembaruan data secara aman pada tabel pengguna.
*/

-- 1. Tambahkan kolom updated_at dengan memberikan nilai default waktu sekarang
ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT NOW();

-- 2. Baris Kompleks: Menghapus kembali constraint DEFAULT setelah data lama sukses terisi
-- Langkah ini krusial agar fungsi dekorator @updatedAt bawaan Prisma Client tidak bertabrakan dengan default value dari Postgres saat runtime aplikasi berjalan.
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;