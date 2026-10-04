# TKA-AI Backend

Ini adalah layanan backend API untuk platform **TKA-AI (TKA Tryout)**. Backend ini dibangun menggunakan **FastAPI** dan **SQLAlchemy**, serta memiliki tanggung jawab untuk manajemen data, logika ujian/tryout (termasuk timer server-side), dan integrasi AI untuk pembuatan soal.

## 🏗️ Struktur Modul Utama

Di dalam folder `backend`, Anda akan menemukan file-file inti berikut:

- **`main.py`**: Entry point utama aplikasi. Mendefinisikan instance FastAPI, mengatur middleware (CORS), dan me-registrasi semua router API dari folder `routers/`.
- **`config.py`**: Memuat konfigurasi dari file `.env` dan menyediakan nilai default.
- **`database.py`**: Mengatur koneksi SQLAlchemy (mendukung **SQLite** dengan mode WAL maupun **PostgreSQL** dengan *pool pre-ping*).
- **`models.py`**: Definisi skema tabel database (terdapat 12 tabel utama).
- **`schemas.py`**: Definisi model Pydantic untuk validasi *request* dan *response* API.
- **`auth.py`**: Logika autentikasi JWT, validasi kredensial pengguna, hashing password (menggunakan `bcrypt`), dan proteksi rute (*Dependency Injection*).
- **`ai_providers.py` & `ai_vision.py`**: Modul integrasi AI. Menangani komunikasi baik ke Ollama (lokal) maupun Gemini (cloud) untuk tugas pembuatan soal otomatis berdasarkan prompt teks atau visi.
- **`document_parser.py`**: Modul pembantu untuk mengekstrak teks mentah dari file upload seperti `.pdf` atau `.docx` sebelum diproses oleh AI.
- **`backup_service.py`**: Layanan manajemen backup online yang spesifik digunakan saat backend berjalan dalam mode SQLite.

## 🚀 Panduan Menjalankan Spesifik Backend

Biasanya backend dijalankan lewat script `run.py` atau `run_server.py` di root proyek. Namun, jika Anda ingin menjalankannya secara terisolasi (misalnya untuk debugging):

1. Aktifkan *virtual environment*:
   ```bash
   # Windows
   venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```
2. Jalankan Uvicorn secara manual:
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

## 🧠 Integrasi AI (AI Providers)

Proyek ini dirancang secara modular agar *engine* pembuat soal (AI) bisa ditukar sewaktu-waktu:
- Konfigurasi penyedia layanan AI (`AI_PROVIDER`) disimpan secara aman di database (`t_app_setting`) agar Admin bisa merubahnya tanpa perlu merestart server.
- API Key (misalnya untuk Gemini) dienkripsi menggunakan `cryptography.Fernet` sebelum disimpan ke database, sehingga mencegah kebocoran kunci secara kasat mata.
- **Pembahasan Otomatis**: Dilengkapi dengan logika *fallback* & *JSON merging* yang kuat di modul API (lihat `routers/questions.py`) untuk menjamin penjelasan langkah demi langkah (terutama B-S dan PG Kompleks) bisa di- *generate* secara konsisten tanpa terpotong, baik oleh model berkapasitas besar maupun kecil (Ollama).

## 🛡️ Penegakan Keamanan Ujian (Server-side Timer)

Berbeda dengan aplikasi ujian sederhana, perhitungan sisa waktu pengerjaan tryout pada TKA-AI tidak sepenuhnya diserahkan kepada *frontend*. Backend melacak waktu `start_time` di tabel `t_attempt` dan akan secara tegas menolak jawaban (API blokir) jika waktu aktual pengumpulan melebihi jatah durasi (ditambah toleransi *network delay* kecil). Hal ini mencegah Siswa berbuat curang dengan mengutak-atik JavaScript lokal di browser.
