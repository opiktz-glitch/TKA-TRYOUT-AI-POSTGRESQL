# Pengujian dan Verifikasi

Ikuti juga aturan repository di `AGENTS.md`. Jalankan pengujian yang relevan dengan perubahan dan laporkan hasil yang benar-benar diperoleh; jangan klaim tes lulus bila belum dijalankan.

## Frontend

Jika frontend berubah, jalankan build dari folder `frontend`:

```powershell
npm run build
```

Jalankan `npm run lint` bila sesuai dengan perubahan.

## Backend dan database

- Backend memuat `backend/.env` secara default; `backend/config.py` mendukung `ENV_FILE` untuk memilih file konfigurasi lain.
- Jangan jalankan tes yang dapat menulis ke database production.
- `backend/scripts/run_tests.ps1` saat ini membaca `.env`, memakai path relatif dari folder `backend`, dan tidak memvalidasi database tes. Jangan menganggap skrip ini aman.
- `scripts/run_post_update_checks.py` juga mengimpor dan menjalankan tes backend; periksa konfigurasi database sebelum menjalankannya.
- Jalankan tes backend hanya setelah database tes terisolasi tersedia dan runner secara eksplisit memilih serta memvalidasi konfigurasi tersebut. Jika belum, jangan jalankan dan laporkan keterbatasannya.
- Untuk perubahan skema, periksa migration files serta dukungan runner. `Base.metadata.create_all()` tidak menambah kolom pada tabel yang sudah ada, dan migrasi startup hanya mencakup kolom tertentu.

## Pelaporan

Cantumkan perintah yang dijalankan dan hasilnya. Untuk perubahan dokumentasi saja, pemeriksaan diff/format sudah memadai kecuali terdapat dokumentasi yang dites otomatis.
