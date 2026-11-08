import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import QuestionImage from "../components/QuestionImage";
import TryoutReviewModal from "../components/TryoutReviewModal";
import {
  createPractice,
  getPracticeReview,
  getPractices,
  getPracticeQuestionOptions,
  getSubjects,
  updatePractice,
} from "../services/api";
import { IconEdit, IconEye } from "../components/Icons";
import "../components/ScoreTable.css";
import "./PracticeManagement.css";

const EMPTY_FORM = {
  title: "",
  description: "",
  subject_id: "",
  question_ids: [],
  status: "DRAFT",
  shuffle_questions: true,
  shuffle_options: false,
};

const STATUS_LABELS = {
  DRAFT: "Draf",
  PUBLISHED: "Terbit",
  ARCHIVED: "Diarsipkan",
};

function PracticeManagement() {
  const { user } = useAuth();
  const [practices, setPractices] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [questionPage, setQuestionPage] = useState(1);
  const [questionSearch, setQuestionSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionLoadError, setQuestionLoadError] = useState("");
  const [questionReload, setQuestionReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [reviewPractice, setReviewPractice] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewTab, setReviewTab] = useState("soal");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const reviewRequest = useRef(0);

  const loadData = useCallback(async () => {
    try {
      const [practiceData, subjectData] = await Promise.all([
        getPractices(),
        getSubjects(),
      ]);
      setPractices(practiceData.practices || []);
      setSubjects(subjectData.filter((subject) => subject.is_active));
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Gagal memuat data latihan.");
      toast.error(error.message || "Gagal memuat data latihan.");
    } finally {
      setLoading(false);
    }
  }, []);

  function retryLoadData() {
    setLoading(true);
    setLoadError("");
    loadData();
  }

  useEffect(() => {
    let active = true;
    Promise.all([getPractices(), getSubjects()])
      .then(([practiceData, subjectData]) => {
        if (!active) return;
        setPractices(practiceData.practices || []);
        setSubjects(subjectData.filter((subject) => subject.is_active));
        setLoadError("");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.message || "Gagal memuat data latihan.");
        toast.error(error.message || "Gagal memuat data latihan.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadQuestions() {
      if (!form.subject_id) {
        return;
      }
      try {
        const result = await getPracticeQuestionOptions({
          page: questionPage,
          limit: 100,
          search: questionSearch,
          subjectId: form.subject_id,
        });
        if (active) {
          setQuestionTotal(result.total || 0);
          setQuestionLoadError("");
          setQuestions((current) => {
            if (questionPage === 1) return result.data || [];
            const existingIds = new Set(current.map((question) => question.id));
            return [
              ...current,
              ...(result.data || []).filter((question) => !existingIds.has(question.id)),
            ];
          });
        }
      } catch (error) {
        if (active) {
          setQuestionLoadError(error.message || "Gagal memuat bank soal.");
          toast.error(error.message || "Gagal memuat bank soal.");
        }
      } finally {
        if (active) setLoadingQuestions(false);
      }
    }
    loadQuestions();
    return () => {
      active = false;
    };
  }, [form.subject_id, questionPage, questionReload, questionSearch, user?.role]);

  const filteredPractices = useMemo(() => {
    const search = filter.trim().toLocaleLowerCase("id");
    if (!search) return practices;
    return practices.filter((practice) =>
      `${practice.title} ${practice.subject_name}`
        .toLocaleLowerCase("id")
        .includes(search)
    );
  }, [filter, practices]);

  function openCreate() {
    setEditing(null);
    setPreviewQuestion(null);
    setForm({ ...EMPTY_FORM });
    setQuestionPage(1);
    setQuestionSearch("");
    setQuestionLoadError("");
    setLoadingQuestions(false);
    setQuestions([]);
    setQuestionTotal(0);
    setFormOpen(true);
  }

  function openEdit(practice) {
    setEditing(practice);
    setPreviewQuestion(null);
    setQuestionPage(1);
    setQuestionSearch("");
    setQuestionLoadError("");
    setLoadingQuestions(true);
    setFormOpen(true);
    setForm({
      title: practice.title,
      description: practice.description || "",
      subject_id: String(practice.subject_id),
      question_ids: practice.question_ids,
      status: practice.status,
      shuffle_questions: practice.shuffle_questions,
      shuffle_options: practice.shuffle_options,
    });
  }

  async function loadPracticeReview(practice) {
    const requestId = reviewRequest.current + 1;
    reviewRequest.current = requestId;
    setReviewPractice(practice);
    setReviewData(null);
    setReviewError("");
    setReviewLoading(true);
    setReviewTab("soal");
    try {
      const data = await getPracticeReview(practice.id);
      if (reviewRequest.current === requestId) {
        setReviewData(data);
      }
    } catch (error) {
      if (reviewRequest.current === requestId) {
        setReviewError(error.message || "Gagal memuat review soal latihan.");
      }
    } finally {
      if (reviewRequest.current === requestId) {
        setReviewLoading(false);
      }
    }
  }

  function closePracticeReview() {
    reviewRequest.current += 1;
    setReviewPractice(null);
    setReviewData(null);
    setReviewError("");
    setReviewLoading(false);
  }

  function printPracticeReview() {
    window.print();
  }

  function closeForm() {
    if (saving) return;
    setEditing(null);
    setPreviewQuestion(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(false);
    setQuestions([]);
    setQuestionTotal(0);
    setLoadingQuestions(false);
  }

  function retryQuestionLoad() {
    setQuestionLoadError("");
    setPreviewQuestion(null);
    setLoadingQuestions(true);
    setQuestionReload((current) => current + 1);
  }

  function toggleQuestion(questionId) {
    if (
      !form.question_ids.includes(questionId) &&
      form.question_ids.length >= 200
    ) {
      toast.error("Satu latihan maksimal 200 soal.");
      return;
    }
    const removing = form.question_ids.includes(questionId);
    if (removing && previewQuestion?.id === questionId) {
      setPreviewQuestion(null);
    }
    setForm((current) => ({
      ...current,
      question_ids: removing
        ? current.question_ids.filter((id) => id !== questionId)
        : [...current.question_ids, questionId],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.subject_id || form.question_ids.length === 0) {
      toast.error("Pilih mata pelajaran dan minimal satu soal.");
      return;
    }
    if (
      form.status === "PUBLISHED" &&
      editing?.status !== "PUBLISHED" &&
      !window.confirm(
        "Terbitkan latihan ini untuk semua siswa? Siswa dapat langsung memulai latihan."
      )
    ) {
      return;
    }
    if (
      form.status === "ARCHIVED" &&
      editing?.status === "PUBLISHED" &&
      !window.confirm(
        "Arsipkan latihan ini? Siswa tidak dapat memulai latihan baru, tetapi sesi yang sedang berjalan tetap dapat dilanjutkan."
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        subject_id: Number(form.subject_id),
      };
      if (editing) {
        await updatePractice(editing.id, data);
        toast.success("Latihan berhasil diperbarui.");
      } else {
        await createPractice(data);
        toast.success("Latihan berhasil dibuat.");
      }
      setFormOpen(false);
      setEditing(null);
      setForm({ ...EMPTY_FORM });
      setQuestionPage(1);
      setQuestionSearch("");
      setPreviewQuestion(null);
      setLoading(true);
      await loadData();
    } catch (error) {
      toast.error(error.message || "Gagal menyimpan latihan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="practice-page">
      <header className="page-header management-page-header">
        <div>
          <h1>Latihan Siswa</h1>
          <p>
            Buat dan kelola latihan dari bank soal. Semua siswa dapat mengakses
            latihan yang terbit dan mengulanginya tanpa memengaruhi nilai Tryout.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={openCreate}>
          + Tambah Latihan
        </button>
      </header>

      <section className="score-card" aria-label="Daftar latihan">
        <div className="question-filter management-list-filter">
          <div className="question-filter-row question-filter-row-primary">
            <div className="filter-group">
              <label className="sr-only" htmlFor="practice-search">
                Cari latihan
              </label>
              <input
                id="practice-search"
                type="search"
                className="search-input"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Cari judul latihan atau mata pelajaran..."
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-message">Memuat daftar latihan...</div>
        ) : loadError ? (
          <div className="error-message" role="alert">
            <p>{loadError}</p>
            <button type="button" className="secondary-button" onClick={retryLoadData}>
              Coba lagi
            </button>
          </div>
        ) : (
          <>
            <div className="score-meta">
              <span>
                {filteredPractices.length} latihan
                {filter.trim() ? " ditemukan" : ""}
              </span>
            </div>

            {filteredPractices.length === 0 ? (
              <div className="empty-message">
                {practices.length
                  ? "Latihan tidak ditemukan. Coba kata kunci lain."
                  : "Belum ada latihan. Pilih “Tambah Latihan” untuk membuat latihan pertama."}
              </div>
            ) : (
              <div className="table-container">
                <table className="score-table">
                  <colgroup>
                    <col style={{ width: user?.role === "ADMIN" ? "25%" : "33%" }} />
                    <col style={{ width: user?.role === "ADMIN" ? "14%" : "18%" }} />
                    {user?.role === "ADMIN" && <col style={{ width: "13%" }} />}
                    <col style={{ width: "8%" }} />
                    <col style={{ width: user?.role === "ADMIN" ? "8%" : "9%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="is-left">Latihan</th>
                      <th className="is-left">Mata Pelajaran</th>
                      {user?.role === "ADMIN" && <th className="is-left">Pembuat</th>}
                      <th>Soal</th>
                      <th>Siswa</th>
                      <th>Percobaan</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPractices.map((practice) => (
                      <tr key={practice.id}>
                        <td>
                          <div
                            className="score-primary is-strong score-ellipsis"
                            title={practice.title}
                          >
                            {practice.title}
                          </div>
                          {practice.description && (
                            <div
                              className="score-secondary score-ellipsis"
                              title={practice.description}
                            >
                              {practice.description}
                            </div>
                          )}
                        </td>
                        <td className="score-ellipsis" title={practice.subject_name}>
                          {practice.subject_name}
                        </td>
                        {user?.role === "ADMIN" && (
                          <td
                            className="score-ellipsis"
                            title={practice.created_by_name}
                          >
                            {practice.created_by_name}
                          </td>
                        )}
                        <td className="is-center is-nowrap">
                          <span className="score-value">{practice.question_count}</span>
                        </td>
                        <td className="is-center is-nowrap">{practice.student_count}</td>
                        <td className="is-center is-nowrap">{practice.attempt_count}</td>
                        <td className="is-center">
                          <span
                            className={`score-badge ${
                              practice.status === "PUBLISHED"
                                ? "is-pass"
                                : "is-none"
                            }`}
                          >
                            {STATUS_LABELS[practice.status] || practice.status}
                          </span>
                        </td>
                        <td className="is-center is-nowrap">
                          <div className="action-buttons management-table-actions">
                            <button
                              type="button"
                              className="review-button"
                              onClick={() => loadPracticeReview(practice)}
                              title={`Review soal ${practice.title}`}
                              aria-label={`Review soal ${practice.title}`}
                              disabled={
                                reviewLoading ||
                                !practice.question_ids?.length
                              }
                            >
                              <IconEye size={16} />
                            </button>
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => openEdit(practice)}
                              title={`Kelola ${practice.title}`}
                              aria-label={`Kelola ${practice.title}`}
                            >
                              <IconEdit size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {formOpen && (
        <div className="practice-modal-backdrop">
          <section
            className="practice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-form-title"
          >
            <header className="practice-modal-header">
              <div>
                <h2 id="practice-form-title">
                  {editing ? "Kelola Latihan" : "Buat Latihan"}
                </h2>
                <p>Soal yang digunakan latihan tidak dapat dihapus permanen.</p>
              </div>
              <button
                type="button"
                className="practice-close"
                onClick={closeForm}
                aria-label="Tutup formulir"
                disabled={saving}
              >
                ×
              </button>
            </header>
            <form onSubmit={handleSubmit}>
              <fieldset disabled={saving} className="practice-form-fieldset">
              <div className="practice-form-grid">
                <label className="form-group">
                  Nama latihan
                  <input
                    required
                    maxLength={200}
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                  />
                </label>
                <label className="form-group">
                  Mata pelajaran
                  <select
                    required
                    value={form.subject_id}
                    onChange={(event) => {
                      const subjectId = event.target.value;
                      setQuestionPage(1);
                      setQuestionLoadError("");
                      setLoadingQuestions(Boolean(subjectId));
                      if (!subjectId) {
                        setQuestions([]);
                        setQuestionTotal(0);
                      }
                      setForm({
                        ...form,
                        subject_id: subjectId,
                        question_ids: [],
                      });
                    }}
                    disabled={Boolean(editing?.attempt_count)}
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="form-group">
                Deskripsi
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>

              <div className="practice-form-grid">
                <label className="form-group">
                  Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                  >
                    <option value="DRAFT">Draf — hanya terlihat pengelola</option>
                    <option value="PUBLISHED">Terbit — dapat diakses siswa</option>
                    <option value="ARCHIVED">Diarsipkan — tidak muncul untuk siswa</option>
                  </select>
                </label>
                <div className="practice-shuffle-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.shuffle_questions}
                      onChange={(event) =>
                        setForm({ ...form, shuffle_questions: event.target.checked })
                      }
                    />
                    Acak urutan soal
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.shuffle_options}
                      onChange={(event) =>
                        setForm({ ...form, shuffle_options: event.target.checked })
                      }
                    />
                    Acak pilihan jawaban
                  </label>
                </div>
              </div>

              <div className="practice-question-picker">
                <div className="practice-question-picker-heading">
                  <div>
                    <h3>Pilih soal</h3>
                    <p>{form.question_ids.length} soal dipilih</p>
                  </div>
                </div>
                {form.subject_id && (
                  <label className="practice-question-search">
                    <span className="sr-only">Cari soal</span>
                    <input
                      type="search"
                      value={questionSearch}
                      onChange={(event) => {
                        setQuestionPage(1);
                        setQuestionLoadError("");
                        setLoadingQuestions(true);
                        setQuestionSearch(event.target.value);
                      }}
                      placeholder="Cari teks soal"
                    />
                  </label>
                )}
                {!form.subject_id ? (
                  <p className="practice-state">Pilih mata pelajaran terlebih dahulu.</p>
                ) : questionLoadError ? (
                  <div className="practice-state" role="alert">
                    <p>{questionLoadError}</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={retryQuestionLoad}
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : loadingQuestions ? (
                  <p className="practice-state">Memuat soal...</p>
                ) : questions.length === 0 ? (
                  <p className="practice-state">
                    Belum ada soal untuk mata pelajaran ini. Tambahkan soal di Bank Soal.
                  </p>
                ) : (
                  <div className="practice-question-list">
                    {questions.map((question) => {
                      const selected = form.question_ids.includes(question.id);
                      return (
                        <div
                          key={question.id}
                          className={`practice-question-option${selected ? " is-selected" : ""}`}
                        >
                          <label className="practice-question-select">
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={
                                Boolean(editing?.attempt_count) ||
                                (!question.is_active && !selected)
                              }
                              onChange={() => toggleQuestion(question.id)}
                            />
                            <span>
                              <strong>
                                {question.question_text.replace(/<[^>]*>/g, "").slice(0, 180)}
                                {question.question_text.length > 180 ? "…" : ""}
                              </strong>
                              <small>
                                {question.question_type.replaceAll("_", " ")} ·{" "}
                                {question.is_active ? "Aktif" : "Nonaktif"}
                              </small>
                            </span>
                          </label>
                          {selected && (
                            <button
                              type="button"
                              className="practice-preview-trigger"
                              onClick={() => setPreviewQuestion(question)}
                            >
                              Pratinjau
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {previewQuestion && (
                  <section className="practice-question-preview" aria-live="polite">
                    <div className="practice-preview-heading">
                      <h4>Pratinjau soal</h4>
                      <button
                        type="button"
                        onClick={() => setPreviewQuestion(null)}
                        aria-label="Tutup pratinjau soal"
                      >
                        Tutup
                      </button>
                    </div>
                    <p>{previewQuestion.question_text}</p>
                    {previewQuestion.has_image && (
                      <QuestionImage questionId={previewQuestion.id} />
                    )}
                    <ol>
                      {previewQuestion.options.map((option) => (
                        <li key={option.option_code}>
                          <strong>{option.option_code}.</strong> {option.option_text}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                {!loadingQuestions && questions.length < questionTotal && (
                  <button
                    type="button"
                    className="practice-load-more"
                    onClick={() => {
                      setQuestionLoadError("");
                      setLoadingQuestions(true);
                      setQuestionPage((page) => page + 1);
                    }}
                  >
                    Muat soal berikutnya ({questions.length} dari {questionTotal})
                  </button>
                )}
              </div>

              <footer className="practice-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving || loadingQuestions}
                >
                  {saving ? "Menyimpan..." : "Simpan Latihan"}
                </button>
              </footer>
              </fieldset>
            </form>
          </section>
        </div>
      )}

      <TryoutReviewModal
        showReviewModal={Boolean(reviewPractice)}
        closeReviewModal={closePracticeReview}
        handlePrintReview={printPracticeReview}
        loadingReview={reviewLoading}
        reviewData={reviewData}
        reviewTab={reviewTab}
        setReviewTab={setReviewTab}
        title="Review Soal Latihan"
        description="Pratinjau seluruh soal dalam latihan ini. Gunakan tab untuk melihat soal atau kunci jawaban dan pembahasan; cetak tab yang sedang dibuka ke PDF."
        reviewError={reviewError}
        retryReview={() => reviewPractice && loadPracticeReview(reviewPractice)}
      />
    </div>
  );
}

export default PracticeManagement;
