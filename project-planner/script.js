const STORAGE_KEY = "project-planner-state";
const OTHER = "Lainnya";

const questions = [
  {
    id: "idea",
    section: "Ide Utama",
    name: "Ide proyek",
    label: "Apa yang ingin kamu buat?",
    hint: "Ceritakan dengan bebas, tidak perlu rapi. Contoh: aplikasi untuk mencatat hasil cek kesehatan saya.",
    type: "textarea",
  },
  {
    id: "appType",
    section: "Ide Utama",
    name: "Jenis aplikasi",
    label: "Aplikasi ini berbentuk apa?",
    type: "choice",
    options: ["Web app", "Website statis (landing page, profil, blog)", "Aplikasi mobile", "Aplikasi desktop", "API / backend saja"],
    other: true,
  },
  {
    id: "problem",
    section: "Ide Utama",
    name: "Masalah yang diselesaikan",
    label: "Masalah apa yang ingin diselesaikan oleh aplikasi ini?",
    hint: "Bagaimana kamu mengerjakannya sekarang, dan apa yang merepotkan?",
    type: "textarea",
    optional: true,
  },
  {
    id: "users",
    section: "Pengguna",
    name: "Pengguna",
    label: "Siapa yang akan memakai aplikasi ini?",
    type: "choice",
    options: ["Hanya saya sendiri", "Saya dan keluarga / teman", "Tim kecil", "Publik / banyak orang"],
    other: true,
  },
  {
    id: "auth",
    section: "Pengguna",
    name: "Login",
    label: "Apakah perlu login?",
    type: "choice",
    options: ["Tidak perlu login", "Email dan password", "Login dengan Google"],
    other: true,
  },
  {
    id: "features",
    section: "Fitur",
    name: "Fitur utama",
    label: "Apa saja fitur utama yang wajib ada?",
    hint: "Tulis satu fitur per baris. Contoh: input data, lihat riwayat, grafik perkembangan.",
    type: "textarea",
  },
  {
    id: "extras",
    section: "Fitur",
    name: "Fitur tambahan (nice to have)",
    label: "Ada fitur tambahan yang bagus kalau ada, tapi tidak wajib?",
    hint: "Satu fitur per baris.",
    type: "textarea",
    optional: true,
  },
  {
    id: "extraOptions",
    section: "Fitur",
    name: "Kemampuan tambahan",
    label: "Kemampuan lain apa yang kamu butuhkan?",
    hint: "Boleh pilih lebih dari satu.",
    type: "multi",
    options: ["Grafik / statistik", "Notifikasi / pengingat", "Ekspor data (CSV / PDF)", "Impor data", "Mode offline", "Mode gelap"],
    other: true,
    optional: true,
  },
  {
    id: "dataStored",
    section: "Data",
    name: "Data yang disimpan",
    label: "Data apa saja yang perlu disimpan?",
    hint: "Sebutkan isian atau kolomnya. Contoh: tanggal, tekanan darah, gula darah, berat badan, catatan.",
    type: "textarea",
  },
  {
    id: "storage",
    section: "Data",
    name: "Penyimpanan data",
    label: "Data mau disimpan di mana?",
    type: "choice",
    options: ["Firebase (Firestore)", "Supabase", "Browser saja (localStorage)", "Database SQL (MySQL / PostgreSQL)", "Belum tahu, sarankan saja"],
    other: true,
  },
  {
    id: "security",
    section: "Data",
    name: "Privasi dan keamanan",
    label: "Ada hal soal privasi atau keamanan data yang perlu diperhatikan?",
    hint: "Contoh: data kesehatan bersifat pribadi, hanya saya yang boleh melihat.",
    type: "textarea",
    optional: true,
  },
  {
    id: "devices",
    section: "Tampilan",
    name: "Perangkat",
    label: "Aplikasi ini akan dibuka di perangkat apa?",
    hint: "Boleh pilih lebih dari satu.",
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
    other: true,
  },
  {
    id: "colors",
    section: "Tampilan",
    name: "Warna / referensi",
    label: "Ada warna favorit atau contoh aplikasi yang ingin ditiru tampilannya?",
    hint: "Contoh: dominan biru, mirip Notion.",
    type: "text",
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
    other: true,
  },
  {
    id: "hosting",
    section: "Teknis",
    name: "Hosting",
    label: "Aplikasi nanti mau di-hosting di mana?",
    type: "choice",
    options: ["Firebase Hosting", "Vercel", "Netlify", "GitHub Pages", "Belum tahu, sarankan saja"],
    other: true,
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
    hint: "Contoh: harus gratis, selesai dalam seminggu.",
    type: "text",
    optional: true,
  },
  {
    id: "notes",
    section: "Batasan",
    name: "Catatan tambahan",
    label: "Ada hal lain yang ingin kamu sampaikan?",
    type: "textarea",
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
        answers: saved.answers,
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
  } catch (error) {
    // Abaikan, aplikasi tetap berjalan tanpa penyimpanan.
  }
};

const isTextType = (question) => question.type === "text" || question.type === "textarea";

const formatValue = (question, answer) => {
  if (!answer) {
    return "";
  }
  if (isTextType(question)) {
    return answer.value.trim();
  }
  const other = (answer.other || "").trim();
  return [].concat(answer.value)
    .map((value) => (value === OTHER ? other : value))
    .filter(Boolean)
    .join(", ");
};

const formatAnswer = (question) => formatValue(question, state.answers[question.id]);

const createOption = (question, label, checked) => {
  const wrapper = document.createElement("label");
  wrapper.className = "option";

  const input = document.createElement("input");
  input.type = question.type === "multi" ? "checkbox" : "radio";
  input.name = "answer";
  input.value = label;
  input.checked = checked;

  const text = document.createElement("span");
  text.textContent = label;

  wrapper.append(input, text);
  return wrapper;
};

const syncOtherInput = () => {
  const otherInput = answerArea.querySelector("#other-input");
  if (!otherInput) {
    return;
  }
  const otherChoice = [...answerArea.querySelectorAll("input[name='answer']")]
    .find((input) => input.value === OTHER);
  otherInput.hidden = !otherChoice.checked;
};

const renderAnswerArea = (question, saved) => {
  answerArea.replaceChildren();

  if (isTextType(question)) {
    const field = document.createElement(question.type === "textarea" ? "textarea" : "input");
    field.id = "text-field";
    if (question.type === "textarea") {
      field.rows = 5;
    } else {
      field.type = "text";
    }
    field.value = saved ? saved.value : "";
    answerArea.removeAttribute("role");
    questionLabel.htmlFor = "text-field";
    answerArea.append(field);
    return;
  }

  const selected = saved ? [].concat(saved.value) : [];
  const options = question.other ? [...question.options, OTHER] : question.options;

  questionLabel.removeAttribute("for");
  answerArea.setAttribute("role", "group");
  answerArea.setAttribute("aria-labelledby", "question-label");
  options.forEach((label) => {
    answerArea.append(createOption(question, label, selected.includes(label)));
  });

  if (question.other) {
    const otherInput = document.createElement("input");
    otherInput.type = "text";
    otherInput.id = "other-input";
    otherInput.placeholder = "Tulis pilihanmu sendiri";
    otherInput.value = saved ? saved.other || "" : "";
    answerArea.append(otherInput);
    syncOtherInput();
  }
};

const focusAnswer = () => {
  const target = answerArea.querySelector("#text-field")
    || answerArea.querySelector("input[name='answer']:checked")
    || answerArea.querySelector("input[name='answer']");
  if (target) {
    target.focus();
  }
};

const renderQuestion = () => {
  const question = questions[state.index];

  progressBar.style.width = `${(state.index / questions.length) * 100}%`;
  progressText.textContent = `Pertanyaan ${state.index + 1} dari ${questions.length}`;
  sectionName.textContent = question.section;
  questionLabel.textContent = question.label;
  questionHint.textContent = question.hint || "";
  questionHint.hidden = !question.hint;
  errorMessage.textContent = "";

  backButton.hidden = state.index === 0;
  skipButton.hidden = !question.optional;
  submitButton.textContent = state.index === questions.length - 1 ? "Selesai" : "Lanjut";

  renderAnswerArea(question, state.answers[question.id]);
  focusAnswer();
};

const readAnswer = (question) => {
  if (isTextType(question)) {
    return { value: answerArea.querySelector("#text-field").value };
  }

  const checked = [...answerArea.querySelectorAll("input[name='answer']:checked")]
    .map((input) => input.value);
  const otherInput = answerArea.querySelector("#other-input");

  return {
    value: question.type === "multi" ? checked : checked[0] || "",
    other: otherInput ? otherInput.value : "",
  };
};

const validate = (question, answer) => {
  const picksOther = [].concat(answer.value).includes(OTHER);
  if (picksOther && !(answer.other || "").trim()) {
    return `Isi dulu pilihan "${OTHER}", atau pilih opsi lain.`;
  }
  if (!question.optional && !formatValue(question, answer)) {
    return "Pertanyaan ini perlu dijawab dulu.";
  }
  return "";
};

const buildPrompt = () => {
  const lines = ["Halo, saya ingin meminta bantuan untuk membuat sebuah proyek. Berikut kebutuhan dan preferensi saya:"];
  let currentSection = "";

  questions.forEach((question) => {
    const value = formatAnswer(question);
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
  const instruction = workflowInstructions[formatAnswer(workflow)];
  if (instruction) {
    lines.push("", "## Yang saya minta", instruction);
  }

  return lines.join("\n");
};

const render = () => {
  quiz.hidden = state.done;
  result.hidden = !state.done;
  copyMessage.textContent = "";
  resetRestartButton();

  if (state.done) {
    resultText.value = buildPrompt();
  } else {
    renderQuestion();
  }
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

answerArea.addEventListener("change", syncOtherInput);

answerArea.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.ctrlKey && event.target.tagName === "TEXTAREA") {
    form.requestSubmit();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = questions[state.index];
  const answer = readAnswer(question);
  const error = validate(question, answer);

  if (error) {
    errorMessage.textContent = error;
    return;
  }

  if (formatValue(question, answer)) {
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
render();
