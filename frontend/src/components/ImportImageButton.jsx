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
//   subjects   -> daftar mata pelajaran, diteruskan ke modal
//   onImported -> onImported(jumlah) setelah ada soal yang tersimpan
// ======================================================

const IMAGE_IMPORT_ENABLED = true;

function ImportImageButtonInner({ subjects, onImported }) {
  const [showModal, setShowModal] = useState(false);

  const [checking, setChecking] = useState(false);

  const [message, setMessage] = useState("");

  // Cek CEPAT (tanpa memanggil AI) apakah provider AI yang aktif bisa
  // membaca gambar. Tidak memakai useAiStatusGate karena hook itu
  // hanya tahu "AI online atau tidak" -- Ollama text-only bisa online
  // tetapi tetap tidak bisa dipakai untuk gambar.
  async function handleClick() {
    setMessage("");

    try {
      setChecking(true);

      const capability = await getImageImportCapability();

      if (!capability.available) {
        setMessage(
          capability.reason || "AI yang aktif saat ini belum bisa membaca gambar. Hubungi admin.",
        );

        return;
      }

      setShowModal(true);
    } catch (err) {
      console.error("CHECK IMAGE IMPORT CAPABILITY ERROR:", err);

      setMessage(err.message || "Gagal memeriksa kemampuan AI. Coba lagi nanti.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="secondary-button"
        onClick={handleClick}
        disabled={checking}
      >
        {checking ? "Mengecek AI..." : "🖼️ Import dari Gambar"}
      </button>

      {message && (
        <div
          className="form-error-message"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "320px",
            zIndex: 5,
            textAlign: "left",
          }}
        >
          {message}
        </div>
      )}

      {showModal && (
        <ImportImageModal
          subjects={subjects}
          onClose={() => setShowModal(false)}
          onImported={onImported}
        />
      )}
    </div>
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
