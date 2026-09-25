import { useState } from "react";
import ImportImageModal from "./ImportImageModal";
import { getImageImportCapability } from "../services/imageImportApi";

// ======================================================
// TOMBOL "IMPORT DARI GAMBAR"
//
// Satu komponen yang membawa SEMUANYA: tombol, pengecekan
// kemampuan AI, pesan error, dan modalnya. Jadi QuestionManagement
// cukup menaruh satu baris:
//
//   <ImportImageButton subjects={subjects} onImported={...} />
//
// MENYEMBUNYIKAN fitur: ubah IMAGE_IMPORT_ENABLED di bawah jadi
// false (tombol hilang, tidak ada request ke backend sama sekali).
// MENGHAPUS fitur: hapus baris di atas dari QuestionManagement.jsx
// beserta import-nya, lalu hapus file frontend fitur ini:
// ImportImageButton.jsx, ImportImageModal.jsx, ImageCropDialog.jsx,
// services/imageImportApi.js, services/imageCrop.js.
//
// Props:
//   gate       -> useAiStatusGate instance dari parent (cek AI online)
//   subjects   -> daftar mata pelajaran, diteruskan ke modal
//   onImported -> onImported(jumlah) setelah ada soal yang tersimpan
// ======================================================

const IMAGE_IMPORT_ENABLED = true;

function ImportImageButtonInner({ gate, subjects, onImported }) {
  const [showModal, setShowModal] = useState(false);

  // Langkah 1: gate.run() cek apakah AI online (via getAIStatus),
  // sama seperti importGate pada tombol "Impor dari Dokumen".
  // Langkah 2: jika online, getImageImportCapability() dijalankan
  // untuk memastikan provider mendukung vision (mis. bukan Ollama
  // text-only), baru modal dibuka.
  async function openIfCapable() {
    try {
      const capability = await getImageImportCapability();

      if (!capability.available) {
        toast.error(
          capability.reason || "AI yang aktif saat ini belum bisa membaca gambar. Hubungi admin.",
          { id: "ai-image-gate" }
        );

        return;
      }

      setShowModal(true);
    } catch (err) {
      console.error("CHECK IMAGE IMPORT CAPABILITY ERROR:", err);

      toast.error(
        err.message || "Gagal memeriksa kemampuan AI. Coba lagi nanti.",
        { id: "ai-image-gate" }
      );
    }
  }

  return (
    <>
      <button
        type="button"
        className="secondary-button"
        onClick={() => gate.run(openIfCapable)}
        disabled={gate.checking}
      >
        {gate.checking ? "Mengecek AI..." : "🖼️ Import dari Gambar"}
      </button>

      {showModal && (
        <ImportImageModal
          subjects={subjects}
          onClose={() => setShowModal(false)}
          onImported={onImported}
        />
      )}
    </>
  );
}

// Dibungkus supaya saat dimatikan, tidak ada hook/efek yang jalan.
function ImportImageButton(props) {
  if (!IMAGE_IMPORT_ENABLED) {
    return null;
  }

  return <ImportImageButtonInner {...props} />;
}

export default ImportImageButton;
