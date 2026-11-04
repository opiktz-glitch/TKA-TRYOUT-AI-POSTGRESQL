# Dokumentasi Skema Database

Backend memakai SQLAlchemy dan mendukung SQLite serta PostgreSQL. Model aplikasi berada di `backend/models.py`; file ini menjelaskan fungsi tabel secara konseptual dan bukan pengganti definisi model atau skrip migrasi.

Saat ini model mendefinisikan **13 tabel**:

`t_user`, `t_student`, `t_teacher`, `t_subject`, `t_question`, `t_question_option`, `t_tryout`, `t_tryout_question`, `t_attempt`, `t_answer`, `t_result`, `t_notification`, dan `t_app_setting`.

## Pengguna dan profil

### `t_user`

Akun autentikasi dan role (`ADMIN`, `GURU`, atau `SISWA`), status akun, serta data sesi aktif yang digunakan untuk membatasi satu sesi aktif per akun.

### `t_student`

Profil akademik siswa yang terhubung dengan akun pengguna.

### `t_teacher`

Profil guru yang terhubung dengan akun pengguna.

## Mata pelajaran dan bank soal

### `t_subject`

Data mata pelajaran yang dapat dikaitkan dengan soal dan paket tryout.

### `t_question`

Bank soal, termasuk jenis soal, teks, penjelasan, label untuk soal Benar/Salah, dan data gambar bila tersedia. Jenis yang digunakan aplikasi mencakup `MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE` (PGK-MCMA), dan `TRUE_FALSE`.

### `t_question_option`

Pilihan/pernyataan dan penanda kunci jawaban yang terkait dengan soal. Interpretasinya mengikuti jenis soal; MCMA dapat memiliki lebih dari satu pilihan benar.

## Tryout dan hasil pengerjaan

### `t_tryout`

Konfigurasi paket ujian, seperti mata pelajaran, durasi, jadwal/status, pembuat, serta bobot penilaian berdasarkan jenis soal.

### `t_tryout_question`

Relasi antara paket tryout dan soal yang dipilih, termasuk urutan dan poin yang berlaku dalam paket tersebut.

### `t_attempt`

Satu sesi pengerjaan siswa. Mencatat status dan waktu yang dipakai backend untuk memvalidasi batas durasi. `tab_switches_count` menyimpan jumlah perpindahan tab/jendela yang tercatat selama attempt. Partial unique index `uq_attempt_active_per_student_tryout` mencegah lebih dari satu attempt `IN_PROGRESS` untuk pasangan siswa dan tryout yang sama.

### `t_answer`

Jawaban siswa untuk soal dalam attempt, termasuk pilihan yang dikirim dan informasi penilaian terkait.

### `t_result`

Hasil/rekap penilaian untuk attempt yang telah diselesaikan.

## Notifikasi dan pengaturan aplikasi

### `t_notification`

Notifikasi dalam aplikasi yang ditujukan ke akun pengguna.

### `t_app_setting`

Penyimpanan konfigurasi aplikasi berbentuk key-value, termasuk pemilihan/provider AI. Nilai sensitif provider dienkripsi oleh lapisan aplikasi; tabel ini tidak menjadikan API key sebagai konfigurasi aman bila `SECRET_KEY` atau database ikut terekspos.

## Integritas dan migrasi

- Relasi, kolom, tipe data, nilai default, dan indeks lengkap ditentukan di `backend/models.py`.
- `Base.metadata.create_all()` membuat tabel yang belum ada, tetapi tidak menambahkan kolom baru ke tabel yang sudah ada.
- `backend/main.py` menjalankan penambahan beberapa kolom tertentu saat startup. Ini bukan migrasi umum dan tidak menggantikan pemeriksaan skema.
- SQL migration files berada di `migrations/` (`v01` sampai `v04`). `scripts/run_migrations.py` saat ini hanya mendukung sampai `v03`; `v04_anti_cheat_telemetry.sql` ada terpisah. Untuk skema lama, verifikasi kolom/index yang dibutuhkan dan prosedur migrasi sebelum menjalankan aplikasi.
- Jangan menerapkan perubahan skema langsung ke database production tanpa backup, rencana pemulihan, dan verifikasi kompatibilitas dialect SQLite/PostgreSQL.

Lihat juga [ERD.mermaid](ERD.mermaid) untuk diagram relasi dan [ARCHITECTURE.md](ARCHITECTURE.md) untuk alur sistem.
