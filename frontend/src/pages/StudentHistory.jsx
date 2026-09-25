import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import StatCard from "../components/StatCard";
import ScoreTable from "../components/ScoreTable";
import QuestionImage from "../components/QuestionImage";
import {
  IconCheck,
  IconClipboard,
  IconPrinter,
  IconSearch,
  IconTarget,
  IconTrophy,
} from "../components/Icons";
import "../components/ScoreTable.css";

import {
  getAttemptHistory,
  getAttemptResultDetail,
  getMyProfile,
} from "../services/api";


// =====================================================
// HELPER — format tanggal "8 Sep 2026, 14:30"
// =====================================================

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
  const isoString = hasTimezone ? value : `${value}Z`;

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


// =====================================================
// RIWAYAT & HASIL TRYOUT (SISWA)
//
// Daftar riwayat di bawah ini UI-nya disamakan dengan
// halaman "Nilai" (TeacherScores.jsx / AdminScores.jsx):
// ringkasan stat-grid + score-card berisi toolbar
// cari & filter status + ScoreTable yang sama, hanya
// kolom "Siswa" disembunyikan (lihat prop hideStudentColumn
// di components/ScoreTable.jsx) dan tombol Aksi memakai
// onViewDetail alih-alih onDeleteAttempt. Modal pembahasan
// per-soal tetap dipertahankan seperti sebelumnya.
// =====================================================

function StudentHistory() {

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [printView, setPrintView] = useState(false);

  // Nama/NIS/sekolah siswa untuk kop halaman cetak (tombol "Cetak
  // Hasil" di modal detail). Gagal ambil profil tidak menghalangi
  // fitur lain di halaman ini, jadi errornya diabaikan saja.
  const [profile, setProfile] = useState(null);


  async function loadHistory() {
    try {
      setLoading(true);

      const data = await getAttemptHistory();

      // ScoreTable (dipakai bersama Nilai admin/guru) memakai nama
      // field "tryout_title", sedangkan endpoint riwayat siswa
      // mengirim "title" -- disamakan di sini saja, tanpa mengubah
      // response backend.
      setAttempts(
        data.map((item) => ({
          ...item,
          tryout_title: item.title,
        }))
      );
    } catch (err) {
      console.error("LOAD HISTORY ERROR:", err);
      toast.error(err.message || "Gagal memuat riwayat tryout", { id: "load-student-history" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
    getMyProfile().then(setProfile).catch(() => {});
  }, []);




  async function openDetail(attempt) {
    setDetail({ attempt_id: attempt.attempt_id });
    setDetailLoading(true);
    setQuestionIndex(0);
    setPrintView(false);

    try {
      const data = await getAttemptResultDetail(attempt.attempt_id);
      setDetail(data);
    } catch (err) {
      console.error("LOAD DETAIL ERROR:", err);
      toast.error(err.message || "Gagal memuat detail hasil", { id: "load-student-history-detail" });
    } finally {
      setDetailLoading(false);
    }
  }


  function closeDetail() {
    setDetail(null);
    setQuestionIndex(0);
    setPrintView(false);
  }


  function handlePrintResult() {
    window.print();
  }


  function goToPrevQuestion() {
    setQuestionIndex((i) => Math.max(0, i - 1));
  }


  function goToNextQuestion() {
    setQuestionIndex((i) =>
      Math.min((detail?.questions?.length || 1) - 1, i + 1)
    );
  }


  const filteredAttempts = attempts.filter((item) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      !keyword ||
      item.title?.toLowerCase().includes(keyword) ||
      item.subject_name?.toLowerCase().includes(keyword);

    const matchesStatus =
      !selectedStatus ||
      (selectedStatus === "PASSED" && item.passed === true) ||
      (selectedStatus === "FAILED" && item.passed === false);

    return matchesSearch && matchesStatus;
  });


  const hasActiveFilter = Boolean(search.trim() || selectedStatus);

  function resetFilters() {
    setSearch("");
    setSelectedStatus("");
  }


  const summary = useMemo(() => {
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        totalTryouts: 0,
      };
    }

    const totalAttempts = attempts.length;

    const validScores = attempts.filter(
      (a) => a.score !== null && a.score !== undefined
    );

    const averageScore =
      validScores.length > 0
        ? validScores.reduce((sum, a) => sum + a.score, 0) / validScores.length
        : 0;

    const passedCount = attempts.filter((a) => a.passed === true).length;
    const passRate = (passedCount / totalAttempts) * 100;

    const totalTryouts = new Set(attempts.map((a) => a.tryout_id)).size;

    return {
      totalAttempts,
      averageScore: Math.round(averageScore * 10) / 10,
      passRate: Math.round(passRate),
      totalTryouts,
    };
  }, [attempts]);


  return (
    <>
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Riwayat &amp; Hasil Tryout</h1>
          <p>Semua tryout yang sudah kamu selesaikan, lengkap dengan skornya</p>
        </div>
      </div>

      {/* RINGKASAN */}

      <div className="stat-grid">
        <StatCard
          icon={<IconClipboard />}
          title="Tryout Diselesaikan"
          value={summary.totalAttempts}
          description="Attempt selesai"
        />

        <StatCard
          icon={<IconTarget />}
          title="Rata-rata Skor"
          value={summary.averageScore}
          description="Dari semua attempt-mu"
        />

        <StatCard
          icon={<IconCheck />}
          title="Tingkat Lulus"
          value={`${summary.passRate}%`}
          description="Dari attempt yang selesai"
        />

        <StatCard
          icon={<IconTrophy />}
          title="Paket Tryout"
          value={summary.totalTryouts}
          description="Sudah kamu ikuti"
        />
      </div>

      {/* TABLE */}

      <div className="score-card">

        <div className="score-toolbar">
          <label className="score-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Cari judul tryout / mata pelajaran"
              aria-label="Cari riwayat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select
            className={`score-select${selectedStatus ? " is-active" : ""}`}
            aria-label="Filter status kelulusan"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="PASSED">Lulus</option>
            <option value="FAILED">Tidak lulus</option>
          </select>
        </div>

        {loading && (
          <div className="loading-message">Memuat riwayat tryout...</div>
        )}

        {!loading && (
          <ScoreTable
            rows={filteredAttempts}
            hideStudentColumn
            resetKey={[search.trim(), selectedStatus].join("|")}
            hasActiveFilter={hasActiveFilter}
            onReset={resetFilters}
            onViewDetail={openDetail}
            emptyMessage={
              hasActiveFilter
                ? "Tidak ada hasil yang cocok."
                : "Belum ada tryout yang kamu selesaikan."
            }
          />
        )}
      </div>

      {/* =========================================================
          MODAL DETAIL HASIL
      ========================================================= */}

      {detail && (
        <div className="modal-overlay">
          <div
            className="modal"
            style={printView ? { width: 900, maxWidth: "96vw" } : { maxWidth: 640 }}
          >

            <div className="modal-header no-print">
              <div>
                <h2>{detail.title || "Detail Hasil"}</h2>
                <p>{detail.subject_name}</p>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {!detailLoading && detail.questions && (
                  printView ? (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handlePrintResult}
                      >
                        <IconPrinter size={16} style={{ verticalAlign: "-3px" }} />{" "}
                        Cetak / PDF
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setPrintView(false)}
                      >
                        Tampilan Per Soal
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setPrintView(true)}
                      title="Lihat semua soal dalam satu halaman untuk dicetak"
                    >
                      <IconPrinter size={16} style={{ verticalAlign: "-3px" }} />{" "}
                      Cetak Hasil
                    </button>
                  )
                )}

                <button className="modal-close" onClick={closeDetail}>
                  ×
                </button>
              </div>
            </div>

            {detailLoading && (
              <div className="loading-message">Memuat detail hasil...</div>
            )}

            {!detailLoading && detail.questions && (
              <div>

                {/* RINGKASAN — disembunyikan di tampilan cetak karena
                    kop halaman cetak (di bawah) sudah memuat skor yang
                    sama */}

                {!printView && (
                  <div
                    className="no-print"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "14px 16px",
                      borderRadius: 8,
                      background: "var(--accent-soft)",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: detail.passed ? "var(--accent)" : "#dc2626",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconTrophy size={22} />
                    </div>

                    <div>
                      <strong style={{ fontSize: 18 }}>
                        {detail.score} {detail.max_score ? `/ ${detail.max_score}` : ""}
                      </strong>

                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {detail.correct_count} benar, {detail.wrong_count} salah,{" "}
                        {detail.unanswered_count} kosong
                        {detail.percentage !== null && detail.percentage !== undefined
                          ? ` · ${Math.round(detail.percentage)}%`
                          : ""}
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================
                    TAMPILAN CETAK — semua soal sekaligus dalam satu halaman
                    (soal, jawaban siswa, kunci jawaban, pembahasan), memakai
                    kelas review-print-* yang sama seperti Review Soal Tryout
                    guru/admin di TryoutManagement.jsx supaya CSS @media print
                    (App.css) yang sudah ada bisa dipakai ulang tanpa
                    perubahan.
                    ========================================================= */}

                {printView && (
                  <div className="review-print-page">
                    <div className="review-print-header">
                      <h3>{detail.title}</h3>
                      <div className="review-print-meta">
                        {profile?.full_name && <span>Nama: {profile.full_name}</span>}
                        {profile?.student_code && <span>NIS: {profile.student_code}</span>}
                        {profile?.school_name && <span>Sekolah: {profile.school_name}</span>}
                        <span>Mapel: {detail.subject_name || "-"}</span>
                        <span>Selesai: {formatDate(detail.finished_at)}</span>
                      </div>
                      <div
                        className={`review-print-score ${detail.passed ? "is-pass" : "is-fail"}`}
                      >
                        Skor: {detail.score} {detail.max_score ? `/ ${detail.max_score}` : ""}
                        {" · "}
                        {detail.correct_count} benar, {detail.wrong_count} salah,{" "}
                        {detail.unanswered_count} kosong
                        {detail.percentage !== null && detail.percentage !== undefined
                          ? ` · ${Math.round(detail.percentage)}%`
                          : ""}
                        {detail.passed !== null && detail.passed !== undefined
                          ? ` · ${detail.passed ? "Lulus" : "Tidak Lulus"}`
                          : ""}
                      </div>
                    </div>

                    <div className="review-print-questions">
                      {detail.questions.map((q) => (
                        <div key={q.question_id} className="review-print-question">
                          {q.has_image && (
                            <QuestionImage
                              questionId={q.question_id}
                              alt={`Gambar soal ${q.question_number}`}
                              className="review-print-image"
                            />
                          )}

                          <div className="review-print-question-text">
                            <span className="review-print-number">
                              {q.question_number}.
                            </span>
                            <span>{q.question_text}</span>
                          </div>

                          <div className="review-print-options">
                            {q.options.map((option) => {
                              const isCorrectOption = option.code === q.correct_option;
                              const isWrongSelected =
                                option.code === q.selected_option && !q.is_correct;

                              return (
                                <div
                                  key={option.code}
                                  className={`review-print-option${
                                    isCorrectOption ? " is-correct" : ""
                                  }${isWrongSelected ? " is-wrong-selected" : ""}`}
                                >
                                  <span className="review-print-option-code">
                                    {option.code}.
                                  </span>
                                  <span>{option.text}</span>

                                  {isCorrectOption && (
                                    <span className="review-print-option-tag">
                                      (Kunci Jawaban)
                                    </span>
                                  )}

                                  {isWrongSelected && (
                                    <span className="review-print-option-tag">
                                      (Jawaban Anda)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="review-answer-student">
                            Jawaban Anda:{" "}
                            <strong>{q.selected_option || "Tidak dijawab"}</strong>
                            {" · "}
                            <span className={q.is_correct ? "is-correct" : "is-wrong"}>
                              {q.is_correct
                                ? "Benar"
                                : q.selected_option
                                ? "Salah"
                                : "Tidak dijawab"}
                            </span>
                          </div>

                          {q.explanation && (
                            <div className="review-answer-explanation">
                              <em>Pembahasan:</em> {q.explanation}
                            </div>
                          )}
                        </div>
                      ))}

                      {detail.questions.length === 0 && (
                        <div className="empty-message">
                          Tryout ini belum memiliki soal.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PEMBAHASAN PER SOAL — satu soal per tampilan,
                    dengan tombol Sebelumnya / Selanjutnya */}

                {!printView && detail.questions.length > 0 && (() => {
                  const q = detail.questions[questionIndex];
                  const isFirst = questionIndex === 0;
                  const isLast = questionIndex === detail.questions.length - 1;

                  return (
                    <div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          Soal {q.question_number} dari {detail.questions.length}
                        </span>

                        {q.is_correct ? (
                          <span style={{ color: "var(--success, #3F7D58)", fontSize: 12 }}>
                            <IconCheck size={12} style={{ verticalAlign: "-1px" }} /> Benar
                          </span>
                        ) : (
                          <span style={{ color: "#dc2626", fontSize: 12 }}>
                            {q.selected_option ? "Salah" : "Tidak dijawab"}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          padding: 14,
                          minHeight: 220,
                        }}
                      >
                        <p style={{ fontSize: 14, marginBottom: 10 }}>
                          {q.question_text}
                        </p>

                        {q.has_image && (
                          <QuestionImage
                            questionId={q.question_id}
                            alt={`Gambar soal ${q.question_number}`}
                            className="question-image-attempt"
                          />
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {q.options.map((option) => {
                            const isSelected = option.code === q.selected_option;
                            const isCorrectOption = option.code === q.correct_option;

                            let background = "white";
                            let border = "1px solid #e5e7eb";

                            if (isCorrectOption) {
                              background = "#ecfdf5";
                              border = "1px solid #3F7D58";
                            } else if (isSelected && !q.is_correct) {
                              background = "#fef2f2";
                              border = "1px solid #dc2626";
                            }

                            return (
                              <div
                                key={option.code}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "8px 12px",
                                  borderRadius: 6,
                                  border,
                                  background,
                                  fontSize: 13,
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>{option.code}.</span>
                                <span>{option.text}</span>

                                {isCorrectOption && (
                                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--success, #3F7D58)" }}>
                                    Kunci Jawaban
                                  </span>
                                )}

                                {isSelected && !isCorrectOption && (
                                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#dc2626" }}>
                                    Jawabanmu
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 12,
                              color: "#6b7280",
                              background: "#f9fafb",
                              padding: 10,
                              borderRadius: 6,
                            }}
                          >
                            <strong>Pembahasan:</strong> {q.explanation}
                          </div>
                        )}
                      </div>

                      {/* NAVIGASI SOAL */}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 14,
                        }}
                      >
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={goToPrevQuestion}
                          disabled={isFirst}
                          style={isFirst ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                        >
                          ← Sebelumnya
                        </button>

                        <div style={{ display: "flex", gap: 4 }}>
                          {detail.questions.map((_, idx) => (
                            <span
                              key={idx}
                              onClick={() => setQuestionIndex(idx)}
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                cursor: "pointer",
                                background:
                                  idx === questionIndex
                                    ? "var(--accent)"
                                    : "#d1d5db",
                              }}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          className="primary-button"
                          onClick={goToNextQuestion}
                          disabled={isLast}
                          style={isLast ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                        >
                          Selanjutnya →
                        </button>
                      </div>

                    </div>
                  );
                })()}

              </div>
            )}

            <div className="modal-footer no-print" style={{ marginTop: 16 }}>
              <button className="secondary-button" onClick={closeDetail}>
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

export default StudentHistory;
