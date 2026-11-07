import { useEffect, useRef, useState, useCallback } from "react";
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
// Dilengkapi fitur Lightbox Modal Zoom yang dapat dibuka lewat tombol
// "Perbesar" saat allowZoom=true.
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
  const zoomTriggerRef = useRef(null);
  const lightboxRef = useRef(null);
  const closeZoomRef = useRef(null);

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

    const zoomTrigger = zoomTriggerRef.current;

    closeZoomRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsZoomed(false);
        setZoomScale(1);
        return;
      }

      if (e.key === "Tab") {
        const buttons = lightboxRef.current?.querySelectorAll(
          'button:not(:disabled):not([tabindex="-1"])'
        );
        const firstButton = buttons?.[0];
        const lastButton = buttons?.[buttons.length - 1];

        if (e.shiftKey && document.activeElement === firstButton) {
          e.preventDefault();
          lastButton?.focus();
        } else if (!e.shiftKey && document.activeElement === lastButton) {
          e.preventDefault();
          firstButton?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      if (zoomTrigger?.isConnected) {
        zoomTrigger.focus();
      }
    };
  }, [isZoomed]);

  const handleCloseZoom = useCallback(() => {
    setIsZoomed(false);
    setZoomScale(1);
  }, []);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleZoomReset = () => {
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
          className={`question-image ${className}`}
          title={alt}
        />

        {allowZoom && (
          <button
            type="button"
            className="question-image-zoom-btn"
            ref={zoomTriggerRef}
            onClick={() => setIsZoomed(true)}
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
          <dialog
            open
            className="image-lightbox-overlay"
            aria-modal="true"
            aria-labelledby="question-image-lightbox-title"
            ref={lightboxRef}
          >
            <button
              type="button"
              className="image-lightbox-backdrop"
              aria-label="Tutup pratinjau gambar"
              tabIndex="-1"
              onClick={handleCloseZoom}
            />

            <div className="image-lightbox-header">
              <span className="image-lightbox-title" id="question-image-lightbox-title">
                Pratinjau Gambar Soal
              </span>
              <button
                type="button"
                className="image-lightbox-close-btn"
                ref={closeZoomRef}
                onClick={handleCloseZoom}
                aria-label="Tutup pratinjau gambar"
                title="Tutup (ESC)"
              >
                ×
              </button>
            </div>

            <div className="image-lightbox-body">
              <img
                src={imageUrl}
                alt={alt}
                className="image-lightbox-img"
                style={{ transform: `scale(${zoomScale})` }}
              />
            </div>

            <div className="image-lightbox-controls">
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
                aria-label={`Atur ulang pembesaran, ${Math.round(zoomScale * 100)}%`}
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
          </dialog>,
          document.body
        )}
    </>
  );
}

export default QuestionImage;
