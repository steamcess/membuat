# membuat

Folder `membuat` berisi **12 folder tingkat atas**, termasuk 6 folder tersembunyi.

- `ai-benchmark` berisi skrip untuk menguji kinerja model AI. Skrip mendukung beberapa penyedia API. Hasilnya mencakup latensi dan kecepatan keluaran token.
- `chatn8n` menyediakan antarmuka web untuk chatbot n8n. Server meneruskan pesan ke webhook n8n dan memuat riwayat percakapan dari PostgreSQL. Halaman **Data** menampilkan dan mengubah data katering dan murid.
- `n8n` menyimpan konfigurasi paket untuk menjalankan `n8n-mcp` secara lokal. Paket itu menghubungkan alat yang mendukung MCP dengan n8n. Versi dependensinya dikunci untuk instalasi yang konsisten.
- `playwright-browser` menyediakan layanan HTTP lokal untuk n8n. Layanan ini mengendalikan Chromium melalui Playwright. Hasilnya memuat teks, tautan, dan elemen interaktif dari halaman.
- `project-planner` berisi aplikasi web untuk merencanakan proyek. Formulirnya membantu pengguna merumuskan ide dan kebutuhan. Ringkasannya bisa disalin sebagai prompt untuk AI.
- `skills` menyimpan panduan kerja untuk agen AI. Di dalamnya ada panduan `run-workflow`. Panduan itu menjelaskan cara menyusun alur kerja yang melibatkan beberapa agen.
- `.agents` merupakan lokasi untuk konfigurasi agen di tingkat proyek. Lokasi ini bisa memuat panduan kerja seperti skill. Folder ini terlihat kosong di ruang kerja saat diperiksa.
- `.amp` menyimpan artefak kerja Amp. Isinya mencakup tangkapan layar `chatn8n`. Tangkapan layar merekam tampilan di ponsel dan iPad.
- `.aws` merupakan lokasi yang biasa digunakan untuk konfigurasi alat AWS. Contoh isinya adalah pengaturan profil dan region. Folder ini terlihat kosong di ruang kerja saat diperiksa.
- `.codex` merupakan lokasi untuk pengaturan Codex di tingkat proyek. Lokasi ini bisa memuat konfigurasi khusus repositori. Folder ini terlihat kosong di ruang kerja saat diperiksa.
- `.git` menyimpan metadata repositori Git. Isinya mencakup riwayat dan referensi cabang. Git menggunakannya untuk melacak perubahan proyek.
- `.idea` menyimpan pengaturan proyek untuk IDE JetBrains. Isinya mencakup konfigurasi modul dan integrasi Git. Pengaturan ruang kerja lokal juga disimpan di sini.
