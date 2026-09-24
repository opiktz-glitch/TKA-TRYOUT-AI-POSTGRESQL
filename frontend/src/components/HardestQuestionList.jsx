import { useState } from "react";

import QuestionPreviewModal from "./QuestionPreviewModal";
import { getQuestion } from "../services/api";
import { DIFFICULTIES } from "../data/questionConstants";
import {
  wrongBadgeClass,
  WRONG_HIGH_PERCENT,
  WRONG_MEDIUM_PERCENT,
} from "../utils/report";


// =====================================================
// DAFTAR "SOAL PALING SERING SALAH"
// (dipakai TeacherReport & AdminReport)
//
// Setiap soal bisa diklik: isi lengkap, kunci jawaban, dan pembahasan
// dibuka lewat QuestionPreviewModal yang sama dengan Bank Soal.
// Laporan hanya mengirim question_id + teks soal, jadi detail soal
// diambil saat diklik (GET /api/questions/{id}, ADMIN & GURU).
//
// Props:
//   questions    daftar soal dari laporan (question_id, question_text,
//                wrong_percentage, ...)
//   getMeta      (q) => teks baris kedua tiap soal (beda antara
//                laporan guru & admin)
//   getSubjectName (q) => nama mapel untuk judul modal preview
//   emptyMessage pesan saat daftar kosong
// =====================================================

function getDifficultyLabel(difficulty) {
  const item = DIFFICULTIES.find((d) => d.value === difficulty);

  return item ? item.label : difficulty;
}


function HardestQuestionList({
  questions,
  getMeta,
  getSubjectName,
  emptyMessage,
}) {
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [previewSubjectName, setPreviewSubjectName] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");


  async function openPreview(q) {
    // Abaikan klik ganda selagi satu soal masih dimuat.
    if (loadingId !== null) {
      return;
    }

    try {
      setLoadingId(q.question_id);
      setError("");

      const detail = await getQuestion(q.question_id);

      setPreviewSubjectName(getSubjectName(q));
      setPreviewQuestion(detail);
    } catch (err) {
      console.error("LOAD QUESTION PREVIEW ERROR:", err);
      setError(err.message || "Gagal memuat soal");
    } finally {
      setLoadingId(null);
    }
  }


  function handleKeyDown(event, q) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPreview(q);
    }
  }


  return (
    <>
      <div style={{ padding: "4px 18px 10px" }}>

        {questions.length === 0 && (
          <div className="empty-message">{emptyMessage}</div>
        )}

        {questions.map((q, index) => (
          <div
            className={
              "hardest-question-item is-clickable" +
              (loadingId === q.question_id ? " is-loading" : "")
            }
            key={q.question_id}
            role="button"
            tabIndex={0}
            title="Klik untuk melihat soal lengkap"
            onClick={() => openPreview(q)}
            onKeyDown={(event) => handleKeyDown(event, q)}
          >

            <div className="hardest-question-body">

              <div className="hardest-question-rank">
                {index + 1}
              </div>

              <div>
                <div className="hardest-question-text">
                  {q.question_text}
                </div>

                <div className="hardest-question-meta">
                  {getMeta(q)}
                </div>
              </div>

            </div>

            <span className={`wrong-badge ${wrongBadgeClass(q.wrong_percentage)}`}>
              {q.wrong_percentage}% salah
            </span>

          </div>
        ))}

        {error && (
          <div className="error-message" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}

      </div>

      {questions.length > 0 && (
        <div className="report-table-note wrong-legend">
          <span>Klik soal untuk melihat isi lengkap, kunci jawaban, dan pembahasan.</span>

          <span className="wrong-legend-items">
            Warna:
            <span className="wrong-badge is-high is-legend">
              ≥ {WRONG_HIGH_PERCENT}%
            </span>
            <span className="wrong-badge is-medium is-legend">
              {WRONG_MEDIUM_PERCENT}–{WRONG_HIGH_PERCENT - 1}%
            </span>
            <span className="wrong-badge is-low is-legend">
              &lt; {WRONG_MEDIUM_PERCENT}%
            </span>
          </span>
        </div>
      )}

      {previewQuestion && (
        <QuestionPreviewModal
          question={previewQuestion}
          subjectName={previewSubjectName}
          difficultyLabel={getDifficultyLabel(previewQuestion.difficulty)}
          onClose={() => setPreviewQuestion(null)}
        />
      )}
    </>
  );
}

export default HardestQuestionList;
