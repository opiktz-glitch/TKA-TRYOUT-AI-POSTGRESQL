import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { createQuestion, uploadQuestionImage } from "../services/api";
import { extractQuestionsFromImage, PER_IMAGE_ERROR_STATUSES } from "../services/imageImportApi";
import { OPTION_CODES } from "../data/questionConstants";
import OptionsEditor from "./OptionsEditor";
import ImageCropDialog from "./ImageCropDialog";
import { blobToFile, cropToBlob } from "../services/imageCrop";

// ======================================================
// IMPORT SOAL DARI GAMBAR (PNG / JPG / WebP / screenshot)
//
// BERDIRI SENDIRI -- terpisah dari ImportDocumentModal. Alurnya
// mirip (upload -> proses -> review -> simpan), tapi kodenya
// sengaja tidak dicampur supaya fitur ini bisa dibuang/dimatikan
// tanpa menyentuh impor dokumen. Yang dipakai bersama hanya
// komponen kecil: OptionsEditor, OPTION_CODES, createQuestion.
//
// Tahap 1: gambar -> TEKS soal & opsi.
// Tahap 2: gambar/diagram DI DALAM soal. AI menandai kotaknya
// (image_box), browser memotongnya dari file asli, guru bisa
// mengoreksi lewat ImageCropDialog, lalu potongan diunggah lewat
// endpoint lampiran soal yang SUDAH ADA (uploadQuestionImage) begitu
// soalnya tersimpan. Kalau unggah gambar gagal, soalnya TETAP
// tersimpan dan unggah gambarnya bisa diulang (tanpa membuat soal ganda).
//
// Props:
//   subjects   -> daftar mata pelajaran (hanya yang aktif ditampilkan)
//   onClose    -> dipanggil saat modal boleh ditutup
//   onImported -> onImported(jumlah) setelah ada soal yang tersimpan
// ======================================================

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // sama dengan batas di backend
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function ImportImageModal({ subjects, onClose, onImported }) {
  // "upload" -> pilih mapel & gambar
  // "processing" -> gambar dibaca AI satu per satu
  // "review" -> draft soal, diperiksa/diedit sebelum disimpan
  const [step, setStep] = useState("upload");

  const [subjectId, setSubjectId] = useState("");

  // { id, file, previewUrl, status: "pending"|"processing"|"done"|
  //   "error"|"cancelled", count, message }
  const [images, setImages] = useState([]);

  const [error, setError] = useState("");

  const [items, setItems] = useState([]);

  const [saving, setSaving] = useState(false);

  const [dragOver, setDragOver] = useState(false);

  // key soal yang potongan gambarnya sedang diatur di ImageCropDialog
  const [cropKey, setCropKey] = useState(null);

  const cancelRef = useRef(false);

  // AbortController milik request yang SEDANG jalan, supaya tombol
  // "Batalkan" menghentikan request itu juga, bukan cuma menunggu
  // gambar yang sedang dibaca selesai (bisa puluhan detik).
  const abortRef = useRef(null);

  const nextImageIdRef = useRef(0);
  const nextItemKeyRef = useRef(0);
  const pasteCounterRef = useRef(0);

  const mountedRef = useRef(true);

  // key soal yang sudah dihapus guru -- supaya pemotongan gambar yang
  // masih berjalan di belakang layar tidak membuat preview "yatim".
  const removedKeysRef = useRef(new Set());

  const fileInputRef = useRef(null);

  // Salinan terbaru `images` untuk cleanup saat unmount, dan untuk
  // handler paste (yang didaftarkan sekali, jadi closure-nya basi).
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const addFilesRef = useRef(null);

  const pendingCount = items.filter((item) => item.selected && item.saveStatus !== "saved").length;

  // Soal sudah tersimpan tapi gambarnya belum berhasil terunggah.
  const imageFailCount = items.filter((item) => item.imageStatus === "error").length;

  // Bebaskan URL preview (thumbnail sumber + potongan gambar soal)
  // saat modal ditutup.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));

      itemsRef.current.forEach((item) => {
        if (item.image?.previewUrl) {
          URL.revokeObjectURL(item.image.previewUrl);
        }
      });
    };
  }, []);

  // ======================================================
  // TAMBAH GAMBAR: pilih file, seret-lepas, atau tempel (Ctrl+V)
  // ======================================================

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);

    if (incoming.length === 0) {
      return;
    }

    const problems = [];

    const accepted = [];

    let slots = MAX_IMAGES - imagesRef.current.length;

    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        problems.push(`"${file.name}" bukan PNG/JPG/WebP`);

        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        problems.push(`"${file.name}" lebih dari ${MAX_FILE_BYTES / (1024 * 1024)} MB`);

        continue;
      }

      if (slots <= 0) {
        problems.push(`"${file.name}" melebihi batas ${MAX_IMAGES} gambar`);

        continue;
      }

      slots -= 1;

      accepted.push({
        id: nextImageIdRef.current++,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
        count: 0,
        message: "",
      });
    }

    if (accepted.length > 0) {
      // Ref diperbarui SEKARANG (bukan menunggu render berikutnya) supaya
      // dua tempelan beruntun tetap menghitung sisa slot dengan benar.
      imagesRef.current = [...imagesRef.current, ...accepted];

      setImages((prev) => [...prev, ...accepted]);
    }

    setError(problems.length > 0 ? `Tidak ditambahkan: ${problems.join("; ")}.` : "");
  }

  addFilesRef.current = addFiles;

  // Tempel screenshot langsung dari clipboard (Win+Shift+S lalu
  // Ctrl+V) -- tanpa harus menyimpan file dulu. Hanya aktif di
  // langkah upload.
  useEffect(() => {
    if (step !== "upload") {
      return undefined;
    }

    function handlePaste(event) {
      const files = Array.from(event.clipboardData?.files || []).filter((file) =>
        file.type.startsWith("image/"),
      );

      if (files.length === 0) {
        return;
      }

      event.preventDefault();

      // Screenshot dari clipboard selalu bernama "image.png";
      // dikasih nama unik supaya bisa dibedakan di daftar & review.
      const renamed = files.map((file) => {
        pasteCounterRef.current += 1;

        const extension = file.type.split("/")[1] || "png";

        return new File([file], `Screenshot ${pasteCounterRef.current}.${extension}`, {
          type: file.type,
        });
      });

      addFilesRef.current(renamed);
    }

    window.addEventListener("paste", handlePaste);

    return () => window.removeEventListener("paste", handlePaste);
  }, [step]);

  function handleRemoveImage(id) {
    const target = images.find((image) => image.id === id);

    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }

    setImages((prev) => prev.filter((image) => image.id !== id));
  }

  function clearImages() {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));

    setImages([]);
  }

  function updateImage(id, patch) {
    setImages((prev) => prev.map((image) => (image.id === id ? { ...image, ...patch } : image)));
  }

  function handleDrop(event) {
    event.preventDefault();

    setDragOver(false);

    addFiles(event.dataTransfer?.files);
  }

  // ======================================================
  // TUTUP MODAL
  // ======================================================

  function confirmDiscardUnsaved(actionText) {
    if (step !== "review" || (pendingCount === 0 && imageFailCount === 0)) {
      return true;
    }

    const parts = [];

    if (pendingCount > 0) {
      parts.push(`${pendingCount} soal hasil baca gambar belum disimpan`);
    }

    if (imageFailCount > 0) {
      parts.push(`${imageFailCount} gambar soal belum berhasil terunggah`);
    }

    return window.confirm(`${parts.join(" dan ")} dan akan hilang. ${actionText}`);
  }

  function closeModal() {
    if (saving || step === "processing") {
      return;
    }

    if (!confirmDiscardUnsaved("Tutup tanpa menyimpan?")) {
      return;
    }

    onClose();
  }

  // ======================================================
  // PROSES: satu gambar per request, hasil LANGSUNG ditambahkan
  // ke daftar review begitu tiap gambar selesai -- kalau gambar
  // ke-4 dari 6 gagal, hasil gambar 1-3 tidak ikut hilang.
  // ======================================================

  async function handleExtract(event) {
    event.preventDefault();

    setError("");

    if (!subjectId) {
      setError("Mata pelajaran wajib dipilih");

      return;
    }

    if (images.length === 0) {
      setError("Tambahkan minimal satu gambar soal terlebih dahulu");

      return;
    }

    const queue = images.slice();

    cancelRef.current = false;

    setItems([]);

    setImages((prev) =>
      prev.map((image) => ({ ...image, status: "pending", count: 0, message: "" })),
    );

    setStep("processing");

    for (let i = 0; i < queue.length; i++) {
      if (cancelRef.current) {
        break;
      }

      const image = queue[i];

      updateImage(image.id, { status: "processing" });

      const controller = new AbortController();

      abortRef.current = controller;

      try {
        const result = await extractQuestionsFromImage(
          Number(subjectId),
          image.file,
          controller.signal,
        );

        const newItems = result.questions.map((question) => ({
          key: nextItemKeyRef.current++,

          sourceLabel: image.file.name,

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

          // ---- tahap 2: gambar soal ----
          // File sumber disimpan supaya potongannya bisa dibuat/diatur ulang.
          sourceFile: image.file,

          // { box, blob, previewUrl, enabled } setelah dipotong
          image: null,

          // true selama potongan otomatis dari kotak AI sedang dibuat
          imageBusy: Boolean(question.image_box),

          // null | "uploading" | "uploaded" | "error"  (setelah soal tersimpan)
          imageStatus: null,
          imageError: "",

          // id soal di database setelah tersimpan -- dipakai untuk mengulang unggah gambar
          savedId: null,
        }));

        setItems((prev) => [...prev, ...newItems]);

        // Potong gambar untuk soal yang kotaknya dikenali AI. Tidak
        // ditunggu (fire-and-forget) -- proses baca gambar berikutnya
        // tidak perlu menunggu canvas.
        result.questions.forEach((question, index) => {
          if (question.image_box) {
            attachCrop(newItems[index].key, image.file, question.image_box);
          }
        });

        updateImage(image.id, {
          status: "done",
          count: newItems.length,
          message: result.note || "",
        });
      } catch (err) {
        if (err.cancelled) {
          updateImage(image.id, { status: "cancelled" });

          break;
        }

        console.error("EXTRACT IMAGE ERROR:", err);

        updateImage(image.id, {
          status: "error",
          message: err.message || "Gagal membaca gambar ini",
        });

        // Gambar rusak/terlalu besar/kecil: lanjut ke gambar berikutnya.
        if (PER_IMAGE_ERROR_STATUSES.includes(err.status)) {
          continue;
        }

        // Selain itu (AI mati, API key salah, kuota habis, timeout)
        // hampir pasti terulang di gambar lain -- berhenti di sini.
        // Hasil gambar sebelumnya tetap ada di daftar review.
        setError(
          `Berhenti di gambar ke-${i + 1} dari ${queue.length}: ${err.message}` +
            " Soal yang sudah berhasil dibaca sebelumnya tetap ada di bawah.",
        );

        break;
      }
    }

    abortRef.current = null;

    setStep("review");
  }

  function handleCancelProcessing() {
    cancelRef.current = true;

    abortRef.current?.abort();
  }

  function handleBackToUpload() {
    if (saving) {
      return;
    }

    if (!confirmDiscardUnsaved("Ganti gambar tanpa menyimpan?")) {
      return;
    }

    clearImages();

    itemsRef.current.forEach((item) => {
      if (item.image?.previewUrl) {
        URL.revokeObjectURL(item.image.previewUrl);
      }
    });

    setItems([]);

    setCropKey(null);

    setError("");

    setStep("upload");
  }

  // ======================================================
  // EDIT DI LAYAR REVIEW (sebelum disimpan)
  // ======================================================

  function updateItem(key, patch) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function updateOption(key, optionIndex, patch) {
    setItems((prev) =>
      prev.map((item) =>
        item.key !== key
          ? item
          : {
              ...item,
              options: item.options.map((option, index) =>
                index === optionIndex ? { ...option, ...patch } : option,
              ),
            },
      ),
    );
  }

  function setCorrectOption(key, optionIndex) {
    setItems((prev) =>
      prev.map((item) =>
        item.key !== key
          ? item
          : {
              ...item,
              options: item.options.map((option, index) => ({
                ...option,
                is_correct: index === optionIndex,
              })),
            },
      ),
    );
  }

  function removeItem(key) {
    const target = itemsRef.current.find((item) => item.key === key);

    if (target?.image?.previewUrl) {
      URL.revokeObjectURL(target.image.previewUrl);
    }

    removedKeysRef.current.add(key);

    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  // ======================================================
  // GAMBAR SOAL (tahap 2)
  // ======================================================

  // Potong `sourceFile` menurut `box` lalu pasang sebagai lampiran
  // soal `key`. Dipakai untuk kotak dari AI maupun kotak hasil atur
  // manual di ImageCropDialog.
  async function attachCrop(key, sourceFile, box) {
    updateItem(key, { imageBusy: true, imageError: "" });

    try {
      const blob = await cropToBlob(sourceFile, box);

      if (!mountedRef.current || removedKeysRef.current.has(key)) {
        return;
      }

      const previewUrl = URL.createObjectURL(blob);

      const previous = itemsRef.current.find((item) => item.key === key)?.image;

      if (previous?.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }

      updateItem(key, {
        image: { box, blob, previewUrl, enabled: true },
        imageBusy: false,
        imageStatus: null,
        imageError: "",
      });
    } catch (err) {
      console.error("CROP IMAGE ERROR:", err);

      if (mountedRef.current && !removedKeysRef.current.has(key)) {
        updateItem(key, {
          imageBusy: false,
          imageError: err.message || "Gagal memotong gambar dari sumber.",
        });
      }
    }
  }

  function removeAttachment(key) {
    const target = itemsRef.current.find((item) => item.key === key);

    if (target?.image?.previewUrl) {
      URL.revokeObjectURL(target.image.previewUrl);
    }

    updateItem(key, { image: null, imageBusy: false, imageError: "" });
  }

  // Unggah potongan ke soal yang SUDAH tersimpan. Kegagalan di sini
  // sengaja TIDAK mengubah status simpan soalnya (soal sudah ada di
  // database) -- cukup ditandai supaya unggah gambarnya bisa diulang.
  async function uploadItemImage(key, questionId, blob) {
    updateItem(key, { imageStatus: "uploading", imageError: "" });

    try {
      await uploadQuestionImage(questionId, blobToFile(blob));

      updateItem(key, { imageStatus: "uploaded" });

      return true;
    } catch (err) {
      console.error("UPLOAD QUESTION IMAGE ERROR:", err);

      updateItem(key, {
        imageStatus: "error",
        imageError: err.message || "Gagal mengunggah gambar soal",
      });

      return false;
    }
  }

  // Masih ada soal yang butuh perhatian guru (gagal disimpan, atau
  // sudah tersimpan tapi gambarnya gagal terunggah)? `exceptKeys` =
  // soal yang baru saja diproses, yang hasilnya sudah dihitung sendiri.
  function hasUnresolvedItems(exceptKeys = []) {
    return itemsRef.current.some(
      (item) =>
        !exceptKeys.includes(item.key) &&
        (item.saveStatus === "error" || item.imageStatus === "error"),
    );
  }

  async function handleRetryImageUpload(key) {
    const item = itemsRef.current.find((current) => current.key === key);

    if (!item || !item.savedId || !item.image?.blob) {
      return;
    }

    const uploaded = await uploadItemImage(key, item.savedId, item.image.blob);

    // Unggah ulang berhasil dan tidak ada masalah lain tersisa ->
    // tidak ada lagi alasan untuk membiarkan modal terbuka.
    if (uploaded && mountedRef.current && !hasUnresolvedItems([key])) {
      onClose();
    }
  }

  // ======================================================
  // SIMPAN: soal yang dicentang disimpan satu per satu lewat
  // POST /api/questions biasa (validasi sama persis dengan tambah
  // soal manual). Yang ditolak backend TETAP ada di layar dengan
  // pesan errornya supaya tinggal diperbaiki lalu disimpan ulang.
  // ======================================================

  async function handleSaveSelected() {
    const selected = items.filter((item) => item.selected);

    if (selected.length === 0) {
      setError("Pilih minimal satu soal untuk disimpan");

      return;
    }

    setError("");

    setSaving(true);

    const selectedKeys = selected.map((item) => item.key);

    setItems((prev) =>
      prev.map((item) =>
        selectedKeys.includes(item.key) ? { ...item, saveStatus: "saving", saveError: "" } : item,
      ),
    );

    let successCount = 0;

    let hadFailure = false;

    for (const item of selected) {
      try {
        const created = await createQuestion({
          subject_id: Number(subjectId),
          question_text: item.question_text,
          question_type: "MULTIPLE_CHOICE",
          difficulty: item.difficulty,
          explanation: item.explanation || null,
          points: item.points,
          is_active: true,
          options: item.options,
        });

        successCount += 1;

        updateItem(item.key, {
          saveStatus: "saved",
          selected: false,
          savedId: created?.id ?? null,
        });

        // Lampiran diunggah SETELAH soalnya ada (butuh id-nya).
        if (item.image?.enabled && item.image.blob && created?.id) {
          const uploaded = await uploadItemImage(item.key, created.id, item.image.blob);

          if (!uploaded) {
            hadFailure = true;
          }
        }
      } catch (err) {
        console.error("SAVE IMAGE-IMPORTED QUESTION ERROR:", err);

        hadFailure = true;

        updateItem(item.key, {
          saveStatus: "error",
          saveError: err.message || "Gagal menyimpan soal ini",
        });
      }
    }

    setSaving(false);

    if (successCount > 0) {
      onImported(successCount);
    }

    // Semua soal terpilih tersimpan (dan semua gambarnya terunggah) ->
    // modal ditutup otomatis; pesan "N soal berhasil diimpor" sudah
    // tampil di halaman Bank Soal lewat onImported. Kalau ada yang
    // gagal, modal SENGAJA tetap terbuka supaya bisa diperbaiki /
    // diulang -- soal yang gagal tidak boleh hilang diam-diam.
    if (successCount > 0 && !hadFailure && !hasUnresolvedItems(selectedKeys)) {
      onClose();
    }
  }

  // ======================================================
  // TAMPILAN
  // ======================================================

  const finishedImages = images.filter((image) =>
    ["done", "error", "cancelled"].includes(image.status),
  ).length;

  const imageIssues = images.filter(
    (image) => image.status === "error" || (image.status === "done" && image.message),
  );

  function renderImageStatus(image) {
    if (image.status === "processing") {
      return "🔄 Sedang dibaca AI...";
    }

    if (image.status === "done") {
      return `✅ ${image.count} soal ditemukan`;
    }

    if (image.status === "error") {
      return `❌ ${image.message}`;
    }

    if (image.status === "cancelled") {
      return "⏹ Dibatalkan";
    }

    return "⏳ Menunggu";
  }

  function renderImageSection(item) {
    const locked = saving || item.saveStatus === "saved";

    return (
      <div className="form-group">
        <label>Gambar Soal</label>

        {item.imageBusy && <small style={{ color: "#6b7280" }}>⏳ Memotong gambar...</small>}

        {!item.imageBusy && item.image && (
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <img
              src={item.image.previewUrl}
              alt="Potongan gambar soal"
              style={{
                maxWidth: "240px",
                maxHeight: "170px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                background: "white",
                opacity: item.image.enabled ? 1 : 0.35,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label
                style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 400 }}
              >
                <input
                  type="checkbox"
                  checked={item.image.enabled}
                  disabled={locked}
                  onChange={() =>
                    updateItem(item.key, { image: { ...item.image, enabled: !item.image.enabled } })
                  }
                />
                Lampirkan gambar ini saat disimpan
              </label>

              {!locked && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ padding: "4px 10px" }}
                    onClick={() => setCropKey(item.key)}
                  >
                    ✂️ Atur Potongan
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    style={{ padding: "4px 10px" }}
                    onClick={() => removeAttachment(item.key)}
                  >
                    Hapus Gambar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!item.imageBusy && !item.image && !locked && (
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "6px 12px" }}
            onClick={() => setCropKey(item.key)}
          >
            🖼️ Lampirkan gambar dari sumber
          </button>
        )}

        {item.imageStatus === "uploading" && (
          <div style={{ color: "#6b7280", marginTop: "6px" }}>⏳ Mengunggah gambar...</div>
        )}

        {item.imageStatus === "uploaded" && (
          <div style={{ color: "#16a34a", marginTop: "6px" }}>✅ Gambar soal terlampir</div>
        )}

        {item.imageStatus === "error" && (
          <div className="form-error-message" style={{ marginTop: "8px" }}>
            Soal sudah tersimpan, tetapi gambarnya gagal diunggah: {item.imageError}{" "}
            <button
              type="button"
              className="secondary-button"
              style={{ padding: "2px 10px", marginLeft: "6px" }}
              disabled={saving}
              onClick={() => handleRetryImageUpload(item.key)}
            >
              Coba unggah lagi
            </button>
          </div>
        )}

        {item.imageStatus !== "error" && item.imageError && (
          <div className="form-error-message" style={{ marginTop: "8px" }}>
            {item.imageError}
          </div>
        )}
      </div>
    );
  }

  const cropItem = cropKey === null ? null : items.find((item) => item.key === cropKey);

  return createPortal(
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 720, textAlign: "left" }}>
        <div className="modal-header">
          <div>
            <h2>🖼️ Import Soal dari Gambar</h2>

            <p>
              {step === "review"
                ? "Periksa & lengkapi tiap soal hasil baca gambar sebelum disimpan. Soal tidak akan tersimpan kalau belum dicentang."
                : "Upload screenshot/foto soal pilihan ganda yang SUDAH ADA. AI hanya membaca ulang & menyalin — bukan membuat soal baru. Gambar/diagram di dalam soal juga ditandai AI dan dipotong otomatis (bisa Anda atur di layar review)."}
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={closeModal}
            disabled={saving || step === "processing"}
          >
            ×
          </button>
        </div>

        {step === "upload" && (
          <form onSubmit={handleExtract}>
            <div className="form-group">
              <label>Mata Pelajaran *</label>

              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
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
              <label>Gambar Soal *</label>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();

                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();

                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? "#2563eb" : "#d1d5db"}`,
                  background: dragOver ? "#eff6ff" : "#f9fafb",
                  borderRadius: "10px",
                  padding: "22px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, color: "#374151", fontSize: "15px" }}>
                  Tempel screenshot (Ctrl+V), seret &amp; lepas, atau klik untuk memilih
                </div>

                <small style={{ color: "#6b7280", fontSize: "13px" }}>
                  PNG, JPG, atau WebP · maks {MAX_FILE_BYTES / (1024 * 1024)} MB per gambar · maks{" "}
                  {MAX_IMAGES} gambar
                </small>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  addFiles(e.target.files);

                  // Reset supaya memilih file yang SAMA lagi (setelah
                  // dihapus dari daftar) tetap memicu onChange.
                  e.target.value = "";
                }}
              />

              {images.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      style={{
                        position: "relative",
                        width: "104px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "4px",
                        background: "white",
                      }}
                    >
                      <img
                        src={image.previewUrl}
                        alt={`Gambar ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "72px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          display: "block",
                        }}
                      />

                      <div
                        title={image.file.name}
                        style={{
                          fontSize: "11px",
                          marginTop: "4px",
                          color: "#374151",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {image.file.name}
                      </div>

                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        {formatSize(image.file.size)}
                      </div>

                      <button
                        type="button"
                        aria-label={`Hapus ${image.file.name}`}
                        onClick={() => handleRemoveImage(image.id)}
                        style={{
                          position: "absolute",
                          top: "-8px",
                          right: "-8px",
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          border: "1px solid #d1d5db",
                          background: "white",
                          cursor: "pointer",
                          lineHeight: 1,
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="form-error-message" style={{ marginBottom: "15px" }}>
                {error}
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={closeModal}>
                Batal
              </button>

              <button type="submit" className="primary-button" disabled={images.length === 0}>
                {images.length > 0 ? `Baca ${images.length} Gambar` : "Baca Gambar"}
              </button>
            </div>
          </form>
        )}

        {step === "processing" && (
          <div>
            <div style={{ marginBottom: "12px", fontWeight: 600 }}>
              Membaca gambar {Math.min(finishedImages + 1, images.length)} dari {images.length}...
            </div>

            <div
              style={{
                width: "100%",
                height: "10px",
                borderRadius: "6px",
                background: "#e5e7eb",
                overflow: "hidden",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: `${images.length > 0 ? (finishedImages / images.length) * 100 : 0}%`,
                  height: "100%",
                  background: "#2563eb",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", fontSize: "14px" }}>
              {images.map((image, index) => (
                <li key={image.id} style={{ padding: "4px 0", color: "#374151" }}>
                  <strong>Gambar {index + 1}</strong>{" "}
                  <span style={{ color: "#6b7280" }}>({image.file.name})</span> —{" "}
                  {renderImageStatus(image)}
                </li>
              ))}
            </ul>

            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              {items.length} soal ditemukan sejauh ini. Soal yang sudah ditemukan tetap aman meski
              gambar berikutnya gagal.
            </p>

            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={handleCancelProcessing}>
                Batalkan &amp; Lihat Hasil Sejauh Ini
              </button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div>
            {imageIssues.length > 0 && (
              <div className="form-error-message" style={{ marginBottom: "15px" }}>
                {imageIssues.map((image) => (
                  <div key={image.id}>
                    <strong>{image.file.name}:</strong> {image.message}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="form-error-message" style={{ marginBottom: "15px" }}>
                {error}
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
              {items.map((item, itemIndex) => (
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
                        onChange={() => updateItem(item.key, { selected: !item.selected })}
                        disabled={saving}
                      />
                      Soal #{itemIndex + 1}
                      <span style={{ color: "#6b7280", fontWeight: 400, fontSize: "12px" }}>
                        dari {item.sourceLabel}
                      </span>
                      {item.saveStatus === "saved" && (
                        <span style={{ color: "#16a34a", fontWeight: 400 }}>— Tersimpan</span>
                      )}
                    </label>

                    <button
                      type="button"
                      className="secondary-button"
                      style={{ padding: "4px 10px" }}
                      onClick={() => removeItem(item.key)}
                      disabled={saving}
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
                      onChange={(e) => updateItem(item.key, { question_text: e.target.value })}
                      rows={3}
                      disabled={saving}
                    />
                  </div>

                  {renderImageSection(item)}

                  <OptionsEditor
                    options={item.options}
                    name={`image-import-correct-${item.key}`}
                    disabled={saving}
                    onTextChange={(optionIndex, value) =>
                      updateOption(item.key, optionIndex, { option_text: value })
                    }
                    onCorrectChange={(optionIndex) => setCorrectOption(item.key, optionIndex)}
                  />

                  <div className="form-group">
                    <label>Pembahasan (opsional)</label>

                    <textarea
                      value={item.explanation}
                      onChange={(e) => updateItem(item.key, { explanation: e.target.value })}
                      rows={2}
                      disabled={saving}
                    />
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <p style={{ color: "#6b7280" }}>
                  Belum ada soal yang berhasil dibaca dari gambar. Kembali ke langkah upload untuk
                  mencoba gambar lain (pastikan tulisannya jelas dan tidak terpotong).
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={handleBackToUpload}
                disabled={saving}
              >
                ← Gambar Lain
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={closeModal}
                disabled={saving}
              >
                Tutup
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleSaveSelected}
                disabled={saving || items.filter((item) => item.selected).length === 0}
              >
                {saving
                  ? "Menyimpan..."
                  : `Simpan ${items.filter((item) => item.selected).length} Soal Terpilih`}
              </button>
            </div>
          </div>
        )}

        {cropItem && (
          <ImageCropDialog
            sourceFile={cropItem.sourceFile}
            initialBox={cropItem.image?.box || null}
            canRemove={Boolean(cropItem.image)}
            onApply={(box) => {
              setCropKey(null);

              attachCrop(cropItem.key, cropItem.sourceFile, box);
            }}
            onRemove={() => {
              removeAttachment(cropItem.key);

              setCropKey(null);
            }}
            onCancel={() => setCropKey(null)}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

export default ImportImageModal;
