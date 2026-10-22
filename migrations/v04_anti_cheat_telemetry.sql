-- =============================================================================
-- Migration v04: Anti-Cheat Telemetry (Pencatatan Pelanggaran Pindah Tab Ujian)
-- Target Table: t_attempt
-- =============================================================================

-- 1. Tambahkan kolom tab_switches_count pada t_attempt jika belum ada
ALTER TABLE t_attempt ADD COLUMN IF NOT EXISTS tab_switches_count INTEGER NOT NULL DEFAULT 0;

-- 2. Beri komentar dokumentasi kolom
COMMENT ON COLUMN t_attempt.tab_switches_count IS 'Jumlah frekuensi siswa terdeteksi berpindah tab/jendela/aplikasi lain saat ujian';
