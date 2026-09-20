// Konstanta yang dipakai bersama oleh halaman Bank Soal
// (QuestionManagement.jsx) dan komponen-komponen modalnya.

// Kode pilihan jawaban, urutannya = urutan tampil di form.
export const OPTION_CODES = ["A", "B", "C", "D"];

// Tingkat kesulitan soal: value = yang dikirim/disimpan di backend,
// label = yang tampil di UI.
export const DIFFICULTIES = [
  {
    value: "EASY",
    label: "Mudah",
  },
  {
    value: "MEDIUM",
    label: "Sedang",
  },
  {
    value: "HARD",
    label: "Sulit",
  },
];
