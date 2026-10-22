import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

import { fetchQuestionImageUrl } from "../services/api";
import "./QuestionImage.css";

// Dipakai di QuestionManagement.jsx (preview form guru),
// StudentTryoutAttempt.jsx (tampilan soal saat siswa ujian),
// QuestionPreviewModal, TryoutReviewModal, dan StudentHistory.
//
// Endpoint GET /api/questions/{id}/image butuh header Authorization,
// jadi tidak bisa langsung dipasang sebagai src="..." — komponen ini
// yang urus fetch + convert ke blob URL di belakang layar, pemanggil
// cukup kasih questionId saja.
//
// Dilengkapi fitur Click-to-Enlarge / Lightbox Modal Zoom:
// jika allowZoom=true (default), gambar dapat diklik atau ditekan
// tombol "Perbesar" untuk melihat resolusi penuh di layar.
function QuestionImage({
  questionId,
  alt = "Gambar soal",
  className = "",
  allowZoom = true,
}) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    setLoadFailed(false);

    fetchQuestionImageUrl(questionId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [questionId]);

  // Keyboard Escape listener & scroll lock saat Lightbox aktif
  useEffect(() => {
    if (!isZoomed) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsZoomed(false);
        setZoomScale(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isZoomed]);

  const handleCloseZoom = useCallback(() => {
    setIsZoomed(false);
    setZoomScale(1);
  }, []);

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoomScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoomScale((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleZoomReset = (e) => {
    e.stopPropagation();
    setZoomScale(1);
  };

  if (loadFailed) {
    return (
      <div className={`question-image-error ${className}`}>
        Gambar gagal dimuat
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`question-image-loading ${className}`}>
        Memuat gambar...
      </div>
    );
  }

  return (
    <>
      <div className="question-image-container">
        <img
          src={imageUrl}
          alt={alt}
          className={`question-image ${className} ${allowZoom ? "question-image-clickable" : ""}`}
          onClick={allowZoom ? () => setIsZoomed(true) : undefined}
          title={allowZoom ? "Klik untuk memperbesar gambar" : alt}
        />

        {allowZoom && (
          <button
            type="button"
            className="question-image-zoom-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(true);
            }}
            title="Klik untuk memperbesar gambar"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            Perbesar
          </button>
        )}
      </div>

      {isZoomed &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="image-lightbox-overlay"
            onClick={handleCloseZoom}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="image-lightbox-header"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="image-lightbox-title">
                Pratinjau Gambar Soal
              </span>
              <button
                type="button"
                className="image-lightbox-close-btn"
                onClick={handleCloseZoom}
                title="Tutup (ESC)"
              >
                ×
              </button>
            </div>

            <div className="image-lightbox-body" onClick={handleCloseZoom}>
              <img
                src={imageUrl}
                alt={alt}
                className="image-lightbox-img"
                style={{ transform: `scale(${zoomScale})` }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div
              className="image-lightbox-controls"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="image-lightbox-btn"
                onClick={handleZoomOut}
                disabled={zoomScale <= 0.5}
                title="Perkecil"
              >
                − Perkecil
              </button>
              <button
                type="button"
                className="image-lightbox-btn"
                onClick={handleZoomReset}
                title="Kembalikan ke Ukuran Normal"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                className="image-lightbox-btn"
                onClick={handleZoomIn}
                disabled={zoomScale >= 3}
                title="Perbesar"
              >
                + Perbesar
              </button>
              <span className="image-lightbox-hint">
                Klik di luar gambar atau tekan ESC untuk keluar
              </span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default QuestionImage;
