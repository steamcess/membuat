# Playwright Browser Tool untuk n8n (Headless)

Layanan HTTP lokal ringan untuk membaca konteks halaman web dan berinteraksi menggunakan Playwright Chromium dalam mode **headless** (berjalan diam-diam di latar belakang tanpa membuka jendela browser di layar).

## Endpoint

- `GET /health` → `{ "ok": true }`
- `POST /action` → JSON `{ "action": "goto|click|type|press|scroll|snapshot|close", ... }`

Setiap aksi mengembalikan konteks terstruktur untuk AI Agent: `url`, `title`, `description`, `headings`, `text` (konten utama halaman), `links`, dan `elements` (elemen interaktif beserta CSS `selector`).

## Menjalankan

- Otomatis (systemd user service): `systemctl --user status|restart|stop playwright-browser`
- Manual: `npm start` (default `http://100.110.217.94:3001`, mode `headless` secara default; set `HEADLESS=false` jika ingin jendela terlihat).
- Tes: `npm test`
