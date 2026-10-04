
CREATE TABLE t_app_setting (
	key VARCHAR NOT NULL, 
	value VARCHAR NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (key)
)

;


CREATE TABLE t_subject (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	description VARCHAR(500), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (code)
)

;


CREATE TABLE t_user (
	id SERIAL NOT NULL, 
	username VARCHAR NOT NULL, 
	password_hash VARCHAR NOT NULL, 
	full_name VARCHAR, 
	role VARCHAR NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	active_session_id VARCHAR, 
	active_session_expires_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
)

;


CREATE TABLE t_notification (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	message TEXT, 
	link VARCHAR(200), 
	is_read BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES t_user (id)
)

;


CREATE TABLE t_question (
	id SERIAL NOT NULL, 
	subject_id INTEGER NOT NULL, 
	question_text TEXT NOT NULL, 
	question_type VARCHAR(30) NOT NULL, 
	difficulty VARCHAR(20) NOT NULL, 
	true_label VARCHAR(50) NOT NULL, 
	false_label VARCHAR(50) NOT NULL, 
	correct_answer VARCHAR(50), 
	explanation TEXT, 
	points FLOAT, 
	is_active BOOLEAN, 
	created_by INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	image_data BYTEA, 
	image_mime_type VARCHAR(50), 
	PRIMARY KEY (id), 
	FOREIGN KEY(subject_id) REFERENCES t_subject (id), 
	FOREIGN KEY(created_by) REFERENCES t_user (id)
)

;


CREATE TABLE t_student (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	student_code VARCHAR(50) NOT NULL, 
	full_name VARCHAR(150) NOT NULL, 
	school_name VARCHAR(200), 
	grade VARCHAR(20), 
	class_name VARCHAR(50), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES t_user (id), 
	UNIQUE (student_code)
)

;


CREATE TABLE t_teacher (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	teacher_code VARCHAR(50) NOT NULL, 
	full_name VARCHAR(150) NOT NULL, 
	school_name VARCHAR(200), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES t_user (id), 
	UNIQUE (teacher_code)
)

;


CREATE TABLE t_tryout (
	id SERIAL NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	description TEXT, 
	subject_id INTEGER NOT NULL, 
	grade VARCHAR(20), 
	duration_minutes INTEGER NOT NULL, 
	total_questions INTEGER, 
	max_score FLOAT, 
	weight_pg FLOAT, 
	weight_mcma FLOAT, 
	weight_bs FLOAT, 
	difficulty VARCHAR(150), 
	created_by INTEGER NOT NULL, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(subject_id) REFERENCES t_subject (id), 
	FOREIGN KEY(created_by) REFERENCES t_user (id)
)

;


CREATE TABLE t_attempt (
	id SERIAL NOT NULL, 
	student_id INTEGER NOT NULL, 
	tryout_id INTEGER NOT NULL, 
	started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	finished_at TIMESTAMP WITHOUT TIME ZONE, 
	status VARCHAR(20), 
	score FLOAT, 
	correct_count INTEGER, 
	wrong_count INTEGER, 
	unanswered_count INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES t_student (id), 
	FOREIGN KEY(tryout_id) REFERENCES t_tryout (id)
)

;


CREATE TABLE t_question_option (
	id SERIAL NOT NULL, 
	question_id INTEGER NOT NULL, 
	option_code VARCHAR(5) NOT NULL, 
	option_text TEXT NOT NULL, 
	is_correct BOOLEAN, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_question_option UNIQUE (question_id, option_code), 
	FOREIGN KEY(question_id) REFERENCES t_question (id)
)

;


CREATE TABLE t_tryout_question (
	id SERIAL NOT NULL, 
	tryout_id INTEGER NOT NULL, 
	question_id INTEGER NOT NULL, 
	question_number INTEGER NOT NULL, 
	points FLOAT, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_tryout_question UNIQUE (tryout_id, question_id), 
	CONSTRAINT uq_tryout_question_number UNIQUE (tryout_id, question_number), 
	FOREIGN KEY(tryout_id) REFERENCES t_tryout (id), 
	FOREIGN KEY(question_id) REFERENCES t_question (id)
)

;


CREATE TABLE t_answer (
	id SERIAL NOT NULL, 
	attempt_id INTEGER NOT NULL, 
	question_id INTEGER NOT NULL, 
	selected_option VARCHAR(50), 
	is_correct BOOLEAN, 
	points_earned FLOAT, 
	answered_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_attempt_question_answer UNIQUE (attempt_id, question_id), 
	FOREIGN KEY(attempt_id) REFERENCES t_attempt (id), 
	FOREIGN KEY(question_id) REFERENCES t_question (id)
)

;


CREATE TABLE t_result (
	id SERIAL NOT NULL, 
	attempt_id INTEGER NOT NULL, 
	total_questions INTEGER NOT NULL, 
	correct_count INTEGER, 
	wrong_count INTEGER, 
	unanswered_count INTEGER, 
	score FLOAT, 
	percentage FLOAT, 
	passed BOOLEAN, 
	completed_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (attempt_id), 
	FOREIGN KEY(attempt_id) REFERENCES t_attempt (id)
)

;

