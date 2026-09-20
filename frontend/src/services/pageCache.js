// =====================================================================
// CACHE HALAMAN (di MEMORI, bukan localStorage)
//
// Dipakai halaman yang datanya dimuat dari server (mis. Nilai dan Laporan)
// supaya saat user berpindah halaman lalu kembali, data kunjungan
// sebelumnya LANGSUNG tampil (tidak ada "Memuat..." / layar kosong),
// sementara halaman memperbarui data di belakang layar dan menimpanya
// dengan yang baru begitu selesai. (Dashboard punya cache sendiri di
// services/dashboardCache.js.)
//
// - Hanya hidup selama tab tidak di-refresh: setelah login pertama atau
//   refresh halaman, cache kosong dan loading tampil seperti biasa.
// - Dikunci per user. Kalau user lain login di tab yang sama, isi cache
//   milik user sebelumnya dibuang.
// - Dikosongkan saat logout dan saat sesi kedaluwarsa (auth/AuthContext.jsx).
// - Dibatasi MAX_ENTRIES entri; yang paling lama tidak dipakai dibuang
//   duluan, jadi memori tidak menumpuk walau user mencoba banyak filter.
// - Sengaja TIDAK memakai localStorage: data ini tidak perlu (dan tidak
//   boleh) bertahan setelah tab ditutup.
//
// Pemakaian:
//   const cached = readPageCache(user?.id, "kunci");   // undefined kalau belum ada
//   writePageCache(user?.id, "kunci", data);
// =====================================================================

const MAX_ENTRIES = 12;

let cacheUserId = null;
let entries = new Map();


// Mengembalikan nilai yang tersimpan, atau undefined kalau belum ada /
// milik user lain. Membaca menandai entri sebagai "baru dipakai".
export function readPageCache(userId, key) {
  if (!userId || cacheUserId !== userId || !entries.has(key)) {
    return undefined;
  }

  const value = entries.get(key);

  entries.delete(key);
  entries.set(key, value);

  return value;
}


export function writePageCache(userId, key, value) {
  if (!userId) {
    return;
  }

  // User berbeda dari pemilik cache saat ini -> mulai dari nol.
  if (cacheUserId !== userId) {
    cacheUserId = userId;
    entries = new Map();
  }

  entries.delete(key);
  entries.set(key, value);

  while (entries.size > MAX_ENTRIES) {
    entries.delete(entries.keys().next().value);
  }
}


export function clearPageCache() {
  cacheUserId = null;
  entries = new Map();
}
