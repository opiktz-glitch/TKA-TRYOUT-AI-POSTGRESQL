# Panduan Kontribusi

Terima kasih telah berkontribusi pada TKA TryOut AI. Panduan ini melengkapi instruksi di `AGENTS.md`; jika ada perbedaan, periksa konfigurasi dan skrip yang benar-benar tersedia di repository.

## Pola implementasi

- Ikuti pembagian backend FastAPI per router/domain dan frontend React per halaman, hook, komponen, serta service.
- Validasi input backend dengan schema Pydantic. Untuk SQL, gunakan ORM atau parameter binding; jangan membangun query dari input pengguna.
- Letakkan konfigurasi backend baru di `backend/config.py` dan dokumentasikan variabel environment tanpa nilai rahasia.
- Perubahan otorisasi harus diperiksa di backend. Pembatasan route di frontend bukan pengganti pemeriksaan server.
- Perubahan skema harus ditargetkan ke PostgreSQL dan disertai migrasi yang sesuai. `create_all()` hanya membuat tabel yang belum ada dan migrasi startup hanya menangani kolom tertentu.

## Frontend

Gunakan functional components dan React hooks dengan mengikuti Rules of Hooks. Pemanggilan API sebaiknya memakai wrapper/service yang sudah ada, terutama `frontend/src/services/api.js`, agar autentikasi dan penanganan error konsisten.

Setelah mengubah frontend, jalankan dari folder `frontend`:

```powershell
npm run build
```

Script `npm run lint` juga tersedia untuk Oxlint bila perubahan memerlukannya.

## Backend dan database

Backend memakai konfigurasi `backend/.env` secara default; `backend/config.py` menerima `ENV_FILE` untuk memilih file konfigurasi lain.

**Jangan jalankan tes backend terhadap database production.** `backend/scripts/run_tests.ps1` saat ini membaca `.env` dan belum memilih atau memvalidasi konfigurasi database tes. Runner ini tidak boleh dianggap aman hanya karena tes memiliki cleanup. `scripts/run_post_update_checks.py` juga memuat tes backend, sehingga sebelum menjalankannya pastikan database yang dipakai terisolasi dan aman untuk ditulis.

Jalankan tes hanya jika konfigurasi tes menunjuk ke database tes terisolasi dan runner secara eksplisit menggunakan serta memvalidasi konfigurasi tersebut. Jika prasyarat itu belum terpenuhi, jangan jalankan tes yang dapat menulis ke database; laporkan keterbatasannya.

Sebelum migrasi skema:

1. Periksa dialect dan struktur database yang didukung oleh SQL migration.
2. Buat backup yang sesuai untuk database target.
3. Pastikan migrasi serta rollback/pemulihan terdokumentasi.
4. Verifikasi kolom dan indeks pada database uji sebelum deployment.

Perhatikan bahwa migration files tersedia sampai `v04`, tetapi `scripts/run_migrations.py` saat ini hanya mengimplementasikan sampai `v03`.

## Kontribusi Git

- Buat perubahan dalam branch kerja yang sesuai dan jaga agar diff tetap fokus.
- Gunakan pesan commit deskriptif yang menjelaskan perubahan.
- Jangan memasukkan `.env`, kredensial, file database, backup, atau artefak build.
- Perbarui dokumentasi terkait jika perilaku, konfigurasi, atau prosedur operasional berubah.
