import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createPostgresSessionStore } from './pg-client.mjs';
import { createPostgresDataStore, DATA_PAGE_SIZE, DATA_SETS } from './data-store.mjs';

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/data': ['data.html', 'text/html; charset=utf-8'],
  '/data/': ['data.html', 'text/html; charset=utf-8'],
  '/data.css': ['data.css', 'text/css; charset=utf-8'],
  '/data.js': ['data.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml; charset=utf-8'],
};

const sessionIdPattern = /^[a-f0-9]{32}$/;
const MAX_DATA_UPDATE_BYTES = 512 * 1024;

function visibleDataRow(row, columns) {
  return Object.fromEntries(columns.map(({ key }) => [key, row[key] ?? null]));
}

function validDataRow(row, columns) {
  if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).length !== columns.length) return false;
  return columns.every(({ key }) => Object.hasOwn(row, key) &&
    (row[key] === null || (typeof row[key] === 'string' && !row[key].includes('\0'))));
}

export function createChatServer({ webhookUrl, authorization, sessionStore = null, dataStore = null }) {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");

    function json(code, body) {
      response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(body));
    }

    const url = new URL(request.url, 'http://localhost');
    const pathname = url.pathname;

    if (request.method === 'GET' && Object.hasOwn(files, pathname)) {
      const [name, type] = files[pathname];
      try {
        const body = await readFile(new URL(name, import.meta.url));
        response.writeHead(200, { 'Content-Type': type });
        response.end(body);
      } catch { json(500, { error: 'Halaman tidak dapat dimuat.' }); }
      return;
    }

    const dataMatch = /^\/api\/data\/([^/]+)$/.exec(pathname);
    if (dataMatch) {
      const name = dataMatch[1];
      if (!Object.hasOwn(DATA_SETS, name)) return json(404, { error: 'Jenis data tidak ditemukan.' });
      const { title, columns } = DATA_SETS[name];
      if (request.method === 'PATCH') {
        if (request.headers.origin !== `http://${request.headers.host}`) return json(403, { error: 'Asal permintaan tidak diizinkan.' });
        if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') return json(415, { error: 'Gunakan JSON.' });
        if (!dataStore) return json(503, { error: 'Database belum dikonfigurasi.' });

        let body;
        try {
          let size = 0;
          const chunks = [];
          for await (const chunk of request) {
            size += chunk.length;
            if (size > MAX_DATA_UPDATE_BYTES) return json(413, { error: 'Data terlalu panjang.' });
            chunks.push(chunk);
          }
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch { return json(400, { error: 'Format data tidak valid.' }); }

        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 2 ||
            !Object.hasOwn(body, 'original') || !Object.hasOwn(body, 'values') ||
            !validDataRow(body.original, columns) || !validDataRow(body.values, columns)) {
          return json(400, { error: 'Kolom atau nilai data tidak valid.' });
        }
        try {
          const updated = await dataStore.updateData(name, body.original, body.values);
          if (!updated) return json(409, { code: 'stale', error: 'Data sudah berubah atau tidak dapat ditemukan. Muat ulang data sebelum mencoba lagi.' });
          return json(200, { row: visibleDataRow(updated, columns) });
        } catch (err) {
          if (err.code === '23505') return json(409, { code: 'duplicate', error: 'Nama atau kode tersebut sudah digunakan.' });
          if (err.code === '23502' || err.code === '23514') return json(400, { error: 'Nilai tidak sesuai ketentuan database.' });
          if (err.code === '23503') return json(409, { error: 'Data masih digunakan oleh data lain dan tidak dapat diubah.' });
          if (err.code === '42501') return json(403, { error: 'Tidak ada izin untuk mengubah data ini.' });
          console.error(`Failed to update ${name} data: ${err.code || err.name}`);
          return json(502, { error: 'Tidak bisa menyimpan data ke database.' });
        }
      }
      if (request.method !== 'GET') return json(405, { error: 'Gunakan GET atau PATCH.' });
      const offsets = url.searchParams.getAll('offset');
      if (offsets.length > 1 || (offsets.length && !/^\d+$/.test(offsets[0]))) {
        return json(400, { error: 'Posisi data tidak valid.' });
      }
      const offset = offsets.length ? Number(offsets[0]) : 0;
      if (!Number.isSafeInteger(offset)) return json(400, { error: 'Posisi data tidak valid.' });
      if (!dataStore) return json(503, { error: 'Database belum dikonfigurasi.' });
      try {
        const { rows, hasMore } = await dataStore.listData(name, offset);
        const visibleRows = rows.map((row) => visibleDataRow(row, columns));
        return json(200, { dataset: name, title, columns, offset, pageSize: DATA_PAGE_SIZE, rows: visibleRows, hasMore });
      } catch (err) {
        console.error(`Failed to load ${name} data: ${err.message}`);
        return json(502, { error: 'Tidak bisa memuat data dari database.' });
      }
    }

    if (pathname === '/api/sessions') {
      if (request.method !== 'GET') return json(405, { error: 'Gunakan GET.' });
      if (!sessionStore) return json(503, { error: 'Riwayat sesi belum dikonfigurasi.' });
      try {
        const sessions = await sessionStore.listSessions();
        return json(200, { sessions });
      } catch (err) {
        console.error(`Failed to list sessions: ${err.message}`);
        return json(502, { error: 'Tidak bisa memuat daftar sesi dari database.' });
      }
    }

    const sessionMatch = /^\/api\/sessions\/([^/]+)$/.exec(pathname);
    if (sessionMatch) {
      if (request.method !== 'GET') return json(405, { error: 'Gunakan GET.' });
      const sessionId = sessionMatch[1];
      if (!sessionIdPattern.test(sessionId)) return json(400, { error: 'Sesi tidak valid.' });
      if (!sessionStore) return json(503, { error: 'Riwayat sesi belum dikonfigurasi.' });
      try {
        const messages = await sessionStore.getSessionMessages(sessionId);
        return json(200, { id: sessionId, messages });
      } catch (err) {
        console.error(`Failed to load session messages: ${err.message}`);
        return json(502, { error: 'Tidak bisa memuat riwayat sesi dari database.' });
      }
    }

    if (pathname !== '/api/chat') return json(404, { error: 'Tidak ditemukan.' });
    if (request.method !== 'POST') return json(405, { error: 'Gunakan POST.' });
    if (request.headers.origin !== `http://${request.headers.host}`) return json(403, { error: 'Asal permintaan tidak diizinkan.' });
    if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') return json(415, { error: 'Gunakan JSON.' });

    let body = '';
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 32768) {
          json(413, { error: 'Pesan terlalu panjang.' });
          return;
        }
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { return json(400, { error: 'Format pesan tidak valid.' }); }

    if (typeof body?.message !== 'string' || !body.message.trim() || body.message.length > 8000 ||
        typeof body.sessionId !== 'string' || !sessionIdPattern.test(body.sessionId)) {
      return json(400, { error: 'Pesan atau sesi tidak valid.' });
    }

    try {
      const upstream = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: JSON.stringify({ action: 'sendMessage', chatInput: body.message.trim(), sessionId: body.sessionId }),
        signal: AbortSignal.timeout(90000),
        redirect: 'error',
      });
      if (!upstream.ok) {
        console.error(`n8n chat returned HTTP ${upstream.status}`);
        return json(502, { error: 'n8n gagal memproses pesan. Periksa eksekusi workflow dan credential di n8n.' });
      }
      const result = await upstream.json();
      if (typeof result?.output !== 'string' || !result.output.trim()) {
        return json(502, { error: 'n8n tidak mengirim balasan. Pastikan workflow sudah dipublikasikan dan berakhir di AI Agent.' });
      }
      json(200, { output: result.output });
    } catch (error) {
      console.error(`n8n chat request failed: ${error.name}`);
      json(502, { error: error.name === 'TimeoutError'
        ? 'n8n terlalu lama merespons. Periksa eksekusi sebelum mengirim ulang; pesan mungkin sudah diproses.'
        : 'Tidak bisa mengambil balasan dari n8n. Pastikan n8n menyala dan URL webhook benar.' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {
    N8N_CHAT_URL,
    N8N_CHAT_USER,
    N8N_CHAT_PASSWORD,
    PGHOST = '127.0.0.1',
    PGPORT = '5432',
    PGDATABASE,
    PGUSER,
    PGPASSWORD = '',
    HOST = '100.110.217.94',
    PORT = '3000',
  } = process.env;
  if (!N8N_CHAT_URL || !N8N_CHAT_USER || !N8N_CHAT_PASSWORD) {
    throw new Error('Lengkapi N8N_CHAT_URL, N8N_CHAT_USER, dan N8N_CHAT_PASSWORD di .env. Lihat README.md.');
  }
  const pgConfig = PGDATABASE && PGUSER
    ? { host: PGHOST, port: PGPORT, database: PGDATABASE, user: PGUSER, password: PGPASSWORD }
    : null;
  const server = createChatServer({
    webhookUrl: N8N_CHAT_URL,
    authorization: `Basic ${Buffer.from(`${N8N_CHAT_USER}:${N8N_CHAT_PASSWORD}`).toString('base64')}`,
    sessionStore: pgConfig ? createPostgresSessionStore(pgConfig) : null,
    dataStore: pgConfig ? createPostgresDataStore(pgConfig) : null,
  });
  server.listen(Number(PORT), HOST, () => console.log(`Chat n8n: http://${HOST}:${PORT}`));
}
