import { queryPostgres } from './pg-client.mjs';

export const DATA_PAGE_SIZE = 50;

const topicFields = 'id, judul, kategori, isi';

// Only these explicitly selected tables and columns are available to the data page.
export const DATA_SETS = {
  pengetahuan: {
    title: 'Pengetahuan',
    rowKey: 'id',
    columns: [
      { key: 'judul', label: 'Judul', required: true, maxLength: 200 },
      { key: 'kategori', label: 'Kategori', maxLength: 100 },
      { key: 'isi', label: 'Isi', required: true, maxLength: 12000, rows: 8 },
    ],
    sql: `
      SELECT ${topicFields}
      FROM knowledge.pengetahuan
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
    `,
    insertSql: `
      INSERT INTO knowledge.pengetahuan (judul, kategori, isi)
      VALUES ($1, $2, $3)
      RETURNING ${topicFields}
    `,
    updateSql: `
      UPDATE knowledge.pengetahuan
      SET judul = $1, kategori = $2, isi = $3
      WHERE judul = $4 AND kategori IS NOT DISTINCT FROM $5 AND isi = $6 AND id = $7
      RETURNING ${topicFields}
    `,
  },
  katering: {
    title: 'Penyedia katering',
    columns: [
      { key: 'nama_catering', label: 'Nama katering', requiredOnCreate: true },
      { key: 'alamat', label: 'Alamat' },
      { key: 'contact_person', label: 'Contact person' },
    ],
    sql: `
      SELECT nama_catering, alamat, contact_person
      FROM knowledge.katering_sekolah
      ORDER BY nama_catering NULLS LAST, alamat NULLS LAST, contact_person NULLS LAST
      LIMIT $1 OFFSET $2
    `,
    updateSql: `
      WITH matching AS MATERIALIZED (
        SELECT tableoid, ctid FROM knowledge.katering_sekolah
        WHERE nama_catering IS NOT DISTINCT FROM $4
          AND alamat IS NOT DISTINCT FROM $5
          AND contact_person IS NOT DISTINCT FROM $6
        LIMIT 2
      )
      UPDATE knowledge.katering_sekolah AS current_row
      SET nama_catering = $1, alamat = $2, contact_person = $3
      FROM matching
      WHERE current_row.tableoid = matching.tableoid AND current_row.ctid = matching.ctid
        AND (SELECT count(*) FROM matching) = 1
        AND current_row.nama_catering IS NOT DISTINCT FROM $4
        AND current_row.alamat IS NOT DISTINCT FROM $5
        AND current_row.contact_person IS NOT DISTINCT FROM $6
      RETURNING current_row.nama_catering, current_row.alamat, current_row.contact_person
    `,
    insertSql: `
      INSERT INTO knowledge.katering_sekolah (nama_catering, alamat, contact_person)
      VALUES ($1, COALESCE($2, ''), COALESCE($3, ''))
      RETURNING nama_catering, alamat, contact_person
    `,
  },
  murid: {
    title: 'Murid',
    columns: [
      { key: 'kode_murid', label: 'Kode murid', requiredOnCreate: true },
      { key: 'nama', label: 'Nama', requiredOnCreate: true },
      { key: 'kelas', label: 'Kelas' },
      { key: 'alamat', label: 'Alamat' },
      { key: 'makanan_disukai', label: 'Makanan disukai' },
      { key: 'alergi', label: 'Alergi' },
    ],
    sql: `
      SELECT kode_murid, nama, kelas, alamat, makanan_disukai, alergi
      FROM knowledge.murid
      ORDER BY kode_murid NULLS LAST, nama NULLS LAST, kelas NULLS LAST,
               alamat NULLS LAST, makanan_disukai NULLS LAST, alergi NULLS LAST
      LIMIT $1 OFFSET $2
    `,
    updateSql: `
      WITH matching AS MATERIALIZED (
        SELECT tableoid, ctid FROM knowledge.murid
        WHERE kode_murid IS NOT DISTINCT FROM $7
          AND nama IS NOT DISTINCT FROM $8
          AND kelas IS NOT DISTINCT FROM $9
          AND alamat IS NOT DISTINCT FROM $10
          AND makanan_disukai IS NOT DISTINCT FROM $11
          AND alergi IS NOT DISTINCT FROM $12
        LIMIT 2
      )
      UPDATE knowledge.murid AS current_row
      SET kode_murid = $1, nama = $2, kelas = $3, alamat = $4, makanan_disukai = $5, alergi = $6
      FROM matching
      WHERE current_row.tableoid = matching.tableoid AND current_row.ctid = matching.ctid
        AND (SELECT count(*) FROM matching) = 1
        AND current_row.kode_murid IS NOT DISTINCT FROM $7
        AND current_row.nama IS NOT DISTINCT FROM $8
        AND current_row.kelas IS NOT DISTINCT FROM $9
        AND current_row.alamat IS NOT DISTINCT FROM $10
        AND current_row.makanan_disukai IS NOT DISTINCT FROM $11
        AND current_row.alergi IS NOT DISTINCT FROM $12
      RETURNING current_row.kode_murid, current_row.nama, current_row.kelas,
                current_row.alamat, current_row.makanan_disukai, current_row.alergi
    `,
    insertSql: `
      INSERT INTO knowledge.murid (kode_murid, nama, kelas, alamat, makanan_disukai, alergi)
      VALUES ($1, $2, COALESCE($3, ''), COALESCE($4, ''), COALESCE($5, ''), COALESCE($6, ''))
      RETURNING kode_murid, nama, kelas, alamat, makanan_disukai, alergi
    `,
  },
  layanan: {
    title: 'Layanan',
    columns: [
      { key: 'nama_layanan', label: 'Nama layanan', requiredOnCreate: true },
      { key: 'fungsi', label: 'Fungsi' },
      { key: 'akses_laptop', label: 'Akses dari laptop' },
      { key: 'akses_tailscale', label: 'Akses via Tailscale' },
      { key: 'auto_start', label: 'Auto-start saat boot' },
      { key: 'catatan', label: 'Catatan' },
    ],
    sql: `
      SELECT nama_layanan, fungsi, akses_laptop, akses_tailscale, auto_start, catatan
      FROM knowledge.layanan_infrastruktur
      ORDER BY nama_layanan
      LIMIT $1 OFFSET $2
    `,
    updateSql: `
      WITH matching AS MATERIALIZED (
        SELECT tableoid, ctid FROM knowledge.layanan_infrastruktur
        WHERE nama_layanan IS NOT DISTINCT FROM $7
          AND fungsi IS NOT DISTINCT FROM $8
          AND akses_laptop IS NOT DISTINCT FROM $9
          AND akses_tailscale IS NOT DISTINCT FROM $10
          AND auto_start IS NOT DISTINCT FROM $11
          AND catatan IS NOT DISTINCT FROM $12
        LIMIT 2
      )
      UPDATE knowledge.layanan_infrastruktur AS current_row
      SET nama_layanan = $1, fungsi = $2, akses_laptop = $3,
          akses_tailscale = $4, auto_start = $5, catatan = $6
      FROM matching
      WHERE current_row.tableoid = matching.tableoid AND current_row.ctid = matching.ctid
        AND (SELECT count(*) FROM matching) = 1
        AND current_row.nama_layanan IS NOT DISTINCT FROM $7
        AND current_row.fungsi IS NOT DISTINCT FROM $8
        AND current_row.akses_laptop IS NOT DISTINCT FROM $9
        AND current_row.akses_tailscale IS NOT DISTINCT FROM $10
        AND current_row.auto_start IS NOT DISTINCT FROM $11
        AND current_row.catatan IS NOT DISTINCT FROM $12
      RETURNING current_row.nama_layanan, current_row.fungsi, current_row.akses_laptop,
                current_row.akses_tailscale, current_row.auto_start, current_row.catatan
    `,
    insertSql: `
      INSERT INTO knowledge.layanan_infrastruktur (nama_layanan, fungsi, akses_laptop, akses_tailscale, auto_start, catatan)
      VALUES ($1, COALESCE($2, ''), COALESCE($3, ''), COALESCE($4, ''), COALESCE($5, ''), COALESCE($6, ''))
      RETURNING nama_layanan, fungsi, akses_laptop, akses_tailscale, auto_start, catatan
    `,
  },
};

export function createPostgresDataStore(config, query = queryPostgres) {
  return {
    async listData(name, offset) {
      if (!Object.hasOwn(DATA_SETS, name)) throw new RangeError('Jenis data tidak dikenal.');
      if (!Number.isSafeInteger(offset) || offset < 0) throw new RangeError('Posisi data tidak valid.');
      const rows = await query(config, DATA_SETS[name].sql, [DATA_PAGE_SIZE + 1, offset]);
      return { rows: rows.slice(0, DATA_PAGE_SIZE), hasMore: rows.length > DATA_PAGE_SIZE };
    },
    async insertData(name, values) {
      if (!Object.hasOwn(DATA_SETS, name) || !DATA_SETS[name].insertSql) {
        throw new RangeError('Jenis data tidak dapat ditambah.');
      }
      const { columns, insertSql } = DATA_SETS[name];
      const [row] = await query(config, insertSql, columns.map(({ key }) => values[key]));
      return row;
    },
    async updateData(name, original, values, rowId) {
      if (!Object.hasOwn(DATA_SETS, name)) throw new RangeError('Jenis data tidak dikenal.');
      const { columns, updateSql, rowKey } = DATA_SETS[name];
      const params = [
        ...columns.map(({ key }) => values[key]),
        ...columns.map(({ key }) => original[key]),
      ];
      if (rowKey) params.push(rowId);
      const rows = await query(config, updateSql, params);
      if (rows.length > 1) throw new Error('Pembaruan menghasilkan lebih dari satu baris.');
      return rows[0] ?? null;
    },
  };
}
