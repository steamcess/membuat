const storageKey = 'chatn8n.session.v1';
const appShell = document.querySelector('#app-shell');
const drawer = document.querySelector('#sessions-drawer');
const backdrop = document.querySelector('#drawer-backdrop');
const toggleSessions = document.querySelector('#toggle-sessions');
const closeSessions = document.querySelector('#close-sessions');
const refreshSessions = document.querySelector('#refresh-sessions');
const sessionList = document.querySelector('#session-list');
const sessionsStatus = document.querySelector('#sessions-status');
const sessionCount = document.querySelector('#session-count');
const messages = document.querySelector('#messages');
const welcomeTemplate = document.querySelector('#welcome-template');
const input = document.querySelector('#message');
const form = document.querySelector('#chat-form');
const send = document.querySelector('#send');
const newChat = document.querySelector('#new-chat');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
const sessionPattern = /^[a-f0-9]{32}$/;
const desktopQuery = matchMedia('(min-width: 900px)');

let busy = false;
let sessions = [];

function createSession() {
  // getRandomValues also works on the HTTP address used inside Tailscale.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return { id: Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''), messages: [] };
}

function sanitizeMessages(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => ['user', 'assistant'].includes(item?.role) && typeof item.text === 'string' && item.text.trim()).slice(-100);
}

function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (sessionPattern.test(saved?.id) && Array.isArray(saved.messages)) {
      return { id: saved.id, messages: sanitizeMessages(saved.messages) };
    }
  } catch { /* Private browsing or unavailable local storage: keep the session in memory. */ }
  return createSession();
}

let session = loadSession();

function saveSession() {
  try { localStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* Chat still works without local storage. */ }
}

function setBusy(nextBusy, statusMessage = '') {
  busy = nextBusy;
  send.disabled = input.disabled = newChat.disabled = refreshSessions.disabled = nextBusy;
  status.textContent = statusMessage;
  for (const btn of sessionList.querySelectorAll('.session-item')) {
    btn.disabled = nextBusy;
  }
}

function openDrawer() {
  if (desktopQuery.matches) {
    appShell.classList.remove('sidebar-collapsed');
    toggleSessions.setAttribute('aria-expanded', 'true');
    return;
  }
  drawer.classList.add('open');
  backdrop.hidden = false;
  toggleSessions.setAttribute('aria-expanded', 'true');
  closeSessions.focus();
}

function closeDrawer() {
  if (desktopQuery.matches) {
    appShell.classList.add('sidebar-collapsed');
    toggleSessions.setAttribute('aria-expanded', 'false');
    return;
  }
  drawer.classList.remove('open');
  backdrop.hidden = true;
  toggleSessions.setAttribute('aria-expanded', 'false');
}

function syncToggleAria() {
  if (desktopQuery.matches) {
    drawer.classList.remove('open');
    backdrop.hidden = true;
    toggleSessions.setAttribute('aria-expanded', String(!appShell.classList.contains('sidebar-collapsed')));
  } else {
    toggleSessions.setAttribute('aria-expanded', String(drawer.classList.contains('open')));
  }
}

function updateWelcomeSessionsButton() {
  const btn = document.querySelector('#welcome-sessions');
  if (btn) btn.hidden = sessions.length === 0;
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function createCopyIcon(copied) {
  const svg = createSvgElement('svg', { 'aria-hidden': 'true', viewBox: '0 0 20 20', fill: 'none' });
  const stroke = { stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

  if (copied) {
    svg.append(createSvgElement('path', { ...stroke, d: 'm4.5 10.5 3.7 3.5L15.5 6.5' }));
    return svg;
  }

  svg.append(
    createSvgElement('rect', { x: '7', y: '7', width: '9.5', height: '9.5', rx: '1.8', stroke: 'currentColor', 'stroke-width': '1.6' }),
    createSvgElement('path', { ...stroke, d: 'M5 13H4.8A1.8 1.8 0 0 1 3 11.2v-6.4A1.8 1.8 0 0 1 4.8 3h6.4A1.8 1.8 0 0 1 13 4.8V5' }),
  );
  return svg;
}

function createModeIcon(mode) {
  const svg = createSvgElement('svg', { 'aria-hidden': 'true', viewBox: '0 0 20 20', fill: 'none' });
  const stroke = { stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

  if (mode === 'markdown') {
    svg.append(
      createSvgElement('rect', { x: '2', y: '4', width: '16', height: '12', rx: '2.2', stroke: 'currentColor', 'stroke-width': '1.4' }),
      createSvgElement('path', { ...stroke, d: 'M4.8 12.6V7.4L7.2 10.3l2.4-2.9v5.2M13.6 7.4v5.2m0 0-1.7-1.7m1.7 1.7 1.7-1.7' }),
    );
    return svg;
  }

  svg.append(
    createSvgElement('path', { ...stroke, d: 'M2.5 10s2.8-4.7 7.5-4.7 7.5 4.7 7.5 4.7-2.8 4.7-7.5 4.7S2.5 10 2.5 10Z' }),
    createSvgElement('circle', { cx: '10', cy: '10', r: '2.2', stroke: 'currentColor', 'stroke-width': '1.5' }),
  );
  return svg;
}

function appendInline(parent, text) {
  const pattern = /(`[^`\n]+`)|(\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<>"'`]+)|(\*\*\*([^\s*](?:[^*\n]*[^\s*])?)\*\*\*)|(\*\*([^\s*](?:[^*\n]*[^\s*])?)\*\*)|(\*([^\s*](?:[^*\n]*[^\s*])?)\*)|(~~([^\s~](?:[^~\n]*[^\s~])?)~~)|((^|[^\w])__([^\s_](?:[^_\n]*[^\s_])?)__(?=[^\w]|$))|((^|[^\w])_([^\s_](?:[^_\n]*[^\s_])?)_(?=[^\w]|$))|(\n)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    if (match.index > lastIndex) {
      parent.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    if (match[1]) {
      const code = document.createElement('code');
      code.textContent = match[1].slice(1, -1);
      parent.append(code);
    } else if (match[2]) {
      const link = document.createElement('a');
      link.href = match[4];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      appendInline(link, match[3]);
      parent.append(link);
    } else if (match[5]) {
      let url = match[5];
      let trailing = '';
      while (/[.,;:!?)]$/.test(url)) {
        if (url.endsWith(')')) {
          const opens = (url.match(/\(/g) || []).length;
          const closes = (url.match(/\)/g) || []).length;
          if (closes <= opens) break;
        }
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = url;
      parent.append(link);
      if (trailing) parent.append(document.createTextNode(trailing));
    } else if (match[6]) {
      const strong = document.createElement('strong');
      const em = document.createElement('em');
      appendInline(em, match[7]);
      strong.append(em);
      parent.append(strong);
    } else if (match[8]) {
      const strong = document.createElement('strong');
      appendInline(strong, match[9]);
      parent.append(strong);
    } else if (match[10]) {
      const em = document.createElement('em');
      appendInline(em, match[11]);
      parent.append(em);
    } else if (match[12]) {
      const del = document.createElement('del');
      appendInline(del, match[13]);
      parent.append(del);
    } else if (match[14]) {
      if (match[15]) parent.append(document.createTextNode(match[15]));
      const strong = document.createElement('strong');
      appendInline(strong, match[16]);
      parent.append(strong);
    } else if (match[17]) {
      if (match[18]) parent.append(document.createTextNode(match[18]));
      const em = document.createElement('em');
      appendInline(em, match[19]);
      parent.append(em);
    } else if (match[20]) {
      parent.append(document.createElement('br'));
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parent.append(document.createTextNode(text.slice(lastIndex)));
  }
}

const mdFenceRe = /^```([\w-]*)\s*$/;
const mdHrRe = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const mdHeadingRe = /^(#{1,6})\s+(.+?)\s*#*$/;
const mdQuoteRe = /^>\s?(.*)$/;
const mdListRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const mdTableSepRe = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*(?:\s*:?-{3,}:?\s*\|?)?\s*$/;

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

function isBlockStart(lines, index) {
  const line = lines[index];
  if (mdFenceRe.test(line) || mdHrRe.test(line) || mdHeadingRe.test(line) || mdQuoteRe.test(line) || mdListRe.test(line)) {
    return true;
  }
  return line.includes('|') && index + 1 < lines.length && mdTableSepRe.test(lines[index + 1]);
}

function parseListBlock(lines, start, baseIndent) {
  const firstMatch = lines[start].match(mdListRe);
  const ordered = /^\d/.test(firstMatch[2]);
  const listEl = document.createElement(ordered ? 'ol' : 'ul');
  if (ordered) {
    const startNum = Number.parseInt(firstMatch[2], 10);
    if (startNum !== 1) listEl.start = startNum;
  }

  let i = start;
  let lastLi = null;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      let next = i + 1;
      while (next < lines.length && !lines[next].trim()) next++;
      if (next < lines.length && mdListRe.test(lines[next])) {
        const nextIndent = lines[next].match(mdListRe)[1].length;
        if (nextIndent >= baseIndent) {
          i = next;
          continue;
        }
      }
      break;
    }

    const match = line.match(mdListRe);
    if (!match) {
      const indent = line.match(/^(\s*)/)[1].length;
      if (lastLi && indent > baseIndent && !isBlockStart(lines, i)) {
        lastLi.append(document.createTextNode(' '), );
        appendInline(lastLi, line.trim());
        i++;
        continue;
      }
      break;
    }

    const indent = match[1].length;
    if (indent < baseIndent) break;

    if (indent > baseIndent) {
      if (!lastLi) break;
      const nested = parseListBlock(lines, i, indent);
      lastLi.append(nested.element);
      i = nested.nextIndex;
      continue;
    }

    const itemOrdered = /^\d/.test(match[2]);
    if (itemOrdered !== ordered) break;

    const li = document.createElement('li');
    appendInline(li, match[3]);
    listEl.append(li);
    lastLi = li;
    i++;
  }

  return { element: listEl, nextIndex: i };
}

function renderMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const fenceMatch = line.match(mdFenceRe);
    if (fenceMatch) {
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = codeLines.join('\n');
      pre.append(code);
      fragment.append(pre);
      continue;
    }

    if (mdHrRe.test(line)) {
      fragment.append(document.createElement('hr'));
      i++;
      continue;
    }

    const headingMatch = line.match(mdHeadingRe);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const heading = document.createElement(`h${level}`);
      appendInline(heading, headingMatch[2]);
      fragment.append(heading);
      i++;
      continue;
    }

    if (mdQuoteRe.test(line)) {
      const quoteLines = [];
      while (i < lines.length) {
        const qm = lines[i].match(mdQuoteRe);
        if (!qm) break;
        quoteLines.push(qm[1]);
        i++;
      }
      const blockquote = document.createElement('blockquote');
      blockquote.append(renderMarkdown(quoteLines.join('\n')));
      fragment.append(blockquote);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && mdTableSepRe.test(lines[i + 1])) {
      const headers = splitTableRow(line);
      i += 2;
      const wrap = document.createElement('div');
      wrap.className = 'md-table-wrap';
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      for (const cell of headers) {
        const th = document.createElement('th');
        appendInline(th, cell);
        headRow.append(th);
      }
      thead.append(headRow);
      table.append(thead);

      const tbody = document.createElement('tbody');
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        const cells = splitTableRow(lines[i]);
        const tr = document.createElement('tr');
        for (let c = 0; c < headers.length; c++) {
          const td = document.createElement('td');
          appendInline(td, cells[c] ?? '');
          tr.append(td);
        }
        tbody.append(tr);
        i++;
      }
      table.append(tbody);
      wrap.append(table);
      fragment.append(wrap);
      continue;
    }

    const listMatch = line.match(mdListRe);
    if (listMatch) {
      const parsed = parseListBlock(lines, i, listMatch[1].length);
      fragment.append(parsed.element);
      i = parsed.nextIndex;
      continue;
    }

    const paraLines = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) {
      paraLines.push(lines[i]);
      i++;
    }
    const p = document.createElement('p');
    appendInline(p, paraLines.join('\n'));
    fragment.append(p);
  }

  return fragment;
}

async function copyText(text) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* Fall back to execCommand on HTTP or restricted contexts. */ }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;font-size:16px;';
  document.body.append(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    textarea.remove();
  }
  return ok;
}

function createCopyButton(getText) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-btn';
  button.title = 'Salin pesan';
  button.setAttribute('aria-label', 'Salin pesan');
  button.append(createCopyIcon(false));

  let resetTimer;
  button.addEventListener('click', async () => {
    const copied = await copyText(getText());
    if (!copied) return;
    clearTimeout(resetTimer);
    button.classList.add('copied');
    button.title = 'Tersalin';
    button.setAttribute('aria-label', 'Tersalin');
    button.replaceChildren(createCopyIcon(true));
    resetTimer = setTimeout(() => {
      button.classList.remove('copied');
      button.title = 'Salin pesan';
      button.setAttribute('aria-label', 'Salin pesan');
      button.replaceChildren(createCopyIcon(false));
    }, 1600);
  });
  return button;
}

function createViewToggle(onChange) {
  const group = document.createElement('div');
  group.className = 'view-toggle';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Mode tampilan pesan');

  const mdBtn = document.createElement('button');
  mdBtn.type = 'button';
  mdBtn.className = 'view-btn';
  mdBtn.title = 'Tampilan Markdown';
  mdBtn.setAttribute('aria-label', 'Tampilan Markdown');
  mdBtn.setAttribute('aria-pressed', 'false');
  mdBtn.append(createModeIcon('markdown'));

  const previewBtn = document.createElement('button');
  previewBtn.type = 'button';
  previewBtn.className = 'view-btn active';
  previewBtn.title = 'Tampilan Preview';
  previewBtn.setAttribute('aria-label', 'Tampilan Preview');
  previewBtn.setAttribute('aria-pressed', 'true');
  previewBtn.append(createModeIcon('preview'));

  function setActive(mode) {
    const isMd = mode === 'markdown';
    mdBtn.classList.toggle('active', isMd);
    mdBtn.setAttribute('aria-pressed', String(isMd));
    previewBtn.classList.toggle('active', !isMd);
    previewBtn.setAttribute('aria-pressed', String(!isMd));
    onChange(mode);
  }

  mdBtn.addEventListener('click', () => setActive('markdown'));
  previewBtn.addEventListener('click', () => setActive('preview'));

  group.append(mdBtn, previewBtn);
  return group;
}

function addMessage(role, text) {
  document.querySelector('#welcome')?.remove();
  const article = document.createElement('article');
  article.className = `message ${role}`;

  const author = document.createElement('p');
  author.className = 'author';
  author.textContent = role === 'user' ? 'Anda' : 'Asisten';

  const body = document.createElement('div');
  body.className = 'text is-preview';
  body.append(renderMarkdown(text));

  let mode = 'preview';
  const toggle = createViewToggle((nextMode) => {
    if (nextMode === mode) return;
    mode = nextMode;
    if (mode === 'markdown') {
      body.classList.remove('is-preview');
      body.classList.add('is-markdown');
      body.textContent = text;
    } else {
      body.classList.remove('is-markdown');
      body.classList.add('is-preview');
      body.replaceChildren(renderMarkdown(text));
    }
  });

  const head = document.createElement('div');
  head.className = 'message-head';
  const spacer = document.createElement('span');
  spacer.className = 'head-spacer';
  spacer.setAttribute('aria-hidden', 'true');
  if (role === 'user') head.append(spacer, toggle, author);
  else head.append(author, toggle, spacer);

  const actions = document.createElement('div');
  actions.className = 'message-actions';
  actions.append(createCopyButton(() => (mode === 'markdown' ? text : (body.innerText || text))));

  article.append(head, body, actions);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}

function renderMessages(list) {
  messages.replaceChildren();
  if (!list.length) {
    messages.append(welcomeTemplate.content.cloneNode(true));
    const welcomeBtn = document.querySelector('#welcome-sessions');
    if (welcomeBtn) {
      welcomeBtn.hidden = sessions.length === 0;
      welcomeBtn.addEventListener('click', openDrawer);
    }
    return;
  }
  list.forEach((item) => addMessage(item.role, item.text));
}

function createSessionButton({ id, title, meta, active }) {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'session-item';
  btn.disabled = busy;
  if (active) btn.setAttribute('aria-current', 'true');

  const titleEl = document.createElement('span');
  titleEl.className = 'session-title';
  titleEl.textContent = title;

  const metaEl = document.createElement('span');
  metaEl.className = 'session-meta';
  const left = document.createElement('span');
  left.textContent = meta;
  const right = document.createElement('span');
  right.textContent = `#${id.slice(0, 6)}`;
  metaEl.append(left, right);

  btn.append(titleEl, metaEl);
  btn.addEventListener('click', () => selectSession(id));
  li.append(btn);
  return li;
}

function renderSessionList() {
  sessionList.replaceChildren();
  if (sessions.length > 0) {
    sessionCount.textContent = String(sessions.length);
    sessionCount.hidden = false;
  } else {
    sessionCount.hidden = true;
  }

  const currentInList = sessions.some((item) => item.id === session.id);
  if (!currentInList) {
    const firstUser = session.messages.find((m) => m.role === 'user')?.text;
    sessionList.append(createSessionButton({
      id: session.id,
      title: firstUser || 'Sesi baru',
      meta: session.messages.length ? `${session.messages.length} pesan` : 'Belum ada pesan',
      active: true,
    }));
  }

  if (!sessions.length && !currentInList) {
    const empty = document.createElement('li');
    empty.className = 'session-empty';
    empty.textContent = 'Belum ada sesi tersimpan.';
    sessionList.append(empty);
    return;
  }

  for (const item of sessions) {
    sessionList.append(createSessionButton({
      id: item.id,
      title: item.title || 'Percakapan',
      meta: `${item.messageCount} pesan`,
      active: item.id === session.id,
    }));
  }
}

async function loadSessions({ silent = false } = {}) {
  if (!silent) sessionsStatus.textContent = 'Memuat daftar sesi…';
  try {
    const response = await fetch('/api/sessions');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal memuat daftar sesi.');
    sessions = Array.isArray(data.sessions) ? data.sessions : [];
    sessionsStatus.textContent = sessions.length ? '' : 'Belum ada riwayat sesi di server.';
    renderSessionList();
    updateWelcomeSessionsButton();
  } catch (cause) {
    sessionsStatus.textContent = cause instanceof TypeError
      ? 'Tidak bisa terhubung untuk memuat daftar sesi.'
      : cause.message;
  }
}

async function selectSession(targetId) {
  if (busy) return;
  if (targetId === session.id) {
    if (!desktopQuery.matches) closeDrawer();
    return;
  }

  const inServerList = sessions.some((item) => item.id === targetId);
  if (!inServerList) {
    if (!desktopQuery.matches) closeDrawer();
    return;
  }

  setBusy(true, 'Memuat riwayat sesi…');
  error.hidden = true;
  try {
    const response = await fetch(`/api/sessions/${targetId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal memuat riwayat sesi.');
    session = { id: targetId, messages: sanitizeMessages(data.messages) };
    saveSession();
    renderMessages(session.messages);
    renderSessionList();
    if (!desktopQuery.matches) closeDrawer();
  } catch (cause) {
    error.textContent = cause instanceof TypeError
      ? 'Tidak terhubung. Pastikan Tailscale aktif dan server menyala.'
      : cause.message;
    error.hidden = false;
  } finally {
    setBusy(false, '');
    if (matchMedia('(pointer: fine)').matches) input.focus();
  }
}

async function syncCurrentSession() {
  const startId = session.id;
  try {
    const response = await fetch(`/api/sessions/${startId}`);
    if (!response.ok) return;
    const data = await response.json();
    if (busy || session.id !== startId) return;
    const serverMessages = sanitizeMessages(data.messages);
    if (serverMessages.length > 0) {
      session.messages = serverMessages;
      saveSession();
      renderMessages(session.messages);
      renderSessionList();
    }
  } catch { /* Non-fatal: keep cached session if server sync fails. */ }
}

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

renderMessages(session.messages);
renderSessionList();
saveSession();
syncToggleAria();
loadSessions();
syncCurrentSession();

desktopQuery.addEventListener('change', syncToggleAria);

toggleSessions.addEventListener('click', () => {
  if (desktopQuery.matches) {
    if (appShell.classList.contains('sidebar-collapsed')) openDrawer();
    else closeDrawer();
    return;
  }
  if (drawer.classList.contains('open')) closeDrawer();
  else openDrawer();
});

closeSessions.addEventListener('click', closeDrawer);
backdrop.addEventListener('click', closeDrawer);
refreshSessions.addEventListener('click', () => { if (!busy) loadSessions(); });

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !desktopQuery.matches && drawer.classList.contains('open')) {
    closeDrawer();
    toggleSessions.focus();
  }
});

input.addEventListener('input', resizeInput);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(pointer: fine)').matches) {
    event.preventDefault();
    form.requestSubmit();
  }
});

newChat.addEventListener('click', () => {
  if (busy) return;
  if (session.messages.length === 0) {
    if (!desktopQuery.matches) closeDrawer();
    if (matchMedia('(pointer: fine)').matches) input.focus();
    return;
  }
  session = createSession();
  saveSession();
  error.hidden = true;
  renderMessages([]);
  renderSessionList();
  if (!desktopQuery.matches) closeDrawer();
  if (matchMedia('(pointer: fine)').matches) input.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;
  setBusy(true, 'Sedang menulis…');
  error.hidden = true;
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
    renderSessionList();
    loadSessions({ silent: true });
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
    setBusy(false, '');
    if (matchMedia('(pointer: fine)').matches) input.focus();
  }
});
