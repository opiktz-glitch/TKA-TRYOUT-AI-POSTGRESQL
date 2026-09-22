// =====================================================================
// CACHE DASHBOARD (di MEMORI, bukan localStorage)
//
// Tujuan: begitu user berpindah halaman lalu kembali ke Dashboard,
// data kunjungan sebelumnya langsung tampil (tidak ada "..." atau kartu
// kosong sesaat), sementara Dashboard.jsx memperbarui data di belakang
// layar dan menimpanya dengan yang baru begitu selesai.
//
// - Hanya hidup selama tab tidak di-refresh. Pertama kali login atau
//   setelah refresh halaman, cache kosong, jadi loading tampil seperti
//   biasa.
// - Dikunci per user (userId). Kalau user lain login di tab yang sama,
//   cache lama diabaikan dan dibuang.
// - Dikosongkan saat logout dan saat sesi kedaluwarsa (lihat
//   auth/AuthContext.jsx), supaya data user sebelumnya tidak tertinggal.
// - Sengaja TIDAK memakai localStorage: data dashboard tidak perlu (dan
//   tidak boleh) bertahan setelah tab ditutup.
//
// Isi per kunci: "admin", "teacher", "student", "live" (angka live admin),
// "system" (status sistem lengkap, khusus ADMIN), dan "aiCard" (status
// AI ringkas, khusus GURU) -- bentuknya ditentukan Dashboard.jsx.
// =====================================================================

const EMPTY = Object.freeze({});

function createEmptyCache(userId) {
  return {
    userId,
    admin: null,
    teacher: null,
    student: null,
    live: null,
    system: null,
    aiCard: null,
  };
}

let cache = createEmptyCache(null);


// Mengembalikan isi cache milik userId ini, atau objek kosong ({}) kalau
// belum ada / milik user lain. Aman langsung di-destructure/dibaca.
export function readDashboardCache(userId) {
  if (!userId || cache.userId !== userId) {
    return EMPTY;
  }

  return cache;
}


export function writeDashboardCache(userId, key, value) {
  if (!userId) {
    return;
  }

  // User berbeda dari pemilik cache saat ini -> mulai dari nol.
  if (cache.userId !== userId) {
    cache = createEmptyCache(userId);
  }

  cache[key] = value;
}


export function clearDashboardCache() {
  cache = createEmptyCache(null);
}
