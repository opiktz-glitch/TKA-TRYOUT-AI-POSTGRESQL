# Dokumentasi Skema Database

Backend memakai SQLAlchemy dengan PostgreSQL sebagai satu-satunya database yang didukung. Model aplikasi berada di `backend/models.py`; file ini menjelaskan fungsi tabel secara konseptual dan bukan pengganti definisi model atau skrip migrasi.

Saat ini model mendefinisikan **17 tabel**:

`t_user`, `t_student`, `t_teacher`, `t_subject`, `t_question`, `t_question_option`, `t_tryout`, `t_tryout_question`, `t_practice`, `t_practice_question`, `t_practice_attempt`, `t_practice_answer`, `t_attempt`, `t_answer`, `t_result`, `t_notification`, dan `t_app_setting`.

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

## Latihan siswa

Latihan merupakan alur belajar terpisah dari Tryout. Latihan berstatus `PUBLISHED` dapat diakses semua siswa; tidak ada relasi penugasan guru ke siswa. Guru hanya dapat mengelola latihan dan memakai soal yang dibuatnya sendiri, sedangkan Admin dapat mengelola semua latihan dan soal.

### `t_practice`

Metadata latihan, mata pelajaran, pembuat, status `DRAFT`/`PUBLISHED`/`ARCHIVED`, dan pengaturan pengacakan.

### `t_practice_question`

Daftar dan urutan soal yang dipilih secara sengaja untuk latihan. Soal yang masih direferensikan latihan tidak dapat dihapus permanen.

### `t_practice_attempt`

Sesi latihan siswa yang dapat diulang. Urutan soal dan pilihan disimpan per sesi agar konsisten saat siswa melanjutkan. Hasilnya tidak disimpan ke tabel nilai Tryout.

### `t_practice_answer`

Pilihan jawaban otomatis dan hasil pemeriksaan per soal dalam satu sesi latihan. `is_checked` membedakan jawaban yang baru tersimpan dari jawaban yang sudah diperiksa; kunci dan pembahasan hanya dikirim setelah pemeriksaan atau latihan selesai.

## Notifikasi dan pengaturan aplikasi

### `t_notification`

Notifikasi dalam aplikasi yang ditujukan ke akun pengguna.

### `t_app_setting`

Penyimpanan konfigurasi aplikasi berbentuk key-value, termasuk pemilihan/provider AI. Nilai sensitif provider dienkripsi oleh lapisan aplikasi; tabel ini tidak menjadikan API key sebagai konfigurasi aman bila `SECRET_KEY` atau database ikut terekspos.

## Integritas dan migrasi

- Relasi, kolom, tipe data, nilai default, dan indeks lengkap ditentukan di `backend/models.py`.
- `Base.metadata.create_all()` membuat tabel yang belum ada, tetapi tidak menambahkan kolom baru ke tabel yang sudah ada.
- `backend/main.py` menjalankan penambahan beberapa kolom tertentu saat startup. Ini bukan migrasi umum dan tidak menggantikan pemeriksaan skema.
- File migrasi SQL yang tersedia:

  | File | Perubahan utama |
  |---|---|
  | `migrations/v01_initial_schema.sql` | Skema dasar aplikasi dan tabel relasional awal. |
  | `migrations/v02_update_media_session_settings.sql` | Media soal, pengaturan aplikasi, sesi aktif, label Benar/Salah, dan bobot soal. |
  | `migrations/v03_optimize_concurrency_indexes_pgk.sql` | Indeks unik untuk attempt aktif, indeks query, dan perluasan keterangan tryout. |
  | `migrations/v04_anti_cheat_telemetry.sql` | Kolom penghitung perpindahan tab selama attempt. |
  | `migrations/v05_practice_module.sql` | Tabel dan indeks untuk pengelolaan latihan serta attempt/jawaban siswa. |
  | `migrations/v06_practice_draft_answers.sql` | Penanda jawaban yang sudah diperiksa, untuk mendukung simpan otomatis tanpa membuka kunci jawaban lebih awal. |

- `scripts/run_migrations.py` menerapkan migrasi berurutan sampai target `v06` (default). `Base.metadata.create_all()` juga dapat membuat tabel latihan yang belum ada, tetapi tidak menggantikan runner untuk pencatatan versi skema.
- Runner migrasi memakai konfigurasi database aplikasi. Periksa target konfigurasi terlebih dahulu dan buat backup yang dapat dipulihkan sebelum menerapkan migrasi; opsi `--check` hanya memeriksa versi skema, bukan memvalidasi keamanan atau lingkungan database.

Contoh penggunaan runner dari root repository setelah target database dipastikan:

```powershell
python scripts/run_migrations.py --check
python scripts/run_migrations.py --target v06
```

- Jangan menerapkan perubahan skema langsung ke database production tanpa backup, rencana pemulihan, dan verifikasi kompatibilitas PostgreSQL.

Lihat juga [ERD.mermaid](ERD.mermaid) untuk diagram relasi dan [ARCHITECTURE.md](ARCHITECTURE.md) untuk alur sistem.
