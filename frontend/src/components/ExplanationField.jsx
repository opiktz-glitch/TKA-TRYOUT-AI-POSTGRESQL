import { useEffect, useState } from "react";

import { generateAIExplanation, verifyAIAnswer } from "../services/api";

// ======================================================
// ExplanationField
//
// Kolom "Pembahasan" di form Tambah/Edit Soal, lengkap dengan
// tombol "✨ Pembahasan dengan AI".
//
// ALURNYA: guru mengisi teks soal + pilihan jawaban (BELUM perlu
// menandai mana yang benar), lalu klik tombol untuk membuat DRAF
// pembahasan. AI TIDAK diberi tahu jawaban mana yang benar -- AI
// menyimpulkan sendiri dari nol dan menyebutkan hurufnya di awal
// teks pembahasan (mis. "Jawaban yang benar adalah B karena...").
// Guru membaca kesimpulan itu, lalu menandai pilihan yang benar
// secara MANUAL di form. Tidak ada yang disimpan otomatis: guru
// memeriksa/mengedit dulu, lalu menyimpan lewat tombol Simpan biasa
// (pola yang sama dengan fitur AI lain di aplikasi ini).
//
// Supaya guru tidak menimpa pembahasan yang sudah ada tanpa sadar,
// tombol OTOMATIS NONAKTIF selama kolom Pembahasan masih terisi --
// aktif lagi begitu kolom itu dikosongkan.
//
// State loading/error/catatan ada DI SINI, jadi
// QuestionManagement.jsx tidak perlu state tambahan.
//
// Tombol sengaja NONAKTIF juga untuk soal bergambar: provider AI
// yang dipakai adalah model teks yang tidak bisa melihat gambar,
// jadi pembahasannya bisa meleset.
//
// Ada tombol KEDUA, TERPISAH & OPSIONAL: "🔍 Verifikasi Jawaban".
// Beda dari "✨ Pembahasan dengan AI" -- tombol ini dipakai SETELAH
// guru menandai jawaban benar manual, untuk mengecek ulang secara
// independen (AI menyimpulkan lagi dari nol, tanpa diberi tahu
// kuncinya) apakah kunci yang baru ditandai itu sudah benar. Sengaja
// tombol terpisah (bukan otomatis nempel di "Pembahasan dengan AI"):
// ini panggilan AI ekstra, jadi guru yang menentukan kapan perlu
// menjalankannya, dan tetap butuh kunci yang SUDAH ditandai untuk
// dibandingkan -- beda dari tombol pembahasan yang justru dibuat
// SEBELUM kunci ditandai.
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

// Dipakai KEDUA tombol: cek dasar yang sama-sama berlaku (soal
// bergambar, teks soal kosong, kurang dari 2 pilihan terisi).
function getBaseBlockReason({ questionText, options, hasImage, questionId }) {
  if (hasImage && !questionId) {
    return "Anda baru saja menambahkan gambar baru. Silakan Simpan soal ini terlebih dahulu, lalu buka Edit kembali untuk bisa menggunakan Pembahasan AI bergambar.";
  }

  if (!questionText.trim()) {
    return "Isi teks soal terlebih dahulu.";
  }

  const filledOptions = options.filter((option) => option.option_text.trim());

  if (filledOptions.length < 2) {
    return "Isi minimal dua pilihan jawaban terlebih dahulu.";
  }

  return "";
}

// "✨ Pembahasan dengan AI" -- SEKARANG dibuat SEBELUM kunci jawaban
// ditandai, jadi TIDAK mensyaratkan satu pilihan benar. Nonaktif
// selama kolom Pembahasan masih terisi, supaya tidak menimpa draf
// yang sudah ada/ditulis guru tanpa sadar.
function getGenerateBlockReason({ value, questionText, options, hasImage, questionId }) {
  if (value.trim()) {
    return "Kolom pembahasan sudah terisi. Kosongkan dulu untuk membuat draf baru dengan AI.";
  }

  return getBaseBlockReason({ questionText, options, hasImage, questionId });
}

// "🔍 Verifikasi Jawaban" -- selain butuh kunci yang SUDAH ditandai
// guru untuk dibandingkan, sekarang juga butuh kolom Pembahasan
// SUDAH terisi (kebalikan dari getGenerateBlockReason): dua tombol
// ini jadi saling eksklusif -- kosong -> cuma tombol "Pembahasan
// dengan AI" aktif, sudah terisi -> cuma tombol "Verifikasi Jawaban"
// aktif. Sejalan dengan alurnya: verifikasi juga menawarkan pengganti
// isi Pembahasan (lihat suggested_explanation), jadi tidak relevan
// dijalankan kalau belum ada pembahasan sama sekali untuk dicek/
// diganti.
function getVerifyBlockReason({ value, questionText, options, hasImage, questionId }) {
  const baseReason = getBaseBlockReason({ questionText, options, hasImage, questionId });

  if (baseReason) {
    return baseReason;
  }

  if (!value.trim()) {
    return "Isi kolom Pembahasan terlebih dahulu (tulis manual atau pakai tombol \"Pembahasan dengan AI\").";
  }

  const filledOptions = options.filter((option) => option.option_text.trim());

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
  questionId = null,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftNotice, setDraftNotice] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyResult, setVerifyResult] = useState(null); // { matches, message }

  const generateBlockReason = getGenerateBlockReason({
    value,
    questionText,
    options,
    hasImage,
    questionId,
  });
  const verifyBlockReason = getVerifyBlockReason({
    value,
    questionText,
    options,
    hasImage,
    questionId,
  });

  const optionsKey = options
    .map((option) => `${option.option_code}:${option.option_text}:${option.is_correct}`)
    .join("|");

  // Soal/pilihan/kunci jawaban berubah -> hasil verifikasi sebelumnya
  // sudah tidak relevan lagi, jangan tampilkan yang basi.
  useEffect(() => {
    setVerifyResult(null);
    setVerifyError("");
  }, [questionText, optionsKey]);


  async function handleGenerate() {
    // Tombol otomatis nonaktif selama kolom Pembahasan masih
    // terisi (lihat getGenerateBlockReason), jadi fungsi ini hanya
    // bisa terpanggil saat value memang kosong -- tidak perlu lagi
    // konfirmasi "timpa pembahasan yang sudah ada".
    try {
      setLoading(true);
      setError("");
      setDraftNotice(false);
      setVerifyResult(null); // Bersihkan hasil verifikasi lama karena kita membuat pembahasan baru
      setVerifyError("");

      // Sengaja TIDAK mengirim is_correct: AI menyimpulkan jawaban
      // benar sendiri dari nol (lihat build_explanation_prompt di
      // backend), lalu menyebutkan hurufnya di teks pembahasan --
      // guru yang menandai kuncinya secara manual setelah membaca.
      const data = await generateAIExplanation({
        question_text: questionText,
        subject_id: subjectId ? Number(subjectId) : null,
        question_id: questionId ? Number(questionId) : null,
        options: options.map((option) => ({
          option_code: option.option_code,
          option_text: option.option_text,
        })),
      });

      onTextChange(data.explanation);
      setDraftNotice(true);
    } catch (err) {
      console.error("GENERATE AI EXPLANATION ERROR:", err);
      setError(err.message || "Gagal membuat pembahasan dengan AI");
    } finally {
      setLoading(false);
    }
  }


  async function handleVerify() {
    try {
      setVerifying(true);
      setVerifyError("");
      setVerifyResult(null);
      setDraftNotice(false); // Sembunyikan draft notice karena user lanjut memverifikasi

      const data = await verifyAIAnswer({
        question_text: questionText,
        question_id: questionId ? Number(questionId) : null,
        options: options.map((option) => ({
          option_code: option.option_code,
          option_text: option.option_text,
          is_correct: Boolean(option.is_correct),
        })),
      });

      if (data.checked) {
        setVerifyResult({
          matches: data.matches,
          message: data.message,
          verifiedOptionCode: data.verified_option_code || "",
          suggestedExplanation: data.suggested_explanation || "",
        });
      } else {
        setVerifyError(data.message);
      }
    } catch (err) {
      console.error("VERIFY AI ANSWER ERROR:", err);
      setVerifyError(err.message || "Gagal menjalankan verifikasi jawaban");
    } finally {
      setVerifying(false);
    }
  }


  function handleTextChange(event) {
    onTextChange(event.target.value);

    // Guru mulai mengedit -> catatan "draf AI" dianggap sudah diperiksa.
    setDraftNotice(false);
  }


  function handleUseSuggestedExplanation() {
    if (!verifyResult?.suggestedExplanation) {
      return;
    }

    onTextChange(verifyResult.suggestedExplanation);

    // Sudah dipakai -> hasil verifikasi lama (termasuk saran ini)
    // sudah tidak relevan lagi untuk ditampilkan.
    setVerifyResult(null);
  }

  // DEBUG OUTPUT
  const debugInfo = {
    hasImage,
    questionId,
    baseReason: getBaseBlockReason({ questionText, options, hasImage, questionId }),
    generateBlockReason,
    verifyBlockReason,
    value: value,
    filledOptions: options.filter((option) => option.option_text.trim()).map(o => o.is_correct),
  };

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

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "4px 12px", fontSize: 12 }}
            onClick={handleVerify}
            disabled={disabled || verifying || Boolean(verifyBlockReason)}
            title={
              verifyBlockReason ||
              "Minta AI menyimpulkan sendiri jawabannya dari soal (tanpa diberi tahu kuncinya), lalu bandingkan dengan kunci di form"
            }
          >
            {verifying ? "Memverifikasi..." : "🔍 Verifikasi Jawaban"}
          </button>

          <button
            type="button"
            className="secondary-button"
            style={{ padding: "4px 12px", fontSize: 12 }}
            onClick={handleGenerate}
            disabled={disabled || loading || Boolean(generateBlockReason)}
            title={generateBlockReason || "Buat draf pembahasan dengan AI"}
          >
            {loading ? "Menyusun pembahasan..." : "✨ Pembahasan dengan AI"}
          </button>
        </div>
      </div>

      <textarea
        name="explanation"
        value={value}
        onChange={handleTextChange}
        placeholder="Tuliskan pembahasan atau penjelasan jawaban..."
        rows="3"
        disabled={disabled}
      />

      {loading && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#0284c7" }}>
          ⏳ Sedang menyusun pembahasan dengan AI. Proses ini mungkin memakan waktu hingga satu menit (terutama untuk soal bergambar). Anda tetap bisa mengedit kolom lain sambil menunggu.
        </div>
      )}

      {verifying && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#0284c7" }}>
          ⏳ Sedang memverifikasi jawaban dengan AI. Proses ini mungkin memakan waktu hingga satu menit (terutama untuk soal bergambar). Anda tetap bisa mengedit kolom lain sambil menunggu.
        </div>
      )}

      {verifyError && (
        <div className="form-error-message" style={{ marginTop: 8 }}>
          {verifyError}
        </div>
      )}

      {verifyResult && verifyResult.matches && (
        <div className="success-message" style={{ marginTop: 8 }}>
          ✅ {verifyResult.message}
        </div>
      )}

      {verifyResult && !verifyResult.matches && (
        <div className="form-error-message" style={{ marginTop: 8 }}>
          ⚠️ {verifyResult.message}
        </div>
      )}

      {verifyResult && !verifyResult.matches && verifyResult.suggestedExplanation && (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            background: "#f9fafb",
          }}
        >
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
            Pembahasan versi AI (untuk opsi {verifyResult.verifiedOptionCode}):
          </div>
          <div style={{ fontSize: 13, marginBottom: 8, whiteSpace: "pre-wrap" }}>
            {verifyResult.suggestedExplanation}
          </div>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "4px 12px", fontSize: 12 }}
            onClick={handleUseSuggestedExplanation}
            disabled={disabled}
          >
            Gunakan pembahasan ini
          </button>
          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            Ini hanya mengganti teks Pembahasan -- jangan lupa centang
            manual opsi yang sesuai di atas.
          </div>
        </div>
      )}

      {error && (
        <div className="form-error-message" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}

      {draftNotice && (
        <div className="success-message" style={{ marginTop: 8 }}>
          ✨ Draf dari AI — baca pembahasannya untuk tahu jawaban yang
          benar menurut AI, lalu klik pilihan tersebut secara manual
          sebelum menyimpan.
        </div>
      )}

    </div>
  );
}

export default ExplanationField;
