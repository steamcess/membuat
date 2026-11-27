import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createChatServer } from './server.mjs';

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
  for (const path of ['/.env', '/server.mjs', '/README.md']) {
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
