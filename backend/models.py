from datetime import datetime

from database import Base
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import relationship

# =========================================================
# USER
# =========================================================

class User(Base):
    __tablename__ = "t_user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)

    role = Column(
        String,
        nullable=False,
        default="SISWA"
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    # =========================================================
    # SESI LOGIN AKTIF (single-session enforcement)
    #
    # Dipakai supaya 1 akun cuma bisa dipakai login di SATU
    # tempat pada satu waktu — mencegah joki/berbagi akun saat
    # tryout. Diisi ulang tiap kali login berhasil (lihat
    # routers/auth.py: login()), dan dicocokkan ke klaim "sid"
    # di dalam JWT pada SETIAP request (lihat dependencies.py:
    # get_current_user()) — bukan cuma dipercaya dari isi token,
    # supaya sesi lama benar-benar bisa "dicabut" sebelum token-
    # nya sendiri kedaluwarsa (mis. lewat tombol Logout, atau
    # tombol 'Paksa Logout' oleh ADMIN).
    #
    # active_session_expires_at SENGAJA disimpan terpisah dari
    # masa berlaku token JWT-nya sendiri: dipakai login() untuk
    # tahu apakah sesi yang tercatat di sini masih "hidup" atau
    # sudah kedaluwarsa dengan sendirinya (sehingga login baru
    # boleh lewat tanpa perlu menunggu ADMIN memaksa logout).
    # =========================================================

    active_session_id = Column(
        String,
        nullable=True
    )

    active_session_expires_at = Column(
        DateTime,
        nullable=True
    )


# =========================================================
# STUDENT
# =========================================================

class Student(Base):
    __tablename__ = "t_student"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("t_user.id"),
        unique=True,
        nullable=False
    )

    student_code = Column(
        String(50),
        unique=True,
        nullable=False
    )

    full_name = Column(
        String(150),
        nullable=False
    )

    school_name = Column(
        String(200),
        nullable=True
    )

    grade = Column(
        String(20),
        nullable=True
    )

    class_name = Column(
        String(50),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================================================
# TEACHER
# =========================================================

class Teacher(Base):
    __tablename__ = "t_teacher"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("t_user.id"),
        unique=True,
        nullable=False
    )

    teacher_code = Column(
        String(50),
        unique=True,
        nullable=False
    )

    full_name = Column(
        String(150),
        nullable=False
    )

    school_name = Column(
        String(200),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================================================
# SUBJECT
# =========================================================

class Subject(Base):
    __tablename__ = "t_subject"

    id = Column(Integer, primary_key=True, index=True)

    code = Column(
        String(50),
        unique=True,
        nullable=False
    )

    name = Column(
        String(100),
        nullable=False
    )

    description = Column(
        String(500),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================================================
# QUESTION
# =========================================================

class Question(Base):
    __tablename__ = "t_question"

    id = Column(Integer, primary_key=True, index=True)

    subject_id = Column(
        Integer,
        ForeignKey("t_subject.id"),
        nullable=False
    )

    question_text = Column(
        Text,
        nullable=False
    )

    question_type = Column(
        String(30),
        nullable=False,
        default="MULTIPLE_CHOICE"
    )

    difficulty = Column(
        String(20),
        nullable=False,
        default="MEDIUM"
    )

    # Ada di database versi terbaru
    correct_answer = Column(
        String(50),
        nullable=True
    )

    explanation = Column(
        Text,
        nullable=True
    )

    points = Column(
        Float,
        default=1
    )

    is_active = Column(
        Boolean,
        default=True
    )

    created_by = Column(
        Integer,
        ForeignKey("t_user.id"),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    # =====================================================
    # GAMBAR SOAL (opsional) — HANYA di pertanyaan, TIDAK di
    # opsi jawaban (keputusan sengaja, per diskusi fitur ini).
    #
    # image_data: bytes mentah gambar, SUDAH dikonversi ke WebP
    # & di-resize server-side sebelum sampai sini (lihat
    # image_service.py) — bukan file asli upload guru apa
    # adanya. LargeBinary -> kolom BYTEA di Postgres, BLOB di
    # SQLite; SQLAlchemy otomatis konversi ke/dari `bytes`
    # Python, tidak perlu encoding manual (base64 dsb) di kode
    # aplikasi.
    #
    # image_mime_type: praktis selalu "image/webp" (karena semua
    # upload dikonversi paksa ke WebP di image_service.py), tapi
    # tetap disimpan eksplisit alih-alih di-hardcode di banyak
    # tempat, jaga-jaga kalau format lain perlu didukung nanti.
    #
    # Keduanya nullable=True -- mayoritas soal tidak pakai
    # gambar sama sekali.
    # =====================================================
    image_data = Column(
        LargeBinary,
        nullable=True
    )

    image_mime_type = Column(
        String(50),
        nullable=True
    )

    @property
    def has_image(self) -> bool:
        """Dipakai QuestionResponse (lihat schemas.py) -- list/detail
        soal biasa cuma perlu tahu ADA/TIDAKNYA gambar, bukan ikut
        membawa bytes gambar (berat kalau dikalikan puluhan soal
        sekaligus). Bytes-nya sendiri baru diambil lewat endpoint
        terpisah GET /api/questions/{id}/image, dipanggil browser
        langsung lewat <img src="...">."""
        return self.image_data is not None

    options = relationship(
        "QuestionOption",
        cascade="all, delete-orphan",
        order_by="QuestionOption.option_code"
    )


# =========================================================
# QUESTION OPTION
# =========================================================

class QuestionOption(Base):
    __tablename__ = "t_question_option"

    id = Column(Integer, primary_key=True, index=True)

    question_id = Column(
        Integer,
        ForeignKey("t_question.id"),
        nullable=False
    )

    option_code = Column(
        String(5),
        nullable=False
    )

    option_text = Column(
        Text,
        nullable=False
    )

    is_correct = Column(
        Boolean,
        default=False
    )

    __table_args__ = (
        UniqueConstraint(
            "question_id",
            "option_code",
            name="uq_question_option"
        ),
    )


# =========================================================
# TRYOUT
# =========================================================

class Tryout(Base):
    __tablename__ = "t_tryout"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(
        String(200),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    subject_id = Column(
        Integer,
        ForeignKey("t_subject.id"),
        nullable=False
    )

    grade = Column(
        String(20),
        nullable=True
    )

    duration_minutes = Column(
        Integer,
        nullable=False
    )

    total_questions = Column(
        Integer,
        default=0
    )

    max_score = Column(
        Float,
        default=100
    )

    # Awalnya field ini untuk tingkat kesulitan (EASY/MEDIUM/HARD),
    # sekarang dipakai sebagai "Keterangan" bebas untuk paket tryout
    # (mis. "Kelas Unggulan", "Paket A"). Nama kolom & atribut TIDAK
    # diganti supaya tidak perlu migrasi DB — cukup nilai yang
    # disimpan berubah jadi teks bebas. Panjang dinaikkan dari 20
    # jadi 150 karakter (SQLite sendiri tidak menegakkan batas ini,
    # jadi aman tanpa migrasi; batas 150 ditegakkan di validasi
    # aplikasi, lihat routers/tryouts.py).
    difficulty = Column(
        String(150),
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey("t_user.id"),
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================================================
# TRYOUT QUESTION
# =========================================================

class TryoutQuestion(Base):
    __tablename__ = "t_tryout_question"

    id = Column(Integer, primary_key=True, index=True)

    tryout_id = Column(
        Integer,
        ForeignKey("t_tryout.id"),
        nullable=False
    )

    question_id = Column(
        Integer,
        ForeignKey("t_question.id"),
        nullable=False
    )

    question_number = Column(
        Integer,
        nullable=False
    )

    points = Column(
        Float,
        default=1
    )

    __table_args__ = (
        UniqueConstraint(
            "tryout_id",
            "question_id",
            name="uq_tryout_question"
        ),

        UniqueConstraint(
            "tryout_id",
            "question_number",
            name="uq_tryout_question_number"
        ),
    )


# =========================================================
# ATTEMPT
# =========================================================

class Attempt(Base):
    __tablename__ = "t_attempt"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("t_student.id"),
        nullable=False
    )

    tryout_id = Column(
        Integer,
        ForeignKey("t_tryout.id"),
        nullable=False
    )

    started_at = Column(
        DateTime,
        nullable=False
    )

    finished_at = Column(
        DateTime,
        nullable=True
    )

    status = Column(
        String(20),
        default="IN_PROGRESS"
    )

    score = Column(
        Float,
        nullable=True
    )

    correct_count = Column(
        Integer,
        default=0
    )

    wrong_count = Column(
        Integer,
        default=0
    )

    unanswered_count = Column(
        Integer,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    # =====================================================
    # CEGAH RACE CONDITION: DUA ATTEMPT AKTIF BERSAMAAN
    #
    # Endpoint start_tryout() (routers/student.py) sebelumnya
    # hanya CEK dulu ("apakah sudah ada attempt IN_PROGRESS?")
    # baru INSERT kalau tidak ada — pola check-then-act ini
    # tidak aman kalau dua request datang nyaris bersamaan
    # (double-klik tombol mulai, atau dua tab dibuka
    # bersamaan): keduanya bisa lolos pengecekan sebelum
    # salah satu sempat commit, menghasilkan DUA baris
    # IN_PROGRESS untuk siswa+tryout yang sama dan
    # mengacaukan nilai/riwayat (attempt mana yang "asli").
    #
    # Index unik PARSIAL di bawah ini menegakkan di level
    # database: untuk kombinasi (student_id, tryout_id) yang
    # sama, HANYA BOLEH ADA SATU baris dengan
    # status='IN_PROGRESS' pada satu waktu. Sengaja dibuat
    # parsial (pakai *_where, bukan UniqueConstraint biasa)
    # supaya siswa tetap boleh mengerjakan ulang (retake)
    # tryout yang sama berkali-kali — banyak baris dengan
    # status='SUBMITTED' untuk pasangan yang sama tetap sah,
    # yang dilarang cuma dua IN_PROGRESS sekaligus.
    #
    # Kalau dua request tetap lolos race di level aplikasi,
    # SQLite/PostgreSQL akan menolak INSERT kedua dengan
    # IntegrityError — start_tryout() menangkap ini dan
    # mengambil ulang baris yang menang, bukan menampilkan
    # error 500 ke siswa.
    #
    # PENTING — MIGRASI DATABASE YANG SUDAH ADA:
    # Base.metadata.create_all() TIDAK menambahkan index baru
    # ke tabel yang sudah ada sebelumnya (hanya membuat tabel
    # yang belum ada). Untuk database project_tz.db yang sudah
    # berjalan, index ini perlu dibuat manual sekali lewat SQL:
    #   CREATE UNIQUE INDEX uq_attempt_active_per_student_tryout
    #   ON t_attempt (student_id, tryout_id)
    #   WHERE status = 'IN_PROGRESS';
    # Instalasi baru (database baru) otomatis mendapat index
    # ini lewat create_all() seperti biasa.
    # =====================================================

    __table_args__ = (
        Index(
            "uq_attempt_active_per_student_tryout",
            "student_id",
            "tryout_id",
            unique=True,
            sqlite_where=text("status = 'IN_PROGRESS'"),
            postgresql_where=text("status = 'IN_PROGRESS'"),
        ),
    )


# =========================================================
# ANSWER
# =========================================================

class Answer(Base):
    __tablename__ = "t_answer"

    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(
        Integer,
        ForeignKey("t_attempt.id"),
        nullable=False
    )

    question_id = Column(
        Integer,
        ForeignKey("t_question.id"),
        nullable=False
    )

    selected_option = Column(
        String(50),
        nullable=True
    )

    is_correct = Column(
        Boolean,
        nullable=True
    )

    points_earned = Column(
        Float,
        nullable=True
    )

    answered_at = Column(
        DateTime,
        nullable=True
    )

    __table_args__ = (
        UniqueConstraint(
            "attempt_id",
            "question_id",
            name="uq_attempt_question_answer"
        ),
    )


# =========================================================
# RESULT
# =========================================================

class Result(Base):
    __tablename__ = "t_result"

    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(
        Integer,
        ForeignKey("t_attempt.id"),
        unique=True,
        nullable=False
    )

    total_questions = Column(
        Integer,
        nullable=False
    )

    correct_count = Column(
        Integer,
        default=0
    )

    wrong_count = Column(
        Integer,
        default=0
    )

    unanswered_count = Column(
        Integer,
        default=0
    )

    score = Column(
        Float,
        default=0
    )

    percentage = Column(
        Float,
        default=0
    )

    passed = Column(
        Boolean,
        default=False
    )

    completed_at = Column(
        DateTime,
        nullable=True
    )


# =========================================================
# NOTIFICATION
#
# Tabel notifikasi generik lintas role (admin/guru/siswa). Dipicu
# server-side dari finalize_attempt() di routers/student.py setiap
# ada siswa menyelesaikan tryout -- bukan dari halaman frontend
# manapun, jadi tidak perlu mengubah kode di frontend/src/pages/.
# =========================================================

class Notification(Base):
    __tablename__ = "t_notification"

    id = Column(Integer, primary_key=True, index=True)

    # Penerima notifikasi -- t_user.id (bisa admin/guru/siswa,
    # tergantung siapa yang seharusnya menerima notifikasi ini).
    user_id = Column(
        Integer,
        ForeignKey("t_user.id"),
        nullable=False,
        index=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    message = Column(
        Text,
        nullable=True
    )

    # Path frontend (mis. "/student/history") yang dibuka kalau
    # notifikasi ini diklik. Nullable -- boleh kosong kalau
    # notifikasi cuma informasi tanpa tujuan klik tertentu.
    link = Column(
        String(200),
        nullable=True
    )

    is_read = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================================================
# APP SETTING
#
# Tabel key-value generik untuk pengaturan yang bisa diubah
# admin lewat aplikasi (mis. model Ollama yang aktif), tanpa
# perlu edit file .env atau restart server. Kalau sebuah key
# tidak ada barisnya di sini, backend fallback ke default dari
# environment variable (lihat config.py).
# =========================================================

class AppSetting(Base):
    __tablename__ = "t_app_setting"

    key = Column(String, primary_key=True)

    value = Column(String, nullable=False)

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )