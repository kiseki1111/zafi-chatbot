Aplikasi ini dibangun menggunakan Next.js
Ada dua cara utama untuk melihat antarmuka (UI) aplikasi ini:

Cara 1: Menjalankan Server Pengembangan (Direkomendasikan)
Prasyarat: Anda perlu menginstal Bun, sebuah runtime dan toolkit JavaScript yang cepat. Jika Anda belum menginstalnya, Anda bisa melakukannya dengan perintah berikut di terminal Anda:
curl -fsSL https://bun.sh/install | bash


Setelah itu, ikuti langkah-langkah berikut di direktori proyek Anda:

Langkah-langkah:

Install dependensi proyek: Buka terminal di folder root proyek dan jalankan perintah:

bash
bun install
Jalankan server pengembangan: Setelah instalasi selesai, jalankan perintah:

bash
bun run dev
Akses aplikasi: Buka browser Anda dan navigasikan ke http://localhost:3000. Halaman login akan muncul.

Informasi Login (Demo): Anda bisa menggunakan salah satu dari dua metode untuk login:

Login Cepat: Klik salah satu dari 6 tombol role (misalnya, "Superadmin", "Marketing", dll.) untuk langsung masuk sebagai role tersebut.
Login Manual: Gunakan kredensial berikut untuk akses penuh sebagai Superadmin:
Email: superadmin@propertiku.id
Password: demo1234
Cara 2: Membuka File HTML Statis
Proyek ini juga menyertakan versi HTML statis yang sudah jadi dan bisa dibuka langsung di browser tanpa perlu menjalankan server. Ini cocok untuk melihat-lihat UI dengan cepat.

Versi Template Multi-halaman (Direkomendasikan untuk eksplorasi): Buka file public/template/index.html langsung di browser Anda. Halaman ini berfungsi sebagai galeri di mana Anda bisa memilih role dan melihat setiap halaman secara terpisah.

Versi Single-File: Buka file public/ui.html langsung di browser Anda. File ini berisi keseluruhan aplikasi dalam satu halaman HTML.

Cukup klik kanan pada salah satu file tersebut di file explorer Anda dan pilih "Open with" lalu pilih browser favorit Anda (Chrome, Firefox, dll.).

@by jonybelajar@gmail.com - programming