# Chat n8n

Web chat pribadi, ringan dan tanpa dependensi (tanpa framework, CDN, atau paket npm), untuk mengobrol dengan chatbot AI yang berjalan di n8n. Google Gemini menjawab pertanyaan, PostgreSQL menyimpan riwayat dan data latihan sekolah, dan n8n menyediakan draf SOP guru serta petugas katering. Dibuka dari HP atau iPad melalui jaringan Tailscale. Tampilan mobile-first, tema terang, menggunakan HTML, CSS, dan JavaScript.

## Arsitektur

```
Browser (HP/iPad, harus masuk Tailscale)
  │  http://100.110.217.94:3000
  ▼
server.mjs — Node.js tanpa dependensi
  ├─ GET/PATCH /api/data/{katering,murid} → PostgreSQL (lihat dan ubah)
  │  POST /api/chat + Basic Auth (password hanya di server)
  ▼
Webhook n8n → workflow "Chatbot Internal - Gemini & Postgres"
  │
  ├─ Perintah kirim email → SMTP → konfirmasi di chat
  └─ AI Agent (instruksi bahasa Indonesia dan draf SOP)
       ├─ Google Gemini Chat Model
       ├─ Postgres Chat Memory → n8n_chat_histories
       ├─ Cari Murid Sekolah → knowledge.murid
       ├─ Cari Katering Sekolah → knowledge.katering_sekolah
       └─ Tavily Search & Tavily Extract → pencarian dan baca halaman web
```

Browser tidak pernah bicara langsung ke n8n; semua lewat web server ini, dan credential tidak pernah dikirim ke browser.

## Isi folder

| File | Isi |
| --- | --- |
| `server.mjs` | Web server untuk halaman chat dan data, API sesi dan data, serta `POST /api/chat` ke n8n |
| `pg-client.mjs` | Klien PostgreSQL TCP wire-protocol murni Node.js (tanpa dependensi) dan pembaca tabel `n8n_chat_histories` |
| `data.html`, `data.css`, `data.js`, `data-store.mjs` | Halaman `/data` untuk melihat dan mengubah data katering dan murid di PostgreSQL |
| `server.test.mjs` | Tes HTTP server dan klien PostgreSQL tiruan (tanpa credential, tanpa AI) |
| `index.html`, `style.css`, `app.js` | Tampilan chat & panel daftar sesi: pilih sesi sebelumnya, tombol **Chat baru**, tombol **salin** per pesan, dan sakelar tampilan **Markdown** / **Preview** |
| `favicon.svg` | Ikon tab browser bertema hijau terang (`>_`) |
| `.env.example` | Contoh isi `.env`; salin menjadi `.env` lalu isi nilai aslinya |
| `.env` | Konfigurasi asli + password. **Tidak di-commit** (sudah di-ignore) |

## Menjalankan

Prasyarat: Node.js ≥ 22.9, Docker n8n + PostgreSQL sudah berjalan, dan perangkat yang dipakai mengobrol terhubung ke Tailscale.

1. `cp .env.example .env`, lalu isi:
   - `N8N_CHAT_URL` — URL webhook produksi Chat Trigger di n8n.
   - `N8N_CHAT_USER` / `N8N_CHAT_PASSWORD` — sama dengan credential Basic Auth pada Chat Trigger n8n.
   - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` — koneksi PostgreSQL untuk memuat daftar dan riwayat sesi serta data sekolah.
   - `HOST` / `PORT` — default IP Tailscale dan port 3000.
2. Jalankan web chat — dua cara:
   - **Otomatis (yang dipakai sekarang):** systemd user service `chatn8n` (`~/.config/systemd/user/chatn8n.service`) sudah aktif dan menyala sendiri setiap laptop direstart, tanpa perlu login (linger aktif). Kendalikan dengan `systemctl --user status|restart|stop chatn8n`.
   - **Manual:** `npm start` dari folder ini — matikan dulu service-nya (`systemctl --user stop chatn8n`) agar tidak berebut port 3000.
3. Buka `http://100.110.217.94:3000` dari perangkat ber-Tailscale.

Setelah laptop direstart, semuanya menyala sendiri: n8n dan PostgreSQL otomatis karena container Docker `restart: unless-stopped`, dan web chat otomatis karena user service di atas.

## Cara kerja

- **Sesi**: browser membuat ID sesi acak 32-heksa, disimpan di localStorage (kunci `chatn8n.session.v1`) bersama maksimum 100 pesan tampilan, agar obrolan berlanjut saat halaman dibuka ulang. **Chat baru** membuat ID sesi baru.
- **Tampilan smartphone**: logo hijau di kiri atas membuka sidebar berisi **Chat baru**, daftar **Sesi** yang dapat dibuka-tutup, dan tautan **Data**. Logo tetap terlihat saat percakapan digulir; teks pesan menggunakan ukuran 12 px.
- **Tampilan pesan & salin**: di tengah atas setiap pesan (kiriman pengguna maupun jawaban AI) tersedia dua tombol kecil untuk berpindah antara **Markdown** (teks mentah monospace) dan **Preview** (bawaan — merender heading, tebal/miring, daftar, kutipan, kode, tabel, dan tautan secara aman tanpa dependensi eksternal). Di bawah pesan terdapat tombol **copy** kecil (kanan bawah untuk pesan pengguna, kiri bawah untuk jawaban AI) yang menyalin isi sesuai mode tampilan aktif dan memiliki fallback `execCommand('copy')` agar tetap berjalan pada alamat HTTP Tailscale.
- **Data**: buka **Data** di sidebar atau `http://100.110.217.94:3000/data`, lalu pilih **Katering** atau **Murid**. Ketuk kartu untuk membuka formulir, lalu tekan **Simpan** atau **Batal**. Data dibaca langsung dari dua tabel yang ditentukan, 50 baris per halaman; belum ada fungsi tambah atau hapus. Server menerima pembaruan hanya dari origin aplikasi, membandingkan nilai sebelumnya untuk mencegah perubahan lain tertimpa, serta tidak menerima nama tabel atau SQL bebas.
- **Permintaan**: browser memanggil `POST /api/chat` di server yang sama. Server memvalidasi origin, format sesi, dan ukuran (maksimum 32 KB / 8.000 karakter), lalu meneruskan hanya `{ action, chatInput, sessionId }` ke webhook n8n dengan Basic Auth. Timeout 90 detik; jika kedaluwarsa, jangan kirim ulang — n8n mungkin masih memproses.
- **Memori**: node Postgres Chat Memory menyimpan setiap pasangan tanya-jawab ke tabel `n8n_chat_histories` dan mengirim jendela konteks terakhir (10) ke AI Agent. Sesi berbeda = memori berbeda, jadi sesi baru tidak tahu isi sesi lama. Browser/perangkat lain punya sesi sendiri; belum ada identitas pengguna atau sinkronisasi antarperangkat.

## Keamanan

- Password Basic Auth hanya ada di `.env` server (chmod 600) dan credential n8n — tidak pernah sampai ke browser atau Git.
- Server hanya mendengarkan IP Tailscale, bukan seluruh antarmuka jaringan; akses mengikuti izin Tailscale. Aplikasi ini tidak punya login pengguna terpisah, sehingga perangkat yang bisa mengakses `/data` juga bisa mengubah data di sana.
- Jangan mengekspos port 3000 ke internet publik, dan jangan memakai browser bersama untuk percakapan rahasia (sesi tersimpan di localStorage tanpa nama pengguna).

## Sisi n8n (workflow yang dihubungi)

- Workflow **Chatbot Internal - Gemini & Postgres** (ID `EtZ8TjakWxnwNlCW`) menerima pesan lewat Chat Trigger dengan Basic Auth dan allowed origin `http://100.110.217.94:3000`. AI Agent memakai Google Gemini Chat Model, Postgres Chat Memory, dua tool PostgreSQL, dan dua HTTP Request Tool untuk Tavily. Chat Trigger mengirim respons setelah node terakhir.
- **Tavily Search** (`POST https://api.tavily.com/search`) dan **Tavily Extract** (`POST https://api.tavily.com/extract`) memakai credential Bearer Auth Tavily (`httpBearerAuth`).
- Tavily dipanggil lewat **HTTP Request Tool** dengan parameter `$fromAI(...)` (bukan `MCP Client Tool`) karena skema MCP bawaan Tavily memakai union `anyOf` / `const` yang ditolak oleh *function declarations* Google Gemini.
- Balasan yang diharapkan web chat: JSON `{ "output": "..." }` dari akhir workflow.
- Container n8n memakai `N8N_EDITOR_BASE_URL=http://100.110.217.94:5678` agar fitur *Open chat* di editor tidak gagal.
- Setelah mengubah workflow di editor, publikasikan — web chat baru memakai versi terbaru. Model, instruksi, dan sumber pengetahuan diatur di n8n, bukan di sini.

### Kirim email dari web chat

Ketik perintah berikut di web chat untuk mengirim email ke alamat yang sudah dikonfigurasi.

```text
Kirim email ke hardhy@gmail.com pesannya: sudah jadi chat berbasis web dan punya knowledge
```

Node **Rute Perintah Email** memeriksa alamat dan isi pesan sebelum menjalankan **Kirim Email dari Chat**. Node tersebut memakai kredensial SMTP notifikasi yang sudah ada, dengan subjek **Pesan dari Chat n8n**. Chat menampilkan status pengiriman. Perintah email melewati jalur notifikasi otomatis, sedangkan pertanyaan biasa tetap masuk ke AI Agent.

## Pengetahuan sekolah

Dalam PostgreSQL, *schema* adalah pengelompokan atau namespace tabel; misalnya `knowledge.murid` berarti tabel `murid` di schema `knowledge`. Schema `knowledge` dipakai untuk data referensi murid dan katering, sedangkan `public` adalah schema default yang saat ini memuat `n8n_chat_histories`. Pemisahan schema tidak dengan sendirinya membentuk hubungan antar-tabel.

Kedua tabel berada di schema `knowledge` pada database PostgreSQL latihan. Isinya fiktif dan bisa dipakai dari sesi chat baru. Kedua tool PostgreSQL memakai credential n8n yang sama dengan **Postgres Chat Memory** dan menjalankan query `SELECT` dengan parameter kata kunci.

| Tool n8n | Tabel | Data latihan | Pencarian |
| --- | --- | --- | --- |
| **Cari Murid Sekolah** | `knowledge.murid` | 10 murid kelas 1A SD, termasuk Dami. Kolomnya `kode_murid`, `nama`, `kelas`, `alamat`, `makanan_disukai`, dan `alergi`. | Nama, potongan nama, atau kode seperti `DUMMY-001`. |
| **Cari Katering Sekolah** | `knowledge.katering_sekolah` | 3 penyedia fiktif, yaitu Dapur Pelangi, Bekal Tunas, dan Rantang Ceria. Kolomnya `nama_catering`, `alamat`, dan `contact_person`. | Nama atau potongan nama katering. |

Kata kunci kosong mengambil seluruh daftar. Untuk membatasi jumlah baris yang diterima model, ubah query di node PostgreSQL dan terapkan `LIMIT` pada baris sebelum agregasi. Pilih kolom yang diperlukan di query untuk membatasi data yang dikirim ke model.

Kolom di halaman `/data` ditentukan secara eksplisit dalam `data-store.mjs`. Kolom baru di PostgreSQL belum otomatis tampil: perbarui daftar kolom serta query baca dan ubah, sesuaikan tes, lalu mulai ulang layanan chat.

**AI Agent → Options → System Message** mengatur persona asisten pribadi, bahasa Indonesia, panjang jawaban, aturan penggunaan tool, dan draf SOP untuk guru serta petugas katering. Instruksinya mengarahkan AI untuk menyebutkan data yang relevan dan meminta verifikasi jika bahan atau risiko kontak silang belum jelas. Untuk mengubah isi profil murid atau kontak katering, gunakan halaman `/data` atau edit baris di PostgreSQL. Untuk mengubah persona, gaya jawaban, atau SOP, edit **System Message** dan publikasikan workflow.

Contoh pertanyaan di web chat:

- “Apa alergi dan makanan kesukaan Dami?”
- “Siapa contact person Dapur Pelangi?”
- “Menurut SOP, apa yang harus dilakukan guru dan petugas katering jika bahan paket Dami belum terverifikasi?”

## Pemeriksaan & masalah umum

`npm test` menjalankan tes chat, API sesi, pembacaan dan pembaruan data, validasi permintaan, serta protokol TCP `queryPostgres` dengan layanan tiruan. Untuk tes nyata dengan memori: kirim informasi unik, tanyakan lagi di sesi yang sama, lalu periksa tabel `n8n_chat_histories` di PostgreSQL.

Untuk memeriksa pengetahuan sekolah, gunakan salah satu contoh pertanyaan di atas dan lihat hasil node yang sesuai di **Executions** n8n. Pertanyaan SOP saja dijawab dari **System Message**. Pengujian integrasi saat penambahan fitur memakai salinan workflow tanpa node email produksi dan memverifikasi panggilan ke kedua tool PostgreSQL serta jawaban SOP.

| Gejala | Kemungkinan penyebab |
| --- | --- |
| "Tidak bisa mengambil balasan dari n8n" | n8n tidak berjalan, atau `N8N_CHAT_URL` salah |
| "n8n gagal memproses pesan" (502) | Eksekusi workflow gagal — cek log eksekusi & credential di n8n |
| Diminta password terus (401) | Password di `.env` berbeda dari credential Chat Trigger n8n |
| "n8n tidak mengirim balasan" | Workflow belum dipublikasikan atau respons node terakhir tidak memiliki field `output` berisi teks |
| Data murid atau katering belum ditemukan | Periksa kata kunci, isi tabel `knowledge`, dan hasil tool PostgreSQL di **Executions** |
| Data gagal disimpan karena sudah berubah | Muat ulang data, lalu ulangi perubahan agar tidak menimpa pembaruan lain |
| Halaman tidak terbuka dari HP | Perangkat belum terhubung Tailscale, atau service tidak berjalan — cek `systemctl --user status chatn8n` |
| *Open chat* di editor n8n gagal | Cek `N8N_EDITOR_BASE_URL` di compose n8n |
