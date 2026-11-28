CREATE TABLE IF NOT EXISTS knowledge.pengetahuan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  judul text NOT NULL CHECK (char_length(judul) <= 200 AND judul ~ '[^[:space:]]'),
  kategori text CHECK (char_length(kategori) <= 100),
  isi text NOT NULL CHECK (char_length(isi) <= 12000 AND isi ~ '[^[:space:]]')
);
