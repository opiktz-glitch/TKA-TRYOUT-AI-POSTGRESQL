import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import PracticeFormWizardModal from "../components/PracticeFormWizardModal";
import TryoutReviewModal from "../components/TryoutReviewModal";
import {
  archivePractice,
  createPractice,
  deletePractice,
  getPracticeAttemptHistory,
  getPracticeReview,
  getPractices,
  getSubjects,
  updatePractice,
} from "../services/api";
import { IconEdit, IconEye, IconHistory, IconTrash } from "../components/Icons";
import { formatDateTime } from "../utils/date";
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
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openingEditId, setOpeningEditId] = useState(null);
  const [reviewPractice, setReviewPractice] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewTab, setReviewTab] = useState("soal");
  const [historyPractice, setHistoryPractice] = useState(null);
  const [historyAttempts, setHistoryAttempts] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [actionPracticeId, setActionPracticeId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [wizardStep, setWizardStep] = useState(1);
  const reviewRequest = useRef(0);
  const historyRequest = useRef(0);

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
    setForm({ ...EMPTY_FORM });
    setSelectedQuestions([]);
    setWizardStep(1);
    setFormOpen(true);
  }

  async function openEdit(practice) {
    setOpeningEditId(practice.id);
    try {
      const review = await getPracticeReview(practice.id);
      const selected = (review.questions || []).map((question) => ({
        question_id: Number(question.question_id),
        question_number: Number(question.question_number),
        points: 1,
        question_text: question.question_text || "",
        difficulty: question.difficulty || "",
        question_type: question.question_type || "MULTIPLE_CHOICE",
        has_image: Boolean(question.has_image),
        is_active: question.is_active !== false,
      }));
      setEditing(practice);
      setSelectedQuestions(selected);
      setWizardStep(1);
      setForm({
        title: practice.title,
        description: practice.description || "",
        subject_id: String(practice.subject_id),
        question_ids: selected.map((question) => question.question_id),
        status: practice.status,
        shuffle_questions: practice.shuffle_questions,
        shuffle_options: practice.shuffle_options,
      });
      setFormOpen(true);
    } catch (error) {
      toast.error(error.message || "Gagal memuat detail latihan.");
    } finally {
      setOpeningEditId(null);
    }
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

  async function loadPracticeHistory(practice, offset = 0) {
    const requestId = historyRequest.current + 1;
    historyRequest.current = requestId;
    setHistoryPractice(practice);
    setHistoryOffset(offset);
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await getPracticeAttemptHistory(practice.id, { offset });
      if (historyRequest.current === requestId) {
        setHistoryAttempts(data.attempts || []);
        setHistoryTotal(data.total || 0);
      }
    } catch (error) {
      if (historyRequest.current === requestId) {
        setHistoryError(error.message || "Gagal memuat riwayat pengerjaan.");
      }
    } finally {
      if (historyRequest.current === requestId) {
        setHistoryLoading(false);
      }
    }
  }

  function closePracticeHistory() {
    historyRequest.current += 1;
    setHistoryPractice(null);
    setHistoryAttempts([]);
    setHistoryTotal(0);
    setHistoryOffset(0);
    setHistoryError("");
    setHistoryLoading(false);
  }

  async function handleArchivePractice(practice) {
    if (
      !window.confirm(
        `Arsipkan latihan "${practice.title}"? Siswa tidak dapat memulai latihan baru, sesi berjalan tetap dapat dilanjutkan, dan riwayat pengerjaan tetap tersimpan.`
      )
    ) {
      return;
    }
    setActionPracticeId(practice.id);
    try {
      await archivePractice(practice.id);
      toast.success("Latihan berhasil diarsipkan.");
      setLoading(true);
      await loadData();
    } catch (error) {
      toast.error(error.message || "Gagal mengarsipkan latihan.");
    } finally {
      setActionPracticeId(null);
    }
  }

  async function handleDeletePractice(practice) {
    if (
      !window.confirm(
        `Hapus permanen draf "${practice.title}" beserta susunan soalnya? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }
    setActionPracticeId(practice.id);
    try {
      await deletePractice(practice.id);
      toast.success("Draf latihan berhasil dihapus.");
      setLoading(true);
      await loadData();
    } catch (error) {
      toast.error(error.message || "Gagal menghapus draf latihan.");
    } finally {
      setActionPracticeId(null);
    }
  }

  function printPracticeReview() {
    window.print();
  }

  function closeForm() {
    if (saving) return;
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSelectedQuestions([]);
    setWizardStep(1);
    setFormOpen(false);
  }

  function handleSelectedQuestionsChange(questions) {
    setSelectedQuestions(questions);
    setForm((current) => ({
      ...current,
      question_ids: questions.map((question) => Number(question.question_id)),
    }));
  }

  function validateInformation() {
    if (!form.title.trim()) {
      return "Nama latihan wajib diisi.";
    }
    if (!form.subject_id) {
      return "Mata pelajaran wajib dipilih.";
    }
    return null;
  }

  function goToStep(target) {
    if (saving) return;
    if (target > 1) {
      const error = validateInformation();
      if (error) {
        toast.error(error);
        setWizardStep(1);
        return;
      }
    }
    if (target > 2 && form.question_ids.length === 0) {
      toast.error("Pilih minimal satu soal untuk latihan.");
      setWizardStep(2);
      return;
    }
    setWizardStep(target);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (wizardStep !== 3) return;
    const infoError = validateInformation();
    if (infoError) {
      toast.error(infoError);
      setWizardStep(1);
      return;
    }
    if (!form.subject_id || form.question_ids.length === 0) {
      toast.error("Pilih mata pelajaran dan minimal satu soal.");
      setWizardStep(2);
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
      setSelectedQuestions([]);
      setWizardStep(1);
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
            Riwayat siswa tersedia dari daftar latihan.
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
                    <col style={{ width: user?.role === "ADMIN" ? "23%" : "32%" }} />
                    <col style={{ width: user?.role === "ADMIN" ? "13%" : "17%" }} />
                    {user?.role === "ADMIN" && <col style={{ width: "10%" }} />}
                    <col style={{ width: user?.role === "ADMIN" ? "7%" : "8%" }} />
                    <col style={{ width: user?.role === "ADMIN" ? "7%" : "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: user?.role === "ADMIN" ? "10%" : "9%" }} />
                    <col style={{ width: user?.role === "ADMIN" ? "22%" : "18%" }} />
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
                              className="review-button"
                              onClick={() => loadPracticeHistory(practice)}
                              title={`Riwayat pengerjaan ${practice.title}`}
                              aria-label={`Riwayat pengerjaan ${practice.title}`}
                              disabled={Boolean(actionPracticeId)}
                            >
                              <IconHistory size={16} />
                            </button>
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => openEdit(practice)}
                              title={`Kelola ${practice.title}`}
                              aria-label={
                                openingEditId === practice.id
                                  ? `Memuat ${practice.title}`
                                  : `Kelola ${practice.title}`
                              }
                              disabled={Boolean(actionPracticeId) || openingEditId === practice.id}
                            >
                              <IconEdit size={16} />
                            </button>
                            {practice.status !== "ARCHIVED" && (
                              <button
                                type="button"
                                className="practice-archive-button"
                                onClick={() => handleArchivePractice(practice)}
                                disabled={Boolean(actionPracticeId)}
                              >
                                {actionPracticeId === practice.id
                                  ? "Memproses..."
                                  : "Arsipkan"}
                              </button>
                            )}
                            {practice.status === "DRAFT" &&
                              practice.attempt_count === 0 && (
                                <button
                                  type="button"
                                  className="delete-button"
                                  onClick={() => handleDeletePractice(practice)}
                                  title={`Hapus draf ${practice.title}`}
                                  aria-label={`Hapus draf ${practice.title}`}
                                  disabled={Boolean(actionPracticeId)}
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
              </div>
            )}
          </>
        )}
      </section>

      <PracticeFormWizardModal
        show={formOpen}
        close={closeForm}
        step={wizardStep}
        goToStep={goToStep}
        editing={editing}
        saving={saving}
        form={form}
        setForm={setForm}
        subjects={subjects}
        selectedQuestions={selectedQuestions}
        onQuestionsChange={handleSelectedQuestionsChange}
        onSubmit={handleSubmit}
        defaultBankScope={user?.role === "GURU" ? "mine" : "all"}
        onSelectionLimitReached={() =>
          toast.error("Satu latihan maksimal 200 soal.")
        }
      />

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

      {historyPractice && (
        <div className="modal-overlay practice-history-overlay">
          <section
            className="modal practice-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-history-title"
          >
            <header className="practice-history-header">
              <div>
                <h2 id="practice-history-title">Riwayat Pengerjaan</h2>
                <p>{historyPractice.title}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Tutup riwayat pengerjaan"
                onClick={closePracticeHistory}
              >
                ×
              </button>
            </header>

            {historyLoading ? (
              <div className="loading-message">Memuat riwayat pengerjaan...</div>
            ) : historyError ? (
              <div className="error-message" role="alert">
                <p>{historyError}</p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => loadPracticeHistory(historyPractice, historyOffset)}
                >
                  Coba lagi
                </button>
              </div>
            ) : historyAttempts.length === 0 ? (
              <div className="empty-message">
                Belum ada siswa yang mengerjakan latihan ini.
              </div>
            ) : (
              <>
                <div className="practice-history-table-wrap">
                  <table className="score-table practice-history-table">
                    <thead>
                      <tr>
                        <th className="is-left">Siswa</th>
                        <th className="is-left">Sekolah</th>
                        <th>Status</th>
                        <th>Mulai</th>
                        <th>Selesai</th>
                        <th>Benar</th>
                        <th>Salah</th>
                        <th>Kosong</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyAttempts.map((attempt) => (
                        <tr key={attempt.attempt_id}>
                          <td>
                            <div className="score-primary is-strong">
                              {attempt.student_name}
                            </div>
                            <div className="score-secondary">
                              {attempt.student_code}
                            </div>
                          </td>
                          <td>{attempt.school_name || "-"}</td>
                          <td className="is-center">
                            {attempt.status === "COMPLETED"
                              ? "Selesai"
                              : "Sedang dikerjakan"}
                          </td>
                          <td className="is-center is-nowrap">
                            {formatDateTime(attempt.started_at)}
                          </td>
                          <td className="is-center is-nowrap">
                            {formatDateTime(attempt.finished_at)}
                          </td>
                          {[
                            attempt.correct_count,
                            attempt.wrong_count,
                            attempt.unanswered_count,
                          ].map((count, index) => (
                            <td className="is-center" key={`${attempt.attempt_id}-${index}`}>
                              {attempt.status === "COMPLETED" ? count : "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="practice-history-pagination">
                  <span>
                    Menampilkan {historyOffset + 1}–
                    {historyOffset + historyAttempts.length} dari {historyTotal} percobaan
                  </span>
                  <div>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={historyLoading || historyOffset === 0}
                      onClick={() =>
                        loadPracticeHistory(
                          historyPractice,
                          Math.max(0, historyOffset - 50)
                        )
                      }
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={
                        historyLoading ||
                        historyOffset + historyAttempts.length >= historyTotal
                      }
                      onClick={() =>
                        loadPracticeHistory(
                          historyPractice,
                          historyOffset + historyAttempts.length
                        )
                      }
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default PracticeManagement;
