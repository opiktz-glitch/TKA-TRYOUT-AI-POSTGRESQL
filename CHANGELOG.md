# Changelog

Semua perubahan penting pada proyek **TKA-AI (TKA Tryout)** didokumentasikan di dalam file ini.

---

## [v03.1] - 2026-10-22 (Fitur Zoom Gambar Soal, Proteksi Database & Kebijakan Testing)

### Ditambahkan
- **Lightbox Zoom Gambar Soal saat Ujian**: Tombol `🔍 Perbesar` muncul di bawah gambar soal saat ujian berlangsung. Klik gambar atau tombol untuk membuka modal zoom fullscreen dengan kontrol `+` / `-` / `100%` dan tutup via tombol `×` atau tekan `ESC`. Blur backdrop dark glassmorphism.
- **Skrip Test Runner Aman (`run_tests.ps1`)**: Script `backend/scripts/run_tests.ps1` untuk menjalankan unit test — menampilkan database yang dipakai (sensor password), menjalankan seluruh test suite, dan melaporkan status SUKSES/GAGAL.
- **Dukungan ENV_FILE di config.py**: `backend/config.py` kini mendukung environment variable `ENV_FILE` untuk memilih file `.env` alternatif tanpa mengubah kode (berguna jika suatu saat ingin memisahkan environment testing).

### Diubah
- **Kebijakan Testing (AGENTS.md & mandatory_testing.md)**: Testing menggunakan database Neon Tech production (sesuai `.env`) — **diperbolehkan**, dengan syarat setiap unit test wajib membersihkan data-nya sendiri via `tearDown()`. Tidak lagi ada pemisahan ke SQLite/PostgreSQL lokal.
- **Tampilan Teks Soal (`white-space: pre-wrap`)**: Teks soal di halaman pengerjaan CBT, riwayat ujian, dan modal pratinjau kini mengikuti *line break* asli naskah soal (tidak kolaps menjadi satu paragraf padat).

### Diperbaiki
- **React Rules of Hooks di `ScoreReportModal.jsx`**: Pindahkan `useMemo` ke atas sebelum `if (!isOpen) return null` untuk menghindari pelanggaran Rules of Hooks.

---

## [v03] - 2026-10-21 (Versi Terkini: PostgreSQL Concurrency & Optimasi Ujian)


### Ditambahkan
- **Dukungan PostgreSQL Penuh**: Backend mendukung PostgreSQL secara *native* dengan fitur *pool pre-ping* dan *pool recycle* (menghindari timeout koneksi pool di penyedia cloud/Neon Tech/Docker).
- **Proteksi Concurrency Ujian**: Menambahkan index unik parsial (`uq_attempt_active_per_student_tryout` pada `t_attempt(student_id, tryout_id)` dengan status `IN_PROGRESS`) untuk mencegah dua attempt aktif bersamaan akibat klik ganda atau multi-tab.
- **Scanner Soal Duplikat**: Fitur pendeteksi soal ganda/mirip (`GET /api/questions/find-duplicates`) dengan perbandingan teks soal dan pilihan jawaban serta tombol bulk delete.
- **Suite Pengujian Otomatis Pasca Update**: Tool verifikasi `scripts/run_post_update_checks.py` yang menguji integritas 13 tabel database, 25 endpoint API, dan seluruh 20 halaman frontend.
- **Code Splitting Frontend (React.lazy & Suspense)**: Mengurangi ukuran bundle utama frontend dari >600kB menjadi 301kB dengan lazy-loading halaman sekunder untuk mempercepat initial page load.
- **Notifikasi Instan Single-Session Kick**: Menangkap respons 401 dan detail alasan dari server untuk memicu toast notification yang jelas kepada pengguna ketika sesi dialihkan dari perangkat lain.
- **Optimasi Polling Notifikasi**: Menambahkan deteksi visibilitas tab (`document.visibilityState`) pada komponen Header sehingga polling HTTP otomatis dijeda saat tab diminimalkan atau tidak aktif, dan langsung diperbarui saat pengguna kembali.
- **Pencatatan Telemetri Anti-Cheat**: Menambahkan kolom `tab_switches_count` pada `t_attempt` untuk mencatat frekuensi siswa meninggalkan tab/jendela ujian secara real-time dan menampilkannya sebagai badge indikator integritas pada tabel Rekap Nilai Guru dan Admin.
- **Pratinjau Dokumen Rekap Nilai (View PDF) & Ekspor Excel/CSV**: Menambahkan modal pratinjau lembar rekapitulasi evaluasi siap cetak/simpan PDF A4 dengan kop resmi, ringkasan KPI (rata-rata, tertinggi, kelulusan, dan status anti-cheat), serta tombol ekspor langsung ke format CSV dan Microsoft Excel (.xls).

### Diubah
- **Skema Keterangan Paket Tryout**: Atribut `difficulty` pada `t_tryout` dinaikkan limitasinya dari 20 karakter menjadi 150 karakter untuk membebaskan teks label paket ujian (misal: "Kelas Unggulan", "Tryout Akbar SNBT").
- **Standardisasi Opsi PGK / MCMA**: Kode pilihan ganda kompleks dinormalisasi menjadi numerik `1, 2, 3, 4` secara konsisten antara UI dan backend.

### Diperbaiki
- **Pembahasan AI (Ollama & Gemini)**: Memperbaiki kendala pemotongan (*truncation*) teks penjelasan AI pada soal Benar-Salah dan PGK dengan penggabungan chunks JSON robust (`strict=False`) dan cetakan instruksi 3 tahap.
- **Spasi Pembahasan**: Menghilangkan spasi/baris kosong berlebih (`\n\n`) dari output JSON AI secara otomatis.
- **Perbaikan Rute Admin Dashboard**: Memperbaiki `NameError: completed_attempts` pada endpoint `GET /api/admin/dashboard`.
- **Proteksi Integritas Riwayat Siswa**: Pada `delete_tryout` dan `bulk_delete_questions`, jika tryout/soal telah memiliki relasi riwayat pengerjaan siswa (`t_attempt` atau `t_answer`), sistem secara aman melakukan pengarsipan (`is_active = False`) untuk mencegah rusaknya foreign key atau hilangnya nilai siswa.
- **Modernisasi Python Datetime**: Mengganti pemanggilan `datetime.utcnow()` yang *deprecated* pada Python 3.12+ dengan helper `utc_now()`, menghilangkan seluruh *DeprecationWarning* dengan tetap mempertahankan kompatibilitas 100% pada kolom `TIMESTAMP WITHOUT TIME ZONE`.

---

## [v02] - 2026-10-15 (Media Soal, AI Vision & Keamanan Sesi)

### Ditambahkan
- **Dukungan Soal Bergambar (Image Support)**: Menambahkan kolom `image_data` (BYTEA) dan `image_mime_type` (VARCHAR 50) pada tabel `t_question`. Kompresi otomatis ke format WebP di sisi server.
- **Pembuatan Soal Otomatis & AI Vision**: Integrasi Ollama Vision dan Gemini Vision untuk ekstraksi soal dari dokumen PDF/Word dan cropping gambar.
- **Manajemen Pengaturan UI Dinamis (`t_app_setting`)**: Penyimpanan API key provider AI dan konfigurasi aktif dengan enkripsi simetris Fernet.
- **Single-Session Enforcement (Anti-Joki)**: Kolom `active_session_id` dan `active_session_expires_at` pada `t_user` untuk membatasi 1 akun hanya login di 1 perangkat pada satu waktu.
- **Label Dinamis Benar-Salah**: Kolom `true_label` dan `false_label` pada `t_question` (misal: "Sesuai / Tidak Sesuai", "Fakta / Opini").
- **Bobot Tipe Soal**: Kolom `weight_pg`, `weight_mcma`, dan `weight_bs` pada `t_tryout`.

---

## [v01] - 2026-10-01 (Fondasi CBT Dasar)

### Ditambahkan
- **Arsitektur Awal**: Framework FastAPI + React (Vite).
- **Sistem Autentikasi**: Autentikasi berbasis token JWT dengan role `ADMIN`, `GURU`, dan `SISWA`.
- **12 Tabel Relasional Inti**:
  - Pengguna & Profil: `t_user`, `t_student`, `t_teacher`.
  - Kurikulum & Soal: `t_subject`, `t_question`, `t_question_option`.
  - Paket Ujian: `t_tryout`, `t_tryout_question`.
  - Pengerjaan & Penilaian: `t_attempt`, `t_answer`, `t_result`.
  - Notifikasi: `t_notification`.
- **Manajemen Bank Soal & Paket Ujian**: Pembuatan soal pilihan ganda standar, penyusunan paket ujian dengan durasi menit dan batas waktu pengerjaan.
