# Roadmap TKA TryOut AI

Roadmap ini adalah usulan prioritas berdasarkan kondisi repository saat ini, bukan komitmen tanggal rilis. Urutan dapat disesuaikan dengan kebutuhan sekolah dan deployment.

## Prioritas 0 — Keamanan operasional dan keandalan

- [ ] **Amankan runner tes backend**
  - Pastikan runner memilih konfigurasi khusus tes secara eksplisit, memvalidasi bahwa database tujuan terisolasi, dan gagal dengan pesan jelas bila konfigurasi tidak aman.
  - Gunakan path absolut/berdasarkan lokasi skrip agar pemanggilan konsisten dari root maupun folder `backend`.
  - Dokumentasikan cara menyiapkan database tes tanpa mengekspos kredensial.
- [ ] **Selaraskan migrasi skema**
  - Tambahkan dukungan migrasi `v04` ke `scripts/run_migrations.py` atau dokumentasikan secara eksplisit cara menerapkannya.
  - Tetapkan prosedur versi skema, backup sebelum migrasi, serta pemeriksaan hasil pada PostgreSQL.
  - Hindari mengandalkan migrasi kolom startup yang terbatas sebagai satu-satunya mekanisme perubahan skema.
- [ ] **Perkuat pengelolaan konfigurasi deployment**
  - Tegaskan pemisahan konfigurasi development, tes, LAN, dan production.
  - Pastikan secret kuat dan kredensial admin awal ditetapkan secara eksplisit untuk deployment baru.
  - Dokumentasikan pemeriksaan konektivitas database dan prosedur rotasi secret/API key.
- [ ] **Verifikasi dan dokumentasikan backup/restore PostgreSQL**
  - Sediakan dan uji prosedur backup serta pemulihan melalui provider/layanan PostgreSQL yang digunakan.
  - Pastikan pemulihan diuji pada salinan lingkungan, bukan database aktif.
  - Untuk setup self-hosted, evaluasi otomasi CLI backup/restore bila alur yang tersedia belum memadai.

## Prioritas 1 — Observabilitas dan performa berbasis pengukuran

- [ ] **Tambahkan pengukuran request backend**
  - Catat durasi dan status request tanpa mencatat token, kredensial, isi jawaban, atau data pribadi.
  - Tentukan endpoint lambat berdasarkan pengukuran, bukan perkiraan.
- [ ] **Ukur query database**
  - Tambahkan instrumentasi durasi query yang dapat diaktifkan secara aman untuk development/diagnostik.
  - Temukan pola query berulang/N+1 dan query lambat; optimalkan hanya setelah profil menunjukkan bottleneck.
- [ ] **Tinjau endpoint daftar dan laporan**
  - Audit endpoint yang mengiterasi entitas lalu menjalankan query tambahan per item.
  - Contoh yang perlu diprofilkan adalah pengambilan daftar tryout siswa di `backend/routers/student.py`, yang menghitung jumlah soal, subject, dan attempt per tryout.
  - Gunakan eager loading, agregasi, paginasi, atau indeks jika hasil ukur dan pola data membenarkannya.
- [ ] **Tetapkan baseline kapasitas**
  - Uji beban realistis untuk login, daftar tryout, penyimpanan jawaban, dan submit.
  - Catat ukuran dataset, konkurensi, p50/p95, tingkat error, dan konfigurasi database agar hasil bisa dibandingkan.

## Prioritas 2 — Konsistensi dan pemeliharaan

- [ ] **Perkuat cakupan tes alur penting**
  - Pastikan ada tes integrasi untuk autentikasi/role, siklus attempt, validasi waktu server, perhitungan hasil, dan migrasi.
  - Pertahankan tes frontend untuk integritas route dan halaman; tambahkan tes interaksi kritis bila belum tercakup.
- [ ] **Tetapkan kontrak API**
  - Dokumentasikan endpoint penting, bentuk error, role yang diperlukan, dan perubahan yang kompatibel.
  - Gunakan schema OpenAPI sebagai referensi kontrak selama dokumentasi API aktif pada lingkungan non-production.
- [ ] **Periksa batas ukuran dan validasi unggahan**
  - Dokumentasikan jenis, ukuran, dan perilaku kegagalan file yang diterima untuk impor dokumen/gambar.
  - Pastikan batas di frontend dan backend konsisten dan diuji.
- [ ] **Tingkatkan konsistensi antarmuka**
  - Evaluasi halaman yang belum memakai layout bersama dan standarkan pola loading, error, serta empty state.
  - Lakukan perubahan bertahap agar alur tiap role tetap terjaga.

## Prioritas 3 — Pengembangan produk

- [ ] **Tingkatkan pengalaman impor soal**
  - Tampilkan progres dan hasil parsial untuk pekerjaan multi-chunk yang lama.
  - Sediakan ringkasan validasi/pratinjau dan cara melanjutkan atau mengulang bagian yang gagal.
- [ ] **Tingkatkan analitik tryout**
  - Kembangkan laporan berdasarkan kebutuhan guru/admin, dengan definisi metrik yang konsisten dan akses berbasis role.
- [ ] **Tambahkan fitur Latihan Siswa yang terpisah dari Tryout**
  1. [x] **Rancang alur dan aturan:** Admin mengelola semua latihan; Guru mengelola latihan dan soal buatannya sendiri; latihan terbit tersedia untuk semua siswa tanpa relasi penugasan guru-siswa.
  2. [x] **Bangun pengelolaan Admin:** buat, edit, pratinjau, terbitkan, dan arsipkan latihan.
  3. [x] **Bangun pengelolaan Guru:** sediakan alur yang sama dengan akses terbatas pada latihan dan soal buatan Guru; latihan terbit tetap tersedia untuk semua siswa.
  4. [x] **Bangun pengalaman Siswa:** daftar latihan, pengerjaan berulang, pengacakan soal/pilihan, pembahasan, dan ringkasan hasil tanpa timer wajib atau dampak ke rekap Tryout.
  5. [x] **Verifikasi sebelum rilis:** migrasi v05 dan alur API Admin/Guru/Siswa diuji pada database PostgreSQL khusus tes; pengulangan, pembahasan, batas akses, tampilan Admin desktop dan Siswa mobile, serta tidak adanya data pada attempt/nilai Tryout resmi sudah diperiksa. Verifikasi lokal selesai; deploy belum dilakukan.
  - Jangan membuka soal dari Tryout aktif secara otomatis; latihan hanya memakai soal yang dipilih secara sengaja.
- [ ] **Tonjolkan tryout prioritas pada Dashboard Siswa**
  - Buat tryout yang belum dikerjakan atau perlu dilanjutkan lebih mudah ditemukan daripada riwayat nilai.
- [ ] **Sederhanakan aksi tryout pada Dashboard Guru**
  - Tinjau pengulangan aksi “Buat Tryout” di bagian Aktivitas dan Akses Cepat agar pilihan tindakan tidak terasa berulang.
- [ ] **Jaga keterbacaan grafik nilai di ponsel**
  - Pastikan label tanggal dan nilai tetap mudah dibaca di layar kecil saat jumlah data bertambah.
- [ ] **Kustomisasi identitas sekolah pada laporan**
  - Evaluasi pengaturan nama sekolah, logo, dan identitas penanggung jawab untuk ditampilkan pada laporan nilai.
- [ ] **Sediakan leaderboard tryout untuk guru**
  - Tampilkan peringkat peserta per paket tryout dengan aturan akses data siswa yang sesuai.
- [ ] **Evaluasi pembersihan data berkala**
  - Tinjau kebijakan retensi sesi dan notifikasi lama sebelum menambahkan pembersihan otomatis; pertahankan data yang dibutuhkan untuk audit dan riwayat.
- [ ] **Tingkatkan kesiapan jaringan dan deployment**
  - Tinjau endpoint admin `/api/system/status` yang sudah ada dan pastikan dokumentasi menjelaskan status API, database, dan AI sesuai implementasinya.
  - Tambahkan endpoint readiness terpisah hanya jika endpoint status yang ada tidak memenuhi kebutuhan deployment/monitoring.
  - Tinjau kebutuhan HTTPS, reverse proxy, firewall, dan konfigurasi CORS untuk deployment non-LAN.

## Kriteria penyelesaian umum

Untuk setiap item yang dikerjakan:

1. Tentukan perilaku yang diharapkan dan risiko migrasi/kompatibilitas.
2. Tambahkan atau perbarui tes yang relevan; jangan arahkan tes backend ke database produksi.
3. Jalankan build frontend jika frontend berubah dan pemeriksaan backend yang sesuai jika backend berubah.
4. Dokumentasikan konfigurasi, batasan, serta langkah rollback/operasional bila relevan.
5. Catat hasil pengujian dan hasil ukur tanpa mengklaim peningkatan performa yang belum dibuktikan.
