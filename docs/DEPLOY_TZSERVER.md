# Otomatisasi deploy aplikasi ke tzserver

Workflow `.github/workflows/deploy-tzserver-frontend.yml` otomatis membangun dan mengirim frontend setelah perubahan di `frontend/` masuk ke branch `main`. Workflow `.github/workflows/deploy-tzserver-backend.yml` otomatis memperbarui backend, dependensi Python, dan me-restart service setelah perubahan di `backend/` masuk ke `main`. Keduanya juga dapat dijalankan manual dari tab Actions di GitHub. Backend dan frontend tetap memiliki workflow terpisah.

## Status deployment

Per 5 November 2026, konfigurasi deploy otomatis sudah terpasang dan workflow berhasil berjalan (run #2 hijau). Deploy memerlukan tzserver aktif dan dapat dijangkau melalui Tailscale. Jika job gagal karena server sedang mati, jalankan ulang workflow setelah server menyala.

Per 6 November 2026, workflow deploy backend juga telah berjalan sukses (run [#42236477591](https://github.com/opiktz-glitch/TKA-TRYOUT-AI-POSTGRESQL/actions/runs/42236477591)). Endpoint backend lulus smoke test (`401` tanpa autentikasi), dan Admin telah mengonfirmasi fitur Backup aktif di UI.

Pada tzserver saat ini, persiapan SSH/sudo untuk workflow backend sudah dilakukan. Bagian persiapan di bawah tetap menjadi acuan untuk memeriksa konfigurasi atau menyiapkan server pengganti.

Build memakai `VITE_API_URL=/`, sehingga request API memakai path relatif `/api` dan diteruskan oleh Nginx tzserver. Build diperiksa agar tidak mengandung hostname Tailscale, domain `rumahzafira`, atau `localhost:8000`. Workflow tidak mengubah environment variable Vercel.

## Persiapan di tzserver

Workflow mengunggah folder `dist` sebagai user SSH `admintz`, lalu memasang isinya ke `/var/www/tka-dist`. Sudo dibatasi tanpa password hanya untuk perintah sinkronisasi frontend. Sesuaikan path `/usr/bin/rsync` bila hasil `command -v rsync` di server berbeda.

Di `/etc/sudoers.d/deploy-tka-frontend`, gunakan aturan berikut. Karakter `=`, `:`, dan `,` di argumen harus di-escape untuk sintaks sudoers; escape ini tidak digunakan pada perintah `rsync` di workflow:

```sudoers
admintz ALL=(root) NOPASSWD: /usr/bin/rsync -a --delete --chown\=root\:root --chmod\=D755\,F644 /home/admintz/dist/ /var/www/tka-dist/
```

Atur izin file dan validasi aturan:

```bash
sudo chmod 440 /etc/sudoers.d/deploy-tka-frontend
sudo visudo -cf /etc/sudoers.d/deploy-tka-frontend
sudo -l | grep rsync
```

Pastikan hasil validasi menunjukkan `parsed OK` dan aturan hanya mengizinkan perintah di atas. Jangan memberi akses `NOPASSWD: ALL` atau menjalankan `rsync --delete` secara manual dari direktori upload yang belum diverifikasi. Workflow frontend tidak mengubah backend, database, atau konfigurasi Nginx/Tailscale.

## Secrets GitHub

Tambahkan secrets berikut di **Settings → Secrets and variables → Actions** pada repository:

| Secret | Isi |
|---|---|
| `TS_OAUTH_CLIENT_ID` | Client ID OAuth Tailscale untuk runner deploy |
| `TS_OAUTH_SECRET` | Client secret OAuth Tailscale |
| `TZSERVER_SSH_HOST` | IP Tailscale atau nama DNS tailnet tzserver yang dapat dijangkau runner |
| `TZSERVER_SSH_PRIVATE_KEY` | Private key SSH yang cocok dengan public key pada akun `admintz` |
| `TZSERVER_SSH_KNOWN_HOSTS` | Baris host key SSH untuk host yang dipakai di `TZSERVER_SSH_HOST` |

Batasi ACL tailnet agar tag `tag:gha-tz-deploy` hanya dapat mengakses port SSH tzserver. Verifikasi fingerprint host key melalui jalur tepercaya sebelum menyimpannya sebagai secret; jangan mempercayai hasil `ssh-keyscan` yang belum diverifikasi.

Karena repository bersifat publik, lindungi branch `main` dan jangan memberi secrets deployment ke workflow pull request. Workflow hanya berjalan untuk push ke `main` atau dispatch pada `main`.

## Cakupan dan verifikasi

- Workflow hanya memperbarui frontend statis di `/var/www/tka-dist`.
- Workflow backend memperbarui checkout aplikasi, memasang dependensi dari `backend/requirements.txt`, me-restart `tka-backend.service`, lalu memastikan endpoint backend merespons `401` atau `403` tanpa autentikasi.
- Kedua workflow memerlukan tzserver yang aktif dan dapat dijangkau melalui Tailscale; secrets deployment hanya tersedia pada workflow branch `main`/dispatch.
- Perubahan skema dan migrasi database harus ditinjau sebelum perubahan backend digabung ke `main`. Backend memiliki migrasi kolom otomatis tertentu saat startup; deploy dapat menjalankan perubahan tersebut terhadap database production.
- Migrasi `v05` menambahkan tabel Latihan. Ikuti bagian [Migrasi PostgreSQL production](#migrasi-postgresql-production-neon-dan-tzserver) untuk memeriksa dan memperbarui setiap database secara terpisah.
- Migrasi `v06` menambahkan penanda jawaban Latihan yang sudah diperiksa. Terapkan migrasi database sebelum deploy backend yang memakai fitur simpan otomatis jawaban Latihan.
- Setelah pemasangan, workflow memastikan `http://127.0.0.1:8081/` membalas HTTP 200 dan `/api/auth/me` membalas 401 atau 403 tanpa autentikasi.
- Jika persiapan SSH/sudo atau smoke test gagal, job akan gagal dan log Actions menunjukkan langkah yang bermasalah.

## Migrasi PostgreSQL production (Neon dan tzserver)

Setiap PostgreSQL yang dipakai backend adalah database terpisah dan harus diperiksa sendiri. Deploy frontend ke Vercel atau tzserver tidak menjalankan migrasi database. Migrasikan Neon jika backend yang melayani aplikasi Vercel terhubung ke Neon; migrasikan database tzserver jika backend tzserver memakainya.

**Status:** Pengguna mengonfirmasi migrasi database Neon selesai pada 8 November 2026. Status database tzserver tidak dikonfirmasi oleh catatan ini; periksa dan migrasikan secara terpisah jika backend tzserver memakai database tersebut. Lihat [MIGRASI_NEON.md](MIGRASI_NEON.md) untuk panduan Neon.

### Sebelum migrasi

1. Pastikan perubahan aplikasi yang membutuhkan skema baru sudah tersedia pada checkout/server terkait.
2. Buat backup database dengan prosedur provider/server dan pastikan backup dapat dipulihkan. Jangan menguji pemulihan pada database aktif.
3. Jalankan pemeriksaan versi pada target yang benar. `--check` hanya membaca versi; periksa juga konfigurasi koneksi dan jangan menampilkan atau mengirim `DATABASE_URL`.
4. Terapkan migrasi hanya pada urutan versi yang sesuai. Migrasi runner menerapkan versi berurutan; untuk SQL manual, terapkan semua versi yang hilang. Jangan mengubah nilai `app:schema_version` sebelum DDL pada tahap tersebut berhasil.

### tzserver

Pada instalasi tzserver saat ini, checkout dimiliki user `tka`, service `tka-backend.service` membaca konfigurasi melalui `ENV_FILE=/etc/tka/backend.env`, dan workflow tidak menyalin file konfigurasi itu. Karena itu jangan mengandalkan `backend/.env` atau menjalankan migrasi sebagai `admintz` langsung.

Jalankan dari akun `admintz` memakai izin sudo yang sesuai:

```bash
sudo -u tka env \
  ENV_FILE=/etc/tka/backend.env \
  PYTHONPATH=/var/www/tka/app/backend \
  /var/www/tka/app/backend/venv/bin/python \
  /var/www/tka/app/scripts/run_migrations.py --check
```

Pastikan versi database sudah diperiksa dan backup tersedia. Setelah itu terapkan target terbaru `v06`:

```bash
sudo -u tka env \
  ENV_FILE=/etc/tka/backend.env \
  PYTHONPATH=/var/www/tka/app/backend \
  /var/www/tka/app/backend/venv/bin/python \
  /var/www/tka/app/scripts/run_migrations.py --target v06
```

Runner menerapkan versi yang belum ada secara berurutan. Bila pemeriksaan awal menunjukkan versi lain yang tidak dipahami atau lebih baru daripada target, berhenti dan tinjau skema sebelum melanjutkan. Setelah sukses, jalankan lagi `--check` dan pastikan hasil `v06`.

### Neon melalui SQL Editor

Pilih project, branch, dan database Neon yang benar sebelum menjalankan SQL. Lakukan backup/branch point terlebih dahulu. Jalankan pemeriksaan versi:

Panduan langkah demi langkah yang berfokus pada penerapan `v06` tersedia di [MIGRASI_NEON.md](MIGRASI_NEON.md).

```sql
SELECT value AS schema_version
FROM t_app_setting
WHERE key = 'app:schema_version';
```

Jika hasilnya `v03`, terapkan isi [`migrations/v04_anti_cheat_telemetry.sql`](../migrations/v04_anti_cheat_telemetry.sql) di SQL Editor. Setelah DDL berhasil, catat versinya:

```sql
INSERT INTO t_app_setting (key, value, updated_at)
VALUES ('app:schema_version', 'v04', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
```

Jika hasil awal `v04`, terapkan [`migrations/v05_practice_module.sql`](../migrations/v05_practice_module.sql), lalu catat `v05` setelah DDL berhasil:

```sql
INSERT INTO t_app_setting (key, value, updated_at)
VALUES ('app:schema_version', 'v05', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
```

Setelah versi terkonfirmasi `v05`, jalankan isi [`migrations/v06_practice_draft_answers.sql`](../migrations/v06_practice_draft_answers.sql):

```sql
ALTER TABLE t_practice_answer
    ADD COLUMN IF NOT EXISTS is_checked BOOLEAN NOT NULL DEFAULT TRUE;
```

Setelah DDL berhasil, catat v06:

```sql
INSERT INTO t_app_setting (key, value, updated_at)
VALUES ('app:schema_version', 'v06', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
```

Jangan menjalankan penanda versi jika DDL terkait gagal. Jika database masih `v03` atau lebih lama, terapkan setiap migrasi yang hilang secara berurutan sebelum mencatat `v06`.

### Verifikasi hasil

Jalankan pada database yang baru dimigrasikan:

```sql
SELECT value AS schema_version
FROM t_app_setting
WHERE key = 'app:schema_version';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = current_schema()
  AND table_name IN (
      't_practice',
      't_practice_question',
      't_practice_attempt',
      't_practice_answer'
  )
ORDER BY table_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 't_practice_answer'
  AND column_name = 'is_checked';
```

Hasil yang diharapkan adalah versi `v06`, empat tabel Latihan, dan kolom `is_checked` pada `t_practice_answer`. Verifikasi setiap database secara terpisah; versi Neon tidak menunjukkan versi tzserver dan sebaliknya. Jangan kirim atau commit `.env`, URL koneksi, password, atau backup.

## Deploy otomatis backend tzserver

Setelah persiapan satu kali di server, perubahan di `backend/` yang masuk ke `main` akan dideploy otomatis oleh workflow backend. Workflow SSH masuk sebagai `admintz`, memverifikasi checkout, menjalankan `git pull --ff-only` dan pemasangan dependensi sebagai user `tka`, me-restart `tka-backend.service`, lalu memeriksa endpoint status Backup. Workflow tidak mengirim `.env`, kredensial, backup database, atau data aplikasi. Nilai-nilai berikut sesuai instalasi tzserver saat ini; verifikasi dahulu sebelum dipakai pada instalasi lain:

- Checkout: `/var/www/tka/app`, dimiliki user `tka`.
- Virtual environment: `/var/www/tka/app/backend/venv`.
- Service systemd: `tka-backend.service`.
- Workflow hanya menerima remote repository `https://github.com/opiktz-glitch/TKA-TRYOUT-AI-POSTGRESQL.git` atau bentuk SSH resminya dan hanya deploy branch `main`.

### Persiapan satu kali untuk deploy backend otomatis

Pastikan path Git, systemd, checkout, virtual environment, dan nama service sesuai dengan server. Jangan melanjutkan jika checkout memiliki perubahan lokal atau bukan repository/branch yang dimaksud. Workflow menolak checkout kotor, remote yang tidak dikenal, dan branch selain `main`.

Jika menyiapkan server baru atau aturan tersebut belum ada, tambahkan aturan sudo terbatas untuk akun SSH `admintz` di `/etc/sudoers.d/deploy-tka-backend`. Aturan ini hanya mengizinkan pemeriksaan checkout, fast-forward ke `main`, instalasi requirements pada virtual environment aplikasi, dan restart/status service backend:

Buka file dengan `sudo visudo -f /etc/sudoers.d/deploy-tka-backend`, lalu masukkan aturan berikut:

```sudoers
admintz ALL=(tka) NOPASSWD: /usr/bin/git -C /var/www/tka/app branch --show-current, /usr/bin/git -C /var/www/tka/app remote get-url origin, /usr/bin/git -C /var/www/tka/app status --porcelain, /usr/bin/git -C /var/www/tka/app pull --ff-only origin main, /var/www/tka/app/backend/venv/bin/pip install -r /var/www/tka/app/backend/requirements.txt
admintz ALL=(root) NOPASSWD: /usr/bin/systemctl restart tka-backend.service, /usr/bin/systemctl --no-pager --full status tka-backend.service
```

Simpan aturan dengan izin yang benar dan validasi sebelum workflow dijalankan:

```bash
sudo chown root:root /etc/sudoers.d/deploy-tka-backend
sudo chmod 440 /etc/sudoers.d/deploy-tka-backend
sudo visudo -cf /etc/sudoers.d/deploy-tka-backend
sudo -l -U admintz
```

Pastikan `visudo` menampilkan `parsed OK` dan hak yang diberikan terbatas pada perintah deploy di atas. Jangan memberikan `NOPASSWD: ALL`. Aturan ini mengasumsikan executable Git dan systemd masing-masing berada di `/usr/bin/git` dan `/usr/bin/systemctl`; sesuaikan dengan hasil pemeriksaan di server. Git remote harus dapat diakses dari tzserver. Karena repository ini publik, checkout dapat mengambil perubahan tanpa menyimpan kredensial deployment di server.

Pastikan secrets Actions yang telah digunakan workflow frontend tersedia pada environment `tzserver-production`. Batasi ACL Tailscale, SSH key, proteksi branch `main`, dan persetujuan environment dengan cara yang sama seperti frontend. Setelah aturan sudo siap, lakukan perubahan backend kecil yang sudah ditinjau dan masuk ke `main`, lalu periksa hasil pada **Actions → Deploy backend to tzserver**. Workflow juga dapat dijalankan manual dari tab Actions.

Jika perlu memperbarui backend secara manual atau menyelidiki kegagalan workflow, gunakan akun pemilik checkout untuk operasi Git (jangan `sudo git`, agar kepemilikan file tidak berubah dan peringatan `dubious ownership` tidak muncul). Jangan lanjut jika checkout kotor, branch bukan `main`, atau remote tidak sesuai:

```bash
sudo -u tka -- git -C /var/www/tka/app status --short
sudo -u tka -- git -C /var/www/tka/app branch --show-current
sudo -u tka -- git -C /var/www/tka/app rev-parse --short HEAD
```

Untuk diagnosis setelah deploy, `401` atau `403` dari endpoint berikut tanpa autentikasi berarti route dikenali. `404` berarti route tidak tersedia pada backend yang melayani request atau reverse proxy mengarah ke backend lain:

```bash
curl -i http://127.0.0.1:8081/api/settings/postgres-backups/status
sudo journalctl -u tka-backend.service -n 50 --no-pager
```

Jangan membagikan log yang memuat rahasia. Jika workflow menolak checkout karena ada perubahan lokal, jangan memaksakan `git reset`, `git clean`, atau pull biasa; tinjau perubahan tersebut dan pulihkan kondisi deploy dengan prosedur yang aman.

Untuk mengaktifkan tab **Pengaturan → Backup Database**:

1. Pastikan dahulu cara service backend memuat konfigurasi. Jika menggunakan file, `backend/config.py` secara default membaca `.env` di folder `backend`; bila `ENV_FILE` ditetapkan, file yang dipilih berada relatif terhadap folder tersebut. Jika service mengelola environment variables lewat systemd atau mekanisme lain, tambahkan variabel di sumber konfigurasi service itu.
2. Tambahkan `POSTGRES_BACKUP_ENABLED=true` pada sumber konfigurasi yang benar. Jangan menimpa file `.env` yang sudah ada. Jika file belum ada, buat file hanya setelah direktori checkout dan user service diverifikasi; isi nilai production yang memang dibutuhkan backend. Jangan menyalin `.env.example` yang masih memiliki nilai kosong tanpa melengkapinya: `load_dotenv(..., override=True)` dapat membuat nilai kosong dalam file menimpa nilai environment service dan mencegah backend berjalan. Batasi izin file agar hanya user service dan administrator yang dapat membacanya. Jangan set variabel ini di Vercel.
3. Pastikan `pg_dump` dan `pg_restore` tersedia bagi proses backend. Pada Linux, jangan gunakan path executable Windows seperti `C:\Program Files\...`; biarkan variabel path kosong jika utilitas tersedia di `PATH`, atau tetapkan `POSTGRES_PG_DUMP_PATH` dan `POSTGRES_PG_RESTORE_PATH` ke path Linux yang benar.
4. Restart backend setelah pembaruan environment agar pengaturan dimuat. Jika konfigurasi environment berubah melalui systemd, ikuti prosedur server untuk memuat ulang konfigurasi unit sebelum restart.
5. Setelah endpoint dikenali, login sebagai Admin dan pastikan respons status `200` memiliki `enabled: true`. Jika masih `enabled: false`, periksa `POSTGRES_BACKUP_ENABLED` dan `message` untuk mengetahui apakah utilitas PostgreSQL belum terdeteksi.
6. Muat ulang halaman Pengaturan. Jika frontend baru saja di-deploy, lakukan hard refresh untuk menghindari aset lama di browser.

## Backup penuh PostgreSQL

Backup file manual tersedia di halaman Pengaturan Admin pada backend native tzserver dan saat ini telah dikonfirmasi aktif. Endpoint dinonaktifkan secara default pada instalasi baru dan hanya aktif jika `POSTGRES_BACKUP_ENABLED=true` ditetapkan pada environment backend tzserver. Jangan aktifkan variabel ini pada Vercel. Vercel Cron dapat menjadwalkan HTTP request ke Vercel Function, tetapi file lokal function bukan penyimpanan arsip permanen; backup/restore dump besar lebih aman dikerjakan pada tzserver/provider. Lihat [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) dan [Function Limits](https://vercel.com/docs/functions/limitations).

Skrip `backend/scripts/backup_postgres.py` membuat dump format custom yang mencakup seluruh database, termasuk gambar soal, lalu memeriksa arsip dengan `pg_restore --list`. Password koneksi tidak ditaruh di argumen proses; skrip memakai file `.pgpass` sementara dengan izin privat dan menghapusnya setelah selesai. File backup dibuat dengan izin pemilik saja. Retensi default menyimpan 14 dump terakhir.

Pengoperasian fitur Backup di tzserver:

1. Ikuti langkah konfigurasi di bagian **Memperbarui backend tzserver**. Jangan menganggap `.env` wajib ada: konfigurasi dapat dikelola oleh systemd atau mekanisme environment lain. Aktifkan `POSTGRES_BACKUP_ENABLED=true` hanya pada sumber konfigurasi backend tzserver, bukan Vercel.
2. Pastikan `pg_dump` dan `pg_restore` tersedia dan versinya kompatibel dengan PostgreSQL provider. Backend mencari executable lewat `PATH`; bila proses service tidak mewarisi PATH yang tepat, atur `POSTGRES_PG_DUMP_PATH` dan `POSTGRES_PG_RESTORE_PATH` ke path yang benar untuk sistem operasi server. Jangan gunakan path Windows pada Linux.
3. Opsional, atur `POSTGRES_BACKUP_DIR` sebagai folder dasar yang diizinkan. User service backend harus bisa menulis ke sana. Jika kosong/tidak diatur, folder default adalah `backend/backups/postgresql`.
4. Login sebagai Admin. Di bagian **Lokasi dan retensi backup**, pilih subfolder relatif (atau biarkan kosong untuk memakai folder dasar) dan jumlah backup. Klik **Simpan & Verifikasi Folder**; backend membuat folder bila belum ada, menguji izin tulis, dan menolak path absolut atau path yang keluar dari folder dasar. Mengganti subfolder tidak memindahkan file backup yang sudah ada.
5. Pilih **Buat & Unduh Backup** untuk membuat file dump dan mengunduhnya. File yang disimpan di server juga bisa diunduh kembali dari daftar. Subfolder dan retensi yang diatur lewat UI tersimpan di pengaturan aplikasi dan hanya berlaku untuk endpoint aplikasi; skrip CLI memakai `POSTGRES_BACKUP_DIR` dan `POSTGRES_BACKUP_RETENTION` secara langsung.
6. Untuk restore, unggah file `.dump` hasil backup lalu konfirmasi. Backend memvalidasi arsip, membuat backup pengaman terlebih dahulu, lalu menjalankan `pg_restore` dalam satu transaksi. Jika `pg_restore` gagal, transaksinya dibatalkan. `pg_restore --clean` menghapus objek yang tercantum dalam arsip; objek yang dibuat setelah backup tetapi tidak ada di arsip dapat tetap ada. Jika API melaporkan error setelah proses restore selesai, periksa database dan minta pengguna login ulang karena pemulihan sesi merupakan langkah setelah transaksi restore. Seluruh sesi login di-reset setelah restore berhasil; pengguna perlu login ulang.

Backup dibuat di `backend/backups/postgresql/` secara default. Admin dapat mengatur subfolder dan retensi untuk backup lewat UI. File berisi seluruh data aplikasi dan harus dianggap sensitif. Jangan menyimpan direktori backup di Git atau menyajikannya melalui Nginx. Download yang dilakukan dari browser adalah salinan yang harus disimpan admin dengan aman.

Penjadwalan backup otomatis belum termasuk tahap ini dan tidak aktif hanya dengan menyalakan fitur manual. Mekanisme jadwal akan diselaraskan terpisah.

Backup ini berada di tzserver dan **belum merupakan salinan off-site**. Jika server atau disk tzserver hilang, backup lokal ikut hilang. Aktifkan juga backup/PITR dari provider PostgreSQL atau tentukan tujuan kedua yang terpisah (misalnya object storage terenkripsi). Uji restore dump secara berkala ke database terpisah; `pg_restore --list` hanya memeriksa struktur arsip, bukan membuktikan pemulihan database berhasil.
