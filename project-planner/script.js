const STORAGE_KEY = "project-planner-state";
const OTHER = "Lainnya";

const questions = [
  {
    id: "idea",
    section: "Ide Utama",
    name: "Ide proyek",
    label: "Apa yang ingin kamu buat?",
    type: "choice",
    options: ["Pencatat aktivitas", "Pengelola tugas", "Katalog produk", "Dasbor data"],
  },
  {
    id: "appType",
    section: "Ide Utama",
    name: "Jenis aplikasi",
    label: "Aplikasi ini berbentuk apa?",
    type: "choice",
    options: ["Web app", "Website statis (landing page, profil, blog)", "Aplikasi mobile", "Aplikasi desktop", "API / backend saja"],
  },
  {
    id: "problem",
    section: "Ide Utama",
    name: "Masalah yang diselesaikan",
    label: "Masalah apa yang ingin diselesaikan oleh aplikasi ini?",
    type: "multi",
    options: ["Pencatatan masih manual", "Informasi tersebar", "Sulit memantau progres", "Koordinasi memakan waktu"],
    optional: true,
  },
  {
    id: "users",
    section: "Pengguna",
    name: "Pengguna",
    label: "Siapa yang akan memakai aplikasi ini?",
    type: "choice",
    options: ["Hanya saya sendiri", "Saya dan keluarga / teman", "Tim kecil", "Publik / banyak orang"],
  },
  {
    id: "auth",
    section: "Pengguna",
    name: "Login",
    label: "Apakah perlu login?",
    type: "choice",
    options: ["Tidak perlu login", "Email dan password", "Login dengan Google"],
  },
  {
    id: "features",
    section: "Fitur",
    name: "Fitur utama",
    label: "Apa saja fitur utama yang wajib ada?",
    type: "multi",
    options: ["Input dan edit data", "Riwayat aktivitas", "Pencarian dan filter", "Laporan ringkas"],
  },
  {
    id: "extras",
    section: "Fitur",
    name: "Fitur tambahan (nice to have)",
    label: "Ada fitur tambahan yang bagus kalau ada, tapi tidak wajib?",
    type: "multi",
    options: ["Favorit", "Berbagi tautan", "Lampiran berkas", "Template siap pakai"],
    optional: true,
  },
  {
    id: "extraOptions",
    section: "Fitur",
    name: "Kemampuan tambahan",
    label: "Kemampuan lain apa yang kamu butuhkan?",
    type: "multi",
    options: ["Grafik / statistik", "Notifikasi / pengingat", "Ekspor data (CSV / PDF)", "Impor data", "Mode offline", "Mode gelap"],
    optional: true,
  },
  {
    id: "dataStored",
    section: "Data",
    name: "Data yang disimpan",
    label: "Data apa saja yang perlu disimpan?",
    type: "multi",
    options: ["Nama dan deskripsi", "Tanggal dan waktu", "Status dan kategori", "Angka atau nominal", "Foto atau dokumen"],
  },
  {
    id: "storage",
    section: "Data",
    name: "Penyimpanan data",
    label: "Data mau disimpan di mana?",
    type: "choice",
    options: ["Firebase (Firestore)", "Supabase", "Browser saja (localStorage)", "Database SQL (MySQL / PostgreSQL)", "Belum tahu, sarankan saja"],
  },
  {
    id: "security",
    section: "Data",
    name: "Privasi dan keamanan",
    label: "Ada hal soal privasi atau keamanan data yang perlu diperhatikan?",
    type: "multi",
    options: ["Data bersifat pribadi", "Akses sesuai peran", "Cadangan berkala", "Penghapusan data"],
    optional: true,
  },
  {
    id: "devices",
    section: "Tampilan",
    name: "Perangkat",
    label: "Aplikasi ini akan dibuka di perangkat apa?",
    type: "multi",
    options: ["HP", "Tablet", "Laptop / desktop"],
  },
  {
    id: "style",
    section: "Tampilan",
    name: "Gaya tampilan",
    label: "Seperti apa gaya tampilan yang kamu suka?",
    type: "choice",
    options: ["Minimalis dan bersih", "Berwarna dan ceria", "Profesional / formal", "Modern dengan animasi halus"],
  },
  {
    id: "colors",
    section: "Tampilan",
    name: "Warna / referensi",
    label: "Ada warna favorit atau contoh aplikasi yang ingin ditiru tampilannya?",
    type: "choice",
    options: ["Netral monokrom", "Biru dan putih", "Warna pastel", "Warna alami"],
    optional: true,
  },
  {
    id: "language",
    section: "Tampilan",
    name: "Bahasa antarmuka",
    label: "Bahasa apa yang dipakai di aplikasi?",
    type: "choice",
    options: ["Bahasa Indonesia", "Bahasa Inggris", "Dua bahasa"],
  },
  {
    id: "stack",
    section: "Teknis",
    name: "Teknologi",
    label: "Apakah ada preferensi teknologi?",
    type: "choice",
    options: ["HTML, CSS, dan JavaScript biasa", "React", "Vue", "Next.js", "Serahkan ke AI, pilihkan yang paling cocok"],
  },
  {
    id: "hosting",
    section: "Teknis",
    name: "Hosting",
    label: "Aplikasi nanti mau di-hosting di mana?",
    type: "choice",
    options: ["Firebase Hosting", "Vercel", "Netlify", "GitHub Pages", "Belum tahu, sarankan saja"],
  },
  {
    id: "experience",
    section: "Teknis",
    name: "Pengalaman coding",
    label: "Seberapa berpengalaman kamu dalam coding?",
    hint: "Supaya penjelasan AI sesuai dengan levelmu.",
    type: "choice",
    options: ["Pemula, belum pernah coding", "Dasar, pernah bikin proyek kecil", "Menengah", "Mahir"],
  },
  {
    id: "constraints",
    section: "Batasan",
    name: "Batasan",
    label: "Ada batasan waktu, biaya, atau hal lain yang perlu diketahui?",
    type: "multi",
    options: ["Gunakan layanan gratis", "Selesai dalam seminggu", "Mudah dirawat sendiri", "Hemat kuota"],
    optional: true,
  },
  {
    id: "notes",
    section: "Batasan",
    name: "Catatan tambahan",
    label: "Ada hal lain yang ingin kamu sampaikan?",
    type: "multi",
    options: ["Utamakan kemudahan penggunaan", "Mulai dari fitur inti", "Sertakan panduan penggunaan"],
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

const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.answers && Number.isInteger(saved.index)) {
      state = {
        answers: Object.fromEntries(questions.filter(q => saved.answers[q.id]).map(q => [q.id, normalizeAnswer(q, saved.answers[q.id])])),
        index: Math.min(Math.max(saved.index, 0), questions.length - 1),
        done: Boolean(saved.done),
      };
    }
  } catch (error) {
    // Penyimpanan tidak tersedia atau datanya rusak, mulai dari awal.
  }
};

const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    if (question.options.includes(value)) selected.push(value);
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
];

const renderAnswerArea = (question, saved) => {
  answerArea.replaceChildren();
  question.options.forEach((label, index) => {
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
  const percent = Math.round((state.done ? 1 : state.index / questions.length) * 100);
  progressBar.style.width = `${percent}%`;
  document.querySelector("#percent").textContent = `${percent}%`;
  document.querySelector("#sections").replaceChildren(...sections.map((section, i) => {
    const row = document.createElement("li");
    const number = document.createElement("span");
    number.textContent = String(i + 1).padStart(2, "0");
    row.append(number, section);
    if (!state.done && section === questions[state.index].section) row.setAttribute("aria-current", "step");
    return row;
  }));
};

const renderQuestion = () => {
  const question = questions[state.index];
  progressText.textContent = `Pertanyaan ${state.index + 1}/${questions.length}`;
  sectionName.textContent = question.section;
  questionLabel.textContent = question.label;
  const instruction = question.type === "multi" ? "Pilih satu atau beberapa jawaban" : "Pilih satu jawaban";
  questionHint.textContent = instruction + ", atau tulis jawabanmu sendiri.";
  errorMessage.textContent = "";
  backButton.hidden = state.index === 0;
  skipButton.hidden = !question.optional;
  submitButton.textContent = state.index === questions.length - 1 ? "Lihat ringkasan" : "Lanjut";
  renderAnswerArea(question, state.answers[question.id]);
};

const readAnswer = () => ({
  value: [...answerArea.querySelectorAll("input:checked")].map(input => input.value),
  note: note.value,
});

const buildPrompt = () => {
  const lines = ["Halo, saya ingin meminta bantuan untuk membuat sebuah proyek. Berikut kebutuhan dan preferensi saya:"];
  let currentSection = "";

  questions.forEach((question) => {
    const value = formatValue(state.answers[question.id]);
    if (!value || question.asInstruction) {
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
  const instruction = [workflowInstructions[answer?.value[0]], answer?.note.trim()].filter(Boolean).join("\n");
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
  if (state.index === questions.length - 1) {
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
  state.answers[questions[state.index].id] = readAnswer();
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

  const question = questions[state.index];
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
  goToNext();
});

skipButton.addEventListener("click", () => {
  delete state.answers[questions[state.index].id];
  goToNext();
});

backButton.addEventListener("click", () => {
  state.index -= 1;
  saveState();
  render();
});

editButton.addEventListener("click", () => {
  state.done = false;
  state.index = questions.length - 1;
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
