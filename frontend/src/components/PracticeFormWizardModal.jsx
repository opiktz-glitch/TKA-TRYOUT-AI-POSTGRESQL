import { IconCheck } from "./Icons";
import TryoutQuestionPicker from "./TryoutQuestionPicker";

const WIZARD_STEPS = [
  { num: 1, label: "Informasi Latihan" },
  { num: 2, label: "Pilih Soal" },
  { num: 3, label: "Tinjau" },
];

export default function PracticeFormWizardModal({
  show,
  close,
  step,
  goToStep,
  editing,
  saving,
  form,
  setForm,
  subjects,
  selectedQuestions,
  onQuestionsChange,
  onSubmit,
  defaultBankScope,
  onSelectionLimitReached,
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <section
        className={`modal tryout-wizard practice-wizard${
          step === 2 ? " is-wide" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-form-title"
      >
        <header className="tw-header">
          <div className="tw-header-title">
            <h2 id="practice-form-title">
              {editing ? "Kelola Latihan" : "Buat Latihan"}
            </h2>
            <p>Atur informasi latihan, pilih soal, lalu tinjau sebelum disimpan.</p>
          </div>

          <ol className="tw-steps" aria-label="Langkah formulir latihan">
            {WIZARD_STEPS.map((item) => (
              <li key={item.num}>
                <button
                  type="button"
                  className={`tw-step${step === item.num ? " is-active" : ""}${
                    step > item.num ? " is-done" : ""
                  }`}
                  onClick={() => goToStep(item.num)}
                  disabled={saving}
                  aria-current={step === item.num ? "step" : undefined}
                >
                  <span className="tw-step-num">
                    {step > item.num ? <IconCheck size={12} /> : item.num}
                  </span>
                  <span className="tw-step-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ol>

          <button
            type="button"
            className="modal-close"
            aria-label="Tutup dialog"
            onClick={close}
            disabled={saving}
          >
            ×
          </button>
        </header>

        <form
          className="tw-form"
          aria-busy={saving}
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 3) onSubmit(event);
          }}
        >
          <div className={`tw-body${step === 2 ? " is-picker" : ""}`}>
              {step === 1 && (
                <div className="practice-wizard-info">
                  <div className="form-group">
                    <label htmlFor="practice-title">Nama latihan *</label>
                    <input
                      id="practice-title"
                      type="text"
                      maxLength={200}
                      required
                      disabled={saving}
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="practice-description">Deskripsi</label>
                    <textarea
                      id="practice-description"
                      rows={3}
                      disabled={saving}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="practice-subject">Mata pelajaran *</label>
                    <select
                      id="practice-subject"
                      required
                      value={form.subject_id}
                      disabled={saving || Boolean(editing?.attempt_count)}
                      onChange={(event) => {
                        const subjectId = event.target.value;
                        setForm((current) => ({
                          ...current,
                          subject_id: subjectId,
                          question_ids: [],
                        }));
                        onQuestionsChange([]);
                      }}
                    >
                      <option value="">Pilih mata pelajaran</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    {editing?.attempt_count > 0 && (
                      <small className="practice-wizard-note">
                        Mata pelajaran dan daftar soal dikunci setelah siswa mulai
                        berlatih.
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="practice-status">Status</label>
                    <select
                      id="practice-status"
                      value={form.status}
                      disabled={saving}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    >
                      <option value="DRAFT">Draf — hanya terlihat pengelola</option>
                      <option value="PUBLISHED">Terbit — dapat diakses siswa</option>
                      <option value="ARCHIVED">
                        Diarsipkan — tidak muncul untuk siswa
                      </option>
                    </select>
                  </div>

                  <div className="practice-shuffle-options">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.shuffle_questions}
                        disabled={saving}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            shuffle_questions: event.target.checked,
                          }))
                        }
                      />
                      Acak urutan soal
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={form.shuffle_options}
                        disabled={saving}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            shuffle_options: event.target.checked,
                          }))
                        }
                      />
                      Acak pilihan jawaban
                    </label>
                  </div>
                </div>
              )}

              {form.subject_id && (
                <div className={`tw-picker-slot${step === 2 ? "" : " is-hidden"}`}>
                  <TryoutQuestionPicker
                    key={form.subject_id}
                    subjectId={form.subject_id}
                    active={step === 2}
                    disabled={saving || Boolean(editing?.attempt_count)}
                    defaultScope={defaultBankScope}
                    showScopeToggle={false}
                    maxSelected={200}
                    onSelectionLimitReached={onSelectionLimitReached}
                    selected={selectedQuestions}
                    onChange={onQuestionsChange}
                  />
                </div>
              )}

              {step === 3 && (
                <section className="practice-wizard-review" aria-label="Ringkasan latihan">
                  <div className="tw-stats">
                    <div className="tw-stat">
                      <span>Total soal</span>
                      <strong>{form.question_ids.length}</strong>
                    </div>
                    <div className="tw-stat">
                      <span>Status</span>
                      <strong>{form.status === "PUBLISHED" ? "Terbit" : form.status === "ARCHIVED" ? "Diarsipkan" : "Draf"}</strong>
                    </div>
                  </div>

                  <dl className="tw-summary">
                    <div>
                      <dt>Nama latihan</dt>
                      <dd>{form.title.trim() || "-"}</dd>
                    </div>
                    <div>
                      <dt>Mata pelajaran</dt>
                      <dd>
                        {subjects.find(
                          (subject) => String(subject.id) === String(form.subject_id)
                        )?.name || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt>Deskripsi</dt>
                      <dd>{form.description.trim() || "-"}</dd>
                    </div>
                    <div>
                      <dt>Pengacakan</dt>
                      <dd>
                        Soal: {form.shuffle_questions ? "Acak" : "Tetap"} · Pilihan
                        jawaban: {form.shuffle_options ? "Acak" : "Tetap"}
                      </dd>
                    </div>
                  </dl>

                  <div className="tw-review-list">
                    {selectedQuestions.map((question, index) => (
                      <div key={question.question_id} className="tw-review-row">
                        <strong>{index + 1}</strong>
                        <div className="tw-review-text">
                          <span className="tw-review-id">
                            #{question.question_id}
                          </span>
                          {question.question_text ||
                            `Soal ID ${question.question_id}`}
                        </div>
                        {question.is_active === false && (
                          <span className="tqp-tag tqp-tag-warn">Nonaktif</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
          </div>

          <footer className="tw-footer">
              <div className="tw-footer-summary">
                {step > 1 && (
                  <>
                    <strong>{form.question_ids.length}</strong> soal dipilih
                  </>
                )}
              </div>
              <div className="tw-footer-actions">
                {step === 1 && (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={close}
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
                {step === 2 && (
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
                {step === 3 && (
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
                        : editing
                          ? "Simpan Perubahan"
                          : "Simpan Latihan"}
                    </button>
                  </>
                )}
              </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
