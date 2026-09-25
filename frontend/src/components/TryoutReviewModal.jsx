import React from 'react';
import QuestionImage from './QuestionImage';

export default function TryoutReviewModal({
  showReviewModal,
  closeReviewModal,
  handlePrintReview,
  loadingReview,
  reviewData,
  reviewTab,
  setReviewTab
}) {
  if (!showReviewModal) return null;

  return (
    <>
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
                {reviewData && !loadingReview && (
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

            {!loadingReview && reviewData && (
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

            {!loadingReview && reviewData && reviewTab === "soal" && (
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
            {!loadingReview && reviewData && reviewTab === "jawaban" && (
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

    </>
  );
}
