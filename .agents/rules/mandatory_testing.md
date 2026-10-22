# MANDATORY TESTING & VERIFICATION POLICY

## Prioritas Utama: Zero-Error Guarantee
Setiap kali ada pembaruan kode, penambahan fitur, perbaikan bug, atau perubahan konfigurasi di aplikasi ini:

1. **Wajib Menjalankan Tes yang Terdampak**:
   - Jika mengubah **Frontend**:
     - Wajib jalankan `npm run build` di folder `frontend/` untuk memastikan tidak ada error kompilasi, JSX syntax error, atau broken imports.
     - Pastikan aturan Rules of Hooks dipatuhi dan tidak ada error lint yang memblokir.
   - Jika mengubah **Backend / Database / Logika Bisnis**:
     - Wajib jalankan test menggunakan skrip:
       ```powershell
       powershell -ExecutionPolicy Bypass -File backend/scripts/run_tests.ps1
       ```
     - Pastikan query database tidak menimbulkan `UndefinedColumn`, `ProgrammingError`, atau HTTP 500 error.
   - Jika ada **Perubahan Skema / Kolom Baru**:
     - Wajib sertakan mekanisme auto-migration / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` di `backend/main.py` agar database lama tidak mengalami crash.

2. **Kebijakan Data Test di Neon Tech Production**:
   - Database production Neon Tech dipakai untuk testing (konfigurasi di `backend/.env`).
   - **Setiap unit test WAJIB membersihkan data-nya sendiri** via `tearDown()` atau `addCleanup()`.
   - Gunakan prefix `test_` pada data test agar mudah diidentifikasi jika cleanup gagal.
   - `backend/config.py` mendukung `ENV_FILE` env var untuk menggunakan file `.env` alternatif jika diperlukan.

3. **Verifikasi Sebelum Melaporkan ke Pengguna**:
   - Dilarang menyatakan tugas selesai sebelum tes berhasil dijalankan dan output-nya diverifikasi berstatus `PASS` / `OK` / `Exit code 0`.
   - Laporkan hasil pengujian secara eksplisit kepada pengguna di setiap akhir pengerjaan.
