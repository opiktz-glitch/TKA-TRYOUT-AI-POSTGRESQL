import QuestionImage from "./QuestionImage";

// ======================================================
// PREVIEW SOAL (lihat soal + kunci jawaban + pembahasan)
//
// Dipakai QuestionManagement.jsx (Bank Soal).
//
// BEDA dari modal Review Soal di TryoutManagement.jsx: di sini
// cuma preview SATU soal (bukan satu paket tryout berisi banyak
// soal), dan datanya sudah ADA di `questions` (hasil loadQuestions
// — QuestionResponse dari backend sudah menyertakan options +
// is_correct + explanation), jadi TIDAK perlu panggil API lagi.
// Tidak ada tombol cetak/PDF di sini (beda dari TryoutManagement)
// karena ini cuma untuk lihat cepat, bukan dokumen yang mau
// dicetak.
//
// Props:
//   question        -> objek soal (QuestionResponse: options, is_correct, dst.)
//   subjectName     -> nama mata pelajaran yang sudah dicari oleh induk
//   difficultyLabel -> label tingkat kesulitan ("Mudah"/"Sedang"/"Sulit")
//   onClose         -> dipanggil saat tombol × ditekan
// ======================================================

function QuestionPreviewModal({ question, subjectName, difficultyLabel, onClose }) {
  return (
    <div className="modal-overlay review-modal-overlay">
      <div className="modal review-modal" style={{ width: "700px", maxWidth: "96vw" }}>
        <div className="modal-header">
          <div>
            <h2>Preview Soal</h2>
            <p>Tampilan soal beserta kunci jawaban dan pembahasan.</p>
          </div>

          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="review-print-page">
          <div className="review-print-header">
            <h3>{subjectName}</h3>
            <div className="review-print-meta">
              <span>Tingkat: {difficultyLabel}</span>
              <span>Bobot: {question.points}</span>
              <span>Status: {question.is_active ? "Aktif" : "Nonaktif"}</span>
            </div>
          </div>

          <div className="review-print-questions">
            <div className="review-print-question">
              {question.has_image && (
                <QuestionImage
                  questionId={question.id}
                  alt="Gambar soal"
                  className="review-print-image"
                />
              )}

              <div className="review-print-question-text">
                <span>{question.question_text}</span>
              </div>

              <div className="review-print-options">
                {question.options.map((option) => (
                  <div
                    key={option.option_code}
                    className={`review-print-option ` + (option.is_correct ? "is-correct" : "")}
                  >
                    <span className="review-print-option-code">{option.option_code}.</span>
                    <span>{option.option_text}</span>
                  </div>
                ))}
              </div>

              {(() => {
                const correctOption = question.options.find((option) => option.is_correct);

                return (
                  <div className="review-answer-correct" style={{ marginTop: 10 }}>
                    Jawaban:{" "}
                    <strong>
                      {correctOption
                        ? `${correctOption.option_code}. ${correctOption.option_text}`
                        : "Belum ditandai"}
                    </strong>
                  </div>
                );
              })()}

              {question.explanation && (
                <div className="review-answer-explanation">
                  <em>Pembahasan:</em> {question.explanation}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuestionPreviewModal;
