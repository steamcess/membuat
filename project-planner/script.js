const STORAGE_KEY = "project-planner-state";
const OTHER = "Lainnya";

const questions = [
  {
    id: "idea",
    section: "Ide Utama",
    name: "Ide proyek",
    label: "Apa yang ingin kamu buat?",
    type: "choice",
    options: [
      "Pencatat aktivitas",
      "Pengelola tugas",
      "Katalog produk",
      "Dasbor data",
      "Pencatat keuangan",
      "Sistem reservasi",
      "Aplikasi belajar",
      "Pengelola inventaris",
      "Portal komunitas",
      "Portofolio karya",
    ],
  },
  {
    id: "appType",
    section: "Ide Utama",
    name: "Jenis aplikasi",
    label: "Aplikasi ini berbentuk apa?",
    type: "choice",
    options: [
      "Web app",
      "Website statis (landing page, profil, blog)",
      "Aplikasi mobile",
      "Aplikasi desktop",
      "API / backend saja",
      "Bot percakapan",
      "Ekstensi browser",
      "Otomatisasi pekerjaan",
      "Game sederhana",
    ],
  },
  {
    id: "problem",
    section: "Ide Utama",
    name: "Masalah yang diselesaikan",
    label: "Masalah apa yang ingin diselesaikan oleh aplikasi ini?",
    type: "multi",
    options: [
      "Pencatatan masih manual",
      "Informasi tersebar",
      "Sulit memantau progres",
      "Koordinasi memakan waktu",
      "Sering lupa jadwal",
      "Sulit menemukan data lama",
      "Banyak kesalahan input",
      "Pekerjaan yang sama terus diulang",
    ],
    optional: true,
  },
  {
    id: "users",
    section: "Pengguna",
    name: "Pengguna",
    label: "Siapa yang akan memakai aplikasi ini?",
    type: "choice",
    options: [
      "Hanya saya sendiri",
      "Saya dan keluarga / teman",
      "Tim kecil",
      "Publik / banyak orang",
      "Pelanggan usaha saya",
      "Siswa dan pengajar",
      "Anggota komunitas",
      "Staf lintas divisi",
    ],
  },
  {
    id: "auth",
    section: "Pengguna",
    name: "Login",
    label: "Apakah perlu login?",
    type: "choice",
    options: [
      "Tidak perlu login",
      "Email dan password",
      "Login dengan Google",
      "Tautan masuk lewat email",
      "Kode sekali pakai",
      "Akun dari kantor atau sekolah",
      "Tamu boleh mencoba sebelum login",
    ],
  },
  {
    id: "features",
    section: "Fitur",
    name: "Fitur utama",
    label: "Apa saja fitur utama yang wajib ada?",
    hint: "Pilih fitur yang dibutuhkan. Kamu juga bisa menulis fitur sendiri, satu per baris.",
    type: "multi",
    options: [
      "Input dan edit data",
      "Riwayat aktivitas",
      "Pencarian dan filter",
      "Laporan ringkas",
      "Kalender dan pemesanan",
      "Keranjang dan pemesanan produk",
      "Pelacakan stok",
      "Checklist dan progres",
      "Formulir pendaftaran",
      "Materi dan kuis",
    ],
  },
  {
    id: "priority",
    section: "Fitur",
    name: "Fitur yang dibuat pertama",
    label: "Fitur mana yang perlu dibuat dulu agar proyek ini mulai berguna?",
    type: "choice",
  },
  {
    id: "extras",
    section: "Fitur",
    name: "Fitur tambahan (nice to have)",
    label: "Ada fitur tambahan yang bagus kalau ada, tapi tidak wajib?",
    type: "multi",
    options: [
      "Favorit",
      "Berbagi tautan",
      "Lampiran berkas",
      "Template siap pakai",
      "Komentar dan diskusi",
      "Label berwarna",
      "Duplikat entri",
      "Daftar yang baru dibuka",
    ],
    optional: true,
  },
  {
    id: "extraOptions",
    section: "Fitur",
    name: "Kemampuan tambahan",
    label: "Kemampuan lain apa yang kamu butuhkan?",
    type: "multi",
    options: [
      "Grafik / statistik",
      "Notifikasi / pengingat",
      "Ekspor data (CSV / PDF)",
      "Impor data",
      "Mode offline",
      "Mode gelap",
      "Sinkronisasi antarperangkat",
      "Pindai kode QR",
      "Terhubung ke aplikasi lain",
      "Beberapa pengguna mengedit bersama",
    ],
    optional: true,
  },
  {
    id: "dataStored",
    section: "Data",
    name: "Data yang disimpan",
    label: "Data apa saja yang perlu disimpan?",
    type: "multi",
    options: [
      "Nama dan deskripsi",
      "Tanggal dan waktu",
      "Status dan kategori",
      "Angka atau nominal",
      "Foto atau dokumen",
      "Kontak pengguna",
      "Lokasi atau alamat",
      "Jumlah stok",
      "Jadwal dan durasi",
      "Jawaban formulir",
    ],
  },
  {
    id: "storage",
    section: "Data",
    name: "Penyimpanan data",
    label: "Data mau disimpan di mana?",
    type: "choice",
    options: [
      "Firebase (Firestore)",
      "Supabase",
      "Browser saja (localStorage)",
      "Database SQL (MySQL / PostgreSQL)",
      "Belum tahu, sarankan saja",
      "Spreadsheet seperti Google Sheets",
      "Berkas di perangkat pengguna",
      "Server milik sendiri",
      "Tidak perlu menyimpan data",
    ],
  },
  {
    id: "security",
    section: "Data",
    name: "Privasi dan keamanan",
    label: "Ada hal soal privasi atau keamanan data yang perlu diperhatikan?",
    type: "multi",
    options: [
      "Data bersifat pribadi",
      "Akses sesuai peran",
      "Cadangan berkala",
      "Penghapusan data",
      "Samarkan identitas pengguna",
      "Batasi masa simpan data",
      "Catat siapa yang mengubah data",
      "Minta izin sebelum membagikan data",
    ],
    optional: true,
  },
  {
    id: "devices",
    section: "Tampilan",
    name: "Perangkat",
    label: "Aplikasi ini akan dibuka di perangkat apa?",
    type: "multi",
    options: [
      "HP",
      "Tablet",
      "Laptop / desktop",
      "Layar kios sentuh",
      "TV atau monitor informasi",
      "Jam tangan pintar",
    ],
  },
  {
    id: "style",
    section: "Tampilan",
    name: "Gaya tampilan",
    label: "Seperti apa gaya tampilan yang kamu suka?",
    type: "choice",
    options: [
      "Minimalis dan bersih",
      "Berwarna dan ceria",
      "Profesional / formal",
      "Modern dengan animasi halus",
      "Hangat seperti jurnal",
      "Padat seperti dasbor kerja",
      "Visual dengan foto besar",
      "Ramah anak dengan ilustrasi",
    ],
  },
  {
    id: "colors",
    section: "Tampilan",
    name: "Warna / referensi",
    label: "Ada warna favorit atau contoh aplikasi yang ingin ditiru tampilannya?",
    type: "choice",
    options: [
      "Netral monokrom",
      "Biru dan putih",
      "Warna pastel",
      "Warna alami",
      "Gelap dengan aksen terang",
      "Hitam putih dengan satu aksen",
      "Ikuti warna merek saya",
      "Kontras tinggi agar mudah dibaca",
    ],
    optional: true,
  },
  {
    id: "language",
    section: "Tampilan",
    name: "Bahasa antarmuka",
    label: "Bahasa apa yang dipakai di aplikasi?",
    type: "choice",
    options: [
      "Bahasa Indonesia",
      "Bahasa Inggris",
      "Dua bahasa",
      "Bahasa daerah",
      "Beberapa bahasa sesuai pilihan pengguna",
      "Ikuti bahasa perangkat",
    ],
  },
  {
    id: "stack",
    section: "Teknis",
    name: "Teknologi",
    label: "Apakah ada preferensi teknologi?",
    type: "choice",
    options: [
      "HTML, CSS, dan JavaScript biasa",
      "React",
      "Vue",
      "Next.js",
      "Serahkan ke AI, pilihkan yang paling cocok",
      "Flutter",
      "Laravel",
      "Python dengan Django",
      "Alat no-code atau low-code",
    ],
  },
  {
    id: "hosting",
    section: "Teknis",
    name: "Hosting",
    label: "Aplikasi nanti mau di-hosting di mana?",
    type: "choice",
    options: [
      "Firebase Hosting",
      "Vercel",
      "Netlify",
      "GitHub Pages",
      "Belum tahu, sarankan saja",
      "Cloudflare Pages",
      "Hosting bersama (shared hosting)",
      "Server kantor atau VPS",
      "Cukup berjalan di perangkat saya",
    ],
  },
  {
    id: "experience",
    section: "Teknis",
    name: "Pengalaman coding",
    label: "Seberapa berpengalaman kamu dalam coding?",
    hint: "Supaya penjelasan AI sesuai dengan levelmu.",
    type: "choice",
    options: [
      "Pemula, belum pernah coding",
      "Dasar, pernah bikin proyek kecil",
      "Menengah",
      "Mahir",
      "Terbiasa memakai alat no-code",
      "Bisa mengubah contoh kode dengan bantuan AI",
      "Berpengalaman di desain, baru belajar coding",
    ],
  },
  {
    id: "constraints",
    section: "Batasan",
    name: "Batasan",
    label: "Ada batasan waktu, biaya, atau hal lain yang perlu diketahui?",
    type: "multi",
    options: [
      "Gunakan layanan gratis",
      "Selesai dalam seminggu",
      "Mudah dirawat sendiri",
      "Hemat kuota",
      "Harus nyaman di HP lama",
      "Bisa dipakai saat internet lambat",
      "Tanpa langganan bulanan",
      "Dikerjakan sendiri di waktu luang",
    ],
    optional: true,
  },
  {
    id: "notes",
    section: "Batasan",
    name: "Catatan tambahan",
    label: "Ada hal lain yang ingin kamu sampaikan?",
    type: "multi",
    options: [
      "Utamakan kemudahan penggunaan",
      "Mulai dari fitur inti",
      "Sertakan panduan penggunaan",
      "Sediakan contoh data",
      "Gunakan istilah sehari-hari",
      "Pastikan teks mudah dibaca",
      "Mudahkan perpindahan dari cara kerja lama",
    ],
    optional: true,
  },
  {
    id: "workflow",
    section: "Cara Kerja AI",
    label: "Terakhir, bagaimana kamu ingin AI mengerjakannya?",
    type: "choice",
    options: [
      "Tanya saya dulu sampai semua kebutuhan jelas",
      "Buat rencana dulu, saya setujui sebelum mulai coding",
      "Langsung buat versi pertama, saya revisi setelahnya",
      "Buat prototipe layar utama untuk saya coba",
      "Pandu saya membuatnya langkah demi langkah",
      "Mulai dari fitur prioritas lalu tunggu masukan saya",
    ],
    asInstruction: true,
  },
];

const workflowInstructions = {
  "Tanya saya dulu sampai semua kebutuhan jelas":
    "Sebelum mulai membuat apa pun, tolong tanyakan kepada saya hal-hal yang masih belum jelas, satu per satu dan sedikit demi sedikit. Setelah semuanya jelas, baru mulai membuat.",
  "Buat rencana dulu, saya setujui sebelum mulai coding":
    "Tolong buat rencana lengkap terlebih dahulu (struktur halaman, alur data, dan langkah pengerjaan). Jangan mulai menulis kode sebelum saya menyetujui rencananya.",
  "Langsung buat versi pertama, saya revisi setelahnya":
    "Tolong langsung buat versi pertamanya berdasarkan informasi di atas. Jika ada yang kurang jelas, ambil asumsi yang masuk akal dan sebutkan asumsinya. Saya akan merevisi setelahnya.",
};

const quiz = document.querySelector("#quiz");
const result = document.querySelector("#result");
const form = document.querySelector("#question-form");
const progressBar = document.querySelector("#progress-bar");
const progressText = document.querySelector("#progress-text");
const sectionName = document.querySelector("#section-name");
const questionLabel = document.querySelector("#question-label");
const questionHint = document.querySelector("#question-hint");
const answerArea = document.querySelector("#answer-area");
const errorMessage = document.querySelector("#error");
const backButton = document.querySelector("#back-button");
const skipButton = document.querySelector("#skip-button");
const submitButton = document.querySelector("#submit-button");
const resultText = document.querySelector("#result-text");
const editButton = document.querySelector("#edit-button");
const restartButton = document.querySelector("#restart-button");
const copyButton = document.querySelector("#copy-button");
const copyMessage = document.querySelector("#copy-message");

let state = { answers: {}, index: 0, done: false };
let restartArmed = false;

const featureChoices = () => {
  const features = state.answers.features;
  if (!features) return [];
  const custom = features.note.split("\n").map(line => line.trim()).filter(Boolean);
  return [...new Set([...features.value, ...custom])];
};

const questionOptions = question => question.id === "priority" ? featureChoices() : question.options;

const activeQuestions = () => featureChoices().length === 1
  ? questions.filter(question => question.id !== "priority")
  : questions;

const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.answers && Number.isInteger(saved.index)) {
      for (const question of questions) {
        const answer = saved.answers[question.id];
        if (!answer) continue;
        if (question.id === "priority" && answer.value?.length && !featureChoices().includes(answer.value[0])) continue;
        state.answers[question.id] = normalizeAnswer(question, answer);
      }
      const legacySteps = questions.filter(question => question.id !== "priority");
      const currentId = saved.currentId || legacySteps[saved.index]?.id;
      state.index = Math.max(0, activeQuestions().findIndex(question => question.id === currentId));
      state.done = Boolean(saved.done);
      state.finishAfterPriority = Boolean(saved.finishAfterPriority);
    }
  } catch (error) {
    // Penyimpanan tidak tersedia atau datanya rusak, mulai dari awal.
  }
};

const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, currentId: activeQuestions()[state.index].id }));
    document.querySelector("#save-state").textContent = "Draf tersimpan";
  } catch (error) {
    document.querySelector("#save-state").textContent = "Draf sesi ini";
  }
};

const note = document.querySelector("#note");
const sections = [...new Set(questions.map(question => question.section))];

// Older drafts stored free text in value and custom choices in other.
const normalizeAnswer = (question, saved) => {
  const selected = [];
  const details = [];
  for (const value of [].concat(saved.value || [])) {
    if (questionOptions(question).includes(value)) selected.push(value);
    else if (value === OTHER && saved.other) details.push(saved.other);
    else if (typeof value === "string" && value !== OTHER) details.push(value);
  }
  if (saved.note) details.push(saved.note);
  return { value: selected, note: details.join("\n") };
};

const formatValue = (answer) => answer
  ? [...answer.value, answer.note.trim()].filter(Boolean).join("\n")
  : "";

const ideaIcons = [
  '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6m-6 4h6"/>',
  '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l1.5 1.5L11 8m2 2h4m-10 5h10"/>',
  '<path d="M3 8l9-5 9 5v9l-9 5-9-5zm0 0l9 5 9-5m-9 5v9"/>',
  '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16v-4m5 4V8m5 8v-6"/>',
  '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18m-7 5h4"/>',
  '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-12 5 2 2 4-4"/>',
  '<path d="M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1zm9 1v14"/>',
  '<rect x="4" y="6" width="16" height="15" rx="2"/><path d="M3 3h18v4H3zm6 9h6"/>',
  '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m0-15a3 3 0 0 1 0 6m2 2a5 5 0 0 1 4 5"/>',
  '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12q9 5 18 0"/>',
];

const renderAnswerArea = (question, saved) => {
  answerArea.replaceChildren();
  questionOptions(question).forEach((label, index) => {
    const wrapper = document.createElement("label");
    wrapper.className = "option";
    const input = document.createElement("input");
    input.type = question.type === "multi" ? "checkbox" : "radio";
    input.name = "answer";
    input.value = label;
    input.checked = saved?.value.includes(label) || false;
    if (question.id === "idea") {
      const icon = document.createElement("span");
      icon.className = "option-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ideaIcons[index]}</svg>`;
      wrapper.append(icon);
    }
    wrapper.append(input, document.createTextNode(label));
    answerArea.append(wrapper);
  });
  note.value = saved?.note || "";
};

const renderProgress = () => {
  const percent = Math.round((state.done ? 1 : state.index / activeQuestions().length) * 100);
  progressBar.style.width = `${percent}%`;
  document.querySelector("#percent").textContent = `${percent}%`;
  document.querySelector("#sections").replaceChildren(...sections.map((section, i) => {
    const row = document.createElement("li");
    const number = document.createElement("span");
    number.textContent = String(i + 1).padStart(2, "0");
    row.append(number, section);
    if (!state.done && section === activeQuestions()[state.index].section) row.setAttribute("aria-current", "step");
    return row;
  }));
};

const renderQuestion = () => {
  const question = activeQuestions()[state.index];
  progressText.textContent = `Pertanyaan ${state.index + 1}/${activeQuestions().length}`;
  sectionName.textContent = question.section;
  questionLabel.textContent = question.label;
  const instruction = question.type === "multi" ? "Pilih satu atau beberapa jawaban" : "Pilih satu jawaban";
  questionHint.textContent = question.hint || instruction + ", atau tulis jawabanmu sendiri.";
  errorMessage.textContent = "";
  backButton.hidden = state.index === 0;
  skipButton.hidden = !question.optional;
  submitButton.textContent = state.finishAfterPriority || state.index === activeQuestions().length - 1 ? "Lihat ringkasan" : "Lanjut";
  renderAnswerArea(question, state.answers[question.id]);
};

const readAnswer = () => ({
  value: [...answerArea.querySelectorAll("input:checked")].map(input => input.value),
  note: note.value,
});

const buildPrompt = () => {
  const lines = ["Halo, saya ingin meminta bantuan untuk membuat sebuah proyek. Berikut kebutuhan dan preferensi saya:"];
  const features = featureChoices();
  const priority = features.length === 1 ? features[0] : formatValue(state.answers.priority);
  if (priority) lines.push("", "## Mulai dari sini", priority);
  let currentSection = "";

  questions.forEach((question) => {
    const value = formatValue(state.answers[question.id]);
    if (!value || question.asInstruction || question.id === "priority") {
      return;
    }

    if (question.section !== currentSection) {
      currentSection = question.section;
      lines.push("", `## ${currentSection}`);
    }

    const items = value
      .split("\n")
      .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
      .filter(Boolean);

    if (items.length === 1) {
      lines.push(`- ${question.name}: ${items[0]}`);
    } else {
      lines.push(`- ${question.name}:`, ...items.map((item) => `  - ${item}`));
    }
  });

  const workflow = questions.find((question) => question.asInstruction);
  const answer = state.answers[workflow.id];
  const instruction = [workflowInstructions[answer?.value[0]] || answer?.value[0], answer?.note.trim()].filter(Boolean).join("\n");
  if (instruction) {
    lines.push("", "## Yang saya minta", instruction);
  }

  return lines.join("\n");
};

const render = (moveFocus = true) => {
  renderProgress();
  quiz.hidden = state.done;
  result.hidden = !state.done;
  copyMessage.textContent = "";
  resetRestartButton();

  if (state.done) {
    resultText.value = buildPrompt();
  } else {
    renderQuestion();
  }
  if (moveFocus) (state.done ? document.querySelector("#result-title") : questionLabel).focus();
};

const goToNext = () => {
  if (state.index === activeQuestions().length - 1) {
    if (featureChoices().length > 1 && !formatValue(state.answers.priority)) {
      // A draft from before the priority step can resume beyond it.
      state.index = activeQuestions().findIndex(question => question.id === "priority");
      state.finishAfterPriority = true;
    } else {
      state.done = true;
    }
  } else if (state.finishAfterPriority && activeQuestions()[state.index].id === "priority") {
    state.finishAfterPriority = false;
    state.done = true;
  } else {
    state.index += 1;
  }
  saveState();
  render();
};

const resetRestartButton = () => {
  restartArmed = false;
  restartButton.textContent = "Mulai ulang";
};

form.addEventListener("input", () => {
  state.answers[activeQuestions()[state.index].id] = readAnswer();
  errorMessage.textContent = "";
  saveState();
});

form.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.ctrlKey && event.target.tagName === "TEXTAREA") {
    form.requestSubmit();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = activeQuestions()[state.index];
  const answer = readAnswer();

  if (!question.optional && !formatValue(answer)) {
    errorMessage.textContent = "Pilih jawaban atau isi informasi tambahan untuk melanjutkan.";
    answerArea.querySelector("input").focus();
    return;
  }

  if (formatValue(answer)) {
    state.answers[question.id] = answer;
  } else {
    delete state.answers[question.id];
  }
  if (question.id === "features") {
    const choices = featureChoices();
    const previous = state.answers.priority;
    if (choices.length === 1 || (previous?.value.length && !choices.includes(previous.value[0]))) {
      delete state.answers.priority;
    }
  }
  goToNext();
});

skipButton.addEventListener("click", () => {
  delete state.answers[activeQuestions()[state.index].id];
  goToNext();
});

backButton.addEventListener("click", () => {
  state.finishAfterPriority = false;
  state.index -= 1;
  saveState();
  render();
});

editButton.addEventListener("click", () => {
  state.done = false;
  state.index = activeQuestions().length - 1;
  saveState();
  render();
});

restartButton.addEventListener("click", () => {
  if (!restartArmed) {
    restartArmed = true;
    restartButton.textContent = "Yakin? Klik lagi";
    return;
  }
  state = { answers: {}, index: 0, done: false };
  saveState();
  render();
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultText.value);
    copyMessage.textContent = "Prompt berhasil disalin.";
  } catch (error) {
    resultText.select();
    copyMessage.textContent = "Teks sudah dipilih, tekan Ctrl+C untuk menyalin.";
  }
});

loadState();
render(false);
