# TKA-AI Backend

Ini adalah layanan backend API untuk platform **TKA-AI (TKA Tryout)**. Backend ini dibangun menggunakan **FastAPI** dan **SQLAlchemy**, serta memiliki tanggung jawab untuk manajemen data, logika ujian/tryout (termasuk timer server-side), dan integrasi AI untuk pembuatan soal.

## 🏗️ Struktur Modul Utama

Di dalam folder `backend`, Anda akan menemukan file-file inti berikut:

- **`main.py`**: Entry point utama aplikasi. Mendefinisikan instance FastAPI, mengatur middleware (CORS), dan me-registrasi semua router API dari folder `routers/`.
- **`config.py`**: Memuat konfigurasi dari file `.env` dan menyediakan nilai default.
- **`database.py`**: Mengatur koneksi SQLAlchemy ke **PostgreSQL** dengan *pool pre-ping*.
- **`models.py`**: Definisi 13 model/tabel database.
- **`schemas.py`**: Definisi model Pydantic untuk validasi *request* dan *response* API.
- **`auth.py`**: Logika autentikasi JWT, validasi kredensial pengguna, hashing password (menggunakan `bcrypt`), dan proteksi rute (*Dependency Injection*).
- **`ai_providers.py` & `ai_vision.py`**: Modul integrasi AI. Menangani komunikasi baik ke Ollama (lokal) maupun Gemini (cloud) untuk tugas pembuatan soal otomatis berdasarkan prompt teks atau visi.
- **`document_parser.py`**: Modul pembantu untuk mengekstrak teks mentah dari file upload seperti `.pdf` atau `.docx` sebelum diproses oleh AI.

## 🚀 Panduan Menjalankan Spesifik Backend

### Instalasi awal

Dari folder `backend`:

```powershell
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Pastikan `SECRET_KEY` di `.env` terisi dengan nilai acak yang kuat. Buat nilainya dengan:

```powershell
venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(64))"
```

Masukkan hasilnya ke `SECRET_KEY` pada `.env`. `DATABASE_URL` wajib menunjuk ke PostgreSQL; backend tidak membuat database lokal berbasis SQLite. Jangan menimpa `.env` yang telah memiliki konfigurasi dan jangan membagikannya.

Backup dan pemulihan dikelola melalui layanan PostgreSQL/provider atau prosedur PostgreSQL operator; backend tidak menyediakan fitur backup/restore.

Jika masih ada data lama dalam file SQLite, `scripts/migrate_sqlite_to_postgres.py` adalah alat impor satu kali ke PostgreSQL yang kosong. Alat tersebut bukan dukungan database runtime; simpan salinan sumber dan verifikasi hasil migrasi sebelum melanjutkan pemakaian.

### Menjalankan backend saja

Biasanya backend dijalankan bersama frontend lewat `run.py` atau `run_server.py` dari root proyek. Untuk menjalankannya sendiri saat debugging:

1. Aktifkan *virtual environment* (atau gunakan executable Python di dalamnya):
   ```bash
   # Windows
   venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```
2. Dari folder `backend`, jalankan Uvicorn:
   ```bash
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

Tes backend dapat menulis ke database yang dibaca dari konfigurasi. `scripts/run_tests.ps1` saat ini membaca `.env` dan belum memvalidasi database tes; jangan arahkan tes ke database production.

## 🧠 Integrasi AI (AI Providers)

Proyek ini dirancang secara modular agar *engine* pembuat soal (AI) bisa ditukar sewaktu-waktu:
- Pemilihan provider serta konfigurasi yang dikelola aplikasi disimpan di database (`t_app_setting`) agar Admin dapat mengubahnya melalui Pengaturan.
- API Key (misalnya untuk Gemini) dienkripsi menggunakan `cryptography.Fernet` sebelum disimpan ke database, sehingga mencegah kebocoran kunci secara kasat mata.
- **Pembahasan Otomatis**: Dilengkapi dengan logika *fallback* & *JSON merging* yang kuat di modul API (lihat `routers/questions.py`) untuk menjamin penjelasan langkah demi langkah (terutama B-S dan PG Kompleks) bisa di- *generate* secara konsisten tanpa terpotong, baik oleh model berkapasitas besar maupun kecil (Ollama).

## 🛡️ Penegakan Keamanan Ujian (Server-side Timer)

Perhitungan waktu pengerjaan tidak diserahkan hanya kepada *frontend*. Backend melacak waktu mulai attempt pada `t_attempt` dan memvalidasi batas durasi ketika request pengerjaan dikirimkan. Timer browser hanya membantu tampilan dan pengiriman di sisi pengguna; koneksi jaringan dibutuhkan untuk menyimpan jawaban.
