# TKA-AI (TKA Tryout)

Platform ujian/tryout berbasis sekolah untuk Admin, Guru, dan Siswa. Aplikasi mencakup bank soal, paket tryout, pengerjaan dengan validasi waktu di backend, laporan hasil, dan bantuan AI.

## Fitur utama

- Manajemen pengguna, siswa, guru, mata pelajaran, soal, dan tryout.
- Tipe soal Pilihan Ganda, PGK-MCMA, dan Benar/Salah.
- Pembuatan/import soal serta draf pembahasan menggunakan provider AI yang dikonfigurasi.
- Autentikasi JWT, pembatasan akses berbasis role, single-session, timer sisi server, dan telemetri perpindahan tab.
- Riwayat dan laporan nilai, notifikasi, serta backup/pemulihan SQLite.
- Mode akses lokal dan LAN.

## Teknologi dan konfigurasi

- **Backend:** FastAPI, SQLAlchemy, SQLite atau PostgreSQL.
- **Frontend:** React 19, React Router, Vite.
- **AI:** Ollama dan Gemini melalui registry backend.
- **Deployment:** Docker Compose; frontend production disajikan Nginx.

Backend memakai SQLite lokal jika `DATABASE_URL` kosong; PostgreSQL dapat dikonfigurasi melalui `backend/.env` atau environment deployment. Fitur backup/pemulihan bawaan dan service backup Docker hanya mendukung SQLite.

## Menjalankan secara lokal di Windows

Ikuti instruksi instalasi dan konfigurasi di [backend/README.md](backend/README.md) dan [frontend/README.md](frontend/README.md). Setelah backend virtual environment, file environment, dan dependensi frontend disiapkan, jalankan dari root repository:

```powershell
# Akses dari komputer ini
python run.py

# Akses dari perangkat lain pada Wi-Fi/LAN yang sama
python run_server.py
```

Frontend tersedia di `http://localhost:5173`, backend di `http://localhost:8000`. Kedua skrip mengasumsikan Python berada di `backend/venv`. Untuk setup LAN dengan Docker, lihat [DEPLOY_LAN.md](DEPLOY_LAN.md).

## Repository

```text
backend/       FastAPI, model, router, layanan, skrip, dan database lokal
frontend/      Aplikasi React/Vite
migrations/    Skrip SQL migrasi v01-v04
scripts/       Runner migrasi dan pemeriksaan pasca-update
tests/         Tes alur backend, migrasi, API, dan integritas frontend
docs/          Arsip dokumentasi perubahan dan laporan audit
```

## Database dan migrasi

Model SQLAlchemy mendefinisikan 13 tabel: `t_user`, `t_student`, `t_teacher`, `t_subject`, `t_question`, `t_question_option`, `t_tryout`, `t_tryout_question`, `t_attempt`, `t_answer`, `t_result`, `t_notification`, dan `t_app_setting`.

Lihat [SCHEMA_DOCS.md](SCHEMA_DOCS.md) dan [ERD.mermaid](ERD.mermaid). `Base.metadata.create_all()` membuat tabel yang belum ada; migrasi startup hanya menangani kolom tertentu. File migrasi tersedia sampai v04, tetapi `scripts/run_migrations.py` saat ini mendukung sampai v03. Periksa dan siapkan skema database lama sebelum menjalankan versi aplikasi yang membutuhkannya.

## Pengujian

Jalankan build frontend dari folder `frontend`:

```powershell
npm run build
```

**Jangan jalankan tes backend terhadap database production.** `backend/scripts/run_tests.ps1` saat ini membaca `.env` dan belum memilih atau memvalidasi konfigurasi database tes. `scripts/run_post_update_checks.py` juga menjalankan tes backend. Jalankan tes hanya terhadap database tes yang terisolasi dengan runner yang secara eksplisit menggunakan dan memvalidasi konfigurasi tersebut. Detail kontribusi ada di [CONTRIBUTING.md](CONTRIBUTING.md) dan [AGENTS.md](AGENTS.md).

## Dokumentasi

- [backend/README.md](backend/README.md) — setup dan detail pengembangan backend.
- [frontend/README.md](frontend/README.md) — setup, development, dan build frontend.
- [ARCHITECTURE.md](ARCHITECTURE.md) — arsitektur dan alur sistem.
- [DEPLOY_LAN.md](DEPLOY_LAN.md) — deployment Docker pada jaringan lokal.
- [USER_MANUAL.md](USER_MANUAL.md) — panduan penggunaan aplikasi.
- [SCHEMA_DOCS.md](SCHEMA_DOCS.md) — ringkasan tabel database.
- [CHANGELOG.md](CHANGELOG.md) — catatan perubahan historis.
- [ROADMAP.md](ROADMAP.md) — usulan pekerjaan berikutnya.

Jangan commit `.env`, kredensial, file database, atau backup. Untuk deployment publik, konfigurasi CORS, HTTPS, dan pengelolaan secret harus disesuaikan dengan lingkungan.
