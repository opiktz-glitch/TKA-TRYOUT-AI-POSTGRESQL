// =====================================================
// HELPER LAPORAN (dipakai AdminReport & TeacherReport)
//
// Ambang tingkat kesalahan soal. Satu-satunya tempat angka ini
// ditulis: warna badge "xx% salah" dan kalimat insight di Laporan
// Guru sama-sama membacanya dari sini.
// =====================================================

// Batas lulus = 70% dari skor maksimal. Harus sama dengan aturan di
// backend (routers/student.py, finalize_attempt: skor >= max_score * 0.70).
export const PASS_THRESHOLD_PERCENT = 70;


// Posisi satu bucket distribusi nilai (label backend "61-80") terhadap
// batas lulus:
//   "below" -> seluruh rentang di bawah batas lulus
//   "pass"  -> seluruh rentang di atas/tepat batas lulus
//   "mixed" -> batas lulus jatuh DI DALAM rentang, jadi isinya campuran
//              (mis. bucket 61-80 berisi yang 61-69 dan 70-80)
export function bucketPassState(range) {
  const [low, high] = String(range).split("-").map(Number);

  if (Number.isNaN(low) || Number.isNaN(high)) {
    return "mixed";
  }

  if (high < PASS_THRESHOLD_PERCENT) {
    return "below";
  }

  if (low >= PASS_THRESHOLD_PERCENT) {
    return "pass";
  }

  return "mixed";
}


// >= ambang ini -> merah ("sulit sekali")
export const WRONG_HIGH_PERCENT = 60;

// >= ambang ini -> kuning ("sulit"); di bawahnya hijau
export const WRONG_MEDIUM_PERCENT = 30;


// Nama kelas modifier untuk <span className="wrong-badge ...">.
// Warnanya didefinisikan di pages/Report.css.
export function wrongBadgeClass(percentage) {
  if (percentage >= WRONG_HIGH_PERCENT) {
    return "is-high";
  }

  if (percentage >= WRONG_MEDIUM_PERCENT) {
    return "is-medium";
  }

  return "is-low";
}
