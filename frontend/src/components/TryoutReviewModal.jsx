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

  const formatExplanation = (text) => {
    if (!text) return null;
    if (text.includes('\n\n')) text = text.replace(/\n\n/g, '\n');
    
    return text.replace(/([a-z][.?!])\s+(?=[A-Z])/g, "$1\n");
  };

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
                  {reviewData.questions.map((question) => {
                    const isTrueFalse = question.question_type === "TRUE_FALSE";
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

                      <div className="review-print-options">
                        {isTrueFalse ? (
                          <table className="tf-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                            <thead>
                              <tr>
                                <th style={{ border: "1px solid #e5e7eb", padding: "8px 12px", textAlign: "left", backgroundColor: "#f9fafb" }}>Pernyataan</th>
                                <th style={{ border: "1px solid #e5e7eb", padding: "8px 12px", width: "80px", textAlign: "center", backgroundColor: "#f9fafb" }}>{question.true_label || "Benar"}</th>
                                <th style={{ border: "1px solid #e5e7eb", padding: "8px 12px", width: "80px", textAlign: "center", backgroundColor: "#f9fafb" }}>{question.false_label || "Salah"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {question.options.map((option) => (
                                <tr key={option.option_code}>
                                  <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px" }}>
                                    {option.option_text}
                                  </td>
                                  <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", textAlign: "center" }}>
                                    <span style={{ border: "1px solid #6b7280", padding: "2px 8px", borderRadius: "4px", fontSize: "14px", color: "#374151" }}>{(question.true_label || "Benar").charAt(0).toUpperCase()}</span>
                                  </td>
                                  <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", textAlign: "center" }}>
                                    <span style={{ border: "1px solid #6b7280", padding: "2px 8px", borderRadius: "4px", fontSize: "14px", color: "#374151" }}>{(question.false_label || "Salah").charAt(0).toUpperCase()}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          question.options.map((option) => (
                            <div
                              key={option.option_code}
                              className="review-print-option"
                            >
                              <span className="review-print-option-code">
                                {option.option_code}.
                              </span>
                              <span>{option.option_text}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )})}

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
                    const isTrueFalse = question.question_type === "TRUE_FALSE";
                    const isMultipleResponse = question.question_type === "MULTIPLE_RESPONSE";
                    const correctOption = isTrueFalse || isMultipleResponse
                      ? null
                      : question.options.find((option) => option.is_correct);

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
                            {isTrueFalse
                              ? question.options.map(opt => `${opt.option_code}: ${opt.is_correct ? (question.true_label || "Benar").charAt(0).toUpperCase() : (question.false_label || "Salah").charAt(0).toUpperCase()}`).join(", ")
                              : isMultipleResponse
                              ? question.options.filter(opt => opt.is_correct).map(opt => `${opt.option_code}`).join(", ")
                              : (correctOption
                                ? `${correctOption.option_code}. ${correctOption.option_text}`
                                : "-")}
                          </strong>
                        </div>

                        {question.explanation && (
                          <div className="review-answer-explanation">
                            <em>Pembahasan:</em> {formatExplanation(question.explanation)}
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
