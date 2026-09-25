from attempt_utils import compute_attempt_numbers
from database import get_db
from dependencies import require_role
from fastapi import APIRouter, Depends, HTTPException
from models import (
    Answer,
    Attempt,
    Question,
    Result,
    Student,
    Subject,
    Teacher,
    Tryout,
    TryoutQuestion,
    User,
)
from schemas import TeacherProfileUpdate
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

router = APIRouter(
    prefix="/api/teacher",
    tags=["Teacher"],
)


# ============================================================
# HELPER
# ============================================================

def get_teacher(
    current_user: User,
    db: Session,
):
    """
    Mengambil data t_teacher berdasarkan user yang sedang login.

    Baris t_teacher biasanya sudah dibuat admin lewat menu Data
    Guru saat akun GURU dibuat. Tapi supaya menu "Profil" tetap
    jalan walau baris itu entah kenapa belum ada (mis. akun lama),
    dibuat otomatis di sini alih-alih mengembalikan 404 -- sama
    seperti pola get_student() di routers/student.py.
    """

    if current_user.role != "GURU":
        raise HTTPException(
            status_code=403,
            detail="Endpoint ini hanya untuk guru",
        )

    teacher = (
        db.query(Teacher)
        .filter(Teacher.user_id == current_user.id)
        .first()
    )

    if teacher:
        return teacher

    # -----------------------------------------------------
    # Buat profil guru otomatis
    #
    # teacher_code di sini cuma placeholder, dikasih prefix
    # "AUTO-" yang jelas beda dari kode yang diketik manual
    # admin lewat menu "Tambah Guru", supaya tidak diam-diam
    # bentrok.
    # -----------------------------------------------------

    base_code = f"AUTO-{current_user.id:06d}"
    teacher_code = base_code

    attempt_suffix = 1

    while (
        db.query(Teacher)
        .filter(Teacher.teacher_code == teacher_code)
        .first()
    ):
        attempt_suffix += 1
        teacher_code = f"{base_code}-{attempt_suffix}"

        if attempt_suffix > 20:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Gagal membuat profil guru otomatis "
                    "(kode guru terus bentrok). Hubungi admin "
                    "untuk membuat profil guru secara manual."
                ),
            )

    teacher = Teacher(
        user_id=current_user.id,
        teacher_code=teacher_code,
        full_name=current_user.full_name or current_user.username,
    )

    db.add(teacher)

    try:
        db.commit()

    except IntegrityError:

        # Race condition: request lain berhasil insert duluan.
        # Ambil ulang baris yang sudah ada alih-alih 500 ke user.

        db.rollback()

        teacher = (
            db.query(Teacher)
            .filter(Teacher.user_id == current_user.id)
            .first()
        )

        if not teacher:
            raise

        return teacher

    db.refresh(teacher)

    return teacher


# ============================================================
# GET PROFIL GURU (SELF-SERVICE)
# ============================================================

@router.get("/profile")
def get_my_teacher_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("GURU")),
):
    """
    Mengambil data profil guru yang sedang login, untuk menu
    "Profil" -- tampilannya disamakan dengan tab "Profil Saya"
    milik admin.
    """

    teacher = get_teacher(current_user, db)

    return {
        "teacher_id": teacher.id,
        "teacher_code": teacher.teacher_code,
        "full_name": teacher.full_name,
        "school_name": teacher.school_name,

        "username": current_user.username,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
    }


# ============================================================
# UPDATE PROFIL GURU (SELF-SERVICE)
# ============================================================

@router.put("/profile")
def update_my_teacher_profile(
    profile_data: TeacherProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("GURU")),
):
    """
    Guru mengubah data profilnya sendiri.

    Catatan: kode guru (teacher_code) sengaja TIDAK bisa diubah
    dari sini karena itu identitas resmi yang dikelola admin
    lewat menu Data Guru, bukan oleh guru sendiri -- sama seperti
    NIS di profil siswa.
    """

    teacher = get_teacher(current_user, db)

    teacher.full_name = profile_data.full_name
    teacher.school_name = profile_data.school_name

    db.commit()
    db.refresh(teacher)

    return {
        "success": True,
        "message": "Profil berhasil diperbarui",
        "data": {
            "teacher_id": teacher.id,
            "teacher_code": teacher.teacher_code,
            "full_name": teacher.full_name,
            "school_name": teacher.school_name,
        },
    }


# ============================================================
# RINGKASAN DASHBOARD (GURU)
#
# Dulu Dashboard.jsx memanggil getQuestions() + getTryouts()
# (SELURUH soal & tryout di sistem, lalu difilter created_by di
# JavaScript) DITAMBAH getTeacherScores() (endpoint /scores di
# atas, yang menjalankan beberapa query PER BARIS attempt) --
# semua itu cuma untuk 4 angka + 2 baris "terbaru". Endpoint ini
# menggantikannya dengan COUNT langsung di database, jadi jauh
# lebih ringan terutama di koneksi lambat.
# ============================================================

@router.get("/dashboard-summary")
def get_teacher_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("GURU")),
):

    total_soal = (
        db.query(Question)
        .filter(Question.created_by == current_user.id)
        .count()
    )

    total_tryout = (
        db.query(Tryout)
        .filter(Tryout.created_by == current_user.id)
        .count()
    )

    completed_attempts_query = (
        db.query(Attempt)
        .join(Tryout, Tryout.id == Attempt.tryout_id)
        .filter(Tryout.created_by == current_user.id)
        .filter(Attempt.status != "IN_PROGRESS")
    )

    total_hasil = completed_attempts_query.count()

    total_peserta = (
        completed_attempts_query
        .with_entities(Attempt.student_id)
        .distinct()
        .count()
    )

    latest_question = (
        db.query(Question)
        .filter(Question.created_by == current_user.id)
        .order_by(Question.id.desc())
        .first()
    )

    latest_tryout = (
        db.query(Tryout)
        .filter(Tryout.created_by == current_user.id)
        .order_by(Tryout.id.desc())
        .first()
    )

    return {

        "stats": {
            "total_soal": total_soal,
            "total_tryout": total_tryout,
            "total_peserta": total_peserta,
            "total_hasil": total_hasil,
        },

        "activity": {

            "latest_question": (
                {
                    "id": latest_question.id,
                    "question_text": latest_question.question_text,
                }
                if latest_question else None
            ),

            "latest_tryout": (
                {
                    "id": latest_tryout.id,
                    "title": latest_tryout.title,
                }
                if latest_tryout else None
            ),

        },

    }


# ============================================================
# GET REKAP NILAI
#
# Untuk GURU: hanya menampilkan hasil dari tryout yang dia
# buat sendiri (Tryout.created_by == current_user.id).
# Untuk ADMIN: menampilkan semua tryout, dengan dukungan
# filter tambahan (mata pelajaran & guru pembuat) supaya
# endpoint ini juga bisa dipakai halaman Nilai milik admin.
# ============================================================

@router.get("/scores")
def get_teacher_scores(
    tryout_id: int | None = None,
    subject_id: int | None = None,
    teacher_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "GURU")),
):
    # Guru pembuat tryout di-JOIN pakai alias terpisah dari User,
    # karena User yang sama juga dipakai untuk relasi lain kalau
    # ada (menghindari SQLAlchemy bingung "User" yang mana yang
    # dimaksud di JOIN ganda).
    Creator = aliased(User)

    query = (
        db.query(Attempt, Tryout, Student, Subject, Creator, Result)
        .join(Tryout, Tryout.id == Attempt.tryout_id)
        # outerjoin (LEFT JOIN), bukan join biasa, untuk
        # Student/Subject/Creator/Result -- supaya baris attempt-nya
        # TETAP ikut tampil walau salah satu datanya kebetulan
        # kosong/terhapus (persis seperti perilaku "if x else None"
        # di versi sebelumnya, cuma sekarang dalam SATU query lewat
        # JOIN, bukan query terpisah per baris).
        .outerjoin(Student, Student.id == Attempt.student_id)
        .outerjoin(Subject, Subject.id == Tryout.subject_id)
        .outerjoin(Creator, Creator.id == Tryout.created_by)
        .outerjoin(Result, Result.attempt_id == Attempt.id)
        .filter(Attempt.status != "IN_PROGRESS")
    )

    if current_user.role == "GURU":
        query = query.filter(Tryout.created_by == current_user.id)

    if tryout_id:
        query = query.filter(Attempt.tryout_id == tryout_id)

    if subject_id:
        query = query.filter(Tryout.subject_id == subject_id)

    if teacher_id:
        query = query.filter(Tryout.created_by == teacher_id)

    rows = (
        query
        .order_by(Attempt.finished_at.desc())
        .all()
    )

    # Nomor percobaan ("Percobaan ke-2 dari 3") dihitung dari baris
    # yang sudah ketarik di atas. Ini tetap akurat walau ada filter
    # (mapel/guru/tryout) karena filter-filter itu bekerja di level
    # TRYOUT, bukan level attempt -- jadi kalau satu attempt suatu
    # tryout lolos filter, seluruh attempt tryout itu (siswa manapun)
    # ikut lolos juga, tidak ada yang "kepotong sebagian".
    attempt_numbers = compute_attempt_numbers(row[0] for row in rows)

    result = []

    for attempt, tryout, student, subject, creator, attempt_result in rows:

        attempt_number, attempt_total = attempt_numbers.get(
            attempt.id, (1, 1)
        )

        result.append({
            "attempt_id": attempt.id,

            "student_id": student.id if student else None,
            "student_code": student.student_code if student else None,
            "student_name": student.full_name if student else None,

            "tryout_id": tryout.id,
            "tryout_title": tryout.title,
            "subject_name": subject.name if subject else None,

            "teacher_id": tryout.created_by,
            "teacher_name": creator.full_name if creator else None,

            "finished_at": attempt.finished_at,

            "attempt_number": attempt_number,
            "attempt_total": attempt_total,

            "score": (
                attempt_result.score if attempt_result else attempt.score
            ),
            "max_score": tryout.max_score,
            "percentage": (
                attempt_result.percentage if attempt_result else None
            ),
            "passed": (
                attempt_result.passed if attempt_result else None
            ),

            "correct_count": (
                attempt_result.correct_count
                if attempt_result
                else attempt.correct_count
            ),
            "wrong_count": (
                attempt_result.wrong_count
                if attempt_result
                else attempt.wrong_count
            ),
            "unanswered_count": (
                attempt_result.unanswered_count
                if attempt_result
                else attempt.unanswered_count
            ),
        })

    return result


# ============================================================
# GET DAFTAR PEMBUAT TRYOUT (UNTUK FILTER "GURU PEMBUAT")
#
# Hanya ADMIN yang butuh filter lintas guru, jadi endpoint
# ini dibatasi untuk ADMIN saja.
# ============================================================

@router.get("/creators")
def get_score_creators(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    creators = (
        db.query(User.id, User.full_name)
        .join(Tryout, Tryout.created_by == User.id)
        .distinct()
        .order_by(User.full_name)
        .all()
    )

    return [
        {"id": c.id, "full_name": c.full_name}
        for c in creators
    ]


# ============================================================
# GET LAPORAN ANALITIK PER TRYOUT
#
# Menampilkan: rata-rata skor, skor tertinggi/terendah,
# tingkat lulus, distribusi nilai, dan soal yang paling
# sering dijawab salah — untuk satu tryout tertentu.
#
# Untuk GURU: hanya boleh melihat laporan tryout miliknya
# sendiri (Tryout.created_by == current_user.id).
# Untuk ADMIN: boleh melihat laporan tryout siapa pun.
# ============================================================

DISTRIBUTION_BUCKETS = [
    ("0-20", 0, 20),
    ("21-40", 21, 40),
    ("41-60", 41, 60),
    ("61-80", 61, 80),
    ("81-100", 81, 100),
]


@router.get("/reports/{tryout_id}")
def get_teacher_report(
    tryout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "GURU")),
):
    tryout = (
        db.query(Tryout)
        .filter(Tryout.id == tryout_id)
        .first()
    )

    if not tryout:
        raise HTTPException(
            status_code=404,
            detail="Tryout tidak ditemukan"
        )

    if (
        current_user.role == "GURU"
        and tryout.created_by != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Tidak memiliki hak akses ke tryout ini"
        )

    subject = (
        db.query(Subject)
        .filter(Subject.id == tryout.subject_id)
        .first()
    )

    # --------------------------------------------------------
    # Attempt yang sudah selesai untuk tryout ini
    # --------------------------------------------------------

    attempts = (
        db.query(Attempt)
        .filter(
            Attempt.tryout_id == tryout.id,
            Attempt.status != "IN_PROGRESS",
        )
        .all()
    )

    total_attempts = len(attempts)

    attempt_ids = [a.id for a in attempts]

    results_by_attempt = {}

    if attempt_ids:
        results = (
            db.query(Result)
            .filter(Result.attempt_id.in_(attempt_ids))
            .all()
        )

        results_by_attempt = {r.attempt_id: r for r in results}

    # --------------------------------------------------------
    # Ringkasan skor
    # --------------------------------------------------------

    scores = []
    percentages = []
    passed_count = 0
    passed_known_count = 0

    for attempt in attempts:

        attempt_result = results_by_attempt.get(attempt.id)

        score = (
            attempt_result.score
            if attempt_result and attempt_result.score is not None
            else attempt.score
        )

        if score is not None:
            scores.append(score)

        max_score = tryout.max_score or 100

        percentage = (
            attempt_result.percentage
            if attempt_result and attempt_result.percentage is not None
            else (score / max_score * 100 if score is not None and max_score else None)
        )

        if percentage is not None:
            percentages.append(percentage)

        if attempt_result and attempt_result.passed is not None:
            passed_known_count += 1

            if attempt_result.passed:
                passed_count += 1

    average_score = (
        round(sum(scores) / len(scores), 1)
        if scores
        else None
    )

    highest_score = round(max(scores), 1) if scores else None
    lowest_score = round(min(scores), 1) if scores else None

    pass_rate = (
        round(passed_count / passed_known_count * 100)
        if passed_known_count > 0
        else None
    )

    # --------------------------------------------------------
    # Distribusi nilai (berdasarkan persentase skor)
    # --------------------------------------------------------

    score_distribution = []

    for label, low, high in DISTRIBUTION_BUCKETS:

        count = sum(
            1 for p in percentages if low <= p <= high
        )

        score_distribution.append({
            "range": label,
            "count": count,
        })

    # --------------------------------------------------------
    # Soal paling sering salah
    #
    # "Salah" mencakup jawaban yang salah maupun tidak dijawab
    # sama sekali, dihitung terhadap total peserta yang
    # menyelesaikan tryout ini.
    # --------------------------------------------------------

    hardest_questions = []

    if attempt_ids:

        correct_counts = dict(
            db.query(
                Answer.question_id,
                func.count(Answer.id),
            )
            .filter(
                Answer.attempt_id.in_(attempt_ids),
                Answer.is_correct == True,
            )
            .group_by(Answer.question_id)
            .all()
        )

        tryout_questions = (
            db.query(TryoutQuestion, Question)
            .join(Question, Question.id == TryoutQuestion.question_id)
            .filter(TryoutQuestion.tryout_id == tryout.id)
            .order_by(TryoutQuestion.question_number)
            .all()
        )

        for tq, question in tryout_questions:

            correct_count = correct_counts.get(question.id, 0)
            wrong_count = max(total_attempts - correct_count, 0)

            wrong_percentage = (
                round(wrong_count / total_attempts * 100, 1)
                if total_attempts > 0
                else 0
            )

            hardest_questions.append({
                "question_id": question.id,
                "question_number": tq.question_number,
                "question_text": question.question_text,
                "wrong_count": wrong_count,
                "correct_count": correct_count,
                "wrong_percentage": wrong_percentage,
            })

        hardest_questions.sort(
            key=lambda q: q["wrong_percentage"],
            reverse=True,
        )

        hardest_questions = hardest_questions[:10]

    return {
        "tryout_id": tryout.id,
        "tryout_title": tryout.title,
        "subject_name": subject.name if subject else None,
        "max_score": tryout.max_score,
        "total_attempts": total_attempts,
        "average_score": average_score,
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "pass_rate": pass_rate,
        "score_distribution": score_distribution,
        "hardest_questions": hardest_questions,
    }
