# Changelog

Semua perubahan penting pada proyek **TKA-AI (TKA Tryout)** akan didokumentasikan di dalam file ini.

## [Unreleased]

### Ditambahkan
- **Dukungan PostgreSQL**: Backend sekarang mendukung database PostgreSQL secara *native* dengan fitur *pool pre-ping* yang diaktifkan (membuat koneksi menjadi lebih stabil, khusus didesain untuk integrasi seperti Neon Tech).
- **Pembuatan Soal Otomatis (AI)**: Menambahkan dukungan multi-provider untuk melakukan generate soal: Ollama (lokal) dan Gemini (cloud). Integrasi ini dipisahkan secara modular pada `ai_providers.py`.
- **Manajemen Pengaturan UI Dinamis**: Kunci API penyedia AI dan pemilihan model aktif sekarang disimpan di dalam database (`t_app_setting`) secara terenkripsi menggunakan Fernet, sehingga dapat diubah admin lewat UI tanpa mengubah `.env`.
- **Proteksi Concurrency Ujian**: Menambahkan index unik parsial (`student_id`, `tryout_id` dengan status `IN_PROGRESS`) di tingkat database SQLite/PostgreSQL untuk mencegah DUA *attempt* aktif secara bersamaan, memastikan perlindungan dari *race condition* atau klik ganda.

### Diubah
- **Pembaruan Skema Pertanyaan**: Fitur lama "opsi E" dihapus dan dibersihkan dari sistem dengan *cleanup script* (`check_legacy_option_e.py`).
- **Skema Keterangan Paket Tryout**: Atribut `difficulty` pada tabel `t_tryout` dinaikkan limitasinya dari 20 karakter menjadi 150 karakter untuk membebaskan input teks label/keterangan paket ujian (misal: "Kelas Unggulan").

### Diperbaiki
- Sinkronisasi waktu di sisi server (mencatat kapan attempt *start* dan *finish*) untuk secara ketat menolak submisi jawaban yang dilakukan di luar batas *duration_minutes* yang sah.
