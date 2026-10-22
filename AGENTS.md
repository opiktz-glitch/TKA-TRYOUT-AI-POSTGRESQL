# ATURAN PENGEMBANGAN PROYEK TKA TRYOUT AI

## 🚨 PRIORITAS TERTINGGI: WAJIB TESTING SETIAP UPDATE KODE (ZERO ERROR POLICY)
Sesuai instruksi pengguna, **SETIAP KALI** melakukan pembaruan, perubahan logika, penambahan fitur, atau bugfix:

1. **Jalankan Pengujian Otomatis yang Terpengaruh**:
   - **Frontend**:
     - Wajib jalankan verifikasi build: `npm run build` di `frontend/`.
     - Pastikan tidak ada syntax error, broken import, atau pelanggaran React Rules of Hooks.
   - **Backend & Database**:
     - Jika ada logika endpoint atau model data yang diubah, jalankan unit test terkait menggunakan:
       `backend\venv\Scripts\python -m unittest tests/test_backend_api_and_pages.py` atau `test_impacted_features.py`.
     - Jika menambah kolom model SQLAlchemy, pastikan fungsi `_auto_migrate_columns_on_startup()` di `backend/main.py` sudah mencakup kolom tersebut agar database remote (seperti Neon Tech) tidak mengalami `UndefinedColumn` error (500).

2. **Dilarang Menyatakan Selesai Tanpa Bukti Test**:
   - Selalu cantumkan hasil eksekusi pengujian (exit code 0 / OK) pada respons akhir ke pengguna.
