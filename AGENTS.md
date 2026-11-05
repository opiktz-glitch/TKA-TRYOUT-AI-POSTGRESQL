# Panduan Pengembangan TKA TryOut AI

## Prinsip perubahan kode

- Buat perubahan yang terarah dan sesuai pola yang sudah digunakan proyek. Jangan mengubah hal di luar kebutuhan.
- Periksa seluruh pemakaian terkait agar perubahan konsisten di backend, frontend, dan database.
- Jangan menyatakan build atau tes berhasil jika belum dijalankan dan hasilnya belum diperiksa.
- Jangan pernah menampilkan, menyalin ke dokumentasi, atau melakukan commit kredensial dari file `.env`.

## Verifikasi frontend

Jika mengubah frontend, jalankan build dari folder `frontend`:

```powershell
npm run build
```

Pastikan build selesai tanpa error sebelum menyatakan perubahan frontend terverifikasi.

## Deployment

- Vercel dan tzserver adalah deployment terpisah. Jangan mengubah environment variable Vercel untuk memenuhi kebutuhan tzserver.
- Push perubahan di `frontend/` ke branch `main` memicu workflow deploy frontend tzserver. Workflow ini tidak memperbarui backend, skema, atau migrasi database.
- Build frontend tzserver memakai `VITE_API_URL=/` agar API menggunakan reverse proxy same-origin. Pertahankan konfigurasi build Vercel secara terpisah.
- Ikuti [docs/DEPLOY_TZSERVER.md](docs/DEPLOY_TZSERVER.md) untuk persiapan, operasi, dan pemulihan deploy. Jangan menaruh secrets atau kredensial deployment di repository.

## Verifikasi backend dan database

- Backend memuat konfigurasi dari `backend/.env` secara default. `backend/config.py` juga mendukung variabel `ENV_FILE` untuk memilih file konfigurasi lain.
- **Jangan jalankan tes backend terhadap konfigurasi default tanpa memastikan database yang dipakai adalah database khusus tes.** `backend/.env` berisi konfigurasi PostgreSQL; jangan mengasumsikan database tersebut lokal atau aman untuk tes.
- Saat ini `backend/scripts/run_tests.ps1` membaca `.env` dan menjalankan `venv\Scripts\python.exe`; skrip tersebut **belum** memilih `.env.test` atau memvalidasi bahwa database tujuan aman. Jalankan skrip hanya setelah pengaman tersebut ditambahkan dan diverifikasi.
- Skrip di atas memakai path relatif dan mengasumsikan dijalankan dari folder `backend`. Jangan mendokumentasikan pemanggilan dari root sebagai cara yang didukung tanpa terlebih dahulu memperbaiki skrip.
- Sebelum tes backend dijalankan, pastikan file konfigurasi tes mengarah hanya ke database khusus tes yang terisolasi, dan runner secara eksplisit memilih serta memvalidasi konfigurasi itu. Jangan mengandalkan fixture pembersihan sebagai perlindungan database.
- Jika menambah atau mengubah kolom model SQLAlchemy, periksa migrasi yang berlaku. `backend/main.py` memiliki `_auto_migrate_columns_on_startup()` untuk beberapa kolom tertentu, tetapi tidak otomatis mencakup setiap perubahan skema.
- Jika pengaman database tes belum tersedia, jangan jalankan tes backend yang dapat menulis ke database; laporkan keterbatasan ini dengan jelas.

## Konfigurasi dan data sensitif

- Jangan commit file `.env`, kredensial, database lokal, maupun backup.
- Jangan mengasumsikan nama penyedia database dari keberadaan `DATABASE_URL`; verifikasi konfigurasi tanpa mencetak URL atau kredensial.
- Untuk perubahan skema database, perbarui mekanisme migrasi dan dokumentasi terkait sesuai kebutuhan.
