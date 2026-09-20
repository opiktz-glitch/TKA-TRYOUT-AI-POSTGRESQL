import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { FULL_BOX } from "../services/imageCrop";

// ======================================================
// DIALOG "ATUR POTONGAN GAMBAR"
//
// Dipakai ImportImageModal untuk memilih (atau mengoreksi kotak dari
// AI) bagian gambar sumber yang mau dilampirkan ke satu soal. Cara
// pakai: tarik (drag) di atas gambar untuk menggambar kotak baru.
//
// BERDIRI SENDIRI -- bagian dari fitur Import dari Gambar; dihapus
// bersama ImportImageModal.jsx kalau fitur itu dibuang.
//
// Props:
//   sourceFile -> File gambar sumber
//   initialBox -> kotak awal {x,y,w,h} pecahan 0..1, atau null
//   canRemove  -> true kalau soal ini sudah punya lampiran (tombol
//                 "Hapus Lampiran" ditampilkan)
//   onApply(box) / onRemove() / onCancel()
// ======================================================

const MIN_SIDE = 0.02;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function ImageCropDialog({ sourceFile, initialBox, canRemove, onApply, onRemove, onCancel }) {
  const [url, setUrl] = useState(null);

  const [box, setBox] = useState(initialBox || null);

  const imgRef = useRef(null);

  // Titik awal drag, dan kotak SEBELUM drag dimulai -- supaya klik
  // biasa (tanpa geser) atau kotak yang terlalu kecil membatalkan
  // drag itu dan mengembalikan kotak yang lama.
  const startRef = useRef(null);
  const previousBoxRef = useRef(initialBox || null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(sourceFile);

    setUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [sourceFile]);

  function pointFromEvent(event) {
    const rect = imgRef.current.getBoundingClientRect();

    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    };
  }

  function handlePointerDown(event) {
    if (!imgRef.current || (event.button !== undefined && event.button !== 0)) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    const point = pointFromEvent(event);

    startRef.current = point;

    previousBoxRef.current = box;

    setBox({ x: point.x, y: point.y, w: 0, h: 0 });
  }

  function handlePointerMove(event) {
    if (!startRef.current) {
      return;
    }

    const point = pointFromEvent(event);

    const start = startRef.current;

    setBox({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      w: Math.abs(point.x - start.x),
      h: Math.abs(point.y - start.y),
    });
  }

  function handlePointerUp() {
    if (!startRef.current) {
      return;
    }

    startRef.current = null;

    setBox((current) =>
      current && current.w >= MIN_SIDE && current.h >= MIN_SIDE ? current : previousBoxRef.current,
    );
  }

  const valid = box && box.w >= MIN_SIDE && box.h >= MIN_SIDE;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 900, textAlign: "left" }}>
        <div className="modal-header">
          <div>
            <h2>✂️ Atur Potongan Gambar</h2>

            <p>Tarik (drag) pada gambar untuk memilih bagian yang mau dilampirkan ke soal.</p>
          </div>

          <button type="button" className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            background: "#f3f4f6",
            borderRadius: "8px",
            padding: "8px",
          }}
        >
          <div
            data-testid="crop-surface"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: "relative",
              display: "inline-block",
              overflow: "hidden",
              lineHeight: 0,
              cursor: "crosshair",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            {url && (
              <img
                ref={imgRef}
                src={url}
                alt="Gambar sumber"
                draggable={false}
                style={{ maxWidth: "100%", maxHeight: "58vh", display: "block" }}
              />
            )}

            {box && (box.w > 0 || box.h > 0) && (
              <div
                data-testid="crop-box"
                style={{
                  position: "absolute",
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  border: "2px solid #2563eb",
                  background: "rgba(37, 99, 235, 0.12)",
                  // Meredupkan area di LUAR kotak; wrapper overflow:hidden
                  // memotong bayangan raksasa ini.
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.35)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>

        <p style={{ color: "#6b7280", fontSize: "13px", margin: "10px 0 0" }}>
          {valid
            ? `Terpilih: ${Math.round(box.w * 100)}% lebar × ${Math.round(box.h * 100)}% tinggi dari gambar sumber.`
            : "Belum ada bagian yang dipilih."}
        </p>

        <div className="modal-footer">
          {canRemove && (
            <button type="button" className="secondary-button" onClick={onRemove}>
              Hapus Lampiran
            </button>
          )}

          <button type="button" className="secondary-button" onClick={() => setBox({ ...FULL_BOX })}>
            Seluruh Gambar
          </button>

          <button type="button" className="secondary-button" onClick={onCancel}>
            Batal
          </button>

          <button
            type="button"
            className="primary-button"
            disabled={!valid}
            onClick={() => onApply(box)}
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ImageCropDialog;
