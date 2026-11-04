# TKA-AI (TKA Tryout) - Frontend

Ini adalah antarmuka pengguna (frontend) untuk proyek **TKA-AI (TKA Tryout)**, sebuah platform ujian/tryout online berbasis sekolah.

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)

## 📂 Struktur Utama Frontend

- `src/pages/` - Halaman utama berdasarkan peran (Admin, Guru, Siswa)
- `src/components/` - Komponen UI yang dapat digunakan kembali (Sidebar, Header, Modal, dll)
- `src/auth/` - Konteks dan manajemen autentikasi pengguna
- `src/services/api.js` - Konfigurasi dan wrapper untuk pemanggilan API ke Backend

## 🛠️ Persiapan dan Instalasi

Pastikan Anda telah menginstal **Node.js `^20.19.0` atau `>=22.12.0`** dan **npm** (sesuai kebutuhan Vite 8).

1. Masuk ke direktori frontend (jika belum):
   ```bash
   cd frontend
   ```

2. Instal semua dependensi:
   ```bash
   npm ci
   ```

3. (Opsional) Konfigurasi URL API:
   Secara default, frontend mengarahkan request API ke hostname yang sama dengan halaman pada port `8000`. Jika API berada pada hostname berbeda, atur `VITE_API_URL` pada environment build Vite (misalnya di `frontend/.env`) sebelum menjalankan build.

## 🏃‍♂️ Menjalankan Aplikasi (Mode Development)

Untuk menjalankan server pengembangan (development server) secara mandiri:

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`. 
*(Pastikan backend FastAPI Anda juga berjalan agar login dan pengambilan data berfungsi dengan baik).*

Anda juga dapat menjalankan frontend dan backend secara bersamaan menggunakan skrip `run.py` atau `run_server.py` yang ada di root direktori proyek.

## 📦 Build untuk Produksi

Untuk mem-build (mengkompilasi) aplikasi menjadi versi produksi (file statis):

```bash
npm run build
```

Hasil build akan berada di dalam folder `dist/`. Folder ini nantinya dapat disajikan menggunakan web server statis seperti Nginx (seperti yang dikonfigurasi dalam `docker-compose.yml` proyek ini).
