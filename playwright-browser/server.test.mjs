import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createBrowserServer } from './server.mjs';
import { createBrowserController } from './browser.mjs';

async function listen(server, t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('HTTP API validates requests and forwards browser actions', async (t) => {
  const calls = [];
  const controller = {
    async run(payload) {
      calls.push(payload);
      if (payload.action === 'fail') throw new Error('Elemen tidak ditemukan');
      return { ok: true, action: payload.action, url: 'https://example.com', title: 'Example', headings: [], links: [], elements: [], text: 'Hello' };
    },
  };
  const origin = await listen(createBrowserServer({ controller }), t);

  const health = await fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });

  assert.equal((await fetch(`${origin}/action`, { method: 'GET' })).status, 405);
  assert.equal((await fetch(`${origin}/action`, { method: 'POST', body: '{}' })).status, 400);

  const okRes = await fetch(`${origin}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'goto', url: 'https://example.com' }),
  });
  assert.equal(okRes.status, 200);
  assert.equal((await okRes.json()).title, 'Example');

  const failRes = await fetch(`${origin}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'fail' }),
  });
  assert.equal(failRes.status, 422);
  assert.deepEqual(calls.map((c) => c.action), ['goto', 'fail']);
});

test('Playwright headless controller extracts rich page context and handles form interaction', async (t) => {
  const targetSite = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const q = url.searchParams.get('q') || '';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html><head>
      <title>Demo Cari</title>
      <meta name="description" content="Halaman demo pencarian menu" />
    </head><body>
      <main>
        <h1>Daftar Menu</h1>
        <form action="/" method="get">
          <input id="search-box" name="q" placeholder="Cari sesuatu" />
          <button id="go-btn" type="submit">Cari</button>
        </form>
        <p id="result">${q ? `Hasil untuk: ${q}` : 'Belum mencari'}</p>
        <a href="/detail">Lihat detail</a>
      </main>
    </body></html>`);
  });
  const siteUrl = await listen(targetSite, t);

  const controller = createBrowserController();
  t.after(() => controller.close());

  const page1 = await controller.run({ action: 'goto', url: siteUrl });
  assert.equal(page1.title, 'Demo Cari');
  assert.equal(page1.description, 'Halaman demo pencarian menu');
  assert.deepEqual(page1.headings, ['h1: Daftar Menu']);
  assert.ok(page1.links.some((l) => l.text === 'Lihat detail' && l.url.endsWith('/detail')));
  assert.ok(page1.elements.some((el) => el.selector === '#search-box'));
  assert.ok(page1.elements.some((el) => el.selector === '#go-btn'));

  await controller.run({ action: 'type', selector: '#search-box', text: 'rendang padang' });
  const page3 = await controller.run({ action: 'click', selector: '#go-btn' });
  assert.match(page3.text, /Hasil untuk: rendang padang/);
});
