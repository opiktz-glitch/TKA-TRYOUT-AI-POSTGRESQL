# Panduan Berkontribusi (Contributing Guide)

Terima kasih atas minat Anda untuk berkontribusi pada **TKA-AI (TKA Tryout)**! 

Proyek ini bertujuan untuk menyediakan platform *tryout* yang cerdas, aman, dan mudah di-deploy ke berbagai skenario (lokal dengan SQLite, maupun *cloud* dengan PostgreSQL). 

Berikut adalah panduan standar bagi setiap developer yang ingin menyumbang kode pada repositori ini.

## 🛠️ Standar Kode (Code Style)

1. **Python (Backend)**
   - Backend menggunakan arsitektur modular FastAPI. Kami mewajibkan penggunaan *type hints* agar mempermudah pemahaman kode (contoh: `def get_user(db: Session, user_id: int) -> User:`).
   - Pastikan variabel lingkungan (env var) baru didaftarkan juga di `config.py`.
   - Linter: Kami menggunakan **Ruff** untuk analisa dan standarisasi *style* kode (terdapat `.ruff_cache` di repositori). Pastikan untuk menjalankan ruff sebelum melakukan *commit*.
   - Keamanan: Jika menambahkan fitur yang mengambil parameter dari *user input*, selalu manfaatkan model **Pydantic** (`schemas.py`) untuk validasi, dan **JANGAN PERNAH** melakukan eksekusi SQL mentah secara *inline* tanpa proteksi ORM/parameter binding.

2. **React (Frontend)**
   - Gunakan komponen berbasis *Functional Components* (Hooks) standar React 19.
   - Hindari logika *fetching* API yang tercerai-berai; satukan integrasinya ke dalam abstraksi service API (misal di folder `src/services/`).

## 🌿 Aturan Git & Branching

1. Jaga agar branch `main` tetap stabil. Lakukan pekerjaan Anda di branch fitur.
2. Format penamaan *branch*: 
   - `feature/nama-fitur` (contoh: `feature/export-nilai-pdf`)
   - `fix/nama-bug` (contoh: `fix/timer-tryout`)
   - `docs/pembaruan` (contoh: `docs/api-postman`)
3. Tulis pesan komit (commit message) yang deskriptif dan menjelaskan apa (dan mengapa) sesuatu diubah, bukan sekadar "update code".

## 🗄️ Database Migrations

Karena model dan struktur *database* ditangani oleh SQLAlchemy (baik untuk SQLite maupun PostgreSQL):
- Jika Anda menambahkan kolom baru di tabel yang ada di `models.py`, dokumentasikan langkah penambahan skemanya (karena metode `Base.metadata.create_all()` tidak memodifikasi *field* yang sudah ada sebelumnya).
- Usahakan sediakan *script utility* perbaikan mandiri (seperti `check_legacy_option_e.py`) bila ada *breaking change* atau struktur *database* yang drastis berubah pada fitur Anda.

---
*Happy Coding!* 🚀
