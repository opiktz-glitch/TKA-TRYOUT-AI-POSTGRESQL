import { parseUtcDate } from "./date";



// =====================================================
// HELPER — potong teks panjang untuk preview singkat
// =====================================================

// =====================================================
// HELPER — nama tampilan provider AI untuk kartu "Status AI"
// milik GURU (GET /api/settings/ai-status cuma mengirim kode
// provider, mis. "OLLAMA", bukan label siap-tampil).
// =====================================================

export function providerLabel(activeProvider) {
  if (activeProvider === "OLLAMA") {
    return "Ollama";
  }

  if (activeProvider === "GEMINI") {
    return "Google Gemini";
  }

  return activeProvider || "-";
}

export function truncateText(text, maxLength = 70) {
  if (!text) {
    return "";
  }

  return text.length > maxLength
    ? `${text.slice(0, maxLength)}…`
    : text;
}


// =====================================================
// HELPER — format tanggal jadi relatif ("2 jam lalu", dst)
// =====================================================

export function timeAgo(dateString) {
  // parseUtcDate: timestamp backend berupa UTC tanpa "Z", jangan
  // langsung new Date() (meleset 7 jam di WIB, lihat utils/date.js).
  const date = parseUtcDate(dateString);

  if (!date) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Baru saja";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} menit lalu`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} jam lalu`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} hari lalu`;
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


// =====================================================
// HELPER — format tanggal singkat ("21 Sep") untuk label
// sumbu grafik "Tren Nilai" (dashboard Siswa), beda dari
// timeAgo() yang untuk teks relatif di kartu lain.
// =====================================================

export function shortDate(dateString) {
  const date = parseUtcDate(dateString);

  if (!date) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}


// =====================================================
// KOMPOSISI BANK SOAL (widget dashboard admin)
//
// Sel dengan jumlah soal di bawah batas ini diberi warna supaya
// admin langsung melihat "celah" bank soal. Ubah angkanya kalau
// dirasa terlalu ketat/longgar untuk skala soal Anda.
// =====================================================

export const MIN_QUESTIONS_PER_CELL = 5;


// =====================================================
// Jeda refresh angka "live" di dashboard admin (Sedang
// Mengerjakan, Selesai Hari Ini), dalam milidetik.
// =====================================================

export const LIVE_REFRESH_MS = 30000;

export function bankCellStyle(count) {
  if (count === 0) {
    return { background: "#f8d7da", color: "#842029", fontWeight: 600 };
  }

  if (count < MIN_QUESTIONS_PER_CELL) {
    return { background: "#fff3cd", color: "#856404", fontWeight: 600 };
  }

  return undefined;
}


// =====================================================
// PANEL "PERLU PERHATIAN" (dashboard admin)
// =====================================================

export function formatBytes(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ATTENTION_BADGE_BASE = {
  marginLeft: "auto",
  flexShrink: 0,
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

// tone: "warn" (perlu dicek), "ok" (aman), "info" (netral)
export function attentionBadgeStyle(tone) {
  if (tone === "warn") {
    return { ...ATTENTION_BADGE_BASE, background: "#fff3cd", color: "#856404" };
  }

  if (tone === "ok") {
    return { ...ATTENTION_BADGE_BASE, background: "#d1e7dd", color: "#0f5132" };
  }

  return { ...ATTENTION_BADGE_BASE, background: "#f3f4f6", color: "#374151" };
}


// =====================================================
// TINGKAT NILAI (dashboard Siswa) -- dipakai bareng oleh
// kartu "Nilai per Mata Pelajaran" (badge + bar) dan kartu
// "Tren Nilai" (warna titik di grafik), supaya ambang batas
// hijau/kuning/merahnya konsisten di kedua tempat.
// =====================================================

export function scoreTier(score) {
  if (score >= 75) {
    return "is-pass";
  }

  if (score >= 60) {
    return "is-medium";
  }

  return "is-fail";
}


// =====================================================
// TITIK GRAFIK "TREN NILAI" (dashboard Siswa)
//
// Ubah daftar {score, ...} jadi koordinat SVG. Asumsi skala
// nilai 0-100 (sama seperti scoreTier() di atas dan bar di
// kartu "Nilai per Mata Pelajaran"). Nilai di-clamp ke 0-100
// supaya data yang di luar dugaan tidak menggambar titik di
// luar area grafik.
//
// Padding atas/bawah SENGAJA tidak simetris: atas perlu ruang
// lebih supaya angka nilai yang ditulis di atas tiap titik
// (lihat render-nya di JSX) tidak kepotong kalau nilainya
// mendekati 100, bawah cukup untuk sumbu tanggal.
// =====================================================

export const TREND_WIDTH = 320;
export const TREND_HEIGHT = 110;
export const TREND_PADDING_X = 20;
export const TREND_PADDING_TOP = 26;
export const TREND_PADDING_BOTTOM = 14;

// Garis bantu skala nilai (bukan cuma dekorasi kosong) --
// ditandai di 0/50/100 supaya posisi titik di grafik punya
// acuan angka, bukan cuma naik/turun relatif tanpa skala.
export const TREND_GRID_VALUES = [0, 50, 100];

export function trendValueToY(value) {
  const usableHeight = TREND_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM;
  const clamped = Math.max(0, Math.min(100, value));

  return TREND_PADDING_TOP + usableHeight - (clamped / 100) * usableHeight;
}

export function buildTrendPoints(scores) {
  const n = scores.length;

  if (n === 0) {
    return [];
  }

  const usableWidth = TREND_WIDTH - TREND_PADDING_X * 2;

  return scores.map((score, i) => {
    const x =
      n === 1
        ? TREND_WIDTH / 2
        : TREND_PADDING_X + (i * usableWidth) / (n - 1);

    return { x, y: trendValueToY(score) };
  });
}


// =====================================================
// CACHE DASHBOARD — kunci cache per role
// (lihat services/dashboardCache.js)
// =====================================================

export function roleCacheKey(role) {
  if (role === "ADMIN") {
    return "admin";
  }

  if (role === "GURU") {
    return "teacher";
  }

  if (role === "SISWA") {
    return "student";
  }

  return null;
}


