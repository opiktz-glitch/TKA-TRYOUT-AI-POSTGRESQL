# Panduan Migrasi Database Neon

Dokumen ini menjelaskan cara menerapkan migrasi skema `v06` pada database PostgreSQL di Neon melalui Neon SQL Editor. Migrasi ini menambahkan kolom `is_checked` ke tabel `t_practice_answer` untuk mendukung penyimpanan otomatis jawaban Latihan tanpa membuka kunci jawaban sebelum siswa memeriksanya.

> **Penting:** Migrasikan database Neon yang digunakan backend aplikasi, bukan hanya database yang namanya tampak benar. Pilih project, branch, dan database yang tepat sebelum menjalankan SQL. Jangan menyalin atau membagikan connection string, password, maupun isi file `.env`.

## Status migrasi saat ini

Pengguna mengonfirmasi migrasi Neon telah selesai pada 8 November 2026. Catatan ini merekam konfirmasi tersebut; nilai versi skema dan hasil query verifikasi tidak diperiksa secara langsung. Langkah di bawah tetap menjadi prosedur untuk memverifikasi database yang sudah dimigrasikan atau mengulang proses pada database Neon lain.

## 1. Persiapan

1. Pastikan perubahan aplikasi yang memerlukan `v06` sudah tersedia.
2. Buat backup atau restore point Neon sebelum mengubah skema. Pastikan Anda mengetahui cara memulihkannya; jangan menguji pemulihan pada database aktif.
3. Buka **SQL Editor** pada project, branch, dan database yang akan dimigrasikan.
4. Jalankan pemeriksaan versi berikut:

   ```sql
   SELECT value AS schema_version
   FROM t_app_setting
   WHERE key = 'app:schema_version';
   ```

   Catat hasilnya. Jangan lanjutkan jika tabel tidak ditemukan, query menghasilkan versi yang tidak dikenal, atau versi lebih baru dari `v06`; periksa konfigurasi dan skema terlebih dahulu.

## 2. Terapkan migrasi

### Jika versi saat ini `v05`

Jalankan DDL:

```sql
ALTER TABLE t_practice_answer
    ADD COLUMN IF NOT EXISTS is_checked BOOLEAN NOT NULL DEFAULT TRUE;
```

`DEFAULT TRUE` mempertahankan status jawaban lama sebagai sudah diperiksa. Setelah DDL berhasil, catat versi `v06`:

```sql
INSERT INTO t_app_setting (key, value, updated_at)
VALUES ('app:schema_version', 'v06', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
```

### Jika versi saat ini sudah `v06`

Jangan perlu menjalankan pembaruan versi lagi. Lanjut ke verifikasi untuk memastikan kolom dan tabel tersedia.

### Jika versi saat ini `v04` atau lebih lama

Jangan langsung menjalankan DDL `v06`. Terapkan setiap migrasi yang belum ada secara berurutan (`v04` → `v05` → `v06`) dan catat versi setelah DDL untuk tahap tersebut berhasil. Gunakan prosedur serta SQL lengkap pada bagian [Neon melalui SQL Editor](DEPLOY_TZSERVER.md#migrasi-postgresql-production-neon-dan-tzserver). Berhenti jika struktur database tidak cocok dengan versi yang dilaporkan.

> Jangan mencatat versi `v06` sebelum DDL `v06` berhasil. Jika DDL gagal, jangan jalankan query pencatatan versi; periksa pesan error dan kondisi skema terlebih dahulu.

## 3. Verifikasi

Jalankan query berikut di database yang sama:

```sql
SELECT value AS schema_version
FROM t_app_setting
WHERE key = 'app:schema_version';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = current_schema()
  AND table_name IN (
      't_practice',
      't_practice_question',
      't_practice_attempt',
      't_practice_answer'
  )
ORDER BY table_name;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 't_practice_answer'
  AND column_name = 'is_checked';
```

Pastikan hasil menunjukkan:

- `schema_version` adalah `v06`.
- Ada empat tabel Latihan: `t_practice`, `t_practice_question`, `t_practice_attempt`, dan `t_practice_answer`.
- Kolom `is_checked` tersedia dengan tipe `boolean`, `is_nullable` bernilai `NO`, dan default bernilai `true`.

Jika hasil berbeda, jangan mengubah versi secara manual untuk menyamarkan kondisi skema. Periksa project/branch/database yang dipilih, lalu bandingkan skema dengan migrasi terkait.

## 4. Setelah migrasi

- Terapkan migrasi pada setiap database Neon yang dipakai aplikasi secara terpisah. Versi Neon tidak menunjukkan versi database tzserver.
- Deploy atau aktifkan backend yang membutuhkan `v06` setelah verifikasi berhasil. Backend lama dapat tetap berjalan selama persiapan, tetapi backend baru yang menggunakan fitur simpan otomatis memerlukan kolom ini.
- Setelah perubahan frontend diterapkan, lakukan hard refresh jika browser masih memuat aset lama.
- Jangan memasukkan connection string, password, hasil backup, atau kredensial ke repository.

Untuk prosedur migrasi runner di tzserver dan rincian migrasi versi sebelumnya, lihat [DEPLOY_TZSERVER.md](DEPLOY_TZSERVER.md#migrasi-postgresql-production-neon-dan-tzserver).
