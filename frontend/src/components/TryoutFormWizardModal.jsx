import React from 'react';
import { IconCheck } from './Icons';
import TryoutQuestionPicker from './TryoutQuestionPicker';

const GRADES = ["4", "5", "6"];

const WIZARD_STEPS = [
  { num: 1, label: "Informasi Paket" },
  { num: 2, label: "Pilih Soal" },
  { num: 3, label: "Tinjau & Bobot" },
];

export default function TryoutFormWizardModal({
  showModal,
  closeModal,
  wizardStep,
  goToStep,
  editingTryout,
  saving,
  form,
  handleChange,
  setForm,
  handleSubmit,
  subjects,
  totalPoints,
  difficultyBreakdown,
  getSubjectName,
  getDifficultyLabel,
  bulkPoints,
  setBulkPoints,
  applyBulkPoints,
  DIFFICULTIES,
  defaultBankScope
}) {
  if (!showModal) return null;

  return (
    <>
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

    </>
  );
}
