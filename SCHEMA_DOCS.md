# TKA-AI Database Schema Documentation

Proyek TKA-AI menggunakan SQLAlchemy (ORM) untuk berinteraksi dengan database (baik SQLite maupun PostgreSQL). Terdapat **13 tabel utama** yang saling berelasi untuk mendukung jalannya platform *tryout* ini. 

Berikut adalah dokumentasi mengenai fungsi dari masing-masing tabel:

## 👤 1. Autentikasi dan Aktor (Users & Roles)

### `t_user`
Tabel inti autentikasi. Menyimpan data *login* untuk semua role (ADMIN, GURU, SISWA).
- Menyimpan kredensial (`username`, `password_hash`).
- Menyimpan data sesi aktif (`active_session_id`, `active_session_expires_at`) untuk menegakkan aturan *single-session* (mencegah joki atau bagi-bagi akun).

### `t_student`
Tabel profil untuk pengguna dengan role SISWA.
- Berelasi `1:1` dengan `t_user`.
- Menyimpan detail akademik seperti `student_code` (NIS/NISN), `school_name`, `grade` (kelas), dan `class_name` (nama rombel).

### `t_teacher`
Tabel profil untuk pengguna dengan role GURU.
- Berelasi `1:1` dengan `t_user`.
- Menyimpan detail guru seperti `teacher_code` (NIP) dan `school_name`.

## 📚 2. Manajemen Mata Pelajaran & Bank Soal

### `t_subject`
Menyimpan daftar mata pelajaran (misal: Matematika, Bahasa Inggris).
- Tabel referensi untuk pengelompokkan soal dan *tryout*.

### `t_question`
Bank soal pusat. Satu mata pelajaran bisa memiliki ratusan/ribuan soal yang kelak bisa dipilih untuk dirakit menjadi *tryout*.
- Menyimpan teks soal, tingkat kesulitan, serta opsi gambar (`image_data` dalam format WebP).
- Berelasi `1:N` dengan opsi jawaban (`t_question_option`).

### `t_question_option`
Menyimpan opsi jawaban (A, B, C, D) untuk tipe soal pilihan ganda.
- Terdapat flag `is_correct` untuk menandai kunci jawaban yang benar.

## 📝 3. Manajemen Ujian (Tryout)

### `t_tryout`
Mendefinisikan "paket ujian".
- Menyimpan durasi ujian (`duration_minutes`), total soal, nilai maksimum, dan keterangan/label paket (`difficulty`).
- Dibuat oleh pengguna spesifik (biasanya role GURU).

### `t_tryout_question`
Tabel *mapping* (relasi N:M) antara paket *tryout* (`t_tryout`) dan bank soal (`t_question`).
- Menyimpan urutan soal (`question_number`) dan bobot poin (`points`) khusus untuk paket tersebut. 

## ⏳ 4. Pengerjaan Ujian (Attempt & Answers)

### `t_attempt`
Mencatat sesi pengerjaan (ketika siswa menekan "Mulai Ujian").
- Menyimpan waktu mulai (`started_at`) yang krusial untuk **validasi batas waktu di sisi server**.
- Menyimpan status pengerjaan (`IN_PROGRESS`, `SUBMITTED`).
- Memiliki proteksi *Unique Index* agar tidak ada 2 percobaan ujian yang berstatus `IN_PROGRESS` secara bersamaan untuk siswa dan ujian yang sama (mencegah eksploitasi tab ganda).

### `t_answer`
Mencatat jawaban siswa per soal untuk satu *attempt* tertentu.
- Menyimpan `selected_option` (opsi yang dipilih) dan status kebenarannya (`is_correct`).

### `t_result`
Menyimpan rekapitulasi akhir atau nilai akhir siswa setelah menyelesaikan suatu *attempt*.
- Mengkalkulasi `score`, persentase, dan statistik benar/salah/kosong.

## 🔔 5. Sistem & Notifikasi

### `t_notification`
Tabel notifikasi *in-app*.
- Digunakan untuk memberi tahu Guru jika ada siswanya yang baru saja menyelesaikan *tryout*, atau memberi info umum kepada siswa/admin.

### `t_app_setting`
Tabel *key-value* untuk menyimpan pengaturan dinamis aplikasi tanpa perlu menyentuh file konfigurasi (`.env`).
- Sangat berguna untuk menyimpan preferensi AI (seperti mengaktifkan model Gemini atau Ollama) dan menyimpan kredensial API secara terenkripsi di dalam database.
