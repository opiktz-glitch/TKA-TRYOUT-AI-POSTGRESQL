import { useCallback, useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Pagination from "../components/Pagination";
import QuestionImage from "../components/QuestionImage";
import TryoutQuestionPicker from "../components/TryoutQuestionPicker";
import "../components/TryoutWizard.css";
import { useAuth } from "../auth/AuthContext";
import {
  IconEdit,
  IconTrash,
  IconCheck,
  IconEye,
  IconSearch,
} from "../components/Icons";
import "../components/ScoreTable.css";
import {
  getSubjects,
  getTryouts,
  getTryout,
  getTryoutReview,
  createTryout,
  updateTryout,
  deleteTryout as deleteTryoutApi,
} from "../services/api";

const DIFFICULTIES = [
  {
    value: "EASY",
    label: "Mudah",
  },
  {
    value: "MEDIUM",
    label: "Sedang",
  },
  {
    value: "HARD",
    label: "Sulit",
  },
];

const GRADES = ["4", "5", "6"];

// Langkah pada form Tambah/Edit Paket Tryout
const WIZARD_STEPS = [
  { n: 1, label: "Informasi paket" },
  { n: 2, label: "Pilih soal" },
  { n: 3, label: "Tinjau" },
];

function TryoutManagement() {
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
  // "" = Semua soal, "mine" = hanya tryout buatan user yang login
  const [creatorFilter, setCreatorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // =====================================================
  // PAGINATION (Paket Tryout)
  // =====================================================

  const TRYOUTS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);

  // =====================================================
  // MESSAGE
  // =====================================================

  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

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
      setLoadError(err.message || "Gagal mengambil mata pelajaran");
    }
  }, []);

  // =====================================================
  // LOAD TRYOUT
  // =====================================================

  const loadTryouts = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const data = await getTryouts();

      setTryouts(data);
    } catch (err) {
      console.error("LOAD TRYOUT ERROR:", err);
      setLoadError(err.message || "Gagal mengambil data tryout");
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
    setFormError("");
    setFormSuccess("");
    setShowModal(true);
  }

  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  async function openEditModal(tryout) {
    try {
      setLoadError("");
      setFormError("");
      setFormSuccess("");
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
      setLoadError(err.message || "Gagal mengambil detail tryout");
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
    setFormError("");
    setFormSuccess("");
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

    setFormError("");
    setFormSuccess("");

    if (target > 1) {
      const infoError = validateInfo();

      if (infoError) {
        setFormError(infoError);
        setWizardStep(1);
        return;
      }
    }

    if (target > 2) {
      const questionsError = validateQuestions();

      if (questionsError) {
        setFormError(questionsError);
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
      setFormError("Bobot per soal harus lebih dari 0");
      return;
    }

    setFormError("");

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

    setFormError("");
    setFormSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
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
        setFormSuccess("");
      }, 900);
    } catch (err) {
      console.error("SAVE TRYOUT ERROR:", err);
      setFormError(err.message || "Gagal menyimpan tryout");
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
      setActionError("");
      setActionSuccess("");

      const data = await deleteTryoutApi(tryout.id);

      setActionSuccess(data.message || `Tryout "${tryout.title}" berhasil dihapus`);

      await loadTryouts();

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);
    } catch (err) {
      console.error("DELETE TRYOUT ERROR:", err);
      setActionError(err.message || "Gagal menghapus tryout");
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
        !creatorFilter ||
        (creatorFilter === "mine" &&
          Number(tryout.created_by) === Number(user?.id));

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" ? tryout.is_active : !tryout.is_active);

      return (
        matchesSearch && matchesSubject && matchesCreator && matchesStatus
      );
    });
  }, [tryouts, subjects, search, subjectFilter, creatorFilter, statusFilter, user]);

  // Reset ke halaman 1 setiap kali pencarian/filter berubah, supaya
  // tidak "nyangkut" di halaman yang sudah tidak relevan.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, subjectFilter, creatorFilter, statusFilter]);

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
    search || subjectFilter || creatorFilter || statusFilter
  );

  // Label opsi "mine" di filter Guru Pembuat: tampilkan nama guru yang
  // sedang login supaya jelas ini bukan sekadar teks generik.
  const myTryoutOptionLabel = (user?.full_name || user?.username)
    ? `Punya saya (${user.full_name || user.username})`
    : "Guru yang login saja";

  const resetTryoutFilters = () => {
    setSearch("");
    setSubjectFilter("");
    setCreatorFilter("");
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

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="content">
          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="page-header">
            <div>
              <h1>Paket Tryout</h1>
              <p>Kelola paket tryout TKA</p>
            </div>

            <button className="primary-button" onClick={openModal}>
              + Tambah Tryout
            </button>
          </div>

          {/* =================================================
              TABLE CARD & FILTER
          ================================================= */}

          <div className="score-card">
            <div className="score-toolbar">
              <label className="score-search">
                <IconSearch size={16} />
                <input
                  type="text"
                  placeholder="Cari judul tryout..."
                  aria-label="Cari tryout"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <select
                className={`score-select${subjectFilter ? " is-active" : ""}`}
                aria-label="Filter mata pelajaran"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <option value="">Semua Mapel</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>

              <select
                className={`score-select${creatorFilter ? " is-active" : ""}`}
                aria-label="Filter guru pembuat"
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
              >
                <option value="">Semua Tryout</option>
                <option value="mine">{myTryoutOptionLabel}</option>
              </select>

              <select
                className={`score-select${statusFilter ? " is-active" : ""}`}
                aria-label="Filter status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>

            {loading && (
              <div className="loading-message">Memuat data tryout...</div>
            )}

            {loadError && !showModal && (
              <div className="error-message">{loadError}</div>
            )}

            {actionError && (
              <div className="form-error-message" style={{ margin: "0 16px", marginTop: "12px" }}>
                {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="success-message" style={{ margin: "0 16px", marginTop: "12px" }}>
                <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                {actionSuccess}
              </div>
            )}

            {!loading && (
              <>
                <div className="score-meta">
                  <span>{filteredTryouts.length} tryout</span>

                  {hasActiveTryoutFilter && (
                    <button type="button" className="score-reset" onClick={resetTryoutFilters}>
                      Reset filter
                    </button>
                  )}
                </div>

                {filteredTryouts.length === 0 ? (
                  <div className="empty-message">
                    {hasActiveTryoutFilter
                      ? "Paket tryout tidak ditemukan."
                      : "Belum ada paket tryout."}
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="score-table">
                      <colgroup>
                        <col style={{ width: "32%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "17%" }} />
                      </colgroup>

                      <thead>
                        <tr>
                          <th className="is-left">Tryout</th>
                          <th>Soal</th>
                          <th>Durasi</th>
                          <th className="is-left">Pembuat Tryout</th>
                          <th>Status</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedTryouts.map((tryout) => {
                          const meta = [
                            getSubjectName(tryout.subject_id),
                            tryout.grade ? `Kelas ${tryout.grade}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ");

                          return (
                            <tr key={tryout.id}>
                              <td>
                                <div
                                  className="score-primary is-strong score-ellipsis"
                                  title={tryout.title}
                                >
                                  {tryout.title}
                                </div>
                                <div
                                  className="score-secondary score-ellipsis"
                                  title={meta || undefined}
                                >
                                  {meta || "-"}
                                </div>
                              </td>

                              <td className="is-center is-nowrap">
                                <span className="score-value">
                                  {tryout.total_questions ?? 0}
                                </span>
                              </td>

                              <td className="is-center is-nowrap">
                                {tryout.duration_minutes} menit
                              </td>

                              <td className="score-ellipsis" title={tryout.created_by_name || undefined}>
                                {tryout.created_by_name || "-"}
                              </td>

                              <td className="is-center">
                                {tryout.is_active ? (
                                  <span className="score-badge is-pass">Aktif</span>
                                ) : (
                                  <span className="score-badge is-fail">Nonaktif</span>
                                )}
                              </td>

                              <td className="is-center is-nowrap">
                                <div className="action-buttons" style={{ justifyContent: "center" }}>
                                  <button
                                    className="edit-button"
                                    onClick={() => openEditModal(tryout)}
                                    title="Edit"
                                  >
                                    <IconEdit size={16} />
                                  </button>

                                  <button
                                    className="review-button"
                                    onClick={() => openReviewModal(tryout)}
                                    title="Review Soal"
                                  >
                                    <IconEye size={16} />
                                  </button>

                                  <button
                                    className="delete-button"
                                    onClick={() => handleDelete(tryout)}
                                    disabled={deletingId === tryout.id}
                                    title="Hapus"
                                  >
                                    <IconTrash size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredTryouts.length}
                  pageSize={TRYOUTS_PER_PAGE}
                  itemLabel="tryout"
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* =====================================================
          MODAL TAMBAH / EDIT TRYOUT (bertahap: Informasi -> Pilih soal -> Tinjau)
      ===================================================== */}

      {showModal && (
        <div className="modal-overlay">
          <div
            className={`modal tryout-wizard${wizardStep === 2 ? " is-wide" : ""}`}
          >
            <div className="tw-header">
              <div className="tw-header-title">
                <h2>
                  {editingTryout ? "Edit Paket Tryout" : "Tambah Paket Tryout"}
                </h2>
                <p>
                  Tentukan informasi dan soal yang digunakan dalam paket tryout.
                </p>
              </div>

              <ol className="tw-steps">
              {WIZARD_STEPS.map((step) => (
                <li key={step.n}>
                  <button
                    type="button"
                    className={`tw-step${
                      wizardStep === step.n ? " is-active" : ""
                    }${wizardStep > step.n ? " is-done" : ""}`}
                    onClick={() => goToStep(step.n)}
                    disabled={saving}
                  >
                    <span className="tw-step-num">
                      {wizardStep > step.n ? <IconCheck size={12} /> : step.n}
                    </span>
                    <span className="tw-step-label">{step.label}</span>
                  </button>
                </li>
              ))}
              </ol>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="tw-form">
              <div className={`tw-body${wizardStep === 2 ? " is-picker" : ""}`}>
                {/* =================================================
                    LANGKAH 1 — INFORMASI PAKET
                ================================================= */}

                {wizardStep === 1 && (
                  <>
                    <div className="form-group">
                      <label>Judul Tryout *</label>
                      <input
                        type="text"
                        name="title"
                        placeholder="Contoh: TKA Matematika Kelas 12 - Tryout 1"
                        value={form.title}
                        onChange={handleChange}
                        disabled={saving}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Deskripsi</label>
                      <textarea
                        name="description"
                        rows="3"
                        placeholder="Deskripsi paket tryout..."
                        value={form.description}
                        onChange={handleChange}
                        disabled={saving}
                      />
                    </div>

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
                        <label>Kelas</label>
                        <select
                          name="grade"
                          value={form.grade}
                          onChange={handleChange}
                          disabled={saving}
                        >
                          <option value="">Pilih Kelas</option>
                          {GRADES.map((grade) => (
                            <option key={grade} value={grade}>
                              Kelas {grade}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Durasi (menit) *</label>
                        <input
                          type="number"
                          name="duration_minutes"
                          min="1"
                          value={form.duration_minutes}
                          onChange={handleChange}
                          disabled={saving}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Nilai Maksimal *</label>
                        <input
                          type="number"
                          name="max_score"
                          min="1"
                          step="0.01"
                          value={form.max_score}
                          onChange={handleChange}
                          disabled={saving}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Keterangan</label>
                      <input
                        type="text"
                        name="difficulty"
                        value={form.difficulty}
                        onChange={handleChange}
                        disabled={saving}
                        maxLength={150}
                        placeholder="Contoh: Kelas Unggulan, Paket A (opsional)"
                      />
                      <small style={{ color: "#777" }}>
                        Catatan bebas untuk paket tryout ini — tidak
                        membatasi soal mana yang boleh dipilih di langkah
                        berikutnya.
                      </small>
                    </div>

                    <div className="form-checkbox">
                      <input
                        type="checkbox"
                        id="tryout-active"
                        name="is_active"
                        checked={form.is_active}
                        onChange={handleChange}
                        disabled={saving}
                      />
                      <label htmlFor="tryout-active">Paket tryout aktif</label>
                    </div>
                  </>
                )}

                {/* =================================================
                    LANGKAH 2 — PILIH SOAL
                    Tetap ter-mount (hanya disembunyikan) selama
                    subject_id tidak berubah, supaya pencarian, filter,
                    dan halaman bank soal tidak hilang saat pindah langkah.
                ================================================= */}

                {form.subject_id && (
                  <div
                    className={`tw-picker-slot${
                      wizardStep === 2 ? "" : " is-hidden"
                    }`}
                  >
                    <TryoutQuestionPicker
                      key={form.subject_id}
                      subjectId={form.subject_id}
                      active={wizardStep === 2}
                      disabled={saving}
                      defaultScope={defaultBankScope}
                      selected={form.questions}
                      onChange={(questions) =>
                        setForm((prev) => ({ ...prev, questions }))
                      }
                    />
                  </div>
                )}

                {/* =================================================
                    LANGKAH 3 — TINJAU
                ================================================= */}

                {wizardStep === 3 && (
                  <div className="tw-review">
                    <div className="tw-stats">
                      <div className="tw-stat">
                        <span>Total soal</span>
                        <strong>{form.questions.length}</strong>
                      </div>
                      <div className="tw-stat">
                        <span>Total bobot</span>
                        <strong>{totalPoints}</strong>
                      </div>
                      <div className="tw-stat">
                        <span>Nilai maksimal</span>
                        <strong>{form.max_score}</strong>
                      </div>
                      <div className="tw-stat">
                        <span>Durasi</span>
                        <strong>{form.duration_minutes} menit</strong>
                      </div>
                    </div>

                    <dl className="tw-summary">
                      <div>
                        <dt>Judul</dt>
                        <dd>{form.title}</dd>
                      </div>
                      <div>
                        <dt>Mata pelajaran</dt>
                        <dd>{getSubjectName(form.subject_id)}</dd>
                      </div>
                      <div>
                        <dt>Kelas</dt>
                        <dd>{form.grade ? `Kelas ${form.grade}` : "-"}</dd>
                      </div>
                      <div>
                        <dt>Keterangan</dt>
                        <dd>{form.difficulty || "-"}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{form.is_active ? "Aktif" : "Nonaktif"}</dd>
                      </div>
                      <div>
                        <dt>Komposisi soal</dt>
                        <dd>
                          {difficultyBreakdown
                            .map((item) => `${item.label} ${item.count}`)
                            .join(" · ")}
                        </dd>
                      </div>
                    </dl>

                    <div className="tw-bulk">
                      <label htmlFor="tw-bulk-points">
                        Samakan bobot semua soal
                      </label>
                      <input
                        id="tw-bulk-points"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={bulkPoints}
                        onChange={(e) => setBulkPoints(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyBulkPoints();
                          }
                        }}
                        disabled={saving}
                      />
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={applyBulkPoints}
                        disabled={saving}
                      >
                        Terapkan
                      </button>
                    </div>

                    <div className="tw-review-list">
                      {form.questions.map((item) => (
                        <div key={item.question_id} className="tw-review-row">
                          <strong>{item.question_number}</strong>

                          <div className="tw-review-text">
                            <span className="tw-review-id">
                              #{item.question_id}
                            </span>
                            {item.question_text ||
                              `Soal ID ${item.question_id}`}
                          </div>

                          {item.difficulty && (
                            <span
                              className={`difficulty-badge tqp-badge ${item.difficulty.toLowerCase()}`}
                            >
                              {getDifficultyLabel(item.difficulty)}
                            </span>
                          )}

                          <span className="tw-review-points">
                            Bobot {item.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {(formError || formSuccess) && (
                <div className="tw-messages">
                  {formError && (
                    <div
                      className="form-error-message"
                      style={{ textAlign: "left" }}
                    >
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="success-message">
                      <IconCheck
                        size={14}
                        style={{ verticalAlign: "-2px", marginRight: "4px" }}
                      />
                      {formSuccess}
                    </div>
                  )}
                </div>
              )}

              {/* =================================================
                  FOOTER
              ================================================= */}

              <div className="tw-footer">
                <div className="tw-footer-summary">
                  {wizardStep > 1 && (
                    <>
                      <strong>{form.questions.length}</strong> soal · total
                      bobot <strong>{totalPoints}</strong>
                    </>
                  )}
                </div>

                <div className="tw-footer-actions">
                  {wizardStep === 1 && (
                    <>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={closeModal}
                        disabled={saving}
                      >
                        Batal
                      </button>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => goToStep(2)}
                        disabled={saving}
                      >
                        Lanjut: pilih soal
                      </button>
                    </>
                  )}

                  {wizardStep === 2 && (
                    <>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => goToStep(1)}
                        disabled={saving}
                      >
                        Kembali
                      </button>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => goToStep(3)}
                        disabled={saving}
                      >
                        Lanjut: tinjau
                      </button>
                    </>
                  )}

                  {wizardStep === 3 && (
                    <>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => goToStep(2)}
                        disabled={saving}
                      >
                        Kembali
                      </button>

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={saving}
                      >
                        {saving
                          ? "Menyimpan..."
                          : editingTryout
                          ? "Simpan Perubahan"
                          : "Simpan Tryout"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL REVIEW SOAL (tampilan seperti halaman cetak/PDF)
      ===================================================== */}

      {showReviewModal && (
        <div className="modal-overlay review-modal-overlay">
          <div
            className="modal review-modal no-print-overlay"
            style={{ width: "950px", maxWidth: "96vw" }}
          >
            <div className="modal-header no-print">
              <div>
                <h2>Review Soal Tryout</h2>
                <p>
                  Pratinjau soal yang akan ditampilkan dalam tryout ini.
                  Gunakan tab di bawah untuk melihat soal polos atau kunci
                  jawaban & pembahasan.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                {reviewData && !loadingReview && !reviewError && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handlePrintReview}
                  >
                    Cetak / PDF
                  </button>
                )}

                <button
                  type="button"
                  className="modal-close"
                  onClick={closeReviewModal}
                >
                  ×
                </button>
              </div>
            </div>

            {!loadingReview && !reviewError && reviewData && (
              <div className="review-tabs no-print">
                <button
                  type="button"
                  className={
                    reviewTab === "soal"
                      ? "review-tab-button active"
                      : "review-tab-button"
                  }
                  onClick={() => setReviewTab("soal")}
                >
                  Soal
                </button>

                <button
                  type="button"
                  className={
                    reviewTab === "jawaban"
                      ? "review-tab-button active"
                      : "review-tab-button"
                  }
                  onClick={() => setReviewTab("jawaban")}
                >
                  Jawaban &amp; Pembahasan
                </button>
              </div>
            )}

            {loadingReview && (
              <div className="loading-message">Memuat soal...</div>
            )}

            {!loadingReview && reviewError && (
              <div className="error-message">{reviewError}</div>
            )}

            {!loadingReview && !reviewError && reviewData && reviewTab === "soal" && (
              <div className="review-print-page">
                <div className="review-print-header">
                  <h3>{reviewData.title}</h3>
                  <div className="review-print-meta">
                    <span>Mapel: {reviewData.subject_name}</span>
                    <span>Kelas: {reviewData.grade || "-"}</span>
                    <span>Durasi: {reviewData.duration_minutes} menit</span>
                    <span>Jumlah Soal: {reviewData.total_questions}</span>
                  </div>
                </div>

                <div className="review-print-questions">
                  {reviewData.questions.map((question) => (
                    <div
                      key={question.question_id}
                      className="review-print-question"
                    >
                      {question.has_image && (
                        <QuestionImage
                          questionId={question.question_id}
                          alt="Gambar soal"
                          className="review-print-image"
                        />
                      )}

                      <div className="review-print-question-text">
                        <span className="review-print-number">
                          {question.question_number}.
                        </span>
                        <span>{question.question_text}</span>
                      </div>

                      <div className="review-print-options">
                        {question.options.map((option) => (
                          <div
                            key={option.option_code}
                            className="review-print-option"
                          >
                            <span className="review-print-option-code">
                              {option.option_code}.
                            </span>
                            <span>{option.option_text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {reviewData.questions.length === 0 && (
                    <div className="empty-message">
                      Paket tryout ini belum memiliki soal.
                    </div>
                  )}
                </div>
              </div>
            )}

            {!loadingReview && !reviewError && reviewData && reviewTab === "jawaban" && (
              <div className="review-print-page">
                <div className="review-print-header">
                  <h3>{reviewData.title} — Kunci Jawaban &amp; Pembahasan</h3>
                  <div className="review-print-meta">
                    <span>Mapel: {reviewData.subject_name}</span>
                    <span>Kelas: {reviewData.grade || "-"}</span>
                    <span>Jumlah Soal: {reviewData.total_questions}</span>
                  </div>
                </div>

                <div className="review-print-questions">
                  {reviewData.questions.map((question) => {
                    const correctOption = question.options.find(
                      (option) => option.is_correct
                    );

                    return (
                      <div
                        key={question.question_id}
                        className="review-print-question"
                      >
                        {question.has_image && (
                          <QuestionImage
                            questionId={question.question_id}
                            alt="Gambar soal"
                            className="review-print-image"
                          />
                        )}

                        <div className="review-print-question-text">
                          <span className="review-print-number">
                            {question.question_number}.
                          </span>
                          <span>{question.question_text}</span>
                        </div>

                        <div className="review-answer-correct">
                          Jawaban:{" "}
                          <strong>
                            {correctOption
                              ? `${correctOption.option_code}. ${correctOption.option_text}`
                              : "-"}
                          </strong>
                        </div>

                        {question.explanation && (
                          <div className="review-answer-explanation">
                            <em>Pembahasan:</em> {question.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {reviewData.questions.length === 0 && (
                    <div className="empty-message">
                      Paket tryout ini belum memiliki soal.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TryoutManagement;