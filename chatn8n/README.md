# Chat n8n

Web chat pribadi, ringan dan tanpa dependensi (tanpa framework, CDN, atau paket npm), untuk mengobrol dengan chatbot AI yang berjalan di n8n — Google Gemini sebagai model dan PostgreSQL sebagai memori percakapan. Dibuka dari HP atau iPad melalui jaringan Tailscale. Tampilan mobile-first, tema terang, satu file HTML + CSS + JS.

## Arsitektur

```
Browser (HP/iPad, harus masuk Tailscale)
  │  http://100.110.217.94:3000
  ▼
server.mjs — Node.js tanpa dependensi
  │  POST /api/chat + Basic Auth (password hanya di server)
  ▼
Webhook n8n → workflow "Chatbot Internal - Gemini & Postgres"
  │
  ├─ AI Agent (otak chatbot, instruksi dalam Bahasa Indonesia)
  ├─ Google Gemini Chat Model (sub-node, yang menjawab)
  └─ Postgres Chat Memory (sub-node, yang mengingat)
       └─ tabel n8n_chat_histories di PostgreSQL
```

Browser tidak pernah bicara langsung ke n8n; semua lewat web server ini, dan credential tidak pernah dikirim ke browser.

## Isi folder

| File | Isi |
| --- | --- |
| `server.mjs` | Web server: menyajikan 3 file statis, endpoint `GET /api/sessions` & `GET /api/sessions/:id`, serta `POST /api/chat` ke n8n |
| `pg-client.mjs` | Klien PostgreSQL TCP wire-protocol murni Node.js (tanpa dependensi) untuk membaca tabel `n8n_chat_histories` |
| `server.test.mjs` | Tes HTTP server dan klien PostgreSQL tiruan (tanpa credential, tanpa AI) |
| `index.html`, `style.css`, `app.js` | Tampilan chat & panel daftar sesi: pilih sesi sebelumnya, sesi lokal, tombol **Chat baru** |
| `.env.example` | Contoh isi `.env`; salin menjadi `.env` lalu isi nilai aslinya |
| `.env` | Konfigurasi asli + password. **Tidak di-commit** (sudah di-ignore) |

## Menjalankan

Prasyarat: Node.js ≥ 22.9, Docker n8n + PostgreSQL sudah berjalan, dan perangkat yang dipakai mengobrol terhubung ke Tailscale.

1. `cp .env.example .env`, lalu isi:
   - `N8N_CHAT_URL` — URL webhook produksi Chat Trigger di n8n.
   - `N8N_CHAT_USER` / `N8N_CHAT_PASSWORD` — sama dengan credential Basic Auth pada Chat Trigger n8n.
   - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` — koneksi PostgreSQL untuk memuat daftar dan riwayat sesi dari tabel `n8n_chat_histories`.
   - `HOST` / `PORT` — default IP Tailscale dan port 3000.
2. Jalankan web chat — dua cara:
   - **Otomatis (yang dipakai sekarang):** systemd user service `chatn8n` (`~/.config/systemd/user/chatn8n.service`) sudah aktif dan menyala sendiri setiap laptop direstart, tanpa perlu login (linger aktif). Kendalikan dengan `systemctl --user status|restart|stop chatn8n`.
   - **Manual:** `npm start` dari folder ini — matikan dulu service-nya (`systemctl --user stop chatn8n`) agar tidak berebut port 3000.
3. Buka `http://100.110.217.94:3000` dari perangkat ber-Tailscale.

Setelah laptop direstart, semuanya menyala sendiri: n8n dan PostgreSQL otomatis karena container Docker `restart: unless-stopped`, dan web chat otomatis karena user service di atas.

## Cara kerja

- **Sesi**: browser membuat ID sesi acak 32-heksa, disimpan di localStorage (kunci `chatn8n.session.v1`) bersama maksimum 100 pesan tampilan, agar obrolan berlanjut saat halaman dibuka ulang. **Chat baru** membuat ID sesi baru.
- **Permintaan**: browser memanggil `POST /api/chat` di server yang sama. Server memvalidasi origin, format sesi, dan ukuran (maksimum 32 KB / 8.000 karakter), lalu meneruskan hanya `{ action, chatInput, sessionId }` ke webhook n8n dengan Basic Auth. Timeout 90 detik; jika kedaluwarsa, jangan kirim ulang — n8n mungkin masih memproses.
- **Memori**: node Postgres Chat Memory menyimpan setiap pasangan tanya-jawab ke tabel `n8n_chat_histories` dan mengirim jendela konteks terakhir (10) ke AI Agent. Sesi berbeda = memori berbeda, jadi sesi baru tidak tahu isi sesi lama. Browser/perangkat lain punya sesi sendiri; belum ada identitas pengguna atau sinkronisasi antarperangkat.

## Keamanan

- Password Basic Auth hanya ada di `.env` server (chmod 600) dan credential n8n — tidak pernah sampai ke browser atau Git.
- Server hanya mendengarkan IP Tailscale, bukan seluruh antarmuka jaringan; akses mengikuti izin Tailscale. Aplikasi ini tidak punya login pengguna terpisah.
- Jangan mengekspos port 3000 ke internet publik, dan jangan memakai browser bersama untuk percakapan rahasia (sesi tersimpan di localStorage tanpa nama pengguna).

## Sisi n8n (workflow yang dihubungi)

- Workflow **Chatbot Internal - Gemini & Postgres** (ID `EtZ8TjakWxnwNlCW`): Chat Trigger (Basic Auth, allowed origins `http://100.110.217.94:3000`, respons setelah node terakhir) → AI Agent → sub-node Gemini Chat Model dan Postgres Chat Memory.
- Balasan yang diharapkan web chat: JSON `{ "output": "..." }` dari akhir workflow.
- Container n8n memakai `N8N_EDITOR_BASE_URL=http://100.110.217.94:5678` agar fitur *Open chat* di editor tidak gagal.
- Setelah mengubah workflow di editor, publikasikan — web chat baru memakai versi terbaru. Model, instruksi, dan sumber pengetahuan diatur di n8n, bukan di sini.

## Pemeriksaan & masalah umum

`npm test` menjalankan 3 tes server (penerusan pesan, penolakan permintaan tak valid, dan laporan kegagalan n8n). Untuk tes nyata dengan memori: kirim informasi unik, tanyakan lagi di sesi yang sama, lalu periksa tabel `n8n_chat_histories` di PostgreSQL.

| Gejala | Kemungkinan penyebab |
| --- | --- |
| "Tidak bisa mengambil balasan dari n8n" | n8n tidak berjalan, atau `N8N_CHAT_URL` salah |
| "n8n gagal memproses pesan" (502) | Eksekusi workflow gagal — cek log eksekusi & credential di n8n |
| Diminta password terus (401) | Password di `.env` berbeda dari credential Chat Trigger n8n |
| "n8n tidak mengirim balasan" | Workflow belum dipublikasikan, atau tidak berakhir di AI Agent |
| Halaman tidak terbuka dari HP | Perangkat belum terhubung Tailscale, atau service tidak berjalan — cek `systemctl --user status chatn8n` |
| *Open chat* di editor n8n gagal | Cek `N8N_EDITOR_BASE_URL` di compose n8n |
