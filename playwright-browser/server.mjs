import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createBrowserController } from './browser.mjs';

export function createBrowserServer({ controller }) {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    function json(code, body) {
      response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(body));
    }

    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (request.method === 'GET' && pathname === '/health') {
      return json(200, { ok: true });
    }

    if (pathname !== '/action') {
      return json(404, { error: 'Tidak ditemukan.' });
    }
    if (request.method !== 'POST') {
      return json(405, { error: 'Gunakan POST.' });
    }

    let body;
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 65536) return json(413, { error: 'Payload terlalu besar.' });
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return json(400, { error: 'Format JSON tidak valid.' });
    }

    if (!body || typeof body.action !== 'string' || !body.action.trim()) {
      return json(400, { error: 'Field action wajib diisi.' });
    }

    try {
      const result = await controller.run(body);
      return json(200, result);
    } catch (err) {
      return json(422, { ok: false, error: err.message });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const HOST = process.env.HOST || '100.110.217.94';
  const PORT = Number(process.env.PORT || '3001');
  const headless = process.env.HEADLESS === 'false' ? false : true;

  const controller = createBrowserController({ headless });
  const server = createBrowserServer({ controller });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, async () => {
      await controller.close().catch(() => {});
      server.close(() => process.exit(0));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`Playwright browser service (${headless ? 'headless' : 'headed'}): http://${HOST}:${PORT}`);
  });
}
