# Menjalankan TKA TryOut AI di Jaringan LAN

Panduan ini menjalankan aplikasi dengan Docker Compose pada satu komputer server agar dapat diakses perangkat lain pada Wi-Fi/LAN yang sama. Ini bukan panduan untuk membuka aplikasi ke internet publik.

## Prasyarat

- Docker Desktop terpasang dan berjalan.
- Komputer server dan perangkat pengguna berada pada jaringan yang sama.
- TCP port `5173` dan `8000` diizinkan pada Windows Firewall untuk jaringan privat.
- Repository tersedia di komputer server.

## Konfigurasi

Compose memerlukan `backend/.env`. Jika file tersebut belum ada, salin template:

```powershell
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
```

Jangan menimpa `.env` yang sudah berisi konfigurasi. Pastikan `SECRET_KEY` memiliki nilai acak yang kuat:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Masukkan hasilnya ke `SECRET_KEY` dalam `backend/.env`. Jangan membagikan atau melakukan commit file tersebut.

Jika `DATABASE_URL` kosong, backend memakai SQLite lokal pada `backend/database/project_tz.db`. Jika mengatur PostgreSQL, sediakan database dan gunakan backup yang dikelola PostgreSQL/provider; service backup Compose hanya mendukung SQLite.

Frontend secara default mengirim request ke API pada hostname yang sama dengan halaman, port `8000`. Jadi untuk setup LAN biasa tidak perlu membuat `.env` di root atau mengisi `VITE_API_URL`. Bila frontend dan API memakai host berbeda, `VITE_API_URL` harus tersedia ketika image frontend dibangun dan image perlu di-build ulang.

## Menjalankan

Dari root repository:

```powershell
docker compose up -d --build
docker compose ps
```

Compose memublikasikan frontend pada host port `5173` dan backend pada host port `8000`. Folder database SQLite dan backup di-bind mount ke `backend/database` dan `backend/backups`; keduanya bukan Docker named volume.

Jika memakai database SQLite lama, buat backup dan verifikasi bahwa skema/indeks yang diperlukan sudah ada sebelum dipakai. `backend/scripts/create_attempt_index.py` hanya menargetkan file SQLite default (`backend/database/project_tz.db`) dan harus dijalankan dari folder `backend`; jangan gunakan skrip tersebut untuk PostgreSQL.

Untuk memperoleh IPv4 server, jalankan:

```powershell
ipconfig
```

Pilih IPv4 pada adapter jaringan yang aktif. Dari perangkat lain di jaringan yang sama, buka:

```text
http://<IPv4-server>:5173
```

Contoh endpoint status sistem untuk pemeriksaan admin:

```text
http://<IPv4-server>:8000/api/system/status
```

Endpoint tersebut dibatasi aksesnya. Dokumentasi Swagger/ReDoc dinonaktifkan saat backend berjalan dalam `APP_MODE=production`.

## Verifikasi dan operasi

1. Pastikan container `backend` dan `frontend` berstatus berjalan dengan `docker compose ps`.
2. Buka frontend dari perangkat lain, lalu uji login dan alur sesuai role.
3. Jika tidak dapat terhubung, verifikasi IPv4, jaringan, dan aturan Windows Firewall.
4. Lihat log:

   ```powershell
   docker compose logs --tail=100
   ```

Perintah operasi:

```powershell
# Ikuti log
docker compose logs -f

# Hentikan container tanpa menghapus file data yang di-bind mount
docker compose down

# Build ulang dan jalankan
docker compose up -d --build
```

## Backup dan batas keamanan

- Service `backup` di Compose membuat backup SQLite berkala (retensi default 14 hari).
- Backup manual, unduh, dan pemulihan SQLite tersedia melalui Pengaturan Admin. Uji pemulihan pada salinan terlebih dahulu.
- Bila menggunakan PostgreSQL, service backup dan fitur backup/pemulihan SQLite tidak mencadangkan PostgreSQL. Atur serta uji backup dari layanan PostgreSQL/provider.
- Jangan meneruskan port `5173` atau `8000` langsung ke internet publik. Untuk akses publik, siapkan HTTPS, reverse proxy, CORS yang sesuai, secret dan kontrol akses yang kuat.
