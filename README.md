# TKA-AI (TKA Tryout)

Platform ujian/tryout berbasis sekolah untuk Admin, Guru, dan Siswa. Aplikasi mencakup bank soal, paket tryout, pengerjaan dengan validasi waktu di backend, laporan hasil, dan bantuan AI.

## Fitur utama

- Manajemen pengguna, siswa, guru, mata pelajaran, soal, dan tryout.
- Tipe soal Pilihan Ganda, PGK-MCMA, dan Benar/Salah.
- Pembuatan/import soal serta draf pembahasan menggunakan provider AI yang dikonfigurasi.
- Autentikasi JWT, pembatasan akses berbasis role, single-session, timer sisi server, dan telemetri perpindahan tab.
- Riwayat dan laporan nilai serta notifikasi.
- Mode akses lokal dan LAN.

Tanggal yang ditampilkan aplikasi menggunakan format `dd-mm-yyyy`; tanggal beserta waktu menggunakan `dd-mm-yyyy HH:mm`. Format ISO tetap digunakan pada pertukaran data API dan penyimpanan.

## Teknologi dan konfigurasi

- **Backend:** FastAPI, SQLAlchemy, PostgreSQL.
- **Frontend:** React 19, React Router, Vite.
- **AI:** Ollama dan Gemini melalui registry backend.
- **Deployment:** Vercel dan tzserver adalah deployment terpisah. Di tzserver, frontend dan backend native masing-masing di-deploy otomatis melalui GitHub Actions; Docker Compose tersedia untuk setup self-hosted/LAN.

Backend mewajibkan PostgreSQL melalui `DATABASE_URL` di `backend/.env` atau environment deployment. SQLite tidak didukung. Backup PostgreSQL manual melalui UI aktif pada backend native tzserver; workflow deploy backend terpisah dari workflow frontend dan tidak mengirim `.env` atau kredensial. Lihat [panduan deploy dan backup tzserver](docs/DEPLOY_TZSERVER.md) untuk pengoperasian. Di deployment lain, gunakan layanan PostgreSQL/provider atau prosedur PostgreSQL yang disiapkan operator.

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
migrations/    Skrip SQL migrasi v01-v06
scripts/       Runner migrasi dan pemeriksaan pasca-update
tests/         Tes alur backend, migrasi, API, dan integritas frontend
docs/          Panduan deployment tzserver dan laporan audit
```

## Database dan migrasi

Model SQLAlchemy mendefinisikan tabel inti aplikasi serta tabel Latihan: `t_user`, `t_student`, `t_teacher`, `t_subject`, `t_question`, `t_question_option`, `t_tryout`, `t_tryout_question`, `t_attempt`, `t_answer`, `t_result`, `t_notification`, `t_app_setting`, `t_practice`, `t_practice_question`, `t_practice_attempt`, dan `t_practice_answer`.

Lihat [SCHEMA_DOCS.md](SCHEMA_DOCS.md) dan [ERD.mermaid](ERD.mermaid). `Base.metadata.create_all()` membuat tabel yang belum ada; migrasi startup hanya menangani kolom tertentu. File migrasi dan `scripts/run_migrations.py` mendukung versi sampai v06. Migrasi Neon dikonfirmasi selesai oleh pengguna pada 8 November 2026; status database tzserver perlu diperiksa secara terpisah. Sebelum memakai versi aplikasi yang memerlukan skema baru pada database lain, periksa versi dan target database serta siapkan backup yang dapat dipulihkan. Ikuti [panduan migrasi Neon](docs/MIGRASI_NEON.md) untuk SQL Editor, atau [prosedur migrasi PostgreSQL](docs/DEPLOY_TZSERVER.md#migrasi-postgresql-production-neon-dan-tzserver) untuk Neon dan tzserver.

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
- [docs/DEPLOY_TZSERVER.md](docs/DEPLOY_TZSERVER.md) — otomatisasi deploy frontend/backend dan panduan backup tzserver.
- [USER_MANUAL.md](USER_MANUAL.md) — panduan penggunaan aplikasi.
- [SCHEMA_DOCS.md](SCHEMA_DOCS.md) — ringkasan tabel database.
- [CHANGELOG.md](CHANGELOG.md) — catatan perubahan historis.
- [ROADMAP.md](ROADMAP.md) — usulan pekerjaan berikutnya.

Jangan commit `.env`, kredensial, file database, atau backup. Untuk deployment publik, konfigurasi CORS, HTTPS, dan pengelolaan secret harus disesuaikan dengan lingkungan.
