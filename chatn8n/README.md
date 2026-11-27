# Chat n8n

Web chat pribadi, ringan, tanpa framework, CDN, atau dependensi npm. Tampilan mobile-first dengan tema terang. Memerlukan Node.js 22.9+ dan n8n yang berjalan.

## Menjalankan

1. Salin `.env.example` menjadi `.env`.
2. Isi password Basic Auth yang sama dengan credential pada Chat Trigger di n8n. Jangan commit `.env` atau menaruh credential di file browser.
3. Jalankan `npm start` dari folder ini.
4. Buka **http://100.110.217.94:3000** dari perangkat yang terhubung ke Tailscale Anda.

Server secara default hanya mendengarkan pada IP Tailscale tersebut, bukan seluruh antarmuka jaringan. Akses mengikuti izin jaringan Tailscale; aplikasi ini tidak memiliki login pengguna terpisah. Jangan mengekspos port ini ke internet publik. Laptop, Tailscale, n8n, PostgreSQL, dan proses web server harus tetap menyala. `npm start` berhenti jika proses terminalnya dihentikan.

## Workflow n8n

- Workflow: **Chatbot Internal - Gemini & Postgres** (`EtZ8TjakWxnwNlCW`).
- Chat Trigger: **Make Chat Publicly Available = true**, mode **Embedded Chat**, authentication **Basic Auth**, response mode **When Last Node Finishes**.
- Credential Basic Auth khusus web chat hanya disimpan di n8n dan `.env` server. Istilah "Publicly Available" adalah pengaturan webhook produksi n8n, bukan berarti chatbot ini tanpa autentikasi.
- Chat Trigger → AI Agent → jawaban `{ "output": "..." }`. Gemini dan Postgres Chat Memory tetap menjadi sub-node AI Agent. Model, instruksi, dan sumber pengetahuan diubah di n8n, bukan di browser.
- Publikasikan workflow setelah mengubahnya agar web chat memakai versi terbaru.
- Browser memanggil `/api/chat` di web server yang sama. Server meneruskan hanya pesan dan ID sesi ke webhook n8n, dengan Basic Auth. Credential tidak pernah dikirim ke browser.

## Sesi dan memori

ID sesi acak dan hingga 100 pesan terakhir disimpan di localStorage browser agar tampilan dan sesi berlanjut saat halaman dibuka ulang. Ini bukan batas penyimpanan PostgreSQL. Riwayat lengkap dikelola oleh node Postgres Chat Memory; jendela konteks mengikuti pengaturannya di n8n.

**Chat baru** membuat ID sesi baru. Riwayat sesi lama tidak dihapus dari PostgreSQL dan tidak otomatis dipakai pada sesi baru. Browser/perangkat lain memiliki sesi sendiri; aplikasi ini belum memiliki identitas pengguna atau sinkronisasi antarperangkat. Menghapus data situs juga memulai sesi baru. Jangan gunakan pada browser bersama untuk percakapan rahasia.

## Pemeriksaan

`npm test` menjalankan tes HTTP server dengan n8n tiruan, tanpa membutuhkan credential atau memanggil AI. Untuk tes nyata, sebutkan informasi unik, tanyakan lagi dalam sesi yang sama, lalu periksa tabel `n8n_chat_histories`. Jangan mengirim ulang otomatis setelah timeout: n8n mungkin masih memproses pesan pertama.
