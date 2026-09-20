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
  onTextChange,
  onCorrectChange,
}) {
  return (
    <div className="options-section">
      <div className="section-title">
        <strong>Pilihan Jawaban</strong>

        <span>Pilih satu jawaban benar</span>
      </div>

      {options.map((option, index) => (
        <div
          className={`option-input-row ` + (option.is_correct ? "correct" : "")}
          key={option.option_code}
        >
          <label className="correct-radio">
            <input
              type="radio"
              name={name}
              checked={option.is_correct}
              onChange={() => onCorrectChange(index)}
              disabled={disabled}
            />

            <span>{option.option_code}</span>
          </label>

          <input
            type="text"
            value={option.option_text}
            onChange={(e) => onTextChange(index, e.target.value)}
            placeholder={`Pilihan ${option.option_code}`}
            disabled={disabled}
            required={required}
          />

          {option.is_correct && <span className="correct-label">Jawaban Benar</span>}
        </div>
      ))}
    </div>
  );
}

export default OptionsEditor;
