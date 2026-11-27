import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { once } from 'node:events';
import { createChatServer } from './server.mjs';
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
  for (const path of ['/.env', '/server.mjs', '/pg-client.mjs', '/README.md']) {
    assert.equal((await fetch(`${origin}${path}`)).status, 404);
  }
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
