# Instruksi Agen Proyek Chat n8n

## Stack dan Perintah Verifikasi

- Frontend memakai HTML, CSS, dan JavaScript vanilla dengan tampilan mobile-first. Backend memakai Node.js ≥ 22.9, modul ESM, dan API bawaan Node.js tanpa dependensi npm. n8n menjalankan workflow Google Gemini. PostgreSQL menyimpan riwayat chat dan data referensi. Aplikasi pribadi diakses melalui Tailscale.
- Jalankan aplikasi dengan `npm start`. Jika port sudah dipakai layanan systemd pengguna, periksa dengan `systemctl --user status chatn8n`.
- Jalankan `npm test` untuk memeriksa API chat, sesi, data, dan klien PostgreSQL melalui layanan tiruan. Tes ini dapat dijalankan tanpa kredensial, n8n produksi, atau database asli.
- Untuk pemeriksaan sintaks JavaScript, jalankan `node --check <file.js-atau-file.mjs>` pada setiap berkas yang diubah. `package.json` menyediakan skrip `start` dan `test`.
- Untuk perubahan UI, periksa halaman yang terdampak pada ukuran layar ponsel dan desktop. Laporkan pemeriksaan yang berhasil, gagal, atau belum dijalankan.

## Peta Proyek dan Kontrak

- `index.html`, `style.css`, dan `app.js` menangani halaman chat, tampilan Markdown, dan pemilihan sesi.
- `data.html`, `data.css`, dan `data.js` menangani halaman `/data` untuk melihat, menambah, dan mengubah data katering, murid, layanan, dan pengetahuan.
- `server.mjs` menyajikan halaman dan menangani `/api/chat`, `/api/sessions`, serta `/api/data/:dataset`. Pertahankan validasi origin dan masukan, serta simpan kredensial webhook di sisi server. Pertahankan kontrak ID sesi, payload chat, dan balasan `output` dari n8n kecuali tugas meminta perubahan kontrak.
- `pg-client.mjs` menangani protokol PostgreSQL dan riwayat sesi. `data-store.mjs` menentukan tabel dan kolom yang diizinkan pada schema `knowledge`. Gunakan parameter SQL untuk nilai masukan dan pertahankan pemeriksaan konflik saat mengubah data agar pembaruan lain tidak tertimpa.
- `db/` berisi definisi tabel yang tersedia di proyek. `server.test.mjs` berisi pengujian. `.env.example` mendokumentasikan variabel konfigurasi. Jaga nilai asli dalam `.env` agar tetap di luar Git, log, dan jawaban.

## Eskalasi Setelah Dua Percobaan

Jika gejala atau tes yang sama tetap gagal setelah dua percobaan perbaikan, hentikan percobaan pada item itu. Biarkan item `[ ]` dan tandai statusnya `BLOCKED`. Catat pesan galat, lokasi berkas dan baris jika diketahui, kedua pendekatan yang sudah dicoba, dan bantuan yang diperlukan di bagian `Blockers` pada `.tasks/active.md`. Jika berkas tersebut belum ada, laporkan detailnya kepada pengguna. Lanjutkan item lain dalam cakupan yang dapat dikerjakan secara mandiri.

## Persetujuan Setelah Tugas Selesai

Setelah setiap tugas selesai, ringkas perubahan dan hasil verifikasi, lalu tanyakan ketiga hal berikut kepada pengguna.

1. Apakah Anda sudah setuju dengan hasilnya?
2. Apakah Anda ingin saya memperbarui `README.md` di folder `chatn8n`?
3. Apakah Anda ingin saya membuat commit dan melakukan push ke GitHub?

Lakukan pembaruan README, commit, atau push hanya jika pengguna sudah menyetujui tindakan tersebut secara eksplisit. Saat menyiapkan commit, periksa berkas yang akan masuk agar perubahan lain dan kredensial lokal tetap di luar commit.
