import React from 'react';
import { IconBook } from './Icons';
import { DIFFICULTIES } from '../data/questionConstants';

export default function AiPromptModal({
  showAiModal, closeAiModal, aiReplaceMode, aiGenerating, aiPromptLoading,
  aiStep, handleShowPrompt, aiForm, handleAiFormChange, subjects,
  aiError, setShowGuideModal, handleAiGenerate, aiPrompt, setAiPrompt, handleBackToAiForm
}) {
  if (!showAiModal) return null;
  return (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>{aiReplaceMode ? "✨ Ganti Soal dengan AI" : "✨ Tambah Soal dengan AI"}</h2>

                <p>
                  {aiStep === "form"
                    ? "Prompt akan ditampilkan dulu untuk diperiksa sebelum soal benar-benar dibuat oleh AI."
                    : 'Periksa dan edit prompt di bawah ini kalau perlu, lalu tekan "Generate Soal".'}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeAiModal}
                disabled={aiGenerating || aiPromptLoading}
              >
                ×
              </button>
            </div>

            {aiStep === "form" && (
              <form onSubmit={handleShowPrompt}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Mata Pelajaran *</label>

                    <select
                      name="subject_id"
                      value={aiForm.subject_id}
                      onChange={handleAiFormChange}
                      disabled={aiPromptLoading}
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
                      value={aiForm.difficulty}
                      onChange={handleAiFormChange}
                      disabled={aiPromptLoading}
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
                  <label>Jenis Soal</label>

                  <select value="MULTIPLE_CHOICE" disabled>
                    <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                  </select>

                  <small style={{ color: "#6b7280" }}>
                    Jenis soal lain (Benar/Salah, Isian Singkat) belum didukung sistem ini.
                  </small>
                </div>

                <div className="form-group">
                  <label>Materi / Lingkup Soal *</label>

                  <input
                    type="text"
                    name="materi"
                    value={aiForm.materi}
                    onChange={handleAiFormChange}
                    placeholder="Contoh: pecahan, penjumlahan bilangan bulat"
                    disabled={aiPromptLoading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 8,
                      width: "100%",
                      fontWeight: 400,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="with_image"
                      checked={aiForm.with_image}
                      onChange={handleAiFormChange}
                      disabled={aiPromptLoading}
                    />
                    <span>Buat soal bergambar</span>
                  </label>

                  <span className="form-hint" style={{ display: "block", textAlign: "left" }}>
                    AI cuma menyarankan deskripsi gambar yang cocok (bukan membuat file gambarnya) —
                    gambar sungguhan tetap perlu kamu siapkan &amp; unggah sendiri lewat form soal
                    setelah digenerate.
                  </span>
                </div>

                <div className="form-group">
                  <label>Perintah Tambahan (opsional)</label>

                  <textarea
                    name="additional_instruction"
                    value={aiForm.additional_instruction}
                    onChange={handleAiFormChange}
                    placeholder="Contoh: gunakan konteks soal cerita, hindari angka negatif"
                    rows={3}
                    disabled={aiPromptLoading}
                  />
                </div>

                {aiError && (
                  <div className="form-error-message" style={{ marginBottom: "15px" }}>
                    {aiError}
                  </div>
                )}

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
                    onClick={closeAiModal}
                    disabled={aiPromptLoading}
                  >
                    Batal
                  </button>

                  <button type="submit" className="primary-button" disabled={aiPromptLoading}>
                    {aiPromptLoading ? "Menyusun prompt..." : "Lihat & Edit Prompt"}
                  </button>
                </div>
              </form>
            )}

            {aiStep === "prompt" && (
              <form onSubmit={handleAiGenerate}>
                <div className="form-group">
                  <label>Prompt untuk AI</label>

                  <textarea
                    name="prompt"
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={14}
                    disabled={aiGenerating}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "13px",
                    }}
                    required
                  />

                  <small style={{ color: "#6b7280" }}>
                    Ini teks persis yang akan dikirim ke AI. Boleh diubah bebas — misalnya menambah
                    contoh soal, mengetatkan format, atau mengganti bahasa instruksi.
                  </small>
                </div>

                {aiError && (
                  <div className="form-error-message" style={{ marginBottom: "15px" }}>
                    {aiError}
                  </div>
                )}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleBackToAiForm}
                    disabled={aiGenerating}
                  >
                    ← Kembali
                  </button>

                  <button type="submit" className="primary-button" disabled={aiGenerating}>
                    {aiGenerating ? "Membuat soal... (bisa 1-2 menit)" : "Generate Soal"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
  );
}
