-- ====================================================================
-- MIGRATION v01: Initial Schema (Skema Awal Platform TKA Tryout)
-- Dialect: PostgreSQL / Compatible with standard SQL
-- ====================================================================

-- 1. Tabel Pengguna (Sistem Autentikasi Dasar)
CREATE TABLE IF NOT EXISTS t_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    full_name VARCHAR,
    role VARCHAR NOT NULL DEFAULT 'SISWA',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_username ON t_user (username);

-- 2. Tabel Mata Pelajaran
CREATE TABLE IF NOT EXISTS t_subject (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Soal (Versi Awal - Standard Multiple Choice)
CREATE TABLE IF NOT EXISTS t_question (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES t_subject(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    correct_answer VARCHAR(50),
    explanation TEXT,
    points FLOAT DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES t_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Pilihan Jawaban Soal
CREATE TABLE IF NOT EXISTS t_question_option (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES t_question(id) ON DELETE CASCADE,
    option_code VARCHAR(5) NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    CONSTRAINT uq_question_option UNIQUE (question_id, option_code)
);

-- 5. Profil Siswa
CREATE TABLE IF NOT EXISTS t_student (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES t_user(id) ON DELETE CASCADE,
    student_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    school_name VARCHAR(200),
    grade VARCHAR(20),
    class_name VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Profil Guru
CREATE TABLE IF NOT EXISTS t_teacher (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES t_user(id) ON DELETE CASCADE,
    teacher_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    school_name VARCHAR(200),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Paket Ujian / Tryout (Versi Awal)
CREATE TABLE IF NOT EXISTS t_tryout (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject_id INTEGER NOT NULL REFERENCES t_subject(id) ON DELETE CASCADE,
    grade VARCHAR(20),
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_questions INTEGER DEFAULT 0,
    max_score FLOAT DEFAULT 100.0,
    difficulty VARCHAR(20) DEFAULT 'MEDIUM',
    created_by INTEGER NOT NULL REFERENCES t_user(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Relasi Paket Tryout & Butir Soal
CREATE TABLE IF NOT EXISTS t_tryout_question (
    id SERIAL PRIMARY KEY,
    tryout_id INTEGER NOT NULL REFERENCES t_tryout(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES t_question(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    points FLOAT DEFAULT 1.0,
    CONSTRAINT uq_tryout_question UNIQUE (tryout_id, question_id),
    CONSTRAINT uq_tryout_question_number UNIQUE (tryout_id, question_number)
);

-- 9. Sesi Pengerjaan / Ujian Siswa (Attempt)
CREATE TABLE IF NOT EXISTS t_attempt (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES t_student(id) ON DELETE CASCADE,
    tryout_id INTEGER NOT NULL REFERENCES t_tryout(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS',
    score FLOAT,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    unanswered_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Jawaban Butir Soal Per Sesi Attempt
CREATE TABLE IF NOT EXISTS t_answer (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES t_attempt(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES t_question(id) ON DELETE CASCADE,
    selected_option VARCHAR(50),
    is_correct BOOLEAN,
    points_earned FLOAT,
    answered_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attempt_question_answer UNIQUE (attempt_id, question_id)
);

-- 11. Hasil Rekapitulasi Skor (Result)
CREATE TABLE IF NOT EXISTS t_result (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL UNIQUE REFERENCES t_attempt(id) ON DELETE CASCADE,
    total_questions INTEGER NOT NULL,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    unanswered_count INTEGER DEFAULT 0,
    score FLOAT DEFAULT 0.0,
    percentage FLOAT DEFAULT 0.0,
    passed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Notifikasi Pengguna
CREATE TABLE IF NOT EXISTS t_notification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_user(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link VARCHAR(200),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
