CREATE TABLE knowledge.layanan_infrastruktur (
  nama_layanan text PRIMARY KEY,
  fungsi text NOT NULL,
  akses_laptop text NOT NULL,
  akses_tailscale text NOT NULL,
  auto_start text NOT NULL,
  catatan text NOT NULL DEFAULT ''
);
