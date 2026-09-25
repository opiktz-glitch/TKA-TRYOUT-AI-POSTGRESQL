import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSubjects,
  getTryouts,
  getTryout,
  getTryoutReview,
  createTryout,
  updateTryout,
  deleteTryout as deleteTryoutApi,
} from "../services/api";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";

export function useTryoutManagement(DIFFICULTIES) {
  const { user } = useAuth();

  // Cakupan awal bank soal di form tryout: guru langsung melihat soal
  // buatannya sendiri (bisa diganti ke "Semua soal" di form), admin
  // langsung melihat semuanya.
  const defaultBankScope = user?.role === "GURU" ? "mine" : "all";

  // =====================================================
  // DATA
  // =====================================================

  const [tryouts, setTryouts] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // =====================================================
  // UI STATE
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTryout, setEditingTryout] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [bulkPoints, setBulkPoints] = useState("1");

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewTab, setReviewTab] = useState("soal");

  // =====================================================
  // FILTER
  // =====================================================

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  // true = hanya tampilkan tryout buatan user yang login. Sama
  // seperti toggle "Soal Saya" di Bank Soal.
  const [onlyMine, setOnlyMine] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  // =====================================================
  // PAGINATION (Paket Tryout)
  // =====================================================

  const TRYOUTS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);

  // =====================================================
  // MESSAGE
  // =====================================================

  // =====================================================
  // FORM
  // =====================================================

  function createEmptyForm() {
    return {
      title: "",
      description: "",
      subject_id: "",
      grade: "",
      duration_minutes: 60,
      max_score: 100,
      difficulty: "",
      is_active: true,
      questions: [],
    };
  }

  const [form, setForm] = useState(createEmptyForm());

  // =====================================================
  // LOAD SUBJECTS
  // =====================================================

  const loadSubjects = useCallback(async () => {
    try {
      const data = await getSubjects();

      setSubjects(data);
    } catch (err) {
      console.error("LOAD SUBJECT ERROR:", err);
      toast.error(err.message || "Gagal mengambil mata pelajaran");
    }
  }, []);

  // =====================================================
  // LOAD TRYOUT
  // =====================================================

  const loadTryouts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTryouts();

      setTryouts(data);
    } catch (err) {
      console.error("LOAD TRYOUT ERROR:", err);
      toast.error(err.message || "Gagal mengambil data tryout");
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // LOAD AWAL
  // =====================================================

  useEffect(() => {
    loadSubjects();
    loadTryouts();
  }, [loadSubjects, loadTryouts]);

  // =====================================================
  // GET SUBJECT NAME
  // =====================================================

  function getSubjectName(subjectId) {
    const subject = subjects.find(
      (item) => Number(item.id) === Number(subjectId)
    );

    return subject ? subject.name : "-";
  }

  // =====================================================
  // GET DIFFICULTY LABEL
  // =====================================================

  function getDifficultyLabel(difficulty) {
    const item = DIFFICULTIES.find(
      (difficultyItem) => difficultyItem.value === difficulty
    );

    return item ? item.label : difficulty || "-";
  }

  // =====================================================
  // FORM CHANGE
  // =====================================================

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    if (name === "subject_id") {
      if (
        form.subject_id &&
        String(form.subject_id) !== String(value) &&
        form.questions.length > 0
      ) {
        const confirmed = window.confirm(
          `Mengganti mata pelajaran akan mengosongkan ${form.questions.length} soal yang sudah dipilih. Lanjutkan?`
        );

        if (!confirmed) {
          return;
        }
      }

      // Soal hanya boleh berasal dari mata pelajaran yang sama
      // dengan paket, jadi pilihan soal dikosongkan saat mapel diganti.
      setForm((prev) => ({
        ...prev,
        subject_id: value,
        questions: [],
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // =====================================================
  // OPEN ADD MODAL
  // =====================================================

  function openModal() {
    setEditingTryout(null);
    setForm(createEmptyForm());
    setWizardStep(1);
    setBulkPoints("1");
    setShowModal(true);
  }

  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  async function openEditModal(tryout) {
    try {
      setEditingTryout(tryout);

      const detail = await getTryout(tryout.id);

      setForm({
        title: detail.title || "",
        description: detail.description || "",
        subject_id: String(detail.subject_id),
        grade: detail.grade || "",
        duration_minutes: detail.duration_minutes || 60,
        max_score: detail.max_score || 100,
        difficulty: detail.difficulty || "",
        is_active: detail.is_active !== false,
        // Selain id/nomor/bobot, backend juga mengirim snapshot soal
        // (teks, tingkat kesulitan, dst.) supaya daftar "Terpilih"
        // bisa tampil tanpa harus memuat seluruh bank soal.
        questions: (detail.questions || []).map((item) => ({
          question_id: Number(item.question_id),
          question_number: Number(item.question_number),
          points: Number(item.points || 1),
          question_text: item.question_text || "",
          difficulty: item.difficulty || "",
          has_image: Boolean(item.has_image),
          is_active: item.is_active !== false,
        })),
      });

      setWizardStep(1);
      setBulkPoints("1");
      setShowModal(true);
    } catch (err) {
      console.error("OPEN EDIT TRYOUT ERROR:", err);
      setEditingTryout(null);
      toast.error(err.message || "Gagal mengambil detail tryout");
    }
  }

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingTryout(null);
    setForm(createEmptyForm());
    setWizardStep(1);
    }

  // =====================================================
  // OPEN REVIEW MODAL (lihat soal & jawaban)
  // =====================================================

  async function openReviewModal(tryout) {
    try {
      setReviewError("");
      setReviewData(null);
      setReviewTab("soal");
      setShowReviewModal(true);
      setLoadingReview(true);

      const data = await getTryoutReview(tryout.id);

      setReviewData(data);
    } catch (err) {
      console.error("LOAD TRYOUT REVIEW ERROR:", err);
      setReviewError(err.message || "Gagal mengambil data review soal");
    } finally {
      setLoadingReview(false);
    }
  }

  // =====================================================
  // CLOSE REVIEW MODAL
  // =====================================================

  function closeReviewModal() {
    setShowReviewModal(false);
    setReviewData(null);
    setReviewError("");
    setReviewTab("soal");
  }

  // =====================================================
  // PRINT REVIEW
  // =====================================================

  function handlePrintReview() {
    window.print();
  }

  // =====================================================
  // VALIDATE FORM
  // =====================================================

  // Langkah 1 — informasi paket
  function validateInfo() {
    if (!form.title.trim()) {
      return "Judul tryout wajib diisi";
    }

    if (!form.subject_id) {
      return "Mata pelajaran wajib dipilih";
    }

    const duration = Number(form.duration_minutes);

    if (!Number.isFinite(duration) || duration <= 0) {
      return "Durasi harus lebih dari 0 menit";
    }

    const maxScore = Number(form.max_score);

    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      return "Nilai maksimal harus lebih dari 0";
    }

    return null;
  }

  // Langkah 2 — soal terpilih
  function validateQuestions() {
    if (form.questions.length === 0) {
      return "Minimal pilih satu soal untuk tryout";
    }

    for (let index = 0; index < form.questions.length; index++) {
      const question = form.questions[index];
      const points = Number(question.points);

      if (!Number.isFinite(points) || points <= 0) {
        return `Point soal nomor ${index + 1} harus lebih dari 0`;
      }

      if (question.is_active === false) {
        return `Soal nomor ${index + 1} (#${question.question_id}) sudah nonaktif. Hapus dari daftar terpilih.`;
      }
    }

    return null;
  }

  function validateForm() {
    return validateInfo() || validateQuestions();
  }

  // =====================================================
  // PINDAH LANGKAH
  // =====================================================

  // Pindah ke langkah tertentu; langkah sebelumnya harus valid dulu.
  function goToStep(target) {
    if (saving) {
      return;
    }

    if (target > 1) {
      const infoError = validateInfo();

      if (infoError) {
        toast.error(infoError);
        setWizardStep(1);
        return;
      }
    }

    if (target > 2) {
      const questionsError = validateQuestions();

      if (questionsError) {
        toast.error(questionsError);
        setWizardStep(2);
        return;
      }
    }

    setWizardStep(target);
  }

  // Menyamakan bobot semua soal terpilih (langkah "Tinjau").
  function applyBulkPoints() {
    const value = Number(bulkPoints);

    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Bobot per soal harus lebih dari 0");
      return;
    }

    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => ({
        ...item,
        points: value,
      })),
    }));
  }

  // =====================================================
  // SUBMIT
  // =====================================================

  async function handleSubmit(event) {
    event.preventDefault();

    // Form ini bertahap: kirim hanya dari langkah terakhir (Tinjau).
    if (wizardStep !== 3) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        subject_id: Number(form.subject_id),
        grade: form.grade || null,
        duration_minutes: Number(form.duration_minutes),
        max_score: Number(form.max_score),
        difficulty: form.difficulty.trim() || null,
        is_active: form.is_active,
        questions: form.questions.map((item) => ({
          question_id: Number(item.question_id),
          question_number: Number(item.question_number),
          points: Number(item.points),
        })),
      };

      const data = editingTryout
        ? await updateTryout(editingTryout.id, payload)
        : await createTryout(payload);

      setFormSuccess(
        data.message ||
          (editingTryout
            ? "Tryout berhasil diperbarui"
            : "Tryout berhasil dibuat")
      );

      await loadTryouts();

      /*
       * Tunggu sebentar supaya admin sempat melihat
       * pesan berhasil sebelum modal tertutup.
       */
      setTimeout(() => {
        setShowModal(false);
        setEditingTryout(null);
        setForm(createEmptyForm());
        setWizardStep(1);
        }, 900);
    } catch (err) {
      console.error("SAVE TRYOUT ERROR:", err);
      toast.error(err.message || "Gagal menyimpan tryout");
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // DELETE
  // =====================================================

  async function handleDelete(tryout) {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus tryout "${tryout.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(tryout.id);
      const data = await deleteTryoutApi(tryout.id);

      toast.success(data.message || `Tryout "${tryout.title}" berhasil dihapus`);

      await loadTryouts();

      setTimeout(() => {
        }, 2500);
    } catch (err) {
      console.error("DELETE TRYOUT ERROR:", err);
      toast.error(err.message || "Gagal menghapus tryout");
    } finally {
      setDeletingId(null);
    }
  }

  // =====================================================
  // FILTER TRYOUT
  // =====================================================

  const filteredTryouts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return tryouts.filter((tryout) => {
      const subjectName = getSubjectName(tryout.subject_id).toLowerCase();
      const title = (tryout.title || "").toLowerCase();
      const description = (tryout.description || "").toLowerCase();

      const matchesSearch =
        !keyword ||
        title.includes(keyword) ||
        description.includes(keyword) ||
        subjectName.includes(keyword);

      const matchesSubject =
        !subjectFilter || String(tryout.subject_id) === String(subjectFilter);

      const matchesCreator =
        !onlyMine || Number(tryout.created_by) === Number(user?.id);

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" ? tryout.is_active : !tryout.is_active);

      return (
        matchesSearch && matchesSubject && matchesCreator && matchesStatus
      );
    });
  }, [tryouts, subjects, search, subjectFilter, onlyMine, statusFilter, user]);

  // Reset ke halaman 1 setiap kali pencarian/filter berubah, supaya
  // tidak "nyangkut" di halaman yang sudah tidak relevan.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, subjectFilter, onlyMine, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTryouts.length / TRYOUTS_PER_PAGE)
  );

  // Kalau halaman aktif jadi lebih besar dari total halaman yang ada
  // (mis. setelah tryout terakhir di halaman itu dihapus), mundurkan
  // otomatis ke halaman terakhir yang valid.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const hasActiveTryoutFilter = Boolean(
    search || subjectFilter || onlyMine || statusFilter
  );

  const resetTryoutFilters = () => {
    setSearch("");
    setSubjectFilter("");
    setOnlyMine(false);
    setStatusFilter("");
  };

  const paginatedTryouts = useMemo(() => {
    const start = (currentPage - 1) * TRYOUTS_PER_PAGE;
    return filteredTryouts.slice(start, start + TRYOUTS_PER_PAGE);
  }, [filteredTryouts, currentPage]);

  // =====================================================
  // RINGKASAN SOAL TERPILIH (untuk footer & langkah "Tinjau")
  // =====================================================

  const totalPoints = useMemo(
    () =>
      Math.round(
        form.questions.reduce(
          (total, item) => total + Number(item.points || 0),
          0
        ) * 100
      ) / 100,
    [form.questions]
  );

  const difficultyBreakdown = useMemo(
    () =>
      DIFFICULTIES.map((item) => ({
        ...item,
        count: form.questions.filter(
          (question) => question.difficulty === item.value
        ).length,
      })),
    [form.questions]
  );

  // =====================================================
  // RENDER
  // =====================================================
  return {
    user,
    defaultBankScope,
    tryouts,
    subjects,
    search,
    setSearch,
    subjectFilter,
    setSubjectFilter,
    statusFilter,
    setStatusFilter,
    onlyMine,
    setOnlyMine,
    currentPage,
    setCurrentPage,
    TRYOUTS_PER_PAGE,
    loading,
    deletingId,
    showModal,
    wizardStep,
    editingTryout,
    saving,
    form,
    setForm,
    bulkPoints,
    setBulkPoints,
    showReviewModal,
    hasActiveTryoutFilter,
    filteredTryouts,
    totalPages,
    paginatedTryouts,
    totalPoints,
    difficultyBreakdown,
    getSubjectName,
    getDifficultyLabel,
    resetTryoutFilters,
    openModal,
    closeModal,
    goToStep,
    handleChange,
    applyBulkPoints,
    openEditModal,
    openReviewModal,
    closeReviewModal,
    handleSubmit,
    handleDelete,
    handlePrintReview,
    loadingReview,
    reviewError,
    reviewData,
    reviewTab,
    setReviewTab
  };
}
