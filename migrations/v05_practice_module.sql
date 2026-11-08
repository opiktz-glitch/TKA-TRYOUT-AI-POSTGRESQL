CREATE TABLE IF NOT EXISTS t_practice (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject_id INTEGER NOT NULL REFERENCES t_subject(id),
    created_by INTEGER NOT NULL REFERENCES t_user(id),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    shuffle_questions BOOLEAN NOT NULL DEFAULT TRUE,
    shuffle_options BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_practice_status_subject
    ON t_practice (status, subject_id);
CREATE INDEX IF NOT EXISTS idx_practice_created_by
    ON t_practice (created_by);

CREATE TABLE IF NOT EXISTS t_practice_question (
    id SERIAL PRIMARY KEY,
    practice_id INTEGER NOT NULL REFERENCES t_practice(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES t_question(id) ON DELETE RESTRICT,
    question_number INTEGER NOT NULL,
    CONSTRAINT uq_practice_question UNIQUE (practice_id, question_id),
    CONSTRAINT uq_practice_question_number UNIQUE (practice_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_practice_question_question_id
    ON t_practice_question (question_id);

CREATE TABLE IF NOT EXISTS t_practice_attempt (
    id SERIAL PRIMARY KEY,
    practice_id INTEGER NOT NULL REFERENCES t_practice(id) ON DELETE RESTRICT,
    student_id INTEGER NOT NULL REFERENCES t_student(id),
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    question_order TEXT NOT NULL,
    option_order TEXT NOT NULL,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    unanswered_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_attempt_active_student
    ON t_practice_attempt (practice_id, student_id)
    WHERE status = 'IN_PROGRESS';
CREATE INDEX IF NOT EXISTS idx_practice_attempt_practice
    ON t_practice_attempt (practice_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempt_student
    ON t_practice_attempt (student_id);

CREATE TABLE IF NOT EXISTS t_practice_answer (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES t_practice_attempt(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES t_question(id) ON DELETE RESTRICT,
    selected_option TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_practice_answer UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_answer_attempt
    ON t_practice_answer (attempt_id);
