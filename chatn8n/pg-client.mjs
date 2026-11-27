import net from 'node:net';
import crypto from 'node:crypto';

function encodeFrame(type, payload) {
  const frame = Buffer.allocUnsafe(5 + payload.length);
  frame.writeUInt8(type.charCodeAt(0), 0);
  frame.writeInt32BE(4 + payload.length, 1);
  payload.copy(frame, 5);
  return frame;
}

function encodeStartup(user, database) {
  const body = Buffer.from(`user\0${user}\0database\0${database}\0\0`, 'utf8');
  const frame = Buffer.allocUnsafe(8 + body.length);
  frame.writeInt32BE(8 + body.length, 0);
  frame.writeInt32BE(196608, 4);
  body.copy(frame, 8);
  return frame;
}

function encodeParse(sql) {
  const sqlBuf = Buffer.from(`\0${sql}\0`, 'utf8');
  const payload = Buffer.allocUnsafe(sqlBuf.length + 2);
  sqlBuf.copy(payload, 0);
  payload.writeInt16BE(0, sqlBuf.length);
  return encodeFrame('P', payload);
}

function encodeBind(params) {
  const parts = [Buffer.from([0, 0, 0, 0]), Buffer.allocUnsafe(2)];
  parts[1].writeInt16BE(params.length, 0);
  for (const param of params) {
    if (param === null || param === undefined) {
      const len = Buffer.allocUnsafe(4);
      len.writeInt32BE(-1, 0);
      parts.push(len);
    } else {
      const val = Buffer.from(String(param), 'utf8');
      const len = Buffer.allocUnsafe(4);
      len.writeInt32BE(val.length, 0);
      parts.push(len, val);
    }
  }
  parts.push(Buffer.from([0, 0]));
  return encodeFrame('B', Buffer.concat(parts));
}

function encodeDescribePortal() {
  return encodeFrame('D', Buffer.from('P\0', 'utf8'));
}

function encodeExecute() {
  return encodeFrame('E', Buffer.from([0, 0, 0, 0, 0]));
}

function encodeSync() {
  return encodeFrame('S', Buffer.alloc(0));
}

function encodeTerminate() {
  return encodeFrame('X', Buffer.alloc(0));
}

function parseError(payload) {
  let offset = 0;
  const fields = {};
  while (offset < payload.length) {
    const code = payload.readUInt8(offset++);
    if (code === 0) break;
    const end = payload.indexOf(0, offset);
    if (end === -1) break;
    fields[String.fromCharCode(code)] = payload.subarray(offset, end).toString('utf8');
    offset = end + 1;
  }
  const err = new Error(fields.M || 'PostgreSQL error');
  err.code = fields.C;
  return err;
}

function parseRowDescription(payload) {
  const count = payload.readInt16BE(0);
  let offset = 2;
  const columns = [];
  for (let i = 0; i < count; i++) {
    const end = payload.indexOf(0, offset);
    columns.push(payload.subarray(offset, end).toString('utf8'));
    offset = end + 1 + 18;
  }
  return columns;
}

function parseDataRow(payload, columns) {
  const count = payload.readInt16BE(0);
  let offset = 2;
  const row = {};
  for (let i = 0; i < count; i++) {
    const len = payload.readInt32BE(offset);
    offset += 4;
    if (len === -1) {
      row[columns[i]] = null;
    } else {
      row[columns[i]] = payload.subarray(offset, offset + len).toString('utf8');
      offset += len;
    }
  }
  return row;
}

function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest();
}

function xorBuffers(a, b) {
  const out = Buffer.allocUnsafe(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

function parseScramAttributes(str) {
  const attrs = {};
  for (const part of str.split(',')) {
    const idx = part.indexOf('=');
    if (idx > 0) attrs[part.slice(0, idx)] = part.slice(idx + 1);
  }
  return attrs;
}

/**
 * Runs a single parameterized query over TCP using the PostgreSQL v3 wire protocol.
 */
export function queryPostgres(config, sql, params = []) {
  const { host = '127.0.0.1', port = 5432, user, password = '', database, timeoutMs = 5000 } = config;
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: Number(port) });
    let buffer = Buffer.alloc(0);
    let columns = [];
    const rows = [];
    let querySent = false;
    let settled = false;
    let scram = null;

    const timer = setTimeout(() => {
      fail(new Error('PostgreSQL connection timeout'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.destroy();
    }

    function fail(err) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    }

    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.end(encodeTerminate()); } catch { socket.destroy(); }
      resolve(rows);
    }

    function sendQuery() {
      querySent = true;
      socket.write(Buffer.concat([
        encodeParse(sql),
        encodeBind(params),
        encodeDescribePortal(),
        encodeExecute(),
        encodeSync(),
      ]));
    }

    function handleAuth(payload) {
      const authType = payload.readInt32BE(0);
      if (authType === 0) return;
      if (authType === 3) {
        socket.write(encodeFrame('p', Buffer.from(`${password}\0`, 'utf8')));
        return;
      }
      if (authType === 5) {
        const salt = payload.subarray(4, 8);
        const inner = crypto.createHash('md5').update(`${password}${user}`).digest('hex');
        const outer = crypto.createHash('md5').update(Buffer.concat([Buffer.from(inner), salt])).digest('hex');
        socket.write(encodeFrame('p', Buffer.from(`md5${outer}\0`, 'utf8')));
        return;
      }
      if (authType === 10) {
        const mechs = payload.subarray(4).toString('utf8').split('\0').filter(Boolean);
        if (!mechs.includes('SCRAM-SHA-256')) {
          return fail(new Error(`Unsupported SASL mechanisms: ${mechs.join(', ')}`));
        }
        const clientNonce = crypto.randomBytes(18).toString('base64');
        const clientFirstBare = `n=,r=${clientNonce}`;
        const clientFirst = `n,,${clientFirstBare}`;
        scram = { clientNonce, clientFirstBare };
        const mechBuf = Buffer.from('SCRAM-SHA-256\0', 'utf8');
        const msgBuf = Buffer.from(clientFirst, 'utf8');
        const out = Buffer.allocUnsafe(mechBuf.length + 4 + msgBuf.length);
        mechBuf.copy(out, 0);
        out.writeInt32BE(msgBuf.length, mechBuf.length);
        msgBuf.copy(out, mechBuf.length + 4);
        socket.write(encodeFrame('p', out));
        return;
      }
      if (authType === 11) {
        const serverFirst = payload.subarray(4).toString('utf8');
        const attrs = parseScramAttributes(serverFirst);
        if (!attrs.r || !attrs.s || !attrs.i || !attrs.r.startsWith(scram.clientNonce)) {
          return fail(new Error('Invalid SCRAM server challenge'));
        }
        const iterations = Number(attrs.i);
        const saltedPassword = crypto.pbkdf2Sync(password, Buffer.from(attrs.s, 'base64'), iterations, 32, 'sha256');
        const clientKey = hmacSha256(saltedPassword, 'Client Key');
        const storedKey = sha256(clientKey);
        const clientFinalWithoutProof = `c=biws,r=${attrs.r}`;
        const authMessage = `${scram.clientFirstBare},${serverFirst},${clientFinalWithoutProof}`;
        const clientProof = xorBuffers(clientKey, hmacSha256(storedKey, authMessage));
        scram.expectedServerSig = hmacSha256(hmacSha256(saltedPassword, 'Server Key'), authMessage).toString('base64');
        const clientFinal = `${clientFinalWithoutProof},p=${clientProof.toString('base64')}`;
        socket.write(encodeFrame('p', Buffer.from(clientFinal, 'utf8')));
        return;
      }
      if (authType === 12) {
        const serverFinal = payload.subarray(4).toString('utf8');
        const attrs = parseScramAttributes(serverFinal);
        if (attrs.v !== scram?.expectedServerSig) {
          return fail(new Error('SCRAM server signature mismatch'));
        }
        return;
      }
      fail(new Error(`Unsupported PostgreSQL auth type: ${authType}`));
    }

    socket.on('connect', () => {
      socket.write(encodeStartup(user, database));
    });

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 5) {
        const type = String.fromCharCode(buffer.readUInt8(0));
        const len = buffer.readInt32BE(1);
        if (buffer.length < 1 + len) break;
        const payload = buffer.subarray(5, 1 + len);
        buffer = buffer.subarray(1 + len);

        if (type === 'R') handleAuth(payload);
        else if (type === 'E') return fail(parseError(payload));
        else if (type === 'T') columns = parseRowDescription(payload);
        else if (type === 'D') rows.push(parseDataRow(payload, columns));
        else if (type === 'Z') {
          if (!querySent) sendQuery();
          else return finish();
        }
      }
    });

    socket.on('error', fail);
    socket.on('close', () => {
      if (!settled) fail(new Error('PostgreSQL connection closed unexpectedly'));
    });
  });
}

const LIST_SESSIONS_SQL = `
  WITH normalized AS (
    SELECT
      id,
      substring(session_id from '^([a-f0-9]{32})') AS sid,
      message->>'type' AS msg_type,
      message->>'content' AS content
    FROM n8n_chat_histories
    WHERE session_id ~ '^[a-f0-9]{32}(__.*)?$'
      AND message->>'type' IN ('human', 'ai')
      AND jsonb_typeof(message->'content') = 'string'
      AND btrim(message->>'content') <> ''
  )
  SELECT
    sid AS id,
    MAX(id) AS last_id,
    COUNT(*)::int AS message_count,
    (ARRAY_AGG(content ORDER BY id ASC) FILTER (WHERE msg_type = 'human'))[1] AS first_user_message,
    (ARRAY_AGG(content ORDER BY id DESC))[1] AS last_message
  FROM normalized
  GROUP BY sid
  ORDER BY last_id DESC
  LIMIT 100
`;

const SESSION_MESSAGES_SQL = `
  SELECT
    message->>'type' AS msg_type,
    message->>'content' AS content
  FROM n8n_chat_histories
  WHERE (session_id = $1 OR session_id LIKE $2)
    AND message->>'type' IN ('human', 'ai')
    AND jsonb_typeof(message->'content') = 'string'
    AND btrim(message->>'content') <> ''
  ORDER BY id ASC
`;

/**
 * Creates a session store backed by n8n's n8n_chat_histories table in PostgreSQL.
 */
export function createPostgresSessionStore(config) {
  return {
    async listSessions() {
      try {
        const rows = await queryPostgres(config, LIST_SESSIONS_SQL);
        return rows.map((row) => ({
          id: row.id,
          title: (row.first_user_message || row.last_message || 'Percakapan').trim(),
          preview: (row.last_message || '').trim(),
          messageCount: Number(row.message_count) || 0,
        }));
      } catch (err) {
        if (err.code === '42P01') return [];
        throw err;
      }
    },
    async getSessionMessages(sessionId) {
      try {
        const rows = await queryPostgres(config, SESSION_MESSAGES_SQL, [sessionId, `${sessionId}__%`]);
        return rows.map((row) => ({
          role: row.msg_type === 'human' ? 'user' : 'assistant',
          text: row.content,
        }));
      } catch (err) {
        if (err.code === '42P01') return [];
        throw err;
      }
    },
  };
}
