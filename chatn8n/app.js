const storageKey = 'chatn8n.session.v1';
const messages = document.querySelector('#messages');
const input = document.querySelector('#message');
const form = document.querySelector('#chat-form');
const send = document.querySelector('#send');
const newChat = document.querySelector('#new-chat');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
const sessionPattern = /^[a-f0-9]{32}$/;
let busy = false;

function createSession() {
  // getRandomValues also works on the HTTP address used inside Tailscale.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return { id: Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''), messages: [] };
}

function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (sessionPattern.test(saved?.id) && Array.isArray(saved.messages)) {
      saved.messages = saved.messages.filter((item) =>
        ['user', 'assistant'].includes(item?.role) && typeof item.text === 'string'
      ).slice(-100);
      return saved;
    }
  } catch { /* Private browsing or unavailable local storage: keep the session in memory. */ }
  return createSession();
}

let session = loadSession();

function saveSession() {
  try { localStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* Chat still works without local storage. */ }
}

function addMessage(role, text) {
  document.querySelector('#welcome')?.remove();
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const author = document.createElement('p');
  author.className = 'author';
  author.textContent = role === 'user' ? 'Anda' : 'Asisten';
  const body = document.createElement('div');
  body.className = 'text';
  body.textContent = text;
  article.append(author, body);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

session.messages.forEach((item) => addMessage(item.role, item.text));
saveSession();

input.addEventListener('input', resizeInput);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(pointer: fine)').matches) {
    event.preventDefault();
    form.requestSubmit();
  }
});

newChat.addEventListener('click', () => {
  if (busy || (session.messages.length && !confirm('Mulai sesi baru? Riwayat lama tetap tersimpan di n8n, tetapi tidak dibaca di sesi baru.'))) return;
  session = createSession();
  saveSession();
  location.reload();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;
  busy = true;
  send.disabled = input.disabled = newChat.disabled = true;
  error.hidden = true;
  status.textContent = 'Sedang menulis…';
  const bubble = addMessage('user', text);
  input.value = '';
  resizeInput();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 95000);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: session.id }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Pesan belum berhasil dikirim. Coba lagi.');
    if (typeof data.output !== 'string' || !data.output.trim()) throw new Error('n8n tidak mengirim balasan. Periksa eksekusi workflow.');
    addMessage('assistant', data.output);
    session.messages.push({ role: 'user', text }, { role: 'assistant', text: data.output });
    session.messages = session.messages.slice(-100);
    saveSession();
  } catch (cause) {
    bubble.remove();
    input.value = text;
    resizeInput();
    error.textContent = cause.name === 'AbortError'
      ? 'Balasan terlalu lama. Periksa n8n sebelum mengirim ulang; pesan mungkin sudah diproses.'
      : cause instanceof TypeError ? 'Tidak terhubung. Pastikan Tailscale aktif dan server menyala.' : cause.message;
    error.hidden = false;
  } finally {
    clearTimeout(timeout);
    busy = false;
    send.disabled = input.disabled = newChat.disabled = false;
    status.textContent = '';
    if (matchMedia('(pointer: fine)').matches) input.focus();
  }
});
