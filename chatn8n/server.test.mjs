import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { once } from 'node:events';
import { createChatServer } from './server.mjs';
import { createPostgresDataStore, DATA_PAGE_SIZE } from './data-store.mjs';
import { queryPostgres } from './pg-client.mjs';

async function listen(server, t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('chat forwards the session and message, keeps authorization server-side, and serves only public files', async (t) => {
  const upstream = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    assert.equal(req.headers.authorization, 'Basic test-server-only');
    assert.deepEqual(body, { action: 'sendMessage', chatInput: 'Nama saya Kenanga', sessionId: 'a'.repeat(32) });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ output: 'Baik, Kenanga.', privateMetadata: 'do not expose' }));
  });
  const webhookUrl = await listen(upstream, t);
  const origin = await listen(createChatServer({ webhookUrl, authorization: 'Basic test-server-only' }), t);
  const response = await fetch(`${origin}/api/chat`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: ' Nama saya Kenanga ', sessionId: 'a'.repeat(32) }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { output: 'Baik, Kenanga.' });
  assert.equal((await fetch(`${origin}/`)).status, 200);
  for (const path of ['/.env', '/server.mjs', '/pg-client.mjs', '/data-store.mjs', '/README.md']) {
    assert.equal((await fetch(`${origin}${path}`)).status, 404);
  }
});

test('data API serves the viewer and lists only allowed datasets with validated pagination', async (t) => {
  const calls = [];
  const dataStore = {
    async listData(name, offset) {
      calls.push({ name, offset });
      if (name === 'katering') {
        return { rows: [{ nama_catering: 'Dapur Contoh', alamat: 'Jalan Contoh', contact_person: 'Nina', secret: 'private' }], hasMore: true };
      }
      if (name === 'layanan') {
        return { rows: [{ nama_layanan: 'Layanan Uji', fungsi: 'Fungsi', akses_laptop: 'Lokal', akses_tailscale: 'Privat', auto_start: 'Ya', catatan: 'Catatan', secret: 'private' }], hasMore: false };
      }
      return { rows: [{ kode_murid: 'A1', nama: 'Murid Contoh', kelas: '1A', alamat: null, makanan_disukai: 'Nasi', alergi: 'Ikan' }], hasMore: false };
    },
  };
  const origin = await listen(createChatServer({ webhookUrl: 'http://127.0.0.1:1', authorization: 'Basic x', dataStore }), t);

  for (const path of ['/data', '/data/', '/data.css', '/data.js']) assert.equal((await fetch(`${origin}${path}`)).status, 200);
  const response = await fetch(`${origin}/api/data/katering?offset=50`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.dataset, 'katering');
  assert.equal(payload.offset, 50);
  assert.equal(payload.pageSize, DATA_PAGE_SIZE);
  assert.equal(payload.hasMore, true);
  assert.deepEqual(payload.rows, [{ nama_catering: 'Dapur Contoh', alamat: 'Jalan Contoh', contact_person: 'Nina' }]);
  assert.deepEqual(payload.columns.map((column) => column.key), ['nama_catering', 'alamat', 'contact_person']);

  const pupils = await fetch(`${origin}/api/data/murid`);
  assert.equal(pupils.status, 200);
  assert.equal((await pupils.json()).rows[0].alergi, 'Ikan');
  const services = await fetch(`${origin}/api/data/layanan`);
  assert.equal(services.status, 200);
  const serviceData = await services.json();
  assert.deepEqual(serviceData.columns.map((column) => column.key), ['nama_layanan', 'fungsi', 'akses_laptop', 'akses_tailscale', 'auto_start', 'catatan']);
  assert.deepEqual(serviceData.rows, [{ nama_layanan: 'Layanan Uji', fungsi: 'Fungsi', akses_laptop: 'Lokal', akses_tailscale: 'Privat', auto_start: 'Ya', catatan: 'Catatan' }]);
  assert.deepEqual(calls, [{ name: 'katering', offset: 50 }, { name: 'murid', offset: 0 }, { name: 'layanan', offset: 0 }]);

  for (const path of ['/api/data/n8n_chat_histories', '/api/data/__proto__']) {
    assert.equal((await fetch(`${origin}${path}`)).status, 404);
  }
  for (const query of ['offset=-1', 'offset=x', 'offset=1e3', 'offset=9007199254740992', 'offset=1&offset=2']) {
    assert.equal((await fetch(`${origin}/api/data/katering?${query}`)).status, 400);
  }
  for (const method of ['PUT', 'DELETE']) {
    assert.equal((await fetch(`${origin}/api/data/katering`, { method })).status, 405);
  }
  assert.equal(calls.length, 3);

  const unconfigured = await listen(createChatServer({ webhookUrl: 'http://127.0.0.1:1', authorization: 'Basic x' }), t);
  assert.equal((await fetch(`${unconfigured}/api/data/katering`)).status, 503);
  const failing = await listen(createChatServer({
    webhookUrl: 'http://127.0.0.1:1', authorization: 'Basic x',
    dataStore: { async listData() { throw new Error('private database detail'); } },
  }), t);
  const failedResponse = await fetch(`${failing}/api/data/murid`);
  assert.equal(failedResponse.status, 502);
  assert.ok(!JSON.stringify(await failedResponse.json()).includes('private database detail'));
});

test('data update validates origin, payload, conflicts, and only permits approved columns', async (t) => {
  const calls = [];
  const dataStore = {
    async updateData(name, original, values) {
      calls.push({ name, original, values });
      if (original.nama_catering === 'stale') return null;
      if (original.nama_catering === 'duplicate') throw Object.assign(new Error('private detail'), { code: '23505' });
      if (original.nama_catering === 'failure') throw new Error('private database detail');
      return { ...values, hidden: 'private' };
    },
  };
  const origin = await listen(createChatServer({ webhookUrl: 'http://127.0.0.1:1', authorization: 'Basic x', dataStore }), t);
  const original = { nama_catering: 'Dapur Contoh', alamat: 'Alamat lama', contact_person: 'Nina' };
  const values = { ...original, alamat: 'Alamat baru' };
  const request = (body, options = {}) => fetch(`${origin}/api/data/katering`, {
    method: 'PATCH',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...options.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

  assert.equal((await request({ original, values }, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  assert.equal((await fetch(`${origin}/api/data/katering`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  assert.equal((await request({ original, values }, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await request('{')).status, 400);
  assert.equal((await request({ original, values: { ...values, extra: 'x' } })).status, 400);
  assert.equal((await request({ original, values: { nama_catering: 'A', alamat: 'B' } })).status, 400);
  assert.equal((await request({ original, values: { ...values, alamat: { nested: 'x' } } })).status, 400);
  assert.equal((await request({ original, values: { ...values, alamat: '\0' } })).status, 400);
  assert.equal((await request({ original, values, extra: true })).status, 400);
  assert.equal((await request({ original, values: { ...values, alamat: 'x'.repeat(530000) } })).status, 413);
  assert.equal(calls.length, 0);

  const response = await request({ original, values });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { row: values });
  assert.deepEqual(calls[0], { name: 'katering', original, values });
  const stale = await request({ original: { ...original, nama_catering: 'stale' }, values });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).code, 'stale');
  const duplicate = await request({ original: { ...original, nama_catering: 'duplicate' }, values });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).code, 'duplicate');
  const failed = await request({ original: { ...original, nama_catering: 'failure' }, values });
  assert.equal(failed.status, 502);
  assert.ok(!JSON.stringify(await failed.json()).includes('private database detail'));
  const service = { nama_layanan: 'Layanan Uji', fungsi: 'Fungsi', akses_laptop: 'Lokal', akses_tailscale: 'Privat', auto_start: 'Ya', catatan: 'Catatan awal' };
  const updatedService = { ...service, catatan: 'Catatan baru' };
  const serviceResponse = await fetch(`${origin}/api/data/layanan`, {
    method: 'PATCH', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ original: service, values: updatedService }),
  });
  assert.equal(serviceResponse.status, 200);
  assert.deepEqual(await serviceResponse.json(), { row: updatedService });
  assert.deepEqual(calls.at(-1), { name: 'layanan', original: service, values: updatedService });

  const unconfigured = await listen(createChatServer({ webhookUrl: 'http://127.0.0.1:1', authorization: 'Basic x' }), t);
  assert.equal((await fetch(`${unconfigured}/api/data/katering`, {
    method: 'PATCH', headers: { Origin: unconfigured, 'Content-Type': 'application/json' }, body: JSON.stringify({ original, values }),
  })).status, 503);
});

test('data store uses fixed queries, limits each page, and binds old and new values', async () => {
  const calls = [];
  const store = createPostgresDataStore({ host: 'test' }, async (config, sql, params) => {
    calls.push({ config, sql, params });
    return Array.from({ length: DATA_PAGE_SIZE + 1 }, (_, index) => ({ row: index }));
  });
  const page = await store.listData('katering', 50);
  assert.equal(page.rows.length, DATA_PAGE_SIZE);
  assert.equal(page.hasMore, true);
  assert.match(calls[0].sql, /^\s*SELECT\b/i);
  assert.match(calls[0].sql, /FROM knowledge\.katering_sekolah\b/);
  assert.deepEqual(calls[0].params, [DATA_PAGE_SIZE + 1, 50]);
  await store.listData('murid', 0);
  assert.match(calls[1].sql, /^\s*SELECT\b/i);
  assert.match(calls[1].sql, /FROM knowledge\.murid\b/);
  assert.deepEqual(calls[1].params, [DATA_PAGE_SIZE + 1, 0]);
  await store.listData('layanan', 0);
  assert.match(calls[2].sql, /^\s*SELECT\b/i);
  assert.match(calls[2].sql, /FROM knowledge\.layanan_infrastruktur\b/);
  assert.deepEqual(calls[2].params, [DATA_PAGE_SIZE + 1, 0]);
  const original = { nama_catering: 'Dapur Lama', alamat: 'Alamat Lama', contact_person: 'Nina' };
  const values = { nama_catering: 'Dapur Baru', alamat: 'Alamat Baru', contact_person: 'Nina' };
  const updateCalls = [];
  const updating = createPostgresDataStore({ host: 'test' }, async (config, sql, params) => {
    updateCalls.push({ sql, params });
    return [values];
  });
  assert.deepEqual(await updating.updateData('katering', original, values), values);
  assert.match(updateCalls[0].sql, /UPDATE knowledge\.katering_sekolah\b/);
  assert.match(updateCalls[0].sql, /\(SELECT count\(\*\) FROM matching\) = 1/);
  assert.deepEqual(updateCalls[0].params, ['Dapur Baru', 'Alamat Baru', 'Nina', 'Dapur Lama', 'Alamat Lama', 'Nina']);
  assert.ok(!updateCalls[0].sql.includes('Dapur Lama'));
  const service = { nama_layanan: 'Layanan Uji', fungsi: 'Fungsi', akses_laptop: 'Lokal', akses_tailscale: 'Privat', auto_start: 'Ya', catatan: '' };
  const serviceUpdate = { ...service, catatan: 'Keterangan' };
  const serviceCalls = [];
  const serviceStore = createPostgresDataStore({ host: 'test' }, async (config, sql, params) => {
    serviceCalls.push({ sql, params });
    return [serviceUpdate];
  });
  assert.deepEqual(await serviceStore.updateData('layanan', service, serviceUpdate), serviceUpdate);
  assert.match(serviceCalls[0].sql, /UPDATE knowledge\.layanan_infrastruktur\b/);
  assert.deepEqual(serviceCalls[0].params, ['Layanan Uji', 'Fungsi', 'Lokal', 'Privat', 'Ya', 'Keterangan', 'Layanan Uji', 'Fungsi', 'Lokal', 'Privat', 'Ya', '']);
  await assert.rejects(store.listData('n8n_chat_histories', 0), RangeError);
  await assert.rejects(store.listData('katering', -1), RangeError);
  assert.equal(calls.length, 3);
});

test('chat rejects other origins, invalid sessions, invalid JSON, and oversized bodies without forwarding', async (t) => {
  let calls = 0;
  const webhookUrl = await listen(createServer((req, res) => { calls++; res.end('{}'); }), t);
  const origin = await listen(createChatServer({ webhookUrl, authorization: 'Basic test' }), t);
  const valid = { message: 'Halo', sessionId: 'b'.repeat(32) };
  for (const [requestOrigin, body, expected] of [
    ['https://untrusted.example', JSON.stringify(valid), 403],
    [origin, JSON.stringify({ ...valid, sessionId: 'shared-session' }), 400],
    [origin, JSON.stringify({ ...valid, message: '  ' }), 400],
    [origin, '{', 400],
    [origin, JSON.stringify({ ...valid, message: 'x'.repeat(8001) }), 400],
    [origin, JSON.stringify({ ...valid, message: 'x'.repeat(33000) }), 413],
  ]) {
    const result = await fetch(`${origin}/api/chat`, {
      method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' }, body,
    });
    assert.equal(result.status, expected);
  }
  assert.equal(calls, 0);
});

test('chat reports failed and empty n8n replies instead of pretending a message succeeded', async (t) => {
  for (const [status, body] of [[500, '{"error":"private detail"}'], [200, '{}'], [200, 'not json']]) {
    const webhookUrl = await listen(createServer((req, res) => { res.writeHead(status); res.end(body); }), t);
    const origin = await listen(createChatServer({ webhookUrl, authorization: 'Basic secret' }), t);
    const response = await fetch(`${origin}/api/chat`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Halo', sessionId: 'c'.repeat(32) }),
    });
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.ok(result.error);
    assert.ok(!JSON.stringify(result).includes('private detail'));
  }
});

test('sessions API lists sessions, loads session messages, validates session IDs, and handles missing store', async (t) => {
  const unconfigured = await listen(createChatServer({ webhookUrl: 'http://127.0.0.1:1', authorization: 'Basic x' }), t);
  assert.equal((await fetch(`${unconfigured}/api/sessions`)).status, 503);
  assert.equal((await fetch(`${unconfigured}/api/sessions/${'a'.repeat(32)}`)).status, 503);

  const sessionStore = {
    async listSessions() {
      return [{ id: 'd'.repeat(32), title: 'Halo n8n', preview: 'Ada yang bisa dibantu?', messageCount: 2 }];
    },
    async getSessionMessages(id) {
      return id === 'd'.repeat(32)
        ? [{ role: 'user', text: 'Halo n8n' }, { role: 'assistant', text: 'Ada yang bisa dibantu?' }]
        : [];
    },
  };
  const origin = await listen(createChatServer({ webhookUrl: 'http://127.0.0.1:1', authorization: 'Basic x', sessionStore }), t);

  const listRes = await fetch(`${origin}/api/sessions`);
  assert.equal(listRes.status, 200);
  assert.deepEqual(await listRes.json(), {
    sessions: [{ id: 'd'.repeat(32), title: 'Halo n8n', preview: 'Ada yang bisa dibantu?', messageCount: 2 }],
  });

  const msgRes = await fetch(`${origin}/api/sessions/${'d'.repeat(32)}`);
  assert.equal(msgRes.status, 200);
  assert.deepEqual(await msgRes.json(), {
    id: 'd'.repeat(32),
    messages: [{ role: 'user', text: 'Halo n8n' }, { role: 'assistant', text: 'Ada yang bisa dibantu?' }],
  });

  assert.equal((await fetch(`${origin}/api/sessions/not-a-valid-id`)).status, 400);
  assert.equal((await fetch(`${origin}/api/sessions`, { method: 'POST' })).status, 405);
});

test('queryPostgres handles wire framing, parameters, and row decoding over TCP', async (t) => {
  function pgMsg(type, payload) {
    const buf = Buffer.allocUnsafe(5 + payload.length);
    buf.writeUInt8(type.charCodeAt(0), 0);
    buf.writeInt32BE(4 + payload.length, 1);
    payload.copy(buf, 5);
    return buf;
  }

  let receivedSql = '';
  const server = createTcpServer((socket) => {
    let stage = 'startup';
    let buf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (stage === 'startup' && buf.length >= 4) {
        const len = buf.readInt32BE(0);
        if (buf.length < len) return;
        buf = buf.subarray(len);
        stage = 'query';
        const authOk = Buffer.alloc(4);
        authOk.writeInt32BE(0, 0);
        socket.write(Buffer.concat([pgMsg('R', authOk), pgMsg('Z', Buffer.from('I'))]));
      }
      if (stage === 'query') {
        while (buf.length >= 5) {
          const type = String.fromCharCode(buf.readUInt8(0));
          const len = buf.readInt32BE(1);
          if (buf.length < 1 + len) break;
          const payload = buf.subarray(5, 1 + len);
          buf = buf.subarray(1 + len);
          if (type === 'P') {
            const start = payload.indexOf(0) + 1;
            const end = payload.indexOf(0, start);
            receivedSql = payload.subarray(start, end).toString('utf8');
          } else if (type === 'S') {
            const colName = Buffer.from('greeting\0');
            const rowDesc = Buffer.alloc(2 + colName.length + 18);
            rowDesc.writeInt16BE(1, 0);
            colName.copy(rowDesc, 2);

            const val = Buffer.from('Halo');
            const dataRow = Buffer.alloc(2 + 4 + val.length);
            dataRow.writeInt16BE(1, 0);
            dataRow.writeInt32BE(val.length, 2);
            val.copy(dataRow, 6);

            socket.write(Buffer.concat([
              pgMsg('T', rowDesc),
              pgMsg('D', dataRow),
              pgMsg('Z', Buffer.from('I')),
            ]));
          } else if (type === 'X') {
            socket.end();
          }
        }
      }
    });
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const rows = await queryPostgres(
    { host: '127.0.0.1', port: server.address().port, user: 'admin', database: 'main_db' },
    'SELECT $1 AS greeting',
    ['Halo'],
  );
  assert.equal(receivedSql, 'SELECT $1 AS greeting');
  assert.deepEqual(rows, [{ greeting: 'Halo' }]);
});
