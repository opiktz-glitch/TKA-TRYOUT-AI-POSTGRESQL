# Buku Panduan Penggunaan - TryOut CBT & AI

Selamat datang di aplikasi TryOut berbasis *Computer-Based Test* (CBT) modern dengan dukungan Kecerdasan Buatan (AI). Buku panduan ini akan membantu Anda memahami cara menggunakan aplikasi dari sudut pandang **Siswa**, **Guru**, dan **Administrator**.

---

## DAFTAR ISI
1. [Panduan Siswa](#panduan-siswa)
2. [Panduan Guru](#panduan-guru)
3. [Panduan Admin](#panduan-admin)

---

## 1. PANDUAN SISWA <a name="panduan-siswa"></a>

Bagian ini dirancang untuk siswa/peserta ujian agar dapat mengerjakan soal TryOut dengan lancar.

### A. Cara Login
1. Buka halaman utama aplikasi TryOut.
2. Masukkan **Username** dan **Password** yang telah diberikan oleh pihak sekolah/admin.
3. Klik tombol **Login**.

> [!TIP]
> Jika Anda lupa password, segera hubungi Guru atau Admin untuk mereset password akun Anda.

### B. Memulai & Mengerjakan Ujian
1. Setelah login, Anda akan masuk ke halaman **Dashboard Siswa**.
2. Cari nama TryOut yang sedang aktif di daftar ujian.
3. Klik tombol **Mulai Mengerjakan**.
4. Di halaman pengerjaan soal:
   - Pilih opsi jawaban yang Anda anggap paling benar.
   - Gunakan navigasi nomor di sebelah kanan layar untuk berpindah ke soal tertentu.
   - Klik **Simpan & Lanjut** untuk menyimpan jawaban Anda.

> [!WARNING]
> Jangan menutup browser saat sedang mengerjakan ujian. Jawaban Anda akan otomatis tersimpan saat Anda berpindah soal.

### C. Menyelesaikan Ujian & Melihat Pembahasan
1. Pada soal terakhir, atau jika Anda sudah yakin dengan semua jawaban, klik tombol **Selesai**.
2. Setelah ujian ditutup oleh Guru, Anda bisa melihat skor dan evaluasi Anda.
3. Klik **Lihat Pembahasan** untuk melihat penjelasan dari setiap soal yang dijawab salah maupun benar.

---

## 2. PANDUAN GURU <a name="panduan-guru"></a>

Sebagai Guru, Anda memiliki akses penuh untuk menyusun bank soal, mengelola tryout, dan menggunakan fitur kecerdasan buatan (AI) untuk membantu membuat pembahasan soal dengan instan.

### A. Membuat Bank Soal
1. Masuk ke menu **Bank Soal**.
2. Klik tombol **+ Tambah Soal**.
3. Ketik teks soal dan pilih opsi jawaban yang benar.
4. Jika soal memiliki gambar, gunakan fitur unggah gambar.

### B. Menggunakan Fitur "Import Soal dari Gambar" (AI Vision)
Fitur ini sangat berguna jika Anda memiliki soal dari buku cetak atau layar komputer yang ingin Anda jadikan teks otomatis.

1. Klik **Import dari Gambar**.
2. Unggah gambar (*screenshot* atau foto) yang berisi kumpulan soal.
3. Aplikasi akan otomatis memotong dan membaca gambar tersebut.
4. AI akan menyalin teks soal dan mendeteksi opsi jawabannya secara otomatis. Cukup tinjau dan simpan!

> [!NOTE]
> Proses ekstraksi gambar menjadi teks membutuhkan waktu sekitar 5-15 detik tergantung kecepatan server/AI yang digunakan.

### C. Membuat Pembahasan Cerdas dengan AI
Tidak perlu lagi mengetik pembahasan panjang satu per satu. AI akan mengerjakannya untuk Anda.
1. Buka form edit/tambah soal.
2. Di bagian kolom "Pembahasan", Anda akan menemukan tiga opsi:
   - `[🔍 Verifikasi Jawaban]`: Meminta AI mengecek apakah Kunci Jawaban yang Anda centang sudah benar atau keliru secara logika.
   - `[✨ Bahas Singkat]`: AI akan membuat draf pembahasan pendek (2-4 kalimat). Cocok untuk soal hafalan/teori mudah.
   - `[📚 Bahas Detail]`: AI akan membuat penjabaran panjang (langkah demi langkah pengerjaan rumus). Cocok untuk Matematika/Eksakta.
3. Baca hasil keluaran AI, lalu klik **Simpan**.

---

## 3. PANDUAN ADMIN <a name="panduan-admin"></a>

Panel admin digunakan untuk memonitor infrastruktur server dan mengatur model AI yang digunakan oleh sekolah/lembaga.

### A. Manajemen User (Pengguna)
1. Buka menu **Manajemen Pengguna**.
2. Di sini, Anda bisa menambahkan Siswa dan Guru secara satuan, atau mereset password mereka.

### B. Konfigurasi AI (Gemini / Ollama Lokal)
1. Buka menu **Pengaturan** -> tab **AI**.
2. Anda bisa memilih "Mesin" utama yang menggerakkan fitur *Import Gambar* dan *Pembahasan Otomatis*:
   - **Gemini API:** Membutuhkan akses internet, sangat cepat (di bawah 5 detik), dan tingkat akurasi tinggi. Wajib memasukkan API Key.
   - **Ollama (Lokal):** Berjalan di server kantor (Offline), lambat namun aman untuk data privasi. Wajib memasukkan `Ollama Base URL` yang valid.

### C. Konfigurasi Jaringan Lokal (WiFi)
1. Di menu **Pengaturan**, terdapat tab **Jaringan**.
2. Tab ini sangat berguna jika server di- *host* di PC/Laptop kantor lokal. Anda bisa langsung melihat *IP Address* lokal (misalnya `192.168.1.15`) yang bisa dibagikan kepada HP atau laptop murid agar bisa mengakses TryOut dari satu WiFi yang sama tanpa repot mengetik `ipconfig` di Terminal.
