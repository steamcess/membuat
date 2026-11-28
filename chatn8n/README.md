# Chat n8n

Web chat pribadi, ringan dan tanpa dependensi (tanpa framework, CDN, atau paket npm), untuk mengobrol dengan chatbot AI yang berjalan di n8n. Google Gemini menjawab pertanyaan, PostgreSQL menyimpan riwayat dan data latihan sekolah, dan n8n menyediakan draf SOP guru serta petugas katering. Dibuka dari HP atau iPad melalui jaringan Tailscale. Tampilan mobile-first, tema terang, menggunakan HTML, CSS, dan JavaScript.

## Arsitektur

```
Browser (HP/iPad, harus masuk Tailscale)
  │  http://100.110.217.94:3000
  ▼
server.mjs — Node.js tanpa dependensi
  ├─ GET/POST/PATCH/DELETE /api/data/{katering,murid,layanan,pengetahuan} → PostgreSQL
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
       ├─ Cari Layanan Infrastruktur → knowledge.layanan_infrastruktur
       ├─ Cari Pengetahuan → knowledge.pengetahuan
       ├─ Google Drive & Google Docs (default: folder-popi-n8n)
       └─ Tavily Search & Tavily Extract → pencarian dan baca halaman web
```

Browser tidak pernah bicara langsung ke n8n; semua lewat web server ini, dan credential tidak pernah dikirim ke browser.

## Isi folder

| File | Isi |
| --- | --- |
| `AGENTS.md` | Panduan agen untuk mengerjakan dan memverifikasi perubahan proyek |
| `server.mjs` | Web server untuk halaman chat dan data, API sesi dan data, serta `POST /api/chat` ke n8n |
| `pg-client.mjs` | Klien PostgreSQL TCP wire-protocol murni Node.js (tanpa dependensi) dan pembaca tabel `n8n_chat_histories` |
| `data.html`, `data.css`, `data.js`, `data-store.mjs` | Halaman `/data` dan akses PostgreSQL untuk melihat, menambah, dan mengubah data katering, murid, layanan, dan pengetahuan |
| `db/pengetahuan.sql` | Struktur tabel pengetahuan yang dikelola melalui halaman `/data` |
| `db/layanan_infrastruktur.sql` | Struktur tabel layanan infrastruktur; isi data disimpan di PostgreSQL, bukan di berkas ini |
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

### Chat (`/`)

- **Navigasi dan riwayat.** Di desktop, buka **Sesi** dari header. Di ponsel, ketuk logo hijau di kiri atas untuk membuka menu **Chat baru**, **Sesi**, dan **Data**. Daftar riwayat dapat dimuat ulang, menampilkan hingga 9 sesi tersimpan pada awalnya, dan dapat diperluas hingga 20. Memilih sesi memuat pesannya lewat `GET /api/sessions/:sessionId`.
- **Sesi aktif.** Browser menyimpan ID sesi acak sepanjang 32 karakter heksadesimal dan hingga 100 pesan sesi aktif di `localStorage` (`chatn8n.session.v1`). Saat halaman dibuka kembali, aplikasi mencoba menyelaraskan pesan sesi aktif dengan riwayat dari PostgreSQL. **Chat baru** membuat ID baru jika sesi aktif sudah berisi pesan.
- **Mengirim pesan.** Tekan **Kirim**. Pada perangkat dengan penunjuk presisi seperti mouse, **Enter** mengirim pesan dan **Shift+Enter** menambah baris. Selama menunggu respons, chat menampilkan **Sedang menulis…**. Jika gagal, teks dikembalikan ke kolom pesan. Jika waktu tunggu habis, periksa eksekusi n8n sebelum mengirim ulang karena pesan mungkin sudah diproses.
- **Alur API.** Browser mengirim `{ message, sessionId }` ke `POST /api/chat`. Server memvalidasi origin, ID sesi, dan ukuran permintaan (32 KB, dengan batas pesan 8.000 karakter), lalu meneruskan `{ action, chatInput, sessionId }` ke webhook n8n dengan Basic Auth. Server menunggu n8n hingga 90 detik. Browser menampilkan teks dari field `output`.
- **Tampilan pesan.** Setiap pesan dapat ditampilkan sebagai **Preview** (bawaan) atau **Markdown** mentah. Tombol salin mengikuti mode aktif dan memiliki fallback untuk akses melalui HTTP Tailscale.
- **Memori n8n.** Postgres Chat Memory menyimpan percakapan di `n8n_chat_histories` dan memasok jendela konteks terakhir (10) ke AI Agent. Memori mengikuti ID sesi yang dipilih. Pilihan sesi aktif disimpan per browser.

### Data tersimpan (`/data`)

- **Memilih jenis data.** Buka **Data** dari menu chat. Halaman membuka **Katering** secara bawaan. Pilihan **Katering**, **Murid**, **Layanan**, dan **Pengetahuan** tercermin pada parameter `jenis` di URL, misalnya `/data?jenis=pengetahuan`. Gunakan **Kembali ke chat** untuk kembali ke percakapan.
- **Menelusuri data.** Aplikasi memuat hingga 50 baris per halaman melalui `GET /api/data/:dataset?offset=…`. Data ditampilkan sebagai tabel di layar lebar dan kartu berlabel di ponsel. Gunakan **Sebelumnya** dan **Selanjutnya** untuk berpindah halaman, atau **Coba lagi** jika daftar gagal dimuat.
- **ID murid.** Halaman `/data` memakai `id` dari respons `GET /api/data/murid` untuk menyimpan perubahan dan menghapus baris. Nilai itu berasal dari kolom `id` di `knowledge.murid`. Untuk mencocokkan entri antara PostgreSQL dan respons API, cari `kode_murid` yang sama pada keduanya dan bandingkan nilai `id`.
- **Menambah dan mengubah.** Tekan tombol **Tambah** pada jenis data yang dipilih untuk membuka formulir kosong, atau pilih baris maupun kartu untuk mengubah entri. Formulir mengikuti kolom, aturan wajib isi, dan batas panjang yang diberikan API. **Simpan** mengirim `POST` untuk entri baru atau `PATCH` untuk perubahan. Setelah tersimpan, daftar dimuat ulang. Penambahan kembali ke halaman pertama.
- **Menghapus.** Buka baris atau kartu, tekan ikon tempat sampah merah di pojok kanan atas, lalu pilih **Hapus** untuk mengonfirmasi penghapusan permanen atau **Batal** untuk kembali ke formulir. Browser mengirim `DELETE /api/data/:dataset` hanya setelah konfirmasi. Daftar dimuat ulang setelah server mengonfirmasi keberhasilan.
- **Konflik perubahan.** Server memvalidasi origin, jenis data, dan kolom yang diizinkan. Saat mengubah atau menghapus entri, server mencocokkan nilai awal dengan data di PostgreSQL. Penghapusan ditolak jika tidak ada satu baris yang cocok, termasuk jika ada beberapa baris identik. Jika data sudah berubah atau hasil permintaan belum pasti, gunakan **Muat ulang data** sebelum mencoba lagi.

## Keamanan

- Password Basic Auth hanya ada di `.env` server (chmod 600) dan credential n8n — tidak pernah sampai ke browser atau Git.
- Server hanya mendengarkan IP Tailscale, bukan seluruh antarmuka jaringan; akses mengikuti izin Tailscale. Aplikasi ini tidak punya login pengguna terpisah, sehingga perangkat yang bisa mengakses `/data` juga bisa mengubah dan menghapus data di sana.
- Jangan mengekspos port 3000 ke internet publik, dan jangan memakai browser bersama untuk percakapan rahasia (sesi tersimpan di localStorage tanpa nama pengguna).

## Sisi n8n (workflow yang dihubungi)

- Workflow **Chatbot Internal - Gemini & Postgres** (ID `EtZ8TjakWxnwNlCW`) menerima pesan lewat Chat Trigger dengan Basic Auth dan allowed origin `http://100.110.217.94:3000`. AI Agent memakai Google Gemini Chat Model, Postgres Chat Memory, empat tool PostgreSQL, dua HTTP Request Tool untuk Tavily, serta empat tool Google Drive. Chat Trigger mengirim respons setelah node terakhir.
- **Tavily Search** (`POST https://api.tavily.com/search`) dan **Tavily Extract** (`POST https://api.tavily.com/extract`) memakai credential Bearer Auth Tavily (`httpBearerAuth`).
- Tavily dipanggil lewat **HTTP Request Tool** dengan parameter `$fromAI(...)` (bukan `MCP Client Tool`) karena skema MCP bawaan Tavily memakai union `anyOf` / `const` yang ditolak oleh *function declarations* Google Gemini.
- Balasan yang diharapkan web chat: JSON `{ "output": "..." }` dari akhir workflow.
- Container n8n memakai `N8N_EDITOR_BASE_URL=http://100.110.217.94:5678` agar fitur *Open chat* di editor tidak gagal.
- Setelah mengubah workflow di editor, publikasikan — web chat baru memakai versi terbaru. Model, instruksi, dan sumber pengetahuan diatur di n8n, bukan di sini.

### Kirim email dari web chat

Notifikasi email otomatis untuk hasil Gemini sedang dijeda. Pada workflow yang dipublikasikan, node **Kirim Email Berhasil** dan **Kirim Email Gagal** dinonaktifkan. Untuk melanjutkan notifikasi, aktifkan kembali kedua node di editor n8n lalu publikasikan workflow.

Ketik perintah berikut di web chat untuk mengirim email ke alamat yang sudah dikonfigurasi.

```text
Kirim email ke hardhy@gmail.com pesannya: sudah jadi chat berbasis web dan punya knowledge
```

Node **Rute Perintah Email** memeriksa alamat dan isi pesan sebelum menjalankan **Kirim Email dari Chat**. Node tersebut memakai kredensial SMTP notifikasi yang sudah ada, dengan subjek **Pesan dari Chat n8n**. Chat menampilkan status pengiriman. Perintah email melewati jalur notifikasi otomatis, sedangkan pertanyaan biasa tetap masuk ke AI Agent.

### Google Drive & Google Docs

Workflow memakai kredensial OAuth2 **Google Drive account 2** (`googleDriveOAuth2Api`) dengan folder default **`folder-popi-n8n`** (`1jKEKnFURfG9qVJLKxQPQUZVKxocsmiHT`) untuk kirim dan terima, kecuali pengguna menyebut folder atau file spesifik di chat:

- **Simpan otomatis hasil Gemini ke Google Docs (sedang dijeda):** Node **Simpan Jawaban ke Google Docs** (di belakang percabangan **Cek Sudah Ditulis ke Drive**) tetap dipertahankan di workflow dalam keadaan dinonaktifkan (`disabled`). Saat diaktifkan, setiap jawaban chat biasa otomatis dibuatkan file Google Docs baru di `folder-popi-n8n` lewat endpoint multipart Google Drive API (`uploadType=multipart`) dengan konversi `application/vnd.google-apps.document` dan menautkannya di akhir balasan chat. Untuk mengaktifkan kembali fitur uji coba ini, aktifkan node **Simpan Jawaban ke Google Docs** di editor n8n lalu publikasikan workflow.
- **Tool AI Agent:** **Cari File Google Drive** dan **Baca Isi File Google Drive** membaca daftar serta isi Google Docs atau file teks (default di `folder-popi-n8n`), sedangkan **Simpan ke Google Docs Spesifik** dan **Update File Google Drive** dipakai jika pengguna secara eksplisit meminta menyimpan atau memperbarui ke folder maupun file tertentu di chat.

## Pengetahuan di PostgreSQL

Dalam PostgreSQL, *schema* adalah pengelompokan atau namespace tabel; misalnya `knowledge.murid` berarti tabel `murid` di schema `knowledge`. Schema `knowledge` dipakai untuk data referensi murid, katering, layanan infrastruktur, dan topik pengetahuan, sedangkan `public` adalah schema default yang saat ini memuat `n8n_chat_histories`. Pemisahan schema tidak dengan sendirinya membentuk hubungan antar-tabel.

Tabel murid dan katering berada di schema `knowledge` pada database PostgreSQL latihan. Isinya fiktif dan bisa dipakai dari sesi chat baru. Keempat tool PostgreSQL memakai credential n8n yang sama dengan **Postgres Chat Memory** dan menjalankan query `SELECT` dengan parameter kata kunci.

| Tool n8n | Tabel | Data latihan | Pencarian |
| --- | --- | --- | --- |
| **Cari Murid Sekolah** | `knowledge.murid` | 10 murid kelas 1A SD, termasuk Dami. Kolomnya `kode_murid`, `nama`, `kelas`, `alamat`, `makanan_disukai`, dan `alergi`. | Nama, potongan nama, atau kode seperti `DUMMY-001`. |
| **Cari Katering Sekolah** | `knowledge.katering_sekolah` | 3 penyedia fiktif, yaitu Dapur Pelangi, Bekal Tunas, dan Rantang Ceria. Kolomnya `nama_catering`, `alamat`, dan `contact_person`. | Nama atau potongan nama katering. |

Tool **Cari Layanan Infrastruktur** membaca `knowledge.layanan_infrastruktur`. Kolomnya `nama_layanan`, `fungsi`, `akses_laptop`, `akses_tailscale`, `auto_start`, dan `catatan`. Tabel ini menyimpan informasi lingkungan sendiri, termasuk catatan akses RustDesk; datanya dapat dilihat dan diubah melalui pilihan **Layanan** di `/data` atau ditanyakan lewat chat.

Buka **Pengetahuan → Tambah topik** untuk menyimpan catatan dengan **Judul**, **Kategori** (opsional), dan **Isi**. Ketuk topik yang sudah ada untuk mengeditnya. Judul menerima hingga 200 karakter, kategori 100, dan isi 12.000. Tool **Cari Pengetahuan** mencari kata kunci di ketiga kolom dan mengambil hingga lima hasil. Kata kunci kosong menampilkan lima judul terbaru. Setelah topik tersimpan, AI dapat mencarinya dari sesi chat baru.

Untuk pemasangan baru, jalankan `db/pengetahuan.sql` di database PostgreSQL aplikasi setelah schema `knowledge` tersedia. Workflow n8n perlu memiliki tool **Cari Pengetahuan** dengan akses baca ke `knowledge.pengetahuan`.

Untuk tool murid, katering, dan layanan, kata kunci kosong mengambil seluruh daftar. Untuk membatasi jumlah baris yang diterima model, ubah query di node PostgreSQL dan terapkan `LIMIT` pada baris sebelum agregasi. Pilih kolom yang diperlukan di query untuk membatasi data yang dikirim ke model.

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
| Saat menghapus muncul “Gunakan GET, POST, atau PATCH.” | Layanan masih menjalankan server versi lama. Jalankan `systemctl --user restart chatn8n`, lalu muat ulang `/data`. |
| Halaman tidak terbuka dari HP | Perangkat belum terhubung Tailscale, atau service tidak berjalan — cek `systemctl --user status chatn8n` |
| *Open chat* di editor n8n gagal | Cek `N8N_EDITOR_BASE_URL` di compose n8n |
