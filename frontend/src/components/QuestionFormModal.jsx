import React from 'react';

import QuestionImage from './QuestionImage';
import OptionsEditor from './OptionsEditor';
import ExplanationField from './ExplanationField';

export default function QuestionFormModal({
showModal,
  closeModal,
  editingQuestion,
  openAiModalForEdit,
  handleSubmit,
  saving,
  aiConsistencyWarning,
  aiGeneratedNotice,
  form,
  handleChange,
  subjects,
  DIFFICULTIES,
  aiImageDescription,
  imagePreviewUrl,
  removeExistingImage,
  handleImageFileChange,
  handleRemoveImageClick,
  handleOptionTextChange,
  handleCorrectAnswer,
  IconBook,
  setShowGuideModal,
  editAiGate
}) {
  if (!showModal) return null;
  
  return (
    <>

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
                  handleChange({ target: { name: "explanation", value: text } })
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
                questionId={editingQuestion?.id}
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

    </>
  );
}
