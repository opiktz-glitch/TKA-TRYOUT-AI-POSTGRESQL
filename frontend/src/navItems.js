// =========================================================
// DAFTAR MENU (untuk quick-nav search di Header)
//
// SENGAJA daftar terpisah, bukan dibaca otomatis dari Sidebar.jsx
// -- link Sidebar ditulis manual per role di sana (bukan di-generate
// dari data), jadi daftar ini disalin manual dan HARUS diperbarui
// bareng kalau Sidebar.jsx berubah (menu ditambah/dihapus/pindah
// role). Ini murni untuk lompat cepat ke halaman lewat pencarian,
// TIDAK mencari isi/data di database sama sekali.
// =========================================================

export const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", roles: ["ADMIN", "GURU", "SISWA"] },

  // ADMIN
  { path: "/users", label: "Kelola User", roles: ["ADMIN"] },
  { path: "/subjects", label: "Mata Pelajaran", roles: ["ADMIN", "GURU"] },
  { path: "/questions", label: "Bank Soal", roles: ["ADMIN", "GURU"] },
  { path: "/tryouts", label: "Paket Tryout", roles: ["ADMIN", "GURU"] },
  { path: "/students", label: "Data Siswa", roles: ["ADMIN"] },
  { path: "/teachers", label: "Data Guru", roles: ["ADMIN"] },
  { path: "/admin/scores", label: "Nilai", roles: ["ADMIN"] },
  { path: "/admin/reports", label: "Laporan", roles: ["ADMIN"] },
  { path: "/admin/settings", label: "Pengaturan", roles: ["ADMIN"] },

  // GURU
  { path: "/teacher/students", label: "Peserta", roles: ["GURU"] },
  { path: "/teacher/scores", label: "Nilai", roles: ["GURU"] },
  { path: "/teacher/reports", label: "Laporan", roles: ["GURU"] },

  // SISWA
  { path: "/student/tryouts", label: "Daftar Tryout", roles: ["SISWA"] },
  { path: "/student/history", label: "Riwayat & Hasil", roles: ["SISWA"] },
  { path: "/student/profile", label: "Profil", roles: ["SISWA"] },
];
