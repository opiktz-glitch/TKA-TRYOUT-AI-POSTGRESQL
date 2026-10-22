-- ====================================================================
-- MIGRATION v03: Concurrency Protection, Performance Indexing & PGK Optimization
-- Upgrade: v02 -> v03
-- Dialect: PostgreSQL
-- ====================================================================

-- 1. Perluas Kolom Keterangan / Tingkat Kesulitan Paket Tryout
-- Memperluas VARCHAR(20) menjadi VARCHAR(150) agar admin/guru bebas mengisi
-- keterangan paket (misal: "Kelas Unggulan", "Simulasi UTBK Mandiri 2026")
ALTER TABLE t_tryout 
ALTER COLUMN difficulty TYPE VARCHAR(150);

-- 2. Concurrency Guard: Partial Unique Index Anti-Race Condition
-- Mencegah seorang siswa memiliki lebih dari SATU attempt aktif (IN_PROGRESS)
-- secara bersamaan untuk tryout yang sama (misal akibat double click / multi tab)
CREATE UNIQUE INDEX IF NOT EXISTS uq_attempt_active_per_student_tryout
ON t_attempt (student_id, tryout_id)
WHERE status = 'IN_PROGRESS';

-- 3. Optimalisasi Indexing Performa (Query & Foreign Keys)
CREATE INDEX IF NOT EXISTS idx_question_subject_id 
ON t_question (subject_id);

CREATE INDEX IF NOT EXISTS idx_attempt_student_tryout 
ON t_attempt (student_id, tryout_id);

CREATE INDEX IF NOT EXISTS idx_answer_attempt_id 
ON t_answer (attempt_id);

CREATE INDEX IF NOT EXISTS idx_result_attempt_id 
ON t_result (attempt_id);

CREATE INDEX IF NOT EXISTS idx_notification_user_unread 
ON t_notification (user_id, is_read);

-- 4. Update Versi Schema Aplikasi ke v03
INSERT INTO t_app_setting (key, value, updated_at)
VALUES ('app:schema_version', 'v03', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET value = 'v03', updated_at = CURRENT_TIMESTAMP;
