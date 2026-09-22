import { useEffect, useRef, useState } from "react";

import { createQuestion, prepareDocumentExtraction, processDocumentChunk } from "../services/api";
import { OPTION_CODES } from "../data/questionConstants";
import OptionsEditor from "./OptionsEditor";

// Pesan yang berganti-ganti tiap beberapa detik SEKEDAR untuk
// memberi kesan "masih berjalan" selama menunggu SATU potongan
// diproses AI -- backend tidak punya progress granular untuk satu
// potongan (responsnya baru datang sekali jadi, bukan streaming),
// jadi urutan pesan ini TIDAK mencerminkan tahapan sungguhan di
// backend, cuma supaya layar tidak terlihat diam/macet selagi
// menunggu.
const IMPORT_PROCESSING_MESSAGES = [
  "Membaca potongan teks dokumen...",
  "AI sedang menganalisis soal...",
  "Menyusun pilihan jawaban...",
  "Hampir selesai untuk potongan ini...",
];

// Batas atas & "kecepatan" progres semu untuk SATU potongan yang
// sedang diproses (lihat computeChunkSubProgress di bawah). MURNI
// kosmetik -- gunanya supaya progress bar & angka %-nya ikut
// bergerak maju terus (melambat, tapi TIDAK PERNAH mundur) selagi
// menunggu potongan itu kelar, alih-alih diam di posisi potongan
// sebelumnya (paling kentara saat dokumen cuma punya 1 potongan:
// tanpa ini, progress akan terbaca 0% terus sampai tiba-tiba lompat
// ke 100% begitu potongan itu selesai).
const CHUNK_SUB_PROGRESS_CAP = 0.92;
const CHUNK_SUB_PROGRESS_TAU_SECONDS = 12;

// Kurva "mendekati tapi tidak pernah sampai" batas atas -- naik cepat
// di awal, makin lama makin melambat, supaya kelihatan wajar untuk
// potongan yang cepat maupun yang makan waktu belasan menit (Ollama
// lokal). Sengaja TIDAK dikaitkan ke pesan yang berputar
// (IMPORT_PROCESSING_MESSAGES) supaya tidak ikut mundur tiap pesan
// balik ke awal.
function computeChunkSubProgress(chunkElapsedSeconds) {
  return CHUNK_SUB_PROGRESS_CAP * (1 - Math.exp(-chunkElapsedSeconds / CHUNK_SUB_PROGRESS_TAU_SECONDS));
}

function formatImportElapsed(totalSeconds) {
  if (totalSeconds < 60) {
    return `${totalSeconds} detik`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes} menit ${seconds} detik`;
}

// ======================================================
// IMPOR SOAL DARI DOKUMEN (PDF/DOCX/TXT)
//
// Dipakai QuestionManagement.jsx (Bank Soal). Seluruh state & alur
// impor ada di sini; komponen ini di-mount baru setiap modal dibuka,
// jadi semua isian otomatis mulai dari nol.
//
// Pengecekan status AI (online/offline) SEBELUM modal dibuka tetap
// dilakukan induk, di tombol "Impor dari Dokumen".
//
// Props:
//   subjects   -> daftar mata pelajaran (yang aktif saja yang ditampilkan)
//   onClose    -> dipanggil saat modal boleh ditutup
//   onImported -> onImported(jumlah) dipanggil setelah ada soal yang
//                 berhasil disimpan, supaya induk memuat ulang daftar soal
// ======================================================

function ImportDocumentModal({ subjects, onClose, onImported }) {
  // "upload" -> pilih mata pelajaran & file
  // "review" -> daftar soal hasil ekstraksi, bisa diperiksa/
  //             diedit/dicentang sebelum disimpan
  const [importStep, setImportStep] = useState("upload");

  const [importSubjectId, setImportSubjectId] = useState("");

  const [importFile, setImportFile] = useState(null);

  const [importLoading, setImportLoading] = useState(false);

  const [importError, setImportError] = useState("");

  const [importSkippedCount, setImportSkippedCount] = useState(0);

  // Setiap item: { key, question_text, explanation, options: [...],
  // warning, selected, saveStatus: null|"saving"|"saved"|"error",
  // saveError }. Disimpan terpisah dari `questions` (daftar soal
  // tersimpan) karena ini masih berupa DRAFT yang belum tentu jadi
  // soal sungguhan sampai guru menekan "Simpan Soal Terpilih".
  const [importedQuestions, setImportedQuestions] = useState([]);

  const [importSaving, setImportSaving] = useState(false);

  // "processing" (langkah tengah, baru): loading + progress bar
  // saat frontend memanggil processDocumentChunk() satu per satu.
  const [importProgressCurrent, setImportProgressCurrent] = useState(0);
  const [importProgressTotal, setImportProgressTotal] = useState(0);

  // MURNI kosmetik (lihat IMPORT_PROCESSING_MESSAGES di atas): waktu
  // berjalan (detik) & pesan yang berputar selama importStep ===
  // "processing", supaya guru punya tanda visual jelas bahwa proses
  // masih berjalan, bukan macet -- terutama untuk potongan yang
  // makan waktu lama (chunk besar / Ollama lambat).
  const [importElapsedSeconds, setImportElapsedSeconds] = useState(0);
  const [importMessageIndex, setImportMessageIndex] = useState(0);

  // Detik berjalan KHUSUS untuk potongan yang sedang diproses saat
  // ini -- beda dari importElapsedSeconds (yang total sejak proses
  // mulai). Dipakai computeChunkSubProgress() supaya progres semu
  // dalam satu potongan mulai dari 0 lagi tiap kali potongan
  // berganti, TAPI tidak pernah mundur SELAMA potongan yang sama
  // masih diproses (beda dengan pendekatan lama yang mengikuti
  // pesan berputar dan jadi ikut mundur).
  const [importChunkElapsedSeconds, setImportChunkElapsedSeconds] = useState(0);

  useEffect(() => {
    if (importStep !== "processing") {
      return undefined;
    }

    const timer = setInterval(() => {
      setImportElapsedSeconds((seconds) => seconds + 1);
      setImportChunkElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [importStep]);

  useEffect(() => {
    if (importStep !== "processing") {
      return undefined;
    }

    const timer = setInterval(() => {
      setImportMessageIndex(
        (index) => (index + 1) % IMPORT_PROCESSING_MESSAGES.length,
      );
    }, 2400);

    return () => clearInterval(timer);
  }, [importStep]);

  // Setiap kali potongan BERGANTI (importProgressCurrent berubah),
  // mulai lagi dari pesan pertama -- supaya pesan "Hampir selesai..."
  // dari potongan sebelumnya tidak nyangkut ke awal potongan
  // berikutnya.
  useEffect(() => {
    setImportMessageIndex(0);
    setImportChunkElapsedSeconds(0);
  }, [importProgressCurrent]);

  // Dipakai tombol "Batalkan" saat importStep === "processing":
  // loop di handleExtractSubmit mengecek ref ini SEBELUM memproses
  // tiap potongan berikutnya. Potongan yang SUDAH selesai diproses
  // tetap muncul di layar review — cuma potongan yang BELUM
  // diproses yang dilewati.
  const importCancelRef = useRef(false);

  const nextImportKeyRef = useRef(0);

  // Soal hasil ekstraksi yang MASIH dicentang tapi belum tersimpan --
  // angkanya sama dengan yang tertulis di tombol "Simpan N Soal Terpilih".
  const pendingCount = importedQuestions.filter(
    (item) => item.selected && item.saveStatus !== "saved",
  ).length;

  // Hasil ekstraksi cuma ada di layar ini (proses AI-nya bisa belasan
  // menit), jadi jangan dibuang diam-diam: minta konfirmasi dulu kalau
  // masih ada yang belum disimpan.
  function confirmDiscardUnsaved(actionText) {
    if (importStep !== "review" || pendingCount === 0) {
      return true;
    }

    return window.confirm(
      `${pendingCount} soal hasil ekstraksi belum disimpan dan akan hilang. ${actionText}`,
    );
  }

  function closeImportModal() {
    if (importLoading || importSaving || importStep === "processing") {
      return;
    }

    if (!confirmDiscardUnsaved("Tutup tanpa menyimpan?")) {
      return;
    }

    onClose();
  }

  // ======================================================
  // LANGKAH 1 -> 2 -> 3: UPLOAD (prepare, cepat & tanpa AI) LALU
  // PROSES TIAP POTONGAN SATU PER SATU LEWAT AI (processDocumentChunk)
  //
  // Hasil tiap potongan LANGSUNG ditambahkan ke `importedQuestions`
  // begitu selesai — bukan menunggu semua potongan kelar dulu.
  // Jadi kalau potongan ke-8 dari 15 gagal (timeout/AI error), 7
  // potongan sebelumnya TETAP ada di layar review, bukan ikut
  // hilang seperti pendekatan lama (1 request besar untuk semua
  // potongan sekaligus).
  // ======================================================

  async function handleExtractSubmit(event) {
    event.preventDefault();

    setImportError("");

    if (!importSubjectId) {
      setImportError("Mata pelajaran wajib dipilih");

      return;
    }

    if (!importFile) {
      setImportError("Pilih file dokumen (.pdf, .docx, atau .txt) terlebih dahulu");

      return;
    }

    let chunks;

    try {
      setImportLoading(true);

      const prepared = await prepareDocumentExtraction(Number(importSubjectId), importFile);

      chunks = prepared.chunks;
    } catch (err) {
      console.error("PREPARE DOCUMENT EXTRACTION ERROR:", err);

      setImportError(err.message || "Gagal membaca dokumen");

      setImportLoading(false);

      return;
    }

    setImportLoading(false);

    if (!chunks || chunks.length === 0) {
      setImportError("Dokumen tidak berisi teks yang bisa diproses.");

      return;
    }

    importCancelRef.current = false;

    setImportedQuestions([]);
    setImportSkippedCount(0);
    setImportProgressCurrent(0);
    setImportProgressTotal(chunks.length);
    setImportElapsedSeconds(0);
    setImportMessageIndex(0);
    setImportStep("processing");

    let totalSkipped = 0;

    for (let i = 0; i < chunks.length; i++) {
      if (importCancelRef.current) {
        break;
      }

      const chunk = chunks[i];

      try {
        const result = await processDocumentChunk(
          Number(importSubjectId),
          chunk.chunk_text,
          chunk.expected_count,
        );

        const items = result.questions.map((question) => ({
          key: nextImportKeyRef.current++,

          question_text: question.question_text,

          difficulty: question.difficulty || "MEDIUM",

          explanation: question.explanation || "",

          points: question.points ?? 1,

          options: OPTION_CODES.map((code) => {
            const found = question.options.find((option) => option.option_code === code);

            return {
              option_code: code,
              option_text: found?.option_text || "",
              is_correct: found?.is_correct || false,
            };
          }),

          warning: question.warning || null,

          selected: true,

          saveStatus: null,
          saveError: "",
        }));

        setImportedQuestions((prev) => [...prev, ...items]);

        totalSkipped += result.skipped_count || 0;

        setImportSkippedCount(totalSkipped);
      } catch (err) {
        console.error("PROCESS DOCUMENT CHUNK ERROR:", err);

        // Kemungkinan besar ini masalah konfigurasi (AI mati di
        // tengah proses, dsb) yang akan terus terulang di potongan
        // berikutnya juga — daripada menghabiskan waktu mencoba
        // semua potongan sisanya dan gagal semua, proses dihentikan
        // di sini. Potongan yang SUDAH berhasil (sebelum ini) tetap
        // ada di importedQuestions, tidak ikut dibuang.
        setImportError(
          `Berhenti di potongan ke-${i + 1} dari ${chunks.length}: ` +
            (err.message || "Gagal memproses potongan ini") +
            " Soal yang sudah berhasil diproses sebelumnya tetap tersimpan di bawah.",
        );

        break;
      }

      setImportProgressCurrent(i + 1);
    }

    setImportStep("review");
  }

  function handleCancelImportProcessing() {
    importCancelRef.current = true;
  }

  function handleBackToImportUpload() {
    if (importSaving) {
      return;
    }

    if (!confirmDiscardUnsaved("Ganti dokumen tanpa menyimpan?")) {
      return;
    }

    setImportStep("upload");
    setImportError("");
  }

  // ======================================================
  // EDIT DI LAYAR REVIEW (sebelum disimpan)
  // ======================================================

  function handleImportToggleSelected(key) {
    setImportedQuestions((prev) =>
      prev.map((item) => (item.key === key ? { ...item, selected: !item.selected } : item)),
    );
  }

  function handleImportRemove(key) {
    setImportedQuestions((prev) => prev.filter((item) => item.key !== key));
  }

  function handleImportQuestionTextChange(key, value) {
    setImportedQuestions((prev) =>
      prev.map((item) => (item.key === key ? { ...item, question_text: value } : item)),
    );
  }

  function handleImportExplanationChange(key, value) {
    setImportedQuestions((prev) =>
      prev.map((item) => (item.key === key ? { ...item, explanation: value } : item)),
    );
  }

  function handleImportOptionTextChange(key, optionIndex, value) {
    setImportedQuestions((prev) =>
      prev.map((item) => {
        if (item.key !== key) {
          return item;
        }

        const newOptions = [...item.options];

        newOptions[optionIndex] = {
          ...newOptions[optionIndex],
          option_text: value,
        };

        return { ...item, options: newOptions };
      }),
    );
  }

  function handleImportCorrectAnswer(key, optionIndex) {
    setImportedQuestions((prev) =>
      prev.map((item) => {
        if (item.key !== key) {
          return item;
        }

        return {
          ...item,
          options: item.options.map((option, index) => ({
            ...option,
            is_correct: index === optionIndex,
          })),
        };
      }),
    );
  }

  // ======================================================
  // LANGKAH 2 -> SIMPAN: soal yang dicentang disimpan SATU PER
  // SATU lewat endpoint POST /api/questions biasa (validasinya
  // sama persis dengan tambah soal manual). Kalau ada yang
  // ditolak backend (mis. opsi belum lengkap, jawaban benar belum
  // ditandai), soal itu TETAP ada di layar dengan pesan error-nya
  // sendiri supaya guru tinggal perbaiki lalu simpan ulang — tidak
  // perlu upload dokumen dari awal lagi.
  // ======================================================

  async function handleSaveSelectedImported() {
    const selectedKeys = importedQuestions.filter((item) => item.selected).map((item) => item.key);

    if (selectedKeys.length === 0) {
      setImportError("Pilih minimal satu soal untuk disimpan");

      return;
    }

    setImportError("");
    setImportSaving(true);

    // Tandai semua yang dicentang sebagai "saving" dulu supaya UI
    // langsung memberi umpan balik, baru diproses berurutan
    // (bukan Promise.all) supaya tidak membanjiri backend/provider
    // AI (verifikasi konsistensi ikut jalan tiap create? — tidak,
    // endpoint create biasa tidak memanggil AI, tapi tetap
    // berurutan lebih aman untuk SQLite).
    setImportedQuestions((prev) =>
      prev.map((item) =>
        selectedKeys.includes(item.key) ? { ...item, saveStatus: "saving", saveError: "" } : item,
      ),
    );

    let successCount = 0;

    for (const key of selectedKeys) {
      const item = importedQuestions.find((q) => q.key === key);

      if (!item) {
        continue;
      }

      try {
        await createQuestion({
          subject_id: Number(importSubjectId),
          question_text: item.question_text,
          question_type: "MULTIPLE_CHOICE",
          difficulty: item.difficulty,
          explanation: item.explanation || null,
          points: item.points,
          is_active: true,
          options: item.options,
        });

        successCount += 1;

        setImportedQuestions((prev) =>
          prev.map((q) => (q.key === key ? { ...q, saveStatus: "saved", selected: false } : q)),
        );
      } catch (err) {
        console.error("SAVE IMPORTED QUESTION ERROR:", err);

        setImportedQuestions((prev) =>
          prev.map((q) =>
            q.key === key
              ? {
                  ...q,
                  saveStatus: "error",
                  saveError: err.message || "Gagal menyimpan soal ini",
                }
              : q,
          ),
        );
      }
    }

    setImportSaving(false);

    if (successCount > 0) {
      onImported(successCount);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <div>
            <h2>📄 Impor Soal dari Dokumen</h2>

            <p>
              {importStep === "upload"
                ? "Upload dokumen (.pdf, .docx, .txt) yang isinya SUDAH BERISI soal pilihan ganda. AI hanya akan membaca ulang & menstrukturkannya — bukan membuat soal baru."
                : "Periksa & lengkapi tiap soal hasil ekstraksi sebelum disimpan. Soal tidak akan tersimpan kalau belum dicentang."}
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={closeImportModal}
            disabled={importLoading || importSaving || importStep === "processing"}
          >
            ×
          </button>
        </div>

        {importStep === "upload" && (
          <form onSubmit={handleExtractSubmit}>
            <div className="form-group">
              <label>Mata Pelajaran *</label>

              <select
                value={importSubjectId}
                onChange={(e) => setImportSubjectId(e.target.value)}
                disabled={importLoading}
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
              <label>File Dokumen *</label>

              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                disabled={importLoading}
                required
              />

              <small style={{ color: "#6b7280" }}>
                Format didukung: PDF, Word (.docx), atau teks biasa (.txt). Maksimal 15 MB.
              </small>
            </div>

            {importError && (
              <div className="form-error-message" style={{ marginBottom: "15px" }}>
                {importError}
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={closeImportModal}
                disabled={importLoading}
              >
                Batal
              </button>

              <button type="submit" className="primary-button" disabled={importLoading}>
                {importLoading
                  ? "Membaca dokumen... (bisa sampai belasan menit untuk dokumen panjang, terutama kalau pakai Ollama lokal)"
                  : "Ekstrak Soal"}
              </button>
            </div>
          </form>
        )}

        {importStep === "processing" && (() => {
          // Potongan yang SEDANG diproses (belum tercatat selesai di
          // importProgressCurrent) dianggap sudah berjalan sebagian,
          // supaya bar & angka %-nya tidak diam di posisi potongan
          // sebelumnya sepanjang menunggu (lihat CHUNK_SUB_PROGRESS).
          const currentChunkFraction =
            importProgressCurrent < importProgressTotal
              ? computeChunkSubProgress(importChunkElapsedSeconds)
              : 0;

          const overallFraction =
            importProgressTotal > 0
              ? (importProgressCurrent + currentChunkFraction) / importProgressTotal
              : 0;

          const overallPercent = Math.min(99, Math.round(overallFraction * 100));

          return (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "4px",
              }}
            >
              <span className="import-spinner" aria-hidden="true" />

              <span style={{ fontSize: "15px", fontWeight: 600 }}>
                {importProgressTotal > 1
                  ? `Memproses potongan ${Math.min(
                      importProgressCurrent + 1,
                      importProgressTotal,
                    )} dari ${importProgressTotal}`
                  : "Memproses dokumen..."}
              </span>

              <span style={{ color: "#9ca3af", fontSize: "13px", marginLeft: "auto" }}>
                {formatImportElapsed(importElapsedSeconds)}
              </span>
            </div>

            {/* key={importMessageIndex} sengaja dipasang supaya elemen
                DI-MOUNT ULANG tiap pesan berganti -- animasi fade-in
                CSS-nya (import-status-message) jalan lagi dari awal
                setiap kali, bukan cuma sekali di awal. */}
            <p
              key={importMessageIndex}
              className="import-status-message"
              style={{ color: "#6b7280", fontSize: "13px", marginBottom: "12px", minHeight: "18px" }}
            >
              {IMPORT_PROCESSING_MESSAGES[importMessageIndex]}
            </p>

            <div className="import-progress-track" style={{ marginBottom: "10px" }}>
              <div
                className="import-progress-fill"
                style={{
                  width: `${overallPercent}%`,
                  transition: "width 0.6s ease",
                }}
              />

              {/* Potongan hijau ini menandai sisa dari potongan yang
                  SEDANG diproses saat ini (belum selesai) -- diberi
                  animasi shimmer supaya terlihat "hidup"/berjalan,
                  nyambung persis di ujung bar solid di atas. */}
              {importProgressCurrent < importProgressTotal && (
                <div
                  className="import-progress-active"
                  style={{
                    left: `${overallPercent}%`,
                    width: `${Math.max(
                      0,
                      (1 / importProgressTotal) * 100 -
                        (overallPercent - (importProgressCurrent / importProgressTotal) * 100),
                    )}%`,
                  }}
                />
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
                color: "#9ca3af",
                marginBottom: "16px",
              }}
            >
              <span>{overallPercent}% selesai</span>

              <span>
                {importedQuestions.length > 0 && `${importedQuestions.length} soal ditemukan`}
                {importSkippedCount > 0 && ` · ${importSkippedCount} bagian dilewati`}
              </span>
            </div>

            <p style={{ color: "#6b7280", marginBottom: "20px", fontSize: "13px" }}>
              Jangan tutup jendela ini — soal yang sudah ditemukan tetap aman meski ada potongan
              berikutnya yang gagal.
            </p>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelImportProcessing}
              >
                Batalkan &amp; Lihat Hasil Sejauh Ini
              </button>
            </div>
          </div>
          );
        })()}

        {importStep === "review" && (
          <div>
            {importSkippedCount > 0 && (
              <div className="form-error-message" style={{ marginBottom: "15px" }}>
                {importSkippedCount} bagian dokumen tidak berhasil dikenali sebagai soal pilihan
                ganda dan tidak ikut muncul di bawah ini. Tambahkan manual kalau ada soal yang
                terlewat.
              </div>
            )}

            {importError && (
              <div className="form-error-message" style={{ marginBottom: "15px" }}>
                {importError}
              </div>
            )}

            <div
              style={{
                maxHeight: "55vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {importedQuestions.map((item, itemIndex) => (
                <div
                  key={item.key}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "14px",
                    opacity: item.saveStatus === "saved" ? 0.6 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: 600,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleImportToggleSelected(item.key)}
                        disabled={importSaving}
                      />
                      Soal #{itemIndex + 1}
                      {item.saveStatus === "saved" && (
                        <span style={{ color: "#16a34a", fontWeight: 400 }}>— Tersimpan</span>
                      )}
                    </label>

                    <button
                      type="button"
                      className="secondary-button"
                      style={{ padding: "4px 10px" }}
                      onClick={() => handleImportRemove(item.key)}
                      disabled={importSaving}
                    >
                      Hapus
                    </button>
                  </div>

                  {item.warning && (
                    <div className="form-error-message" style={{ marginBottom: "10px" }}>
                      ⚠️ {item.warning}
                    </div>
                  )}

                  {item.saveStatus === "error" && (
                    <div className="form-error-message" style={{ marginBottom: "10px" }}>
                      {item.saveError}
                    </div>
                  )}

                  <div className="form-group">
                    <label>Pertanyaan</label>

                    <textarea
                      value={item.question_text}
                      onChange={(e) => handleImportQuestionTextChange(item.key, e.target.value)}
                      rows={3}
                      disabled={importSaving}
                    />
                  </div>

                  <OptionsEditor
                    options={item.options}
                    name={`import-correct-${item.key}`}
                    disabled={importSaving}
                    onTextChange={(optionIndex, value) =>
                      handleImportOptionTextChange(item.key, optionIndex, value)
                    }
                    onCorrectChange={(optionIndex) =>
                      handleImportCorrectAnswer(item.key, optionIndex)
                    }
                  />

                  <div className="form-group">
                    <label>Pembahasan (opsional)</label>

                    <textarea
                      value={item.explanation}
                      onChange={(e) => handleImportExplanationChange(item.key, e.target.value)}
                      rows={2}
                      disabled={importSaving}
                    />
                  </div>
                </div>
              ))}

              {importedQuestions.length === 0 && (
                <p style={{ color: "#6b7280" }}>
                  Semua soal hasil ekstraksi sudah dihapus dari daftar ini. Kembali ke langkah
                  upload kalau mau coba dokumen lain.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={handleBackToImportUpload}
                disabled={importSaving}
              >
                ← Dokumen Lain
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={closeImportModal}
                disabled={importSaving}
              >
                Tutup
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleSaveSelectedImported}
                disabled={importSaving || importedQuestions.filter((q) => q.selected).length === 0}
              >
                {importSaving
                  ? "Menyimpan..."
                  : `Simpan ${importedQuestions.filter((q) => q.selected).length} Soal Terpilih`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportDocumentModal;
