import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { IconEdit, IconTrash, IconCheck, IconBook, IconEye } from "../components/Icons";
import PanduanSoalModal from "../components/PanduanSoalModal";
import QuestionImage from "../components/QuestionImage";
import QuestionPreviewModal from "../components/QuestionPreviewModal";
import ImportDocumentModal from "../components/ImportDocumentModal";
import ImportImageButton from "../components/ImportImageButton";
import ExplanationField from "../components/ExplanationField";
import OptionsEditor from "../components/OptionsEditor";
import useAiStatusGate from "../hooks/useAiStatusGate";
import { useAuth } from "../auth/AuthContext";
import { OPTION_CODES, DIFFICULTIES } from "../data/questionConstants";
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

function QuestionManagement() {
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
  // State isian modal (langkah, file, hasil ekstraksi, dst.) ada di
  // dalam ImportDocumentModal dan otomatis mulai dari nol karena
  // komponennya di-mount baru setiap modal dibuka.
  const importGate = useAiStatusGate();

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

  // ======================================================
  // PAGINATION (Bank Soal)
  // ======================================================

  const QUESTIONS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);

  // ======================================================
  // MESSAGE
  // ======================================================

  const [loadError, setLoadError] = useState("");

  const [actionError, setActionError] = useState("");

  const [actionSuccess, setActionSuccess] = useState("");

  const [formError, setFormError] = useState("");

  const [formSuccess, setFormSuccess] = useState("");

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
  const [imageActionError, setImageActionError] = useState("");

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

    setImageActionError("");

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

      setLoadError(err.message || "Gagal mengambil mata pelajaran");
    }
  }, []);

  // ======================================================
  // LOAD QUESTIONS
  // ======================================================

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const data = await getQuestions();

      setQuestions(data);
    } catch (err) {
      console.error("LOAD QUESTIONS ERROR:", err);

      setLoadError(err.message || "Gagal mengambil bank soal");
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

  function getSubjectName(subjectId) {
    const subject = subjects.find((item) => item.id === subjectId);

    return subject ? subject.name : "-";
  }

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

    setFormError("");
    setFormSuccess("");
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
    setImageActionError("");

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

    setFormError("");
    setFormSuccess("");
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
    setImageActionError("");

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

    setFormError("");
    setFormSuccess("");
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
    setImageActionError("");
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

      setFormError("");
      setFormSuccess("");
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
    setActionSuccess(`${successCount} soal berhasil diimpor dari dokumen.`);

    loadQuestions();
  }

  // Sama seperti handleImported, untuk fitur Import dari Gambar
  // (components/ImportImageButton.jsx).
  function handleImportedFromImage(successCount) {
    setActionSuccess(`${successCount} soal berhasil diimpor dari gambar.`);

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

    setFormError("");
    setFormSuccess("");
    setImageActionError("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);

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
          setImageActionError(
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
          setImageActionError(
            "Soal berhasil disimpan, tapi gagal menghapus gambar: " +
              (imageErr.message || "kesalahan tidak diketahui"),
          );
        }
      }

      setFormSuccess(
        data.message || (existingId ? "Soal berhasil diperbarui" : "Soal berhasil ditambahkan"),
      );

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
      setFormSuccess("");
      setSelectedImageFile(null);
      setImagePreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
      setRemoveExistingImage(false);
      setImageActionError("");
    } catch (err) {
      console.error("SAVE QUESTION ERROR:", err);

      setFormError(err.message || "Gagal menyimpan soal");
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

      setActionError("");
      setActionSuccess("");

      const data = await deleteQuestionApi(question.id);

      setActionSuccess(data.message || "Soal berhasil dihapus");

      await loadQuestions();

      setTimeout(() => {
        setActionSuccess("");
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

      return matchesSearch && matchesSubject && matchesDifficulty && matchesStatus;
    });
  }, [questions, subjects, search, subjectFilter, difficultyFilter, statusFilter]);

  // Reset ke halaman 1 setiap kali pencarian/filter berubah, supaya
  // tidak "nyangkut" di halaman 5 misalnya padahal hasil filter
  // barunya cuma ada 1 halaman.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, subjectFilter, difficultyFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE));

  // Kalau halaman aktif jadi lebih besar dari total halaman yang ada
  // (mis. setelah soal terakhir di halaman itu dihapus), mundurkan
  // otomatis ke halaman terakhir yang valid.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * QUESTIONS_PER_PAGE;
    return filteredQuestions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [filteredQuestions, currentPage]);

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="content">
          {/* ============================================
              PAGE HEADER
              ============================================ */}

          <div className="page-header">
            <div>
              <h1>Bank Soal</h1>

              <p>Kelola soal TKA Tryout</p>

              {aiGate.message && (
                <div
                  className="form-error-message"
                  style={{
                    marginTop: 10,
                    maxWidth: 520,
                  }}
                >
                  {aiGate.message}
                </div>
              )}

              {importGate.message && (
                <div
                  className="form-error-message"
                  style={{
                    marginTop: 10,
                    maxWidth: 520,
                  }}
                >
                  {importGate.message}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => importGate.run(() => setShowImportModal(true))}
                disabled={importGate.checking}
              >
                {importGate.checking ? "Mengecek AI..." : "📄 Impor dari Dokumen"}
              </button>

              <ImportImageButton subjects={subjects} onImported={handleImportedFromImage} />

              <button
                type="button"
                className="secondary-button"
                onClick={() => aiGate.run(openAiModal)}
                disabled={aiGate.checking}
              >
                {aiGate.checking ? "Mengecek AI..." : "✨ Tambah Soal AI"}
              </button>

              <button className="primary-button" onClick={openAddModal}>
                + Tambah Soal
              </button>
            </div>
          </div>

          {/* ============================================
              FILTER & TABLE CARD
              ============================================ */}

          <div className="dashboard-card">
            <div className="question-filter">
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="Cari pertanyaan..."
                  className="search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="search-input"
                >
                  <option value="">Semua Mata Pelajaran</option>

                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="search-input"
                >
                  <option value="">Semua Tingkat Kesulitan</option>

                  {DIFFICULTIES.map((difficulty) => (
                    <option key={difficulty.value} value={difficulty.value}>
                      {difficulty.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="search-input"
                >
                  <option value="">Semua Status</option>

                  <option value="ACTIVE">Aktif</option>

                  <option value="INACTIVE">Tidak Aktif</option>
                </select>
              </div>
            </div>

            {loading && questions.length === 0 && (
              <div className="loading-message">Memuat bank soal...</div>
            )}

            {loadError && !showModal && <div className="error-message">{loadError}</div>}

            {actionError && (
              <div className="form-error-message" style={{ marginBottom: "15px" }}>
                {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="success-message" style={{ marginBottom: "15px" }}>
                <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                {actionSuccess}
              </div>
            )}

            {/* Tabel TIDAK disembunyikan saat reload (setelah simpan/hapus/impor)
                selama sudah ada data -- supaya tidak berkedip & posisi scroll
                tidak hilang. Spinner cuma muncul saat pemuatan pertama. */}
            {(!loading || questions.length > 0) && (
              <div className="table-container">
                <table className="user-table question-bank-table">
                  <thead>
                    <tr>
                      <th className="align-center">No</th>
                      <th className="align-center">ID</th>
                      <th className="align-center">Mata Pelajaran</th>
                      <th className="align-center">Pertanyaan</th>
                      <th className="align-center">Tingkat</th>
                      <th className="align-center">Bobot</th>
                      <th className="align-center">Status</th>
                      <th className="align-center sticky-col">Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedQuestions.map((question, index) => (
                      <tr key={question.id}>
                        <td className="align-center">
                          {(currentPage - 1) * QUESTIONS_PER_PAGE + index + 1}
                        </td>

                        <td className="align-center">{question.id}</td>

                        <td className="align-left">
                          <strong>{getSubjectName(question.subject_id)}</strong>
                        </td>

                        <td className="align-left">
                          <div className="question-preview">{question.question_text}</div>
                        </td>

                        <td className="align-center">
                          <span
                            className={
                              `difficulty-badge ` + (question.difficulty || "").toLowerCase()
                            }
                          >
                            {getDifficultyLabel(question.difficulty)}
                          </span>
                        </td>

                        <td className="align-center">{question.points}</td>

                        <td className="align-center">
                          {question.is_active ? (
                            <span className="status-active">Aktif</span>
                          ) : (
                            <span className="status-inactive">Nonaktif</span>
                          )}
                        </td>

                        <td className="align-center sticky-col">
                          <div className="action-buttons">
                            <button
                              className="review-button"
                              title="Preview Soal"
                              onClick={() => openPreviewModal(question)}
                            >
                              <IconEye size={16} />
                            </button>

                            <button className="edit-button" onClick={() => openEditModal(question)}>
                              <IconEdit size={16} />
                            </button>

                            {canDeleteQuestion(question) && (
                              <button
                                className="delete-button"
                                onClick={() => handleDelete(question)}
                                disabled={deletingId === question.id}
                              >
                                <IconTrash size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredQuestions.length === 0 && (
                  <div className="empty-message">
                    {search || subjectFilter || difficultyFilter || statusFilter
                      ? "Soal tidak ditemukan."
                      : "Belum ada soal."}
                  </div>
                )}

                {filteredQuestions.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                      padding: "14px 4px",
                      // Tetap terlihat di bagian bawah walau daftar soal
                      // di tabel di atasnya panjang & di-scroll — sama
                      // seperti pola .modal-footer (lihat App.css),
                      // supaya tidak perlu scroll ke paling bawah dulu
                      // baru tombol halaman muncul. "bottom: 0" lengket
                      // ke tepi bawah AREA SCROLL-nya (elemen ".content"
                      // di App.css, bukan seluruh window), karena itu
                      // nearest scrolling ancestor dari tabel ini.
                      position: "sticky",
                      bottom: 0,
                      background: "white",
                      borderTop: "1px solid var(--line)",
                      boxShadow: "0 -2px 6px rgba(0, 0, 0, 0.04)",
                      zIndex: 2,
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#6b7280" }}>
                      Menampilkan {(currentPage - 1) * QUESTIONS_PER_PAGE + 1}
                      {"–"}
                      {Math.min(
                        currentPage * QUESTIONS_PER_PAGE,
                        filteredQuestions.length,
                      )} dari {filteredQuestions.length} soal
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Sebelumnya
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        // Kalau halamannya banyak, cukup tampilkan halaman
                        // pertama, terakhir, dan beberapa di sekitar halaman
                        // aktif — sisanya diringkas jadi "…" supaya baris
                        // nomor halaman tidak melebar tak terbatas.
                        .filter((page) => {
                          if (totalPages <= 7) return true;
                          return (
                            page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                          );
                        })
                        .reduce((acc, page, idx, arr) => {
                          if (idx > 0 && page - arr[idx - 1] > 1) {
                            acc.push("ellipsis-" + page);
                          }
                          acc.push(page);
                          return acc;
                        }, [])
                        .map((item) =>
                          typeof item === "string" ? (
                            <span
                              key={item}
                              style={{ padding: "0 4px", color: "#9ca3af", fontSize: 13 }}
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setCurrentPage(item)}
                              style={{
                                minWidth: 32,
                                height: 32,
                                borderRadius: 6,
                                border: "1px solid var(--line)",
                                background: item === currentPage ? "var(--accent)" : "white",
                                color: item === currentPage ? "white" : "#374151",
                                fontWeight: item === currentPage ? 600 : 500,
                                fontSize: 13,
                                cursor: "pointer",
                              }}
                            >
                              {item}
                            </button>
                          ),
                        )}

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ==================================================
          MODAL TAMBAH / EDIT SOAL
          ================================================== */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal question-modal">
            <div className="modal-header">
              <div>
                <h2>{editingQuestion ? "Edit Soal" : "Tambah Soal"}</h2>

                <p>
                  {editingQuestion
                    ? "Perbaharui data soal pilihan ganda"
                    : "Tambahkan soal pilihan ganda baru"}
                </p>
              </div>

              <button type="button" className="modal-close" onClick={closeModal} disabled={saving}>
                ×
              </button>
            </div>

            {editingQuestion && (
              <div
                style={{
                  // Modal (.modal) sudah punya padding 24px sendiri, jadi wrapper
                  // ini TIDAK boleh menambah padding horizontal lagi.
                  // Tombol + teks penjelasan diletakkan di tengah modal.
                  padding: 0,
                  marginTop: "16px",
                  marginBottom: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                {editAiGate.message && (
                  <div
                    className="form-error-message"
                    style={{ marginBottom: "10px", width: "100%", textAlign: "left" }}
                  >
                    {editAiGate.message}
                  </div>
                )}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => editAiGate.run(openAiModalForEdit)}
                  disabled={editAiGate.checking || saving}
                >
                  {editAiGate.checking ? "Mengecek AI..." : "✨ Edit dengan AI"}
                </button>

                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginTop: "8px",
                    marginBottom: "0",
                    maxWidth: "560px",
                  }}
                >
                  AI akan membuatkan draft soal pengganti untuk soal ini. Draft akan mengisi form di
                  bawah — Anda tetap bisa edit manual sebelum menekan "Simpan Perubahan".
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {aiConsistencyWarning && (
                <div className="form-error-message" style={{ marginBottom: "15px" }}>
                  ⚠️ {aiConsistencyWarning}
                </div>
              )}

              {aiGeneratedNotice && (
                <div className="success-message" style={{ marginBottom: "15px" }}>
                  ✨ Soal ini dibuat oleh AI. Periksa dan edit bila perlu sebelum menyimpan —
                  pastikan jawaban yang ditandai benar sudah tepat.
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Mata Pelajaran *</label>

                  <select
                    name="subject_id"
                    value={form.subject_id}
                    onChange={handleChange}
                    disabled={saving}
                    required
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>

                    {subjects
                      .filter((subject) => subject.is_active)
                      .map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Tingkat Kesulitan *</label>

                  <select
                    name="difficulty"
                    value={form.difficulty}
                    onChange={handleChange}
                    disabled={saving}
                    required
                  >
                    {DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty.value} value={difficulty.value}>
                        {difficulty.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Pertanyaan *</label>

                <textarea
                  name="question_text"
                  value={form.question_text}
                  onChange={handleChange}
                  placeholder="Tuliskan pertanyaan..."
                  rows="4"
                  disabled={saving}
                  required
                />
              </div>

              <div className="form-group">
                <label>Gambar Soal (opsional)</label>

                {aiImageDescription && (
                  <div className="success-message" style={{ marginBottom: 10 }}>
                    ✨ Saran ilustrasi dari AI (bukan gambar jadi — siapkan/unggah sendiri gambar
                    yang sesuai):
                    <br />
                    <em>{aiImageDescription}</em>
                  </div>
                )}

                {imagePreviewUrl && (
                  <img
                    src={imagePreviewUrl}
                    alt="Preview gambar soal"
                    className="question-image-form-preview"
                  />
                )}

                {!imagePreviewUrl && !removeExistingImage && editingQuestion?.has_image && (
                  <QuestionImage
                    questionId={editingQuestion.id}
                    alt="Gambar soal saat ini"
                    className="question-image-form-preview"
                  />
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  disabled={saving}
                />

                <span className="form-hint">
                  Format apa saja (JPG/PNG/dll), maksimal 5 MB — otomatis dikompres & diubah ke WebP
                  saat disimpan.
                </span>

                {(imagePreviewUrl || (editingQuestion?.has_image && !removeExistingImage)) && (
                  <button
                    type="button"
                    className="btn-link-danger"
                    onClick={handleRemoveImageClick}
                    disabled={saving}
                  >
                    Hapus gambar
                  </button>
                )}

                {imageActionError && <div className="form-error-message">{imageActionError}</div>}
              </div>

              <OptionsEditor
                options={form.options}
                name="correct_answer"
                required
                disabled={saving}
                onTextChange={handleOptionTextChange}
                onCorrectChange={handleCorrectAnswer}
              />

              <ExplanationField
                value={form.explanation}
                onTextChange={(text) =>
                  setForm((prev) => ({ ...prev, explanation: text }))
                }
                disabled={saving}
                questionText={form.question_text}
                options={form.options}
                subjectId={form.subject_id}
                hasImage={
                  Boolean(imagePreviewUrl) ||
                  Boolean(editingQuestion?.has_image && !removeExistingImage) ||
                  Boolean(aiImageDescription)
                }
              />

              <div className="form-row">
                <div className="form-group">
                  <label>Bobot Soal *</label>

                  <input
                    type="number"
                    name="points"
                    value={form.points}
                    onChange={handleChange}
                    min="0.1"
                    step="0.1"
                    disabled={saving}
                    required
                  />
                </div>

                <div
                  className="form-checkbox"
                  style={{ alignSelf: "flex-end", paddingBottom: "8px" }}
                >
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    id="is_active"
                    disabled={saving}
                  />

                  <label htmlFor="is_active">Soal aktif</label>
                </div>
              </div>

              {formError && (
                <div className="form-error-message" style={{ marginBottom: "15px" }}>
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="success-message" style={{ marginBottom: "15px" }}>
                  <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                  {formSuccess}
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="guide-button"
                  onClick={() => setShowGuideModal(true)}
                >
                  <IconBook size={15} />
                  Panduan
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Soal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================
          MODAL GENERATE SOAL AI (TAMBAH / GANTI SOAL)
          ============================================ */}

      {showAiModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>{aiReplaceMode ? "✨ Ganti Soal dengan AI" : "✨ Tambah Soal dengan AI"}</h2>

                <p>
                  {aiStep === "form"
                    ? "Prompt akan ditampilkan dulu untuk diperiksa sebelum soal benar-benar dibuat oleh AI."
                    : 'Periksa dan edit prompt di bawah ini kalau perlu, lalu tekan "Generate Soal".'}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeAiModal}
                disabled={aiGenerating || aiPromptLoading}
              >
                ×
              </button>
            </div>

            {aiStep === "form" && (
              <form onSubmit={handleShowPrompt}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Mata Pelajaran *</label>

                    <select
                      name="subject_id"
                      value={aiForm.subject_id}
                      onChange={handleAiFormChange}
                      disabled={aiPromptLoading}
                      required
                    >
                      <option value="">-- Pilih Mata Pelajaran --</option>

                      {subjects
                        .filter((subject) => subject.is_active)
                        .map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code} - {subject.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tingkat Kesulitan *</label>

                    <select
                      name="difficulty"
                      value={aiForm.difficulty}
                      onChange={handleAiFormChange}
                      disabled={aiPromptLoading}
                      required
                    >
                      {DIFFICULTIES.map((difficulty) => (
                        <option key={difficulty.value} value={difficulty.value}>
                          {difficulty.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Jenis Soal</label>

                  <select value="MULTIPLE_CHOICE" disabled>
                    <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                  </select>

                  <small style={{ color: "#6b7280" }}>
                    Jenis soal lain (Benar/Salah, Isian Singkat) belum didukung sistem ini.
                  </small>
                </div>

                <div className="form-group">
                  <label>Materi / Lingkup Soal *</label>

                  <input
                    type="text"
                    name="materi"
                    value={aiForm.materi}
                    onChange={handleAiFormChange}
                    placeholder="Contoh: pecahan, penjumlahan bilangan bulat"
                    disabled={aiPromptLoading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 8,
                      width: "100%",
                      fontWeight: 400,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="with_image"
                      checked={aiForm.with_image}
                      onChange={handleAiFormChange}
                      disabled={aiPromptLoading}
                    />
                    <span>Buat soal bergambar</span>
                  </label>

                  <span className="form-hint" style={{ display: "block", textAlign: "left" }}>
                    AI cuma menyarankan deskripsi gambar yang cocok (bukan membuat file gambarnya) —
                    gambar sungguhan tetap perlu kamu siapkan &amp; unggah sendiri lewat form soal
                    setelah digenerate.
                  </span>
                </div>

                <div className="form-group">
                  <label>Perintah Tambahan (opsional)</label>

                  <textarea
                    name="additional_instruction"
                    value={aiForm.additional_instruction}
                    onChange={handleAiFormChange}
                    placeholder="Contoh: gunakan konteks soal cerita, hindari angka negatif"
                    rows={3}
                    disabled={aiPromptLoading}
                  />
                </div>

                {aiError && (
                  <div className="form-error-message" style={{ marginBottom: "15px" }}>
                    {aiError}
                  </div>
                )}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="guide-button"
                    onClick={() => setShowGuideModal(true)}
                  >
                    <IconBook size={15} />
                    Panduan
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeAiModal}
                    disabled={aiPromptLoading}
                  >
                    Batal
                  </button>

                  <button type="submit" className="primary-button" disabled={aiPromptLoading}>
                    {aiPromptLoading ? "Menyusun prompt..." : "Lihat & Edit Prompt"}
                  </button>
                </div>
              </form>
            )}

            {aiStep === "prompt" && (
              <form onSubmit={handleAiGenerate}>
                <div className="form-group">
                  <label>Prompt untuk AI</label>

                  <textarea
                    name="prompt"
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={14}
                    disabled={aiGenerating}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "13px",
                    }}
                    required
                  />

                  <small style={{ color: "#6b7280" }}>
                    Ini teks persis yang akan dikirim ke AI. Boleh diubah bebas — misalnya menambah
                    contoh soal, mengetatkan format, atau mengganti bahasa instruksi.
                  </small>
                </div>

                {aiError && (
                  <div className="form-error-message" style={{ marginBottom: "15px" }}>
                    {aiError}
                  </div>
                )}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleBackToAiForm}
                    disabled={aiGenerating}
                  >
                    ← Kembali
                  </button>

                  <button type="submit" className="primary-button" disabled={aiGenerating}>
                    {aiGenerating ? "Membuat soal... (bisa 1-2 menit)" : "Generate Soal"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showImportModal && (
        <ImportDocumentModal
          subjects={subjects}
          onClose={() => setShowImportModal(false)}
          onImported={handleImported}
        />
      )}

      {previewQuestion && (
        <QuestionPreviewModal
          question={previewQuestion}
          subjectName={getSubjectName(previewQuestion.subject_id)}
          difficultyLabel={getDifficultyLabel(previewQuestion.difficulty)}
          onClose={closePreviewModal}
        />
      )}

      {showGuideModal && <PanduanSoalModal onClose={() => setShowGuideModal(false)} />}
    </div>
  );
}

export default QuestionManagement;
