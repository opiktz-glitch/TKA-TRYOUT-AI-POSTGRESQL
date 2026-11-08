# Panduan Pengembangan TKA TryOut AI

## Prinsip perubahan kode

- Buat perubahan yang terarah dan sesuai pola yang sudah digunakan proyek. Jangan mengubah hal di luar kebutuhan.
- Periksa seluruh pemakaian terkait agar perubahan konsisten di backend, frontend, dan database.
- Jangan menyatakan build atau tes berhasil jika belum dijalankan dan hasilnya belum diperiksa.
- Jangan pernah menampilkan, menyalin ke dokumentasi, atau melakukan commit kredensial dari file `.env`.

## Verifikasi frontend

Tentukan level validasi berdasarkan risiko dan cakupan perubahan. Jalankan pemeriksaan secukupnya; jangan otomatis menjalankan seluruh build dan tes untuk setiap perubahan.

### Level validasi

1. **Teks/konten** — perubahan caption, judul, label, atau pesan tanpa mengubah perilaku. Periksa diff dan lint file yang diubah. Tidak perlu build atau tes logika.
2. **Tampilan** — perubahan CSS, ukuran, jarak, atau tata letak tanpa mengubah alur data. Jalankan build dan lint file frontend yang diubah. Periksa tampilan desktop jika perubahan dapat memengaruhi keterbacaan, posisi, scroll, atau tombol.
3. **Perilaku** — perubahan state, validasi input, interaksi, request API, atau alur pengguna. Jalankan tes terarah untuk perilaku yang diubah, ditambah build/lint frontend atau pemeriksaan backend yang relevan.
4. **Data/akses/risiko tinggi** — perubahan model atau migrasi, transaksi database, izin akses, penghapusan, autentikasi, atau lintas layanan. Jalankan tes backend/integrasi terarah yang aman; periksa migrasi dan aturan akses. Jangan arahkan tes ke database default yang belum dipastikan aman.

Naikkan level hanya jika perubahan menyentuh aspek tersebut. Untuk perubahan campuran, gunakan level tertinggi yang relevan. Jangan mengulang pemeriksaan yang sudah lulus tanpa perubahan lanjutan yang memengaruhinya; laporkan pemeriksaan yang dilewati beserta batas verifikasinya.

Untuk perubahan frontend level 2 atau lebih, jalankan build dari folder `frontend`:

```powershell
npm run build
```

Pastikan build selesai tanpa error sebelum menyatakan perubahan frontend terverifikasi. Jalankan lint hanya pada file yang diubah. Build dan lint dapat dijalankan dalam satu pemanggilan dari folder `frontend`, misalnya:

```powershell
npm run build; if ($?) { npm run lint -- src/components/SomeComponent.jsx src/services/api.js }
```

Pilih hanya file yang memang diubah. Perubahan frontend level 1 cukup lint dan pemeriksaan diff; jangan menjalankan build atau tes logika kecuali ada dampak lain yang menjadikannya relevan.

## Pemeriksaan yang efektif

- Pilih pemeriksaan terkecil yang memvalidasi perubahan secara langsung. Jangan menjalankan beberapa suite luas atau pemeriksaan berulang untuk satu perubahan kecil.
- Gabungkan pemeriksaan yang berkaitan dalam satu pemanggilan jika dapat dilakukan tanpa mengaburkan hasil; pemeriksaan independen boleh dijalankan bersamaan.
- Jalankan `git diff --check` sekali pada akhir perubahan, bukan setelah setiap edit.
- Untuk perubahan frontend dan backend sekaligus, validasi build/lint frontend serta pemeriksaan backend yang paling relevan. Jangan mengklaim pemeriksaan statis sebagai pengganti tes runtime.
- Jika tes runtime backend berisiko memakai database, patuhi pengamanan database di bawah. Bila database tes aman belum disiapkan, gunakan pemeriksaan yang tidak terhubung ke database dan nyatakan batas verifikasinya.

## Panduan UI frontend

- Pertahankan bahasa UI dalam Bahasa Indonesia dan ikuti sistem visual yang sudah ada: warna/token di `frontend/src/App.css`, kartu dan form Pengaturan di `frontend/src/components/settings/settings.css`, serta pola toolbar/tabel nilai di `frontend/src/components/ScoreTable.css`. Gunakan token seperti `--accent`, `--accent-hover`, `--accent-soft`, `--paper`, dan `--line`; jangan memperkenalkan palet atau gaya tombol baru tanpa kebutuhan yang jelas.
- Sebelum membuat komponen visual baru, cari dan gunakan komponen/class yang sudah ada—misalnya `dashboard-card`, `settings-card`, `settings-grid`, `form-group`, `score-card`, `score-toolbar`, `score-table`, `score-badge`, `Pagination`, dan komponen modal bersama. Jangan menduplikasi pola yang sudah tersedia.
- Halaman baru mengikuti pola route/layout di `frontend/src/App.jsx` dan layout bersama `frontend/src/components/Layout.jsx`. Jangan merender `Sidebar` atau `Header` kedua kali di halaman yang sudah berada dalam layout bersama; periksa route dan halaman serupa terlebih dahulu karena sebagian halaman lama belum dimigrasikan.
- Letakkan CSS khusus komponen di file CSS komponen dengan nama class yang ter-namespace. Hindari selector global baru dan perubahan luas di `App.css` kecuali memang memperbaiki sistem bersama. Untuk pola berulang, gunakan class/CSS bersama daripada menyalin inline style.
- Buat halaman tetap rapi pada layar sempit: gunakan grid/flex yang dapat membungkus atau menjadi satu kolom, cegah teks/path panjang meluber, dan bungkus tabel lebar dengan area scroll horizontal. Ikuti breakpoint yang sudah dipakai di stylesheet terkait, bukan menambahkan breakpoint berbeda tanpa alasan.
- Setiap alur data perlu tampilan yang jelas untuk loading, kosong, gagal, berhasil, dan aksi yang sedang berjalan. Nonaktifkan tombol selama aksi yang berkonflik dan tampilkan pesan yang menjelaskan tindakan berikutnya.
- **Validasi UI laptop/desktop wajib dan menjadi prioritas utama.** Setelah perubahan UI, periksa tampilan serta alur utama pada viewport laptop/PC terlebih dahulu (disarankan 1366×768 atau 1280×720); pastikan judul, konten, navigasi, tombol aksi, dan area scroll terlihat serta dapat digunakan tanpa terpotong atau tertutup. Jangan melewatkan pemeriksaan desktop hanya karena tampilan HP sudah dicek. Pemeriksaan HP/mobile bersifat opsional kecuali diminta pengguna atau perubahan secara khusus memengaruhi breakpoint/perilaku mobile.
- Modul Latihan terpisah dari Tryout dan nilai resmi. Latihan yang diterbitkan dapat diakses semua siswa; jangan menambahkan asumsi penugasan guru-ke-siswa/kelas yang tidak ada di model aplikasi.
- Ikuti pola layout bersama serta komponen visual yang sudah tersedia untuk UI Admin/Guru/Siswa Latihan. Soal Tryout aktif tidak dimasukkan otomatis, dan kunci jawaban/pembahasan tidak boleh dikirim sebelum siswa menjawab soal.
- Gunakan elemen semantik dan aksesibel: `button type="button"` untuk aksi, label yang terhubung ke input, nama aksesibel untuk kontrol ikon, fokus keyboard yang terlihat, serta `role`/atribut dialog yang sesuai. Jangan mengandalkan warna saja untuk menyampaikan status.
- Semua tanggal yang ditampilkan kepada pengguna harus memakai format `dd-mm-yyyy`; tanggal dan waktu memakai `dd-mm-yyyy HH:mm`. Gunakan formatter bersama di `frontend/src/utils/date.js`, termasuk untuk dashboard/grafik, notifikasi, tabel, laporan, dan ekspor. Format API/database tetap ISO agar dapat diproses mesin.
- Jaga hierarki informasi: judul dan deskripsi singkat, kelompokkan pengaturan terkait, gunakan label aksi spesifik, dan tampilkan peringatan dekat tindakan berdampak tinggi. Konfirmasi eksplisit diperlukan untuk aksi destruktif atau sulit dibatalkan.
- Setelah perubahan UI, jalankan build frontend dan lint untuk file yang diubah. Jika aplikasi lokal dapat diakses, periksa tampilan desktop/laptop terlebih dahulu dan state utama; pemeriksaan mobile opsional kecuali diminta atau relevan dengan perubahan. Jika terhalang login, data, atau konfigurasi, nyatakan batas verifikasi dan jangan mengklaim pemeriksaan visual sudah dilakukan.

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
- Untuk perubahan backend yang tidak memerlukan database, gunakan pemeriksaan terarah yang aman (misalnya pemeriksaan sintaks atau tes unit dengan dependency database di-mock) alih-alih menjalankan seluruh suite backend.

## Konfigurasi dan data sensitif

- Jangan commit file `.env`, kredensial, database lokal, maupun backup.
- Jangan mengasumsikan nama penyedia database dari keberadaan `DATABASE_URL`; verifikasi konfigurasi tanpa mencetak URL atau kredensial.
- Untuk perubahan skema database, perbarui mekanisme migrasi dan dokumentasi terkait sesuai kebutuhan.
