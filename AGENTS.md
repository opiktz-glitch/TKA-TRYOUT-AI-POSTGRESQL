# ATURAN PENGEMBANGAN PROYEK TKA TRYOUT AI

## 🚨 PRIORITAS TERTINGGI: WAJIB TESTING SETIAP UPDATE KODE (ZERO ERROR POLICY)
Sesuai instruksi pengguna, **SETIAP KALI** melakukan pembaruan, perubahan logika, penambahan fitur, atau bugfix:

1. **Jalankan Pengujian Otomatis yang Terpengaruh**:
   - **Frontend**:
     - Wajib jalankan verifikasi build: `npm run build` di `frontend/`.
     - Pastikan tidak ada syntax error, broken import, atau pelanggaran React Rules of Hooks.
   - **Backend & Database**:
     - Jika ada logika endpoint atau model data yang diubah, jalankan unit test **WAJIB menggunakan skrip aman**:
       ```
       powershell -ExecutionPolicy Bypass -File backend/scripts/run_tests.ps1
       ```
     - **DILARANG** menjalankan test langsung dengan `python -m unittest` tanpa mengatur `ENV_FILE=".env.test"` terlebih dahulu — ini akan membuat data test masuk ke database **production Neon Tech**.
     - Jika menambah kolom model SQLAlchemy, pastikan fungsi `_auto_migrate_columns_on_startup()` di `backend/main.py` sudah mencakup kolom tersebut agar database remote (seperti Neon Tech) tidak mengalami `UndefinedColumn` error (500).

2. **Dilarang Menyatakan Selesai Tanpa Bukti Test**:
   - Selalu cantumkan hasil eksekusi pengujian (exit code 0 / OK) pada respons akhir ke pengguna.

## 🛡️ PROTEKSI DATABASE PRODUCTION (NEON TECH)
Database production berada di Neon Tech (lihat `backend/.env`). Aturan keras:

- **Testing WAJIB memakai `.env.test`** yang mengarah ke **PostgreSQL lokal** (`localhost:5432/project_tz`), bukan Neon.
- **Gunakan `backend/scripts/run_tests.ps1`** — skrip ini otomatis:
  1. Memvalidasi `.env.test` tidak mengandung URL Neon production.
  2. Set `ENV_FILE=".env.test"` sebelum menjalankan test.
  3. Reset environment setelah selesai.
- **`backend/config.py`** mendukung `ENV_FILE` environment variable — saat testing, `config.py` akan membaca `.env.test` bukan `.env`.
- `.env.test` sudah terdaftar di `.gitignore` (pola `.env.*`) — tidak akan ter-commit ke git.

