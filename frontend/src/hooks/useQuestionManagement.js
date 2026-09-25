import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSubjects,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion as deleteQuestionApi,
  uploadQuestionImage,
  deleteQuestionImage,
  generateAIQuestion,
  previewAIPrompt,
} from "../services/api";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import useAiStatusGate from "./useAiStatusGate";

export function useQuestionManagement(OPTION_CODES, DIFFICULTIES) {
  // ======================================================
  // HAK AKSES
  //
  // Hapus soal (backend: DELETE /api/questions/{id}, routers/questions.py
  // -> delete_question):
  //   ADMIN -> boleh menghapus SEMUA soal.
  //   GURU  -> hanya soal yang DIA BUAT SENDIRI (created_by == id user
  //            yang login). Soal tanpa pencatat pembuat (created_by
  //            kosong, mis. data lama) hanya bisa dihapus ADMIN.
  // Lihat / tambah / edit boleh ADMIN & GURU. Tombol hapus hanya
  // ditampilkan kalau backend akan mengizinkannya; kalau aturan di
  // backend berubah, ubah fungsi ini juga.
  // ======================================================
  const { user } = useAuth();

  function canDeleteQuestion(question) {
    if (!user) {
      return false;
    }

    if (user.role === "ADMIN") {
      return true;
    }

    return (
      user.role === "GURU" && question.created_by != null && question.created_by === user.id
    );
  }

  // ======================================================
  // DATA
  // ======================================================

  const [questions, setQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [subjects, setSubjects] = useState([]);

  // ======================================================
  // UI STATE
  // ======================================================

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState(null);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  // ======================================================
  // AI GENERATE SOAL
  // ======================================================

  const [showAiModal, setShowAiModal] = useState(false);

  // Cek status provider AI (Ollama/Gemini) SEBELUM modal dibuka --
  // lihat hooks/useAiStatusGate.js. Tiap tombol punya gate sendiri
  // karena state loading & letak pesan errornya terpisah:
  // - aiGate     : tombol "Tambah Soal AI" di toolbar Bank Soal
  // - editAiGate : tombol "Edit dengan AI" DI DALAM modal Edit Soal
  //                (pesannya tampil di modal itu, bukan di toolbar,
  //                 supaya guru tidak kehilangan perubahan manual
  //                 yang sudah diketik)
  const aiGate = useAiStatusGate();

  const editAiGate = useAiStatusGate();

  // true kalau modal AI sedang dibuka untuk MENGGANTIKAN soal yang
  // sedang diedit (bukan membuat soal baru). Dipakai supaya:
  // - editingQuestion TIDAK di-null-kan setelah generate (submit
  //   berikutnya harus tetap UPDATE, bukan CREATE baru)
  // - kalau modal AI dibatalkan, modal Edit Soal dibuka lagi
  //   dengan data yang sudah ada, bukan hilang begitu saja
  const [aiReplaceMode, setAiReplaceMode] = useState(false);

  const [aiGenerating, setAiGenerating] = useState(false);

  const [aiError, setAiError] = useState("");

  const [aiGeneratedNotice, setAiGeneratedNotice] = useState(false);

  // Diisi dari result.consistency_warning saat backend mendeteksi
  // opsi yang ditandai benar kemungkinan tidak sejalan dengan
  // pembahasannya sendiri (lihat routers/questions.py ->
  // _verify_answer_consistency). null kalau tidak ada masalah.
  const [aiConsistencyWarning, setAiConsistencyWarning] = useState(null);

  // Diisi dari result.image_description saat guru mencentang
  // "Buat soal bergambar" dan AI mengembalikan saran ilustrasi.
  // Cuma teks pengingat untuk guru -- BUKAN gambar sungguhan,
  // guru tetap upload manual lewat input file di bawah.
  const [aiImageDescription, setAiImageDescription] = useState(null);

  // "form"   -> isi mata pelajaran/kesulitan/materi
  // "prompt" -> tampilkan prompt (bisa diedit) sebelum generate
  const [aiStep, setAiStep] = useState("form");

  const [aiPrompt, setAiPrompt] = useState("");

  const [aiPromptLoading, setAiPromptLoading] = useState(false);

  const createEmptyAiForm = () => ({
    subject_id: "",
    difficulty: "MEDIUM",
    materi: "",
    additional_instruction: "",
    with_image: false,
  });

  const [aiForm, setAiForm] = useState(createEmptyAiForm());

  // ======================================================
  // IMPOR SOAL DARI DOKUMEN (PDF/DOCX/TXT)
  // ======================================================

  const [showImportModal, setShowImportModal] = useState(false);

  // Pakai pengecekan status AI yang SAMA seperti tombol "Tambah
  // Soal AI" (fitur ini juga memanggil provider AI yang aktif di
  // backend), supaya guru tidak buka modal dulu baru gagal
  // belakangan kalau tidak ada AI yang online.
  //
  // - importGate  : tombol "Impor dari Dokumen" di toolbar
  // - imageGate   : tombol "Import dari Gambar" di toolbar (cek AI online
  //                 dulu; pengecekan kemampuan vision dilakukan di dalam
  //                 komponen ImportImageButton lewat getImageImportCapability)
  const importGate = useAiStatusGate();

  const imageGate = useAiStatusGate();

  // ======================================================
  // PREVIEW SOAL
  //
  // Tampilannya ada di components/QuestionPreviewModal.jsx. Cukup
  // simpan soal yang sedang dipreview di sini (null = modal tertutup).
  // Datanya sudah ADA di `questions` (QuestionResponse dari backend
  // sudah menyertakan options + is_correct + explanation), jadi
  // TIDAK perlu panggil API lagi.
  // ======================================================

  const [previewQuestion, setPreviewQuestion] = useState(null);

  function openPreviewModal(question) {
    setPreviewQuestion(question);
  }

  function closePreviewModal() {
    setPreviewQuestion(null);
  }

  // ======================================================
  // FILTER
  // ======================================================

  const [search, setSearch] = useState("");

  const [subjectFilter, setSubjectFilter] = useState("");

  const [difficultyFilter, setDifficultyFilter] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  // Kelengkapan pembahasan: "" | "COMPLETE" | "INCOMPLETE" -- cocok
  // dengan badge Lengkap/Tidak Lengkap yang sudah tampil di kolom
  // Status, cuma sebelumnya belum bisa difilter.
  const [explanationFilter, setExplanationFilter] = useState("");

  // Toggle cepat "Soal Saya" -- true berarti hanya tampilkan soal
  // dengan created_by === user yang login. Backend GET /api/questions
  // mengembalikan soal SEMUA guru ke siapa saja (tidak dibatasi role),
  // jadi ini murni filter di frontend.
  const [onlyMine, setOnlyMine] = useState(false);

  // Ada gambar / tanpa gambar: "" | "WITH_IMAGE" | "WITHOUT_IMAGE" --
  // cocok dengan has_image dari backend (lihat QuestionResponse di
  // schemas.py). Berguna buat QA setelah impor dokumen/gambar,
  // mengecek soal mana yang kebawa gambar.
  const [hasImageFilter, setHasImageFilter] = useState("");

  // Cuma dipakai di mobile (lihat CSS @media max-width:600px) --
  // menyembunyikan baris filter lanjutan (Tingkat/Status/Pembahasan/
  // Gambar) di balik tombol, biar filter tidak makan tempat sebelum
  // tabel. Di desktop/tablet diabaikan, baris lanjutan selalu tampil.
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  // ======================================================
  // PAGINATION (Bank Soal)
  // ======================================================

  const QUESTIONS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);

  // ======================================================
  // MESSAGE
  // ======================================================

  // ------------------------------------------------------
  // GAMBAR SOAL
  //
  // selectedImageFile: file baru yang dipilih guru, BELUM diupload
  // ke server -- baru benar-benar diupload saat handleSubmit
  // (setelah soal berhasil dibuat/diupdate, karena upload butuh
  // question_id yang cuma ada setelah itu).
  //
  // imagePreviewUrl: preview LOKAL (URL.createObjectURL langsung
  // dari File yang dipilih, belum lewat server sama sekali) supaya
  // guru langsung lihat hasilnya tanpa nunggu upload selesai.
  //
  // removeExistingImage: guru klik "Hapus gambar" saat mode edit
  // soal yang sudah punya gambar -- ditandai dulu, baru benar-benar
  // dihapus (panggil deleteQuestionImage) saat handleSubmit, biar
  // konsisten dengan field form lain yang juga baru "commit" saat
  // submit (bukan langsung waktu diklik).
  // ------------------------------------------------------

  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  // ID soal yang BARU SAJA dibuat lewat modal ini (mode Tambah).
  // Dipakai supaya submit berikutnya di modal yang SAMA -- mis. klik
  // "Simpan" lagi setelah upload gambar gagal, atau klik ganda selagi
  // modal belum tertutup -- meng-UPDATE soal itu, BUKAN membuat soal
  // baru lagi (yang akan jadi duplikat). Di-reset tiap modal
  // dibuka/ditutup.
  const createdQuestionIdRef = useRef(null);

  function handleImageFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Buang preview lama dulu (kalau ada) sebelum bikin yang baru --
    // blob URL yang tidak di-revoke akan terus makan memori browser.
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return URL.createObjectURL(file);
    });

    setSelectedImageFile(file);
    setRemoveExistingImage(false);
  }

  function handleRemoveImageClick() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setSelectedImageFile(null);
    setRemoveExistingImage(true);
  }

  // ======================================================
  // FORM
  // ======================================================

  const createEmptyForm = () => ({
    subject_id: "",
    question_text: "",
    question_type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation: "",
    points: 1,
    is_active: true,

    options: OPTION_CODES.map((code) => ({
      option_code: code,
      option_text: "",
      is_correct: false,
    })),
  });

  const [form, setForm] = useState(createEmptyForm());

  // ======================================================
  // LOAD SUBJECTS
  // ======================================================

  const loadSubjects = useCallback(async () => {
    try {
      const data = await getSubjects();

      setSubjects(data);
    } catch (err) {
      console.error("LOAD SUBJECT ERROR:", err);

      toast.error(err.message || "Gagal mengambil mata pelajaran");
    }
  }, []);

  // ======================================================
  // LOAD QUESTIONS
  // ======================================================

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getQuestions();

      setQuestions(data.data || data); setTotalQuestions(data.total || 0);
    } catch (err) {
      console.error("LOAD QUESTIONS ERROR:", err);

      toast.error(err.message || "Gagal mengambil bank soal");
    } finally {
      setLoading(false);
    }
  }, []);

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    loadSubjects();

    loadQuestions();
  }, [loadSubjects, loadQuestions]);

  // ======================================================
  // SUBJECT NAME
  // ======================================================

  const getSubjectName = useCallback((subjectId) => {
    const subject = subjects.find((item) => item.id === subjectId);

    return subject ? subject.name : "-";
  }, [subjects]);

  // ======================================================
  // DIFFICULTY LABEL
  // ======================================================

  function getDifficultyLabel(difficulty) {
    const item = DIFFICULTIES.find((item) => item.value === difficulty);

    return item ? item.label : difficulty;
  }

  // ======================================================
  // OPEN ADD MODAL
  // ======================================================

  function openAddModal() {
    setEditingQuestion(null);
    createdQuestionIdRef.current = null;

    setForm(createEmptyForm());

    setAiGeneratedNotice(false);
    setAiConsistencyWarning(null);
    setAiImageDescription(null);
    editAiGate.reset();

    setSelectedImageFile(null);
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
    setRemoveExistingImage(false);
    setShowModal(true);
  }

  // ======================================================
  // OPEN EDIT MODAL
  // ======================================================

  function openEditModal(question) {
    const options = OPTION_CODES.map((code) => {
      const existingOption = question.options?.find((option) => option.option_code === code);

      return {
        option_code: code,

        option_text: existingOption?.option_text || "",

        is_correct: existingOption?.is_correct || false,
      };
    });

    setEditingQuestion(question);
    createdQuestionIdRef.current = null;

    setForm({
      subject_id: String(question.subject_id),

      question_text: question.question_text || "",

      question_type: question.question_type || "MULTIPLE_CHOICE",

      difficulty: question.difficulty || "MEDIUM",

      explanation: question.explanation || "",

      points: question.points ?? 1,

      is_active: question.is_active !== false,

      options,
    });

    setAiGeneratedNotice(false);
    setAiConsistencyWarning(null);
    setAiImageDescription(null);
    editAiGate.reset();

    setSelectedImageFile(null);
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
    setRemoveExistingImage(false);
    setShowModal(true);
  }

  // ======================================================
  // CLOSE MODAL
  // ======================================================

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingQuestion(null);
    createdQuestionIdRef.current = null;

    setForm(createEmptyForm());

    setAiGeneratedNotice(false);
    setAiConsistencyWarning(null);
    setAiImageDescription(null);
    editAiGate.reset();

    // Bersihkan juga state gambar. Modal bisa dibuka lagi TANPA lewat
    // openAddModal/openEditModal (yaitu dari hasil "Tambah Soal AI"),
    // jadi tanpa ini file/preview dari sesi sebelumnya bisa "nyangkut"
    // dan ikut terupload ke soal yang berbeda.
    setSelectedImageFile(null);
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
    setRemoveExistingImage(false);
    }

  // ======================================================
  // OPEN / CLOSE MODAL GENERATE SOAL AI
  // ======================================================

  function openAiModal() {
    // Mode TAMBAH: pastikan tidak "menempel" ke soal manapun,
    // supaya hasil generate nanti disimpan sebagai soal BARU.
    setEditingQuestion(null);
    createdQuestionIdRef.current = null;

    setAiReplaceMode(false);

    setAiForm(createEmptyAiForm());

    setAiError("");

    setAiStep("form");

    setAiPrompt("");

    setShowAiModal(true);
  }

  // ======================================================
  // TOMBOL "EDIT DENGAN AI" DI DALAM MODAL EDIT SOAL
  //
  // Membuka modal generate AI yang SAMA, tapi:
  // - subject_id & difficulty diisi otomatis dari soal yang
  //   sedang diedit (guru tidak perlu pilih ulang)
  // - additional_instruction diisi draft yang menyebutkan soal
  //   lama, supaya AI tahu ini permintaan PENGGANTI, bukan soal
  //   yang tidak berhubungan sama sekali
  // - editingQuestion TETAP tersimpan (lihat aiReplaceMode) supaya
  //   setelah draft AI dipakai, tombol "Simpan Perubahan" di modal
  //   Edit Soal meng-UPDATE soal ini, bukan membuat soal baru
  // ======================================================

  function openAiModalForEdit() {
    setAiReplaceMode(true);

    setAiForm({
      subject_id: form.subject_id,
      difficulty: form.difficulty,
      materi: "",
      with_image: false,
      additional_instruction: form.question_text
        ? `Buatkan soal PENGGANTI untuk soal lama berikut (topik ` +
          `boleh sejenis, tapi teks soal & pilihan jawaban harus ` +
          `beda, jangan cuma menyalin ulang):\n"${form.question_text}"`
        : "",
    });

    setAiError("");

    setAiStep("form");

    setAiPrompt("");

    // Modal Edit Soal disembunyikan dulu (bukan ditutup total —
    // form & editingQuestion tetap tersimpan di state) supaya
    // modal AI tidak bertumpuk di atasnya.
    setShowModal(false);

    setShowAiModal(true);
  }

  function closeAiModal() {
    if (aiGenerating || aiPromptLoading) {
      return;
    }

    setShowAiModal(false);

    setAiError("");

    setAiStep("form");

    setAiPrompt("");

    // Kalau modal AI ini dibuka dari tombol "Edit dengan AI" dan
    // dibatalkan (bukan berhasil generate), buka lagi modal Edit
    // Soal supaya guru tidak kehilangan soal yang sedang diedit.
    if (aiReplaceMode) {
      setAiReplaceMode(false);

      setShowModal(true);
    }
  }

  // ======================================================
  // LANGKAH 1 -> 2: SUSUN PROMPT UNTUK DIPERIKSA/DIEDIT
  //
  // Tidak memanggil Ollama sama sekali. Cuma minta backend
  // menyusun teks prompt dari form, supaya guru bisa membaca
  // dan mengubahnya dulu sebelum benar-benar generate soal.
  // ======================================================

  async function handleShowPrompt(event) {
    event.preventDefault();

    setAiError("");

    if (!aiForm.subject_id) {
      setAiError("Mata pelajaran wajib dipilih");

      return;
    }

    if (!aiForm.materi.trim()) {
      setAiError("Materi / lingkup soal wajib diisi");

      return;
    }

    try {
      setAiPromptLoading(true);

      const result = await previewAIPrompt({
        subject_id: Number(aiForm.subject_id),
        difficulty: aiForm.difficulty,
        materi: aiForm.materi.trim(),
        additional_instruction: aiForm.additional_instruction.trim() || null,
        with_image: aiForm.with_image,
      });

      setAiPrompt(result.prompt);

      setAiStep("prompt");
    } catch (err) {
      console.error("AI PREVIEW PROMPT ERROR:", err);

      setAiError(err.message || "Gagal menyusun prompt");
    } finally {
      setAiPromptLoading(false);
    }
  }

  // Kembali dari langkah prompt ke form (mis. mau ganti materi
  // atau tingkat kesulitan, bukan cuma teks prompt-nya).
  function handleBackToAiForm() {
    if (aiGenerating) {
      return;
    }

    setAiStep("form");

    setAiError("");
  }

  // ======================================================
  // FORM GENERATE AI - CHANGE
  // ======================================================

  function handleAiFormChange(event) {
    const { name, value, type, checked } = event.target;

    setAiForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // ======================================================
  // GENERATE SOAL DENGAN AI
  //
  // Endpoint AI hanya mengembalikan draft (tidak menyimpan
  // apapun). Hasilnya dipakai untuk mengisi form soal biasa
  // dalam mode "review" — guru wajib memeriksa/mengedit lalu
  // menekan "Simpan Soal" seperti alur tambah soal manual.
  // ======================================================

  async function handleAiGenerate(event) {
    event.preventDefault();

    setAiError("");

    if (!aiForm.subject_id) {
      setAiError("Mata pelajaran wajib dipilih");

      return;
    }

    if (!aiForm.materi.trim()) {
      setAiError("Materi / lingkup soal wajib diisi");

      return;
    }

    if (!aiPrompt.trim()) {
      setAiError("Prompt tidak boleh kosong");

      return;
    }

    try {
      setAiGenerating(true);

      const result = await generateAIQuestion({
        subject_id: Number(aiForm.subject_id),
        difficulty: aiForm.difficulty,
        materi: aiForm.materi.trim(),
        additional_instruction: aiForm.additional_instruction.trim() || null,
        with_image: aiForm.with_image,
        prompt: aiPrompt.trim(),
      });

      // CATATAN: editingQuestion SENGAJA tidak di-null-kan di sini.
      // Kalau modal ini dibuka lewat "Edit dengan AI"
      // (aiReplaceMode = true), editingQuestion masih menunjuk ke
      // soal lama, supaya tombol "Simpan Perubahan" nanti meng-
      // UPDATE soal itu. Untuk mode Tambah, editingQuestion sudah
      // di-null-kan lebih dulu di openAiModal().

      setForm((prev) => ({
        subject_id: String(result.subject_id),

        question_text: result.question_text,

        question_type: result.question_type || "MULTIPLE_CHOICE",

        difficulty: result.difficulty,

        explanation: result.explanation || "",

        // Mode ganti soal (edit): pertahankan poin & status aktif
        // soal LAMA, karena itu bukan sesuatu yang AI tentukan.
        // Mode tambah baru: pakai default dari hasil AI / 1.
        points: aiReplaceMode ? prev.points : (result.points ?? 1),

        is_active: aiReplaceMode ? prev.is_active : true,

        options: OPTION_CODES.map((code) => {
          const found = result.options.find((option) => option.option_code === code);

          return {
            option_code: code,

            option_text: found?.option_text || "",

            is_correct: found?.is_correct || false,
          };
        }),
      }));

      setAiGeneratedNotice(true);
      setAiConsistencyWarning(result.consistency_warning || null);
      setAiImageDescription(result.image_description || null);

      setShowAiModal(false);
      setAiStep("form");
      setAiPrompt("");
      setAiReplaceMode(false);
      setShowModal(true);
    } catch (err) {
      console.error("AI GENERATE ERROR:", err);

      setAiError(err.message || "Gagal membuat soal dengan AI");
    } finally {
      setAiGenerating(false);
    }
  }

  // Dipanggil ImportDocumentModal setelah ada soal yang berhasil
  // disimpan: tampilkan pesan sukses & muat ulang daftar Bank Soal.
  function handleImported(successCount) {
    toast.success(`${successCount} soal berhasil diimpor dari dokumen.`);

    loadQuestions();
  }

  // Sama seperti handleImported, untuk fitur Import dari Gambar
  // (components/ImportImageButton.jsx).
  function handleImportedFromImage(successCount) {
    toast.success(`${successCount} soal berhasil diimpor dari gambar.`);

    loadQuestions();
  }

  // ======================================================
  // FORM CHANGE
  // ======================================================

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,

      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // ======================================================
  // OPTION CHANGE
  // ======================================================

  function handleOptionTextChange(index, value) {
    setForm((prev) => {
      const newOptions = [...prev.options];

      newOptions[index] = {
        ...newOptions[index],
        option_text: value,
      };

      return {
        ...prev,
        options: newOptions,
      };
    });
  }

  // ======================================================
  // CORRECT ANSWER
  // ======================================================

  function handleCorrectAnswer(index) {
    setForm((prev) => {
      const newOptions = prev.options.map((option, optionIndex) => ({
        ...option,

        is_correct: optionIndex === index,
      }));

      return {
        ...prev,
        options: newOptions,
      };
    });
  }

  // ======================================================
  // VALIDATE FORM
  // ======================================================

  function validateForm() {
    if (!form.subject_id) {
      return "Mata pelajaran wajib dipilih";
    }

    if (!form.question_text.trim()) {
      return "Pertanyaan wajib diisi";
    }

    if (form.question_text.trim().length < 5) {
      return "Pertanyaan minimal 5 karakter";
    }

    const points = Number(form.points);

    if (!Number.isFinite(points) || points <= 0) {
      return "Bobot soal harus lebih besar dari 0";
    }

    for (let index = 0; index < form.options.length; index++) {
      const option = form.options[index];

      if (!option.option_text.trim()) {
        return `Pilihan ${option.option_code} ` + "wajib diisi";
      }
    }

    const correctOptions = form.options.filter((option) => option.is_correct);

    if (correctOptions.length !== 1) {
      return "Harus memilih tepat satu " + "jawaban yang benar";
    }

    return null;
  }

  // ======================================================
  // SUBMIT
  // ======================================================

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      toast.error(validationError);

      return;
    }

    try {
      setSaving(true);

      const payload = {
        subject_id: Number(form.subject_id),

        question_text: form.question_text.trim(),

        question_type: form.question_type,

        difficulty: form.difficulty,

        explanation: form.explanation.trim() || null,

        points: Number(form.points),

        is_active: form.is_active,

        options: form.options.map((option) => ({
          option_code: option.option_code,

          option_text: option.option_text.trim(),

          is_correct: option.is_correct,
        })),
      };

      // Soal dianggap "sudah ada" kalau sedang diedit, ATAU baru saja
      // dibuat lewat modal ini (lihat createdQuestionIdRef di atas).
      const existingId = editingQuestion?.id ?? createdQuestionIdRef.current;

      const data = existingId
        ? await updateQuestion(existingId, payload)
        : await createQuestion(payload);

      if (!existingId) {
        createdQuestionIdRef.current = data.id;
      }

      // --------------------------------------------------
      // GAMBAR SOAL — dijalankan SETELAH soal tersimpan (baru ada
      // data.id di titik ini). Try/catch TERPISAH dari penyimpanan
      // soal di atas: kalau bagian ini gagal, soal itu sendiri TETAP
      // tersimpan (jangan sampai guru mengira seluruh soal gagal
      // disimpan gara-gara gambar yang bermasalah).
      // --------------------------------------------------

      let imageStepFailed = false;

      if (selectedImageFile) {
        try {
          await uploadQuestionImage(data.id, selectedImageFile);
        } catch (imageErr) {
          console.error("UPLOAD IMAGE ERROR:", imageErr);
          imageStepFailed = true;
          toast.error(
            "Soal berhasil disimpan, tapi gambar gagal diupload: " +
              (imageErr.message || "kesalahan tidak diketahui") +
              ". Coba upload ulang gambarnya.",
          );
        }
      } else if (removeExistingImage && editingQuestion?.has_image) {
        try {
          await deleteQuestionImage(data.id);
        } catch (imageErr) {
          console.error("DELETE IMAGE ERROR:", imageErr);
          imageStepFailed = true;
          toast.error(
            "Soal berhasil disimpan, tapi gagal menghapus gambar: " +
              (imageErr.message || "kesalahan tidak diketahui"),
          );
        }
      }

      if (!imageStepFailed) {
        toast.success(
          data.message || (existingId ? "Soal berhasil diperbarui" : "Soal berhasil ditambahkan"),
        );
      }

      await loadQuestions();

      // Kalau langkah gambar gagal, modal SENGAJA tidak ditutup
      // otomatis -- biarkan guru lihat pesan errornya lalu klik
      // "Simpan" lagi untuk mencoba ulang. File gambar TETAP dipilih
      // (tidak di-null-kan) supaya preview dan isi form konsisten,
      // dan karena soalnya sudah tersimpan, klik "Simpan" berikutnya
      // meng-UPDATE soal itu -- bukan membuat soal baru.
      if (imageStepFailed) {
        return;
      }

      // Tunda penutupan modal supaya pesan sukses sempat terlihat.
      //
      // Ditunggu dengan await (BUKAN setTimeout lepas) supaya `saving`
      // TETAP true selama jeda ini: tombol Simpan/Batal/×/"Edit dengan
      // AI" tetap terkunci sampai modal benar-benar tertutup. Kalau
      // pakai setTimeout lepas, `saving` sudah false lebih dulu, dan
      // klik "Edit dengan AI" dalam jeda itu bisa kena reset timer
      // (editingQuestion jadi null) -> hasil AI disimpan sebagai soal
      // BARU (duplikat), bukan meng-update soal yang sedang diedit.
      await new Promise((resolve) => setTimeout(resolve, 900));

      setShowModal(false);
      setEditingQuestion(null);
      createdQuestionIdRef.current = null;
      setForm(createEmptyForm());
      setSelectedImageFile(null);
      setImagePreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
      setRemoveExistingImage(false);
      } catch (err) {
      console.error("SAVE QUESTION ERROR:", err);

      toast.error(err.message || "Gagal menyimpan soal");
    } finally {
      setSaving(false);
    }
  }

  // ======================================================
  // DELETE
  // ======================================================

  async function handleDelete(question) {
    if (!canDeleteQuestion(question)) {
      return;
    }

    const confirmed = window.confirm("Apakah Anda yakin ingin menghapus soal ini?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(question.id);

      const data = await deleteQuestionApi(question.id);

      toast.success(data.message || "Soal berhasil dihapus");

      await loadQuestions();

      setTimeout(() => {
        }, 2500);
    } catch (err) {
      console.error("DELETE QUESTION ERROR:", err);

      // Jaring pengaman: kalau backend tetap menolak (mis. role akun
      // diubah admin saat sesi masih berjalan), tampilkan pesan yang
      // menjelaskan solusinya, bukan sekadar "Tidak memiliki hak akses".
      // (Penolakan karena soal milik orang lain sudah membawa pesan
      // sendiri dari backend dan ditampilkan apa adanya.)
      setActionError(
        err.message === "Tidak memiliki hak akses"
          ? "Anda tidak memiliki hak untuk menghapus soal ini. Untuk menyembunyikan soal dari daftar, nonaktifkan lewat tombol Edit."
          : err.message || "Gagal menghapus soal",
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ======================================================
  // FILTER QUESTIONS
  // ======================================================

  const filteredQuestions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return questions.filter((question) => {
      const subjectName = getSubjectName(question.subject_id).toLowerCase();

      const questionText = (question.question_text || "").toLowerCase();

      const matchesSearch =
        !keyword || questionText.includes(keyword) || subjectName.includes(keyword);

      const matchesSubject =
        !subjectFilter || String(question.subject_id) === String(subjectFilter);

      const matchesDifficulty = !difficultyFilter || question.difficulty === difficultyFilter;

      const matchesStatus =
        !statusFilter || (statusFilter === "ACTIVE" ? question.is_active : !question.is_active);

      const hasExplanation = Boolean((question.explanation || "").trim());

      const matchesExplanation =
        !explanationFilter ||
        (explanationFilter === "COMPLETE" ? hasExplanation : !hasExplanation);

      const matchesMine = !onlyMine || (user && question.created_by === user.id);

      const matchesHasImage =
        !hasImageFilter ||
        (hasImageFilter === "WITH_IMAGE" ? question.has_image : !question.has_image);

      return (
        matchesSearch &&
        matchesSubject &&
        matchesDifficulty &&
        matchesStatus &&
        matchesExplanation &&
        matchesMine &&
        matchesHasImage
      );
    });
  }, [
    questions,
    search,
    subjectFilter,
    difficultyFilter,
    statusFilter,
    explanationFilter,
    onlyMine,
    hasImageFilter,
    user,
    getSubjectName,
  ]);

  const currentFilterSig = [
    search,
    subjectFilter,
    difficultyFilter,
    statusFilter,
    explanationFilter,
    onlyMine,
    hasImageFilter,
  ].join("|");

  const [lastFilterSig, setLastFilterSig] = useState(currentFilterSig);

  // Reset ke halaman 1 setiap kali pencarian/filter berubah
  // Dilakukan saat render (tanpa useEffect) untuk mencegah cascading renders
  if (currentFilterSig !== lastFilterSig) {
    setLastFilterSig(currentFilterSig);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE));

  // Kalau halaman aktif jadi lebih besar dari total halaman yang ada, mundurkan
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * QUESTIONS_PER_PAGE;
    return filteredQuestions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [filteredQuestions, currentPage]);

  const hasActiveQuestionFilter = Boolean(
    search ||
      subjectFilter ||
      difficultyFilter ||
      statusFilter ||
      explanationFilter ||
      onlyMine ||
      hasImageFilter
  );

  const resetQuestionFilters = () => {
    setSearch("");
    setSubjectFilter("");
    setDifficultyFilter("");
    setStatusFilter("");
    setExplanationFilter("");
    setOnlyMine(false);
    setHasImageFilter("");
  };

  // ======================================================
  // RENDER
  // ======================================================
  return {
    QUESTIONS_PER_PAGE,
    aiConsistencyWarning,
    aiError,
    aiForm,
    aiGate,
    aiGeneratedNotice,
    aiGenerating,
    aiImageDescription,
    aiPrompt,
    aiPromptLoading,
    aiReplaceMode,
    aiStep,
    canDeleteQuestion,
    closeAiModal,
    closeModal,
    closePreviewModal,
    createEmptyAiForm,
    createEmptyForm,
    createdQuestionIdRef,
    currentPage,
    deletingId,
    difficultyFilter,
    editAiGate,
    editingQuestion,
    explanationFilter,
    filteredQuestions,
    form,
    getDifficultyLabel,
    getSubjectName,
    handleAiFormChange,
    handleAiGenerate,
    handleBackToAiForm,
    handleChange,
    handleCorrectAnswer,
    handleDelete,
    handleImageFileChange,
    handleImported,
    handleImportedFromImage,
    handleOptionTextChange,
    handleRemoveImageClick,
    handleShowPrompt,
    handleSubmit,
    hasActiveQuestionFilter,
    hasImageFilter,
    imagePreviewUrl,
    imageGate,
    importGate,
    loadQuestions,
    loadSubjects,
    loading,
    onlyMine,
    openAddModal,
    openAiModal,
    openAiModalForEdit,
    openEditModal,
    openPreviewModal,
    paginatedQuestions,
    previewQuestion,
    questions,
    removeExistingImage,
    resetQuestionFilters,
    saving,
    search,
    selectedImageFile,
    setAiConsistencyWarning,
    setAiError,
    setAiForm,
    setAiGeneratedNotice,
    setAiGenerating,
    setAiImageDescription,
    setAiPrompt,
    setAiPromptLoading,
    setAiReplaceMode,
    setAiStep,
    setCurrentPage,
    setDeletingId,
    setDifficultyFilter,
    setEditingQuestion,
    setExplanationFilter,
    setForm,
    setHasImageFilter,
    setImagePreviewUrl,
    setLoading,
    setOnlyMine,
    setPreviewQuestion,
    setQuestions,
    setRemoveExistingImage,
    setSaving,
    setSearch,
    setSelectedImageFile,
    setShowAdvancedFilter,
    setShowAiModal,
    setShowGuideModal,
    setShowImportModal,
    setShowModal,
    setStatusFilter,
    setSubjectFilter,
    setSubjects,
    setTotalQuestions,
    showAdvancedFilter,
    showAiModal,
    showGuideModal,
    showImportModal,
    showModal,
    statusFilter,
    subjectFilter,
    subjects,
    totalPages,
    totalQuestions,
    user,
    validateForm
  };
}
