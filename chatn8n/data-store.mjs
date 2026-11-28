import { queryPostgres } from './pg-client.mjs';

export const DATA_PAGE_SIZE = 50;

// Only these explicitly selected tables and columns are available to the data page.
export const DATA_SETS = {
  katering: {
    title: 'Penyedia katering',
    columns: [
      { key: 'nama_catering', label: 'Nama katering' },
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
  },
  murid: {
    title: 'Murid',
    columns: [
      { key: 'kode_murid', label: 'Kode murid' },
      { key: 'nama', label: 'Nama' },
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
    async updateData(name, original, values) {
      if (!Object.hasOwn(DATA_SETS, name)) throw new RangeError('Jenis data tidak dikenal.');
      const { columns, updateSql } = DATA_SETS[name];
      const params = [
        ...columns.map(({ key }) => values[key]),
        ...columns.map(({ key }) => original[key]),
      ];
      const rows = await query(config, updateSql, params);
      if (rows.length > 1) throw new Error('Pembaruan menghasilkan lebih dari satu baris.');
      return rows[0] ?? null;
    },
  };
}
