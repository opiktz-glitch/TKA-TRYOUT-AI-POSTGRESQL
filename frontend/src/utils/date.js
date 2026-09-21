// =====================================================
// HELPER TANGGAL
//
// Backend menyimpan & mengirim timestamp sebagai UTC TANPA info
// zona waktu (mis. "2026-09-21T03:00:00"). Kalau string seperti
// itu langsung dilempar ke `new Date()`, browser menganggapnya
// WAKTU LOKAL, bukan UTC -- di Jakarta (UTC+7) hasilnya meleset
// 7 jam ("selesai 5 menit lalu" tampil "7 jam lalu").
//
// parseUtcDate() memaksa string tanpa zona waktu diperlakukan
// sebagai UTC. String yang sudah punya zona ("...Z" atau
// "+07:00") dibiarkan apa adanya.
//
// Mengembalikan objek Date, atau null kalau nilainya kosong /
// tidak valid.
// =====================================================

export function parseUtcDate(value) {
  if (!value) {
    return null;
  }

  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}
