// ======================================================
// OptionsEditor
//
// Daftar pilihan jawaban (A-D) dengan radio "jawaban benar" dan
// input teks per pilihan. Dipakai bersama oleh form Tambah/Edit
// Soal (QuestionManagement.jsx) dan daftar hasil impor dokumen
// (ImportDocumentModal.jsx).
//
// Komponen ini "controlled" -- tidak menyimpan state sendiri:
// - options        : [{ option_code, option_text, is_correct }, ...]
// - name           : nama grup radio. WAJIB unik per editor yang tampil
//                    bersamaan (mis. per soal di modal Impor), kalau
//                    sama radio antar-editor akan saling menimpa.
// - disabled       : kunci semua input (mis. saat sedang menyimpan)
// - required       : tandai input teks wajib diisi (validasi browser)
// - onTextChange   : (index, value) => void
// - onCorrectChange: (index) => void
// ======================================================

function OptionsEditor({
  options,
  name,
  disabled = false,
  required = false,
  isTrueFalse = false,
  isMultipleResponse = false,
  onTextChange,
  onCorrectChange,
  onAddOption,
  onRemoveOption,
  trueLabel = "Benar",
  falseLabel = "Salah",
}) {
  return (
    <div className="options-section">
      <div className="section-title">
        <strong>
          {isTrueFalse ? `Pernyataan ${trueLabel} / ${falseLabel}` 
            : isMultipleResponse ? "Pilihan Jawaban (Bisa pilih &gt; 1)" 
            : "Pilihan Jawaban"}
        </strong>

        <span>
          {isTrueFalse ? `Tentukan pernyataan mana yang ${trueLabel} atau ${falseLabel}` 
            : isMultipleResponse ? "Pilih semua jawaban yang benar"
            : "Pilih satu jawaban benar"}
        </span>
      </div>

      {options.map((option, index) => (
        <div
          className={`option-input-row ` + (option.is_correct ? "correct" : "")}
          key={option.option_code}
        >
          <label className={isTrueFalse || isMultipleResponse ? "correct-checkbox" : "correct-radio"}>
            <input
              type={isTrueFalse || isMultipleResponse ? "checkbox" : "radio"}
              name={isTrueFalse || isMultipleResponse ? `${name}_${index}` : name}
              checked={option.is_correct}
              onChange={() => onCorrectChange(index)}
              disabled={disabled}
            />
            <span>{isTrueFalse ? (option.is_correct ? trueLabel.charAt(0).toUpperCase() : falseLabel.charAt(0).toUpperCase()) : option.option_code}</span>
          </label>

          <input
            type="text"
            value={option.option_text}
            onChange={(e) => onTextChange(index, e.target.value)}
            placeholder={isTrueFalse ? `Pernyataan ${option.option_code}` : `Pilihan ${option.option_code}`}
            disabled={disabled}
            required={required}
          />

          {options.length > 2 && (
            <button
              type="button"
              className="btn-link-danger"
              style={{ marginLeft: '10px' }}
              onClick={() => onRemoveOption && onRemoveOption(index)}
              disabled={disabled}
            >
              Hapus
            </button>
          )}

          {!isTrueFalse && option.is_correct && <span className="correct-label">Jawaban Benar</span>}
          {isTrueFalse && <span className="correct-label">{option.is_correct ? trueLabel : falseLabel}</span>}
        </div>
      ))}

      {options.length < 5 && (
        <button
          type="button"
          className="secondary-button"
          onClick={onAddOption}
          disabled={disabled}
          style={{ marginTop: '10px' }}
        >
          {isTrueFalse ? "+ Tambah Pernyataan" : "+ Tambah Pilihan Jawaban"}
        </button>
      )}
    </div>
  );
}

export default OptionsEditor;
