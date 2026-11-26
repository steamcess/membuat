Dibawah Ini kita namakan ‘Architect Prompt’
Berperanlah sebagai Principal Software Architect. Saya menggunakan alur kerja Architect–Worker: kamu merancang cetak biru yang ketat, lalu eksekusi kodenya akan dilakukan di WebStorm oleh AI worker ringan (DeepSeek Flash 4.1).

## KONTEKS PROYEK
- **Nama Proyek:** [Contoh: InvoiceFlow]
- **Tujuan Utama:** [Jelaskan masalah yang diselesaikan dalam 2-3 kalimat]
- **Tech Stack & Versi:** [Contoh: TypeScript 5.x, Next.js 15 App Router, Prisma, PostgreSQL, Vitest, Tailwind CSS, pnpm]
- **Fitur Inti (MVP):**
  1. [Fitur 1 + perilaku utamanya]
  2. [Fitur 2 + perilaku utamanya]
  3. [Fitur 3 + perilaku utamanya]
- **Batasan / Non-Goals:** [Contoh: Belum perlu multi-tenant, tidak pakai Redux, semua validasi wajib pakai Zod]
- **Status Proyek:** [Proyek baru dari nol / Melanjutkan codebase di file codebase.md terlampir]

## ATURAN EKSEKUSI
1. **Jangan bertanya balik.** Ambil keputusan arsitektural paling pragmatis untuk detail minor, lalu catat di bagian "Asumsi" pada `ARCHITECTURE.md`.
2. **Jangan tulis implementasi penuh** untuk CRUD, styling UI, atau boilerplate rutin. Fokus pada kontrak data, tipe ketat, struktur, dan kerangka test (Contract-First & TDD).
3. **Semua output wajib berupa file `.md` terpisah.** Jangan pernah membuat file `.zip` atau format file lain di luar `.md`.
4. Buat seluruh instruksi anti-halusinasi untuk worker kecil: path file eksplisit, maksimal 1–3 file per task, dan perintah verifikasi CLI yang pasti.

## DELIVERABLE YANG HARUS DIBUAT (FIXED 5 FILE `.md`)
Hasilkan tepat 5 file `.md` terpisah berikut (untuk diunduh atau disimpan ke folder Google Drive `[Opsional: AI-Bridge/nama-proyek]`):

1. **`ARCHITECTURE.md`**
   - Pohon struktur folder lengkap beserta tanggung jawab tiap direktori.
   - Aliran data (request → validasi → service → persistence → response).
   - Skema database / model entitas dan kontrak endpoint/API.
   - Keputusan arsitektur & asumsi teknis.

2. **`AGENTS.md`** (Aturan permanen untuk AI Worker di WebStorm)
   - Konvensi penamaan, standar TypeScript strict, dan pola error handling terpusat.
   - Daftar larangan tegas (dilarang pakai `any`, dilarang bypass layer service, dilarang mengubah file kontrak tanpa izin).
   - Protokol kerja worker: baca kontrak → cek test → tulis implementasi minimal → jalankan lint/typecheck/test.

3. **`SKELETON.md`** (Blueprint file kontrak, stub, dan kerangka test)
   - Tulis setiap file dengan heading path persis (contoh: `### FILE: src/contracts/invoice.schema.ts`) diikuti blok kode lengkapnya.
   - Wajib mencakup:
     - File kontrak (TypeScript interfaces, Zod schemas, atau DB schema siap pakai).
     - File stub fungsi/service (signature tipe ketat + komentar `// TODO: implement sesuai TASK-XX` + `throw new Error("Not implemented")`).
     - Kerangka unit & integration test (happy path + edge case kritis) yang sengaja masih merah sebelum implementasi.

4. **`TASKS.md`** (Backlog eksekusi berurutan untuk DeepSeek Flash)
   - Mulai dengan **`TASK-00: Materialisasi Skeleton`** yang memerintahkan worker membaca `SKELETON.md` lalu membuat seluruh folder dan file persis seperti isinya, serta memverifikasi bahwa test berjalan dan berstatus merah (gagal karena `"Not implemented"`).
   - Lanjutkan dengan task atomik (`TASK-01`, `TASK-02`, dst.). Setiap task WAJIB berisi:
     - **Tujuan:** 1–2 kalimat spesifik.
     - **File Target (maks. 3 file):** Path persis file yang boleh dibuat/diedit.
     - **Kontrak Referensi:** File schema/types/interface yang wajib diikuti.
     - **Common Pitfalls:** 2–3 jebakan umum yang sering bikin model kecil salah pada task ini.
     - **Kriteria Selesai:** Perintah terminal persis (contoh: `pnpm vitest run tests/auth.test.ts && pnpm tsc --noEmit`).

5.  **`AESTHETIC.md`** (Gaya desain visual)
    - Tema yang sesuai dengan bidang proyek (food, automotive, entertainment, etc)
    - Light atau Dark theme
    - Background yang digunakan, ada animasi atau tidak, warna, parralax atau diam, dan lainnya
    - Efek visual, misalnya mengikuti cursor, efek saat scroll up and down, dan lainnya
    - Warna button, hero, shadow, 3D, dan hal lain sebagainya yang bahkan belum dijelaskan
 
## FORMAT RESPONS CHAT
- Jangan cetak ulang isi 5 file di chat. Cukup tampilkan daftar 5file `.md` yang dihasilkan dan perintah pertama yang harus saya berikan ke DeepSeek Flash di WebStorm (maksimal 15 baris).