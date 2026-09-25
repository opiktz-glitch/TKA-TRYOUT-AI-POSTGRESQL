// =====================================================
// API IMPORT SOAL DARI GAMBAR
//
// BERDIRI SENDIRI -- sengaja tidak menambah apa pun ke api.js.
// apiFetch() di api.js tidak di-export, jadi file ini punya
// versi mini sendiri dengan perilaku yang SAMA:
//   - base URL: VITE_API_URL, atau hostname browser + :8000
//   - header Authorization dari localStorage("access_token")
//   - 401 -> hapus token & broadcast "auth:unauthorized"
//   - pesan error dibaca dari `detail` response backend
//
// Kalau suatu saat mau digabung: export apiFetch dari api.js lalu
// ganti fungsi request() di bawah dengan itu.
//
// Menghapus fitur: hapus file ini + ImportImageModal.jsx +
// ImportImageButton.jsx + ImageCropDialog.jsx + services/imageCrop.js
// + 3 baris di QuestionManagement.jsx.
// =====================================================

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, "");
  }

  const { protocol, hostname } = window.location;

  return `${protocol}//${hostname}:8000`;
}

const API_BASE_URL = resolveApiBaseUrl();

// Harus lebih longgar dari timeout backend TERLAMA di antara semua
// provider vision, bukan cuma Gemini -- Ollama LOKAL (sering dipakai
// tanpa GPU khusus, mis. di laptop) butuh jauh lebih lama daripada
// Gemini untuk satu gambar. Lihat OLLAMA_VISION_TIMEOUT_SECONDS (240
// detik) di backend/ai_vision.py; +20 detik di sini supaya backend
// SELALU sempat membalas duluan (baik hasil sukses maupun pesan error
// timeout-nya sendiri) sebelum frontend menyerah.
const EXTRACT_TIMEOUT_MS = 260000;

// Error yang khusus SATU gambar (gambar rusak/terlalu besar/terlalu
// kecil). Proses gambar berikutnya boleh lanjut. Status lain (400,
// 502, 503, 504, 401, ...) = masalah AI/konfigurasi, jadi proses
// dihentikan. Kodenya sinkron dengan routers/image_import.py.
export const PER_IMAGE_ERROR_STATUSES = [413, 415, 422];

async function request(path, { method = "GET", body, signal } = {}) {
  const headers = {};

  const token = localStorage.getItem("access_token");

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // FormData: Content-Type SENGAJA tidak diisi, biar browser yang
  // menambahkan boundary multipart dengan benar.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body,
    signal,
  });

  if (response.status === 401) {
    localStorage.removeItem("access_token");

    window.dispatchEvent(new Event("auth:unauthorized"));

    throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.message === "string" && data.message) ||
      "Terjadi kesalahan pada server";

    const error = new Error(message);

    error.status = response.status;

    throw error;
  }

  return data;
}

// -> { available: boolean, provider: string|null, reason: string|null }
export async function getImageImportCapability() {
  return request("/api/image-import/capability");
}

// Membaca SATU gambar -> { questions: [...], note: string|null }.
// `cancelSignal` (AbortSignal, opsional): kalau di-abort pemanggil
// (tombol "Batalkan"), error yang dilempar punya `cancelled = true`
// supaya bisa dibedakan dari timeout.
export async function extractQuestionsFromImage(subjectId, file, cancelSignal) {
  const formData = new FormData();

  formData.append("file", file);

  const controller = new AbortController();

  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;

    controller.abort();
  }, EXTRACT_TIMEOUT_MS);

  const onCancel = () => controller.abort();

  if (cancelSignal) {
    if (cancelSignal.aborted) {
      controller.abort();
    } else {
      cancelSignal.addEventListener("abort", onCancel, { once: true });
    }
  }

  try {
    return await request(
      `/api/image-import/extract?subject_id=${encodeURIComponent(subjectId)}`,
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      },
    );
  } catch (err) {
    if (err.name === "AbortError") {
      if (timedOut) {
        throw new Error(
          `Gambar ini butuh waktu lebih dari ${Math.round(
            EXTRACT_TIMEOUT_MS / 60000
          )} menit untuk dibaca AI, jadi dihentikan. Ini wajar kalau memakai Ollama secara lokal di laptop tanpa GPU, apalagi untuk gambar yang penuh teks. Coba lagi, pakai model vision yang lebih ringan, atau gunakan Gemini untuk sementara.`
        );
      }

      const cancelled = new Error("Dibatalkan");

      cancelled.cancelled = true;

      throw cancelled;
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);

    if (cancelSignal) {
      cancelSignal.removeEventListener("abort", onCancel);
    }
  }
}
