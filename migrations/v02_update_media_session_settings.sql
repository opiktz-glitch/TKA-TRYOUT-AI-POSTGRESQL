-- ====================================================================
-- MIGRATION v02: Media Soal, Session Tracking & Konfigurasi Dinamis
-- Upgrade: v01 -> v02
-- Dialect: PostgreSQL / Compatible with standard SQL
-- ====================================================================

-- 1. Buat Tabel Pengaturan Aplikasi (t_app_setting)
-- Digunakan untuk menyimpan konfigurasi dinamis (AI provider, secret key rotation)
CREATE TABLE IF NOT EXISTS t_app_setting (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inisialisasi versi schema di t_app_setting
INSERT INTO t_app_setting (key, value, updated_at)
VALUES ('app:schema_version', 'v02', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET value = 'v02', updated_at = CURRENT_TIMESTAMP;

-- 2. Tambah Kolom Media Soal Bergambar ke t_question
ALTER TABLE t_question 
ADD COLUMN IF NOT EXISTS image_data BYTEA;

ALTER TABLE t_question 
ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(50);

-- 3. Tambah Kolom Label Benar-Salah Dinamis ke t_question
-- Memungkinkan pilihan label kustom (Benar/Salah, Sesuai/Tidak Sesuai)
ALTER TABLE t_question 
ADD COLUMN IF NOT EXISTS true_label VARCHAR(50) DEFAULT 'Benar' NOT NULL;

ALTER TABLE t_question 
ADD COLUMN IF NOT EXISTS false_label VARCHAR(50) DEFAULT 'Salah' NOT NULL;

-- 4. Tambah Kolom Single-Session Tracking ke t_user (Anti-Joki)
-- Memastikan 1 akun hanya dapat login aktif di 1 perangkat pada satu waktu
ALTER TABLE t_user 
ADD COLUMN IF NOT EXISTS active_session_id VARCHAR;

ALTER TABLE t_user 
ADD COLUMN IF NOT EXISTS active_session_expires_at TIMESTAMP WITHOUT TIME ZONE;

-- 5. Tambah Bobot Penilaian Per Tipe Soal ke t_tryout
ALTER TABLE t_tryout 
ADD COLUMN IF NOT EXISTS weight_pg FLOAT DEFAULT 40.0;

ALTER TABLE t_tryout 
ADD COLUMN IF NOT EXISTS weight_mcma FLOAT DEFAULT 35.0;

ALTER TABLE t_tryout 
ADD COLUMN IF NOT EXISTS weight_bs FLOAT DEFAULT 25.0;
