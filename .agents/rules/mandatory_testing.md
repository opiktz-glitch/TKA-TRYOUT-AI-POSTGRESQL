# MANDATORY TESTING & VERIFICATION POLICY

## Prioritas Utama: Zero-Error Guarantee
Setiap kali ada pembaruan kode, penambahan fitur, perbaikan bug, atau perubahan konfigurasi di aplikasi ini:
1. **Wajib Menjalankan Tes yang Terdampak**:
   - Jika mengubah **Frontend**:
     - Wajib jalankan `npm run build` di folder `frontend/` untuk memastikan tidak ada error kompilasi, JSX syntax error, atau broken imports.
     - Pastikan aturan Rules of Hooks dipatuhi dan tidak ada error lint yang memblokir.
   - Jika mengubah **Backend / Database / Logika Bisnis**:
     - Wajib jalankan rangkaian tes terkait menggunakan `backend\venv\Scripts\python -m unittest tests/<test_file>.py` (misal `test_impacted_features.py`, `test_database_migrations.py`, atau `test_backend_api_and_pages.py`).
     - Pastikan query database tidak menimbulkan `UndefinedColumn`, `ProgrammingError`, atau HTTP 500 error.
   - Jika ada **Perubahan Skema / Kolom Baru**:
     - Wajib sertakan mekanisme auto-migration / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` di `backend/main.py` agar database lama (SQLite maupun Neon) tidak mengalami crash.

2. **Verifikasi Sebelum Melaporkan ke Pengguna**:
   - Dilarang menyatakan tugas selesai sebelum tes berhasil dijalankan dan output-nya diverifikasi berstatus `PASS` / `OK` / `Exit code 0`.
   - Laporkan hasil pengujian secara eksplisit kepada pengguna di setiap akhir pengerjaan.
