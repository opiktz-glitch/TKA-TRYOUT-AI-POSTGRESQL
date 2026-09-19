import { useEffect, useState } from "react";

import { fetchQuestionImageUrl } from "../services/api";

// Dipakai di QuestionManagement.jsx (preview form guru) dan
// StudentTryoutAttempt.jsx (tampilan soal saat siswa ujian).
//
// Endpoint GET /api/questions/{id}/image butuh header Authorization,
// jadi tidak bisa langsung dipasang sebagai src="..." — komponen ini
// yang urus fetch + convert ke blob URL di belakang layar, pemanggil
// cukup kasih questionId saja.
function QuestionImage({ questionId, alt = "Gambar soal", className = "" }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    setLoadFailed(false);

    fetchQuestionImageUrl(questionId)
      .then((url) => {
        if (cancelled) {
          // Komponen sudah unmount / questionId sudah ganti lagi
          // sebelum fetch selesai -- buang blob URL yang baru
          // didapat, jangan sampai nyangkut tanpa pernah di-render.
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
    <img
      src={imageUrl}
      alt={alt}
      className={`question-image ${className}`}
    />
  );
}

export default QuestionImage;
