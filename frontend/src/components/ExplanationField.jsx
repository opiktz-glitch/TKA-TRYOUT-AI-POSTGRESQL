import { useState } from "react";

import { generateAIExplanation } from "../services/api";

// ======================================================
// ExplanationField
//
// Kolom "Pembahasan" di form Tambah/Edit Soal, lengkap dengan
// tombol "✨ Pembahasan dengan AI".
//
// Tombol itu membuat DRAF pembahasan dari isi form saat ini
// (teks soal, pilihan, dan jawaban yang ditandai benar), lalu
// mengisikannya ke kolom ini. Tidak ada yang disimpan otomatis:
// guru memeriksa/mengedit dulu, lalu menyimpan lewat tombol Simpan
// biasa (pola yang sama dengan fitur AI lain di aplikasi ini).
//
// State loading/error/catatan ada DI SINI, jadi
// QuestionManagement.jsx tidak perlu state tambahan.
//
// Tombol sengaja NONAKTIF untuk soal bergambar: provider AI yang
// dipakai adalah model teks yang tidak bisa melihat gambar, jadi
// pembahasannya bisa meleset.
//
// Props:
// - value          : isi pembahasan saat ini
// - onTextChange   : (teks) => void — dipanggil saat guru mengetik
//                    DAN saat draf AI masuk
// - disabled       : kunci semua (mis. saat sedang menyimpan)
// - questionText   : teks soal di form
// - options        : [{ option_code, option_text, is_correct }, ...]
// - subjectId      : id mata pelajaran di form (opsional, konteks prompt)
// - hasImage       : true kalau soal ini bergambar
// ======================================================

function getBlockReason({ hasImage, questionText, options }) {
  if (hasImage) {
    return "Soal bergambar belum didukung: AI tidak bisa melihat gambar, jadi pembahasan perlu ditulis manual.";
  }

  if (!questionText.trim()) {
    return "Isi teks soal terlebih dahulu.";
  }

  const filledOptions = options.filter((option) => option.option_text.trim());

  if (filledOptions.length < 2) {
    return "Isi minimal dua pilihan jawaban terlebih dahulu.";
  }

  if (filledOptions.filter((option) => option.is_correct).length !== 1) {
    return "Tandai satu jawaban yang benar terlebih dahulu.";
  }

  return "";
}


function ExplanationField({
  value,
  onTextChange,
  disabled = false,
  questionText,
  options,
  subjectId,
  hasImage = false,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [draftNotice, setDraftNotice] = useState(false);

  const blockReason = getBlockReason({ hasImage, questionText, options });


  async function handleGenerate() {
    if (
      value.trim() &&
      !window.confirm("Timpa pembahasan yang sudah ada dengan draf dari AI?")
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setWarning("");
      setDraftNotice(false);

      const data = await generateAIExplanation({
        question_text: questionText,
        subject_id: subjectId ? Number(subjectId) : null,
        options: options.map((option) => ({
          option_code: option.option_code,
          option_text: option.option_text,
          is_correct: Boolean(option.is_correct),
        })),
      });

      onTextChange(data.explanation);
      setDraftNotice(true);
      setWarning(data.consistency_warning || "");
    } catch (err) {
      console.error("GENERATE AI EXPLANATION ERROR:", err);
      setError(err.message || "Gagal membuat pembahasan dengan AI");
    } finally {
      setLoading(false);
    }
  }


  function handleTextChange(event) {
    onTextChange(event.target.value);

    // Guru mulai mengedit -> catatan "draf AI" dianggap sudah diperiksa.
    setDraftNotice(false);
    setWarning("");
  }


  return (
    <div className="form-group">

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 7,
        }}
      >
        <label style={{ margin: 0 }}>Pembahasan</label>

        <button
          type="button"
          className="secondary-button"
          style={{ padding: "4px 12px", fontSize: 12 }}
          onClick={handleGenerate}
          disabled={disabled || loading || Boolean(blockReason)}
          title={blockReason || "Buat draf pembahasan dengan AI"}
        >
          {loading ? "Menyusun pembahasan..." : "✨ Pembahasan dengan AI"}
        </button>
      </div>

      <textarea
        name="explanation"
        value={value}
        onChange={handleTextChange}
        placeholder="Tuliskan pembahasan atau penjelasan jawaban..."
        rows="3"
        disabled={disabled}
      />

      {blockReason && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
          {blockReason}
        </div>
      )}

      {error && (
        <div className="form-error-message" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}

      {warning && (
        <div className="form-error-message" style={{ marginTop: 8 }}>
          ⚠️ {warning}
        </div>
      )}

      {draftNotice && (
        <div className="success-message" style={{ marginTop: 8 }}>
          ✨ Draf dari AI — periksa dan edit bila perlu sebelum menyimpan.
        </div>
      )}

    </div>
  );
}

export default ExplanationField;
