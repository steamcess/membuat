const dataOptions = [...document.querySelectorAll('.data-option')];
const results = document.querySelector('#data-results');
const title = document.querySelector('#data-title');
const description = document.querySelector('#data-description');
const status = document.querySelector('#data-status');
const retry = document.querySelector('#data-retry');
const add = document.querySelector('#data-add');
const tableWrap = document.querySelector('#data-table-wrap');
const tableHead = document.querySelector('#data-table-head');
const tableBody = document.querySelector('#data-table-body');
const pagination = document.querySelector('#data-pagination');
const previous = document.querySelector('#data-previous');
const next = document.querySelector('#data-next');
const pageLabel = document.querySelector('#data-page-label');
const editor = document.querySelector('#data-editor');
const editForm = document.querySelector('#edit-form');
const editTitle = document.querySelector('#edit-title');
const editFields = document.querySelector('#edit-fields');
const editFeedback = document.querySelector('#edit-feedback');
const editError = document.querySelector('#edit-error');
const editRefresh = document.querySelector('#edit-refresh');
const editCancel = document.querySelector('#edit-cancel');
const editSave = document.querySelector('#edit-save');

const descriptions = {
  katering: { title: 'Penyedia katering', description: 'Nama, alamat, dan kontak penyedia katering.', entry: 'katering' },
  murid: { title: 'Murid', description: 'Kode, nama, kelas, dan informasi murid.', entry: 'murid' },
  layanan: { title: 'Layanan', description: 'Fungsi, akses, dan auto-start layanan.', entry: 'layanan' },
  pengetahuan: { title: 'Pengetahuan', description: 'Topik dan catatan yang bisa dicari AI dari chat.', entry: 'topik' },
};
const requestedDataset = new URLSearchParams(location.search).get('jenis');
let dataset = Object.hasOwn(descriptions, requestedDataset) ? requestedDataset : 'katering';
let offset = 0;
let pageSize = 50;
let hasMore = false;
let activeRequest = null;
let editing = null;
let saving = false;

function updateSelection() {
  for (const button of dataOptions) {
    button.setAttribute('aria-pressed', String(button.dataset.dataset === dataset));
  }
  title.textContent = descriptions[dataset].title;
  description.textContent = descriptions[dataset].description;
  add.textContent = `Tambah ${descriptions[dataset].entry}`;
}

function openEditor(name, columns, row = null) {
  if (editor.open || saving) return;
  const original = Object.fromEntries(columns.map(({ key }) => [key, row?.[key] ?? null]));
  const inputs = new Map();
  const fields = document.createDocumentFragment();
  for (const column of columns) {
    const field = document.createElement('div');
    field.className = 'edit-field';
    const label = document.createElement('label');
    label.htmlFor = `edit-field-${column.key}`;
    label.textContent = column.label;
    const input = document.createElement('textarea');
    input.id = label.htmlFor;
    input.name = column.key;
    input.rows = column.rows ?? (['alamat', 'catatan'].includes(column.key) ? 2 : 1);
    input.required = Boolean(column.required || (!row && column.requiredOnCreate));
    if (column.maxLength) input.maxLength = column.maxLength;
    input.value = original[column.key] ?? '';
    inputs.set(column.key, { input, initial: input.value });
    field.append(label, input);
    fields.append(field);
  }
  editing = { name, columns, original, inputs, row };
  editTitle.textContent = `${row ? 'Ubah' : 'Tambah'} ${descriptions[name].entry}`;
  editFields.replaceChildren(fields);
  editFeedback.hidden = true;
  editRefresh.hidden = true;
  editError.textContent = '';
  editor.showModal();
}

function renderTable(name, columns, rows) {
  const header = document.createElement('tr');
  for (const column of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = column.label;
    header.append(th);
  }
  tableHead.replaceChildren(header);

  const body = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const [index, column] of columns.entries()) {
      const td = document.createElement('td');
      td.dataset.label = column.label;
      const value = row[column.key];
      const display = document.createElement(index === 0 ? 'button' : 'span');
      display.className = 'data-cell-value';
      if (index === 0) {
        display.type = 'button';
        display.classList.add('data-row-edit');
        display.setAttribute('aria-label', `Ubah ${value ? String(value).slice(0, 80) : 'data'}`);
        display.addEventListener('click', (event) => { event.stopPropagation(); openEditor(name, columns, row); });
      }
      if (value === null || value === undefined || value === '') {
        display.classList.add('data-empty-value');
        display.textContent = '—';
      } else {
        display.textContent = String(value);
      }
      td.append(display);
      tr.append(td);
    }
    tr.addEventListener('click', () => openEditor(name, columns, row));
    body.append(tr);
  }
  tableBody.replaceChildren(body);
}

async function loadData(notice = '') {
  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  const requestedName = dataset;
  const requestedOffset = offset;
  updateSelection();
  add.disabled = true;
  add.onclick = null;
  results.setAttribute('aria-busy', 'true');
  status.dataset.state = 'loading';
  status.textContent = 'Memuat data…';
  retry.hidden = true;
  tableWrap.hidden = true;
  pagination.hidden = true;

  try {
    const response = await fetch(`/api/data/${requestedName}?offset=${requestedOffset}`, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Tidak bisa memuat data.');
    if (activeRequest !== controller) return;
    if (!Array.isArray(data.columns) || !Array.isArray(data.rows) || !Number.isSafeInteger(data.pageSize) || data.pageSize < 1) {
      throw new Error('Data yang diterima tidak valid.');
    }

    pageSize = data.pageSize;
    hasMore = data.hasMore === true;
    renderTable(requestedName, data.columns, data.rows);
    add.onclick = () => openEditor(requestedName, data.columns);
    add.disabled = false;
    tableWrap.hidden = data.rows.length === 0;
    status.dataset.state = 'ready';
    const summary = data.rows.length
      ? `Menampilkan data ${requestedOffset + 1}–${requestedOffset + data.rows.length}.`
      : 'Tidak ada data untuk ditampilkan.';
    status.textContent = notice ? `${notice} ${summary}` : summary;
    previous.disabled = requestedOffset === 0;
    next.disabled = !hasMore;
    pageLabel.textContent = `Halaman ${Math.floor(requestedOffset / pageSize) + 1}`;
    pagination.hidden = requestedOffset === 0 && !hasMore;
  } catch (error) {
    if (activeRequest !== controller || error.name === 'AbortError') return;
    status.dataset.state = 'error';
    const message = error instanceof TypeError ? 'Tidak bisa terhubung ke server.' : error.message;
    status.textContent = notice ? `${notice} ${message}` : message;
    retry.hidden = false;
  } finally {
    if (activeRequest === controller) results.setAttribute('aria-busy', 'false');
  }
}

function setSaving(value) {
  saving = value;
  editSave.disabled = editCancel.disabled = editRefresh.disabled = value;
  for (const input of editFields.querySelectorAll('textarea')) input.disabled = value;
  editSave.textContent = value ? 'Menyimpan…' : 'Simpan';
}

function closeEditor() {
  if (!saving) editor.close();
}

editCancel.addEventListener('click', closeEditor);
editor.addEventListener('cancel', (event) => { if (saving) event.preventDefault(); });
editor.addEventListener('close', () => { if (!editor.open) editing = null; });
editRefresh.addEventListener('click', () => {
  if (saving) return;
  editor.close();
  loadData();
});
editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!editing || saving) return;
  const state = editing;
  const values = Object.fromEntries(state.columns.map(({ key }) => {
    const { input, initial } = state.inputs.get(key);
    return [key, input.value === initial ? state.original[key] : input.value];
  }));
  if (state.row && state.columns.every(({ key }) => values[key] === state.original[key])) {
    editor.close();
    status.textContent = 'Tidak ada perubahan.';
    return;
  }

  editFeedback.hidden = true;
  editRefresh.hidden = true;
  setSaving(true);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let saved = false;
  try {
    const response = await fetch(`/api/data/${state.name}`, {
      method: state.row ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.row ? { id: state.row.id, original: state.original, values } : { values }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Tidak bisa menyimpan data.');
      error.code = data.code;
      error.status = response.status;
      throw error;
    }
    saved = true;
    editor.close();
  } catch (error) {
    const uncertain = error.name === 'AbortError' || error instanceof TypeError || error instanceof SyntaxError || error.status >= 500;
    editError.textContent = uncertain
      ? 'Hasil penyimpanan belum dapat dipastikan. Muat ulang data sebelum mencoba lagi.'
      : error.message;
    editRefresh.hidden = !(uncertain || error.code === 'stale');
    editFeedback.hidden = false;
  } finally {
    clearTimeout(timer);
    setSaving(false);
  }
  if (saved) {
    if (!state.row) offset = 0;
    loadData('Data berhasil disimpan.');
  }
});

for (const button of dataOptions) {
  button.addEventListener('click', () => {
    const name = button.dataset.dataset;
    if (name === dataset || !Object.hasOwn(descriptions, name)) return;
    dataset = name;
    offset = 0;
    const url = new URL(location.href);
    url.searchParams.set('jenis', dataset);
    history.replaceState(null, '', url);
    loadData();
  });
}
previous.addEventListener('click', () => { offset = Math.max(0, offset - pageSize); loadData(); });
next.addEventListener('click', () => { if (hasMore) { offset += pageSize; loadData(); } });
retry.addEventListener('click', () => loadData());

loadData();
