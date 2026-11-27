import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createPostgresSessionStore } from './pg-client.mjs';

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml; charset=utf-8'],
};

const sessionIdPattern = /^[a-f0-9]{32}$/;

export function createChatServer({ webhookUrl, authorization, sessionStore = null }) {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");

    function json(code, body) {
      response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(body));
    }

    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (request.method === 'GET' && Object.hasOwn(files, pathname)) {
      const [name, type] = files[pathname];
      try {
        const body = await readFile(new URL(name, import.meta.url));
        response.writeHead(200, { 'Content-Type': type });
        response.end(body);
      } catch { json(500, { error: 'Halaman tidak dapat dimuat.' }); }
      return;
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
  const sessionStore = PGDATABASE && PGUSER
    ? createPostgresSessionStore({ host: PGHOST, port: PGPORT, database: PGDATABASE, user: PGUSER, password: PGPASSWORD })
    : null;
  const server = createChatServer({
    webhookUrl: N8N_CHAT_URL,
    authorization: `Basic ${Buffer.from(`${N8N_CHAT_USER}:${N8N_CHAT_PASSWORD}`).toString('base64')}`,
    sessionStore,
  });
  server.listen(Number(PORT), HOST, () => console.log(`Chat n8n: http://${HOST}:${PORT}`));
}
