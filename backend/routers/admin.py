from collections import defaultdict
from datetime import datetime, timedelta

from database import IS_SQLITE, get_db
from dependencies import require_role
from fastapi import APIRouter, Depends
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
from sqlalchemy import func, or_, text, case
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)


@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(
        require_role("ADMIN")
    )
):


    # --------------------------------------------------------
    # Top Siswa & Paket Tryout Populer
    # --------------------------------------------------------

    popular_tryouts = []
    tryout_attempt_counts = defaultdict(int)
    for attempt in completed_attempts:
        tryout_attempt_counts[attempt.tryout_id] += 1
    
    for tryout_id, count in tryout_attempt_counts.items():
        t = tryout_map.get(tryout_id)
        if t:
            popular_tryouts.append({
                "tryout_id": tryout_id,
                "title": t.title,
                "attempt_count": count
            })
    popular_tryouts.sort(key=lambda x: x["attempt_count"], reverse=True)
    popular_tryouts = popular_tryouts[:5]

    student_scores = defaultdict(list)
    for attempt in completed_attempts:
        tryout = tryout_map.get(attempt.tryout_id)
        if not tryout:
            continue
            
        attempt_result = results_by_attempt.get(attempt.id)
        score = attempt_result.score if attempt_result and attempt_result.score is not None else attempt.score
        if score is None:
            continue
            
        max_score = tryout.max_score or 100
        percentage = score / max_score * 100
        student_scores[attempt.student_id].append(percentage)

    top_students = []
    students_by_id = {s.id: s for s in db.query(Student).all()}
    for student_id, percentages in student_scores.items():
        s = students_by_id.get(student_id)
        if not s: continue
        u = users_by_id.get(s.user_id)
        name = u.full_name if u else "Unknown"
        avg_percentage = round(sum(percentages) / len(percentages), 1)
        top_students.append({
            "student_id": student_id,
            "student_name": name,
            "average_percentage": avg_percentage,
            "tryouts_taken": len(percentages)
        })
    top_students.sort(key=lambda x: (x["average_percentage"], x["tryouts_taken"]), reverse=True)
    top_students = top_students[:5]

    return {
        "top_students": top_students,
        "popular_tryouts": popular_tryouts,

        "success": True,

        "message":
            "Selamat datang di Admin Dashboard",

        "username":
            current_user.username,

        "role":
            current_user.role

    }


# ============================================================
# RINGKASAN DASHBOARD (ADMIN)
#
# Dulu Dashboard.jsx mengambil SELURUH baris user, siswa, guru,
# tryout, dan soal (5 request paralel, tiap satu bisa berisi
# ratusan/ribuan baris) HANYA untuk dihitung .length dan dicari
# id terbesarnya di JavaScript. Di koneksi lambat, itu jadi lama
# banget cuma untuk menampilkan 4 angka + 3 baris "terbaru".
#
# Endpoint ini menggantikannya dengan query database yang murah
# (COUNT dan GROUP BY), jadi payload-nya kecil dan konstan berapa
# pun jumlah datanya.
#
# Isi: statistik untuk kartu dashboard (jumlah siswa, jumlah paket
# tryout & yang aktif) + "komposisi bank soal" (jumlah soal aktif
# per mata pelajaran aktif x tingkat kesulitan, plus jumlah soal
# aktif yang belum dipakai di paket tryout mana pun) untuk widget
# "Komposisi Bank Soal" di Dashboard.jsx. Blok "activity" (user/
# tryout/soal terbaru) dan hitungan total user/guru/admin sudah
# dihapus karena tidak dipakai lagi. Angka "live" (sedang
# mengerjakan, selesai hari ini) ada di endpoint terpisah di bawah.
# Blok "attention" berisi data panel "Perlu Perhatian" (paket berisi
# soal nonaktif, soal tanpa pembahasan, ukuran gambar soal).
# ============================================================


def _compose_question_bank(subjects, grouped_counts, subject_metrics):
    """
    Menyusun baris tabel "Komposisi Bank Soal" untuk dashboard admin.

    - subjects       : daftar mata pelajaran AKTIF (sudah terurut)
    - grouped_counts : hasil GROUP BY berupa (subject_id, difficulty,
                       jumlah) untuk soal AKTIF

    Mapel yang belum punya soal tetap dimunculkan dengan angka 0 --
    justru itu "celah" yang ingin terlihat admin. "total" dihitung
    dari SEMUA soal aktif mapel itu (termasuk nilai difficulty di
    luar EASY/MEDIUM/HARD kalau ada data lama), jadi tidak ada soal
    yang "hilang" dari hitungan.
    """

    per_difficulty = {}
    totals = {}

    for subject_id, difficulty, count in grouped_counts:
        per_difficulty[(subject_id, difficulty)] = count
        totals[subject_id] = totals.get(subject_id, 0) + count

    rows = []

    for subject in subjects:
        metrics = subject_metrics.get(subject.id, {"image_count": 0, "unused_count": 0})
        rows.append({
            "subject_id": subject.id,
            "code": subject.code,
            "name": subject.name,
            "easy": per_difficulty.get((subject.id, "EASY"), 0),
            "medium": per_difficulty.get((subject.id, "MEDIUM"), 0),
            "hard": per_difficulty.get((subject.id, "HARD"), 0),
            "total": totals.get(subject.id, 0),
            "image_count": metrics["image_count"],
            "unused_count": metrics["unused_count"],
        })

    return rows


# Berapa nama paket yang ditampilkan di baris "Paket berisi soal
# nonaktif" pada panel Perlu Perhatian (sisanya jadi "+N lainnya").
ATTENTION_MAX_TRYOUT_NAMES = 3


def _compose_attention(
    tryout_rows,
    questions_without_explanation,
    image_count,
    image_bytes,
    question_table_bytes,
):
    """
    Menyusun data panel "Perlu Perhatian" di dashboard admin.

    - tryout_rows : (tryout_id, judul, jumlah_soal_nonaktif) untuk
                    paket AKTIF yang berisi soal nonaktif, sudah
                    terurut (paling banyak soal nonaktif dulu)
    - "count" adalah jumlah SEMUA paket bermasalah, sedangkan "items"
      hanya berisi beberapa paket pertama (ATTENTION_MAX_TRYOUT_NAMES)
      supaya kartu tidak kepanjangan.
    - question_table_bytes : ukuran fisik tabel t_question (data +
      index) di Postgres, None kalau lagi jalan di atas SQLite (dev
      lokal), lihat get_question_table_bytes().
    """


    return {
        "tryouts_with_inactive_questions": {
            "count": len(tryout_rows),
            "items": [
                {
                    "id": tryout_id,
                    "title": title,
                    "inactive_count": inactive_count,
                }
                for tryout_id, title, inactive_count
                in tryout_rows[:ATTENTION_MAX_TRYOUT_NAMES]
            ],
        },
        "questions_without_explanation": questions_without_explanation,
        "image_storage": {
            "count": image_count,
            "bytes": image_bytes,
        },
        "question_table_size": {
            "bytes": question_table_bytes,
        },
    }


def _get_question_table_bytes(db: Session):
    """
    Ukuran fisik tabel t_question (data + index) di database yang
    sedang jalan, lewat pg_total_relation_size() -- bukan cuma kolom
    image_data, tapi seluruh tabel bank soal (termasuk gambar WebP
    yang tersimpan di situ).

    Postgres-only: pg_total_relation_size() tidak ada di SQLite, jadi
    di dev lokal (IS_SQLITE) fungsi ini dilewati dan mengembalikan
    None -- frontend menampilkan "Tidak tersedia" untuk kasus ini.
    """

    if IS_SQLITE:
        return None

    result = db.execute(
        text("SELECT pg_total_relation_size('t_question')")
    ).scalar()

    return int(result) if result is not None else None


@router.get("/dashboard-summary")
def get_admin_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):

    total_students = db.query(Student).count()
    total_tryouts = db.query(Tryout).count()
    active_tryouts = (
        db.query(Tryout)
        .filter(Tryout.is_active == True)
        .count()
    )

    # ------------------------------------------------------------
    # KOMPOSISI BANK SOAL
    #
    # Satu query GROUP BY untuk jumlah soal aktif per (mapel,
    # tingkat kesulitan), plus satu hitungan soal aktif yang belum
    # masuk paket tryout mana pun. Semuanya dibatasi ke mata
    # pelajaran AKTIF supaya angka di tabel dan angka "belum dipakai"
    # konsisten satu sama lain.
    # ------------------------------------------------------------

    active_subjects = (
        db.query(Subject)
        .filter(Subject.is_active == True)
        .order_by(Subject.name)
        .all()
    )

    grouped_counts = (
        db.query(
            Question.subject_id,
            Question.difficulty,
            func.count(Question.id),
        )
        .filter(Question.is_active == True)
        .group_by(Question.subject_id, Question.difficulty)
        .all()
    )
    used_in_tryout = (
        db.query(TryoutQuestion.id)
        .filter(TryoutQuestion.question_id == Question.id)
        .exists()
    )

    subject_metrics_rows = (
        db.query(
            Question.subject_id,
            func.sum(case((Question.image_data.is_not(None), 1), else_=0)),
            func.sum(case((~used_in_tryout, 1), else_=0))
        )
        .filter(Question.is_active == True)
        .group_by(Question.subject_id)
        .all()
    )

    subject_metrics = {
        row[0]: {"image_count": row[1] or 0, "unused_count": row[2] or 0}
        for row in subject_metrics_rows
    }

    question_bank_subjects = _compose_question_bank(
        active_subjects,
        grouped_counts,
        subject_metrics,
    )

    total_active_questions = sum(
        row["total"] for row in question_bank_subjects
    )


    unused_questions = (
        db.query(func.count(Question.id))
        .join(Subject, Subject.id == Question.subject_id)
        .filter(
            Question.is_active == True,
            Subject.is_active == True,
            ~used_in_tryout,
        )
        .scalar()
    ) or 0

    # ------------------------------------------------------------
    # PANEL "PERLU PERHATIAN"
    #
    # 1) Paket AKTIF yang berisi soal NONAKTIF. Saat pengerjaan
    #    dimuat, soal nonaktif dilewati diam-diam (lihat routers/
    #    student.py), jadi siswa mengerjakan lebih sedikit soal dari
    #    total_questions tanpa tahu sebabnya.
    # 2) Soal aktif (di mapel aktif) yang belum punya pembahasan.
    #    Pembahasan tampil ke siswa saat meninjau hasil.
    # 3) Ukuran gambar soal. Gambar disimpan di database (kolom
    #    image_data, sudah WebP), bukan sebagai file, jadi ikut
    #    memakai kuota penyimpanan database hosting. Diambil lewat
    #    SUM(LENGTH(...)) di database supaya isi gambarnya tidak
    #    ikut ditarik ke aplikasi.
    # ------------------------------------------------------------

    tryouts_with_inactive_rows = (
        db.query(
            Tryout.id,
            Tryout.title,
            func.count(TryoutQuestion.id),
        )
        .join(TryoutQuestion, TryoutQuestion.tryout_id == Tryout.id)
        .join(Question, Question.id == TryoutQuestion.question_id)
        .filter(
            Tryout.is_active == True,
            Question.is_active == False,
        )
        .group_by(Tryout.id, Tryout.title)
        .order_by(func.count(TryoutQuestion.id).desc(), Tryout.title)
        .all()
    )

    questions_without_explanation = (
        db.query(func.count(Question.id))
        .join(Subject, Subject.id == Question.subject_id)
        .filter(
            Question.is_active == True,
            Subject.is_active == True,
            or_(
                Question.explanation.is_(None),
                func.trim(Question.explanation) == "",
            ),
        )
        .scalar()
    ) or 0

    image_count, image_bytes = (
        db.query(
            func.count(Question.id),
            func.coalesce(func.sum(func.length(Question.image_data)), 0),
        )
        .filter(Question.image_data.is_not(None))
        .one()
    )

    question_table_bytes = _get_question_table_bytes(db)

    completed_attempts = db.query(Attempt).filter(Attempt.status != "IN_PROGRESS").all()
    tryout_map = {t.id: t for t in db.query(Tryout).all()}
    attempt_ids = [a.id for a in completed_attempts]
    results_by_attempt = {}
    if attempt_ids:
        results = db.query(Result).filter(Result.attempt_id.in_(attempt_ids)).all()
        results_by_attempt = {r.attempt_id: r for r in results}
    users_by_id = {u.id: u for u in db.query(User).all()}


    # --------------------------------------------------------
    # Top Siswa & Paket Tryout Populer
    # --------------------------------------------------------

    popular_tryouts = []
    tryout_attempt_counts = defaultdict(int)
    for attempt in completed_attempts:
        tryout_attempt_counts[attempt.tryout_id] += 1
    
    for tryout_id, count in tryout_attempt_counts.items():
        t = tryout_map.get(tryout_id)
        if t:
            popular_tryouts.append({
                "tryout_id": tryout_id,
                "title": t.title,
                "attempt_count": count
            })
    popular_tryouts.sort(key=lambda x: x["attempt_count"], reverse=True)
    popular_tryouts = popular_tryouts[:5]

    student_scores = defaultdict(list)
    for attempt in completed_attempts:
        tryout = tryout_map.get(attempt.tryout_id)
        if not tryout:
            continue
            
        attempt_result = results_by_attempt.get(attempt.id)
        score = attempt_result.score if attempt_result and attempt_result.score is not None else attempt.score
        if score is None:
            continue
            
        max_score = tryout.max_score or 100
        percentage = score / max_score * 100
        student_scores[attempt.student_id].append(percentage)

    top_students = []
    students_by_id = {s.id: s for s in db.query(Student).all()}
    for student_id, percentages in student_scores.items():
        s = students_by_id.get(student_id)
        if not s: continue
        u = users_by_id.get(s.user_id)
        name = u.full_name if u else "Unknown"
        avg_percentage = round(sum(percentages) / len(percentages), 1)
        top_students.append({
            "student_id": student_id,
            "student_name": name,
            "average_percentage": avg_percentage,
            "tryouts_taken": len(percentages)
        })
    top_students.sort(key=lambda x: (x["average_percentage"], x["tryouts_taken"]), reverse=True)
    top_students = top_students[:5]

    return {
        "top_students": top_students,
        "popular_tryouts": popular_tryouts,

        "stats": {
            "total_students": total_students,
            "total_tryouts": total_tryouts,
            "active_tryouts": active_tryouts,
        },

        "question_bank": {
            "subjects": question_bank_subjects,
            "total_active": total_active_questions,
            "unused_count": unused_questions,
        },

        "attention": _compose_attention(
            tryouts_with_inactive_rows,
            questions_without_explanation,
            image_count or 0,
            int(image_bytes or 0),
            question_table_bytes,
        ),

    }


# ============================================================
# RINGKASAN "LIVE" DASHBOARD (ADMIN)
#
# Dua angka untuk kartu dashboard yang di-refresh berkala
# (polling ~30 detik oleh Dashboard.jsx), makanya dipisah dari
# /dashboard-summary supaya ringkasan yang lebih berat tidak ikut
# diambil ulang terus-menerus:
#
# - in_progress    : jumlah SISWA yang sedang mengerjakan tryout.
#                    Hanya attempt IN_PROGRESS yang deadline-nya
#                    (started_at + duration_minutes, sama seperti
#                    get_attempt_deadline() di routers/student.py)
#                    BELUM lewat. Attempt yang ditinggalkan siswa
#                    (browser ditutup) tetap berstatus IN_PROGRESS
#                    di database sampai ada request berikutnya, jadi
#                    tanpa filter deadline angkanya akan membengkak.
#                    Dihitung di Python (bukan SQL) supaya aman untuk
#                    SQLite maupun PostgreSQL.
# - finished_today : jumlah pengerjaan yang selesai sejak pukul
#                    00.00 WIB hari ini. Server menyimpan waktu UTC
#                    (naive), sedangkan hari di WIB berganti pukul
#                    17.00 UTC, jadi batas awal harinya dihitung di
#                    WIB lalu diubah kembali ke UTC untuk query.
# ============================================================

WIB_OFFSET = timedelta(hours=7)


def _start_of_today_wib_as_utc(now_utc):
    """
    Awal hari ini (00.00 WIB) dinyatakan dalam UTC naive, siap
    dibandingkan dengan kolom DateTime yang disimpan sebagai UTC.
    """

    now_wib = now_utc + WIB_OFFSET

    start_wib = now_wib.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    return start_wib - WIB_OFFSET


def _count_active_students(rows, now_utc):
    """
    rows: iterable berisi (student_id, started_at, duration_minutes)
    untuk attempt berstatus IN_PROGRESS. Mengembalikan jumlah siswa
    UNIK yang deadline attempt-nya belum lewat.
    """

    active_student_ids = set()

    for student_id, started_at, duration_minutes in rows:
        deadline = started_at + timedelta(minutes=duration_minutes or 0)

        if deadline > now_utc:
            active_student_ids.add(student_id)

    return len(active_student_ids)


@router.get("/live-summary")
def get_admin_live_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):

    now_utc = datetime.utcnow()

    in_progress_rows = (
        db.query(
            Attempt.student_id,
            Attempt.started_at,
            Tryout.duration_minutes,
        )
        .join(Tryout, Tryout.id == Attempt.tryout_id)
        .filter(Attempt.status == "IN_PROGRESS")
        .all()
    )

    finished_today = (
        db.query(func.count(Attempt.id))
        .filter(
            Attempt.status != "IN_PROGRESS",
            Attempt.finished_at >= _start_of_today_wib_as_utc(now_utc),
        )
        .scalar()
    ) or 0

    completed_attempts = db.query(Attempt).filter(Attempt.status != "IN_PROGRESS").all()
    tryout_map = {t.id: t for t in db.query(Tryout).all()}
    attempt_ids = [a.id for a in completed_attempts]
    results_by_attempt = {}
    if attempt_ids:
        results = db.query(Result).filter(Result.attempt_id.in_(attempt_ids)).all()
        results_by_attempt = {r.attempt_id: r for r in results}
    users_by_id = {u.id: u for u in db.query(User).all()}


    # --------------------------------------------------------
    # Top Siswa & Paket Tryout Populer
    # --------------------------------------------------------

    popular_tryouts = []
    tryout_attempt_counts = defaultdict(int)
    for attempt in completed_attempts:
        tryout_attempt_counts[attempt.tryout_id] += 1
    
    for tryout_id, count in tryout_attempt_counts.items():
        t = tryout_map.get(tryout_id)
        if t:
            popular_tryouts.append({
                "tryout_id": tryout_id,
                "title": t.title,
                "attempt_count": count
            })
    popular_tryouts.sort(key=lambda x: x["attempt_count"], reverse=True)
    popular_tryouts = popular_tryouts[:5]

    student_scores = defaultdict(list)
    for attempt in completed_attempts:
        tryout = tryout_map.get(attempt.tryout_id)
        if not tryout:
            continue
            
        attempt_result = results_by_attempt.get(attempt.id)
        score = attempt_result.score if attempt_result and attempt_result.score is not None else attempt.score
        if score is None:
            continue
            
        max_score = tryout.max_score or 100
        percentage = score / max_score * 100
        student_scores[attempt.student_id].append(percentage)

    top_students = []
    students_by_id = {s.id: s for s in db.query(Student).all()}
    for student_id, percentages in student_scores.items():
        s = students_by_id.get(student_id)
        if not s: continue
        u = users_by_id.get(s.user_id)
        name = u.full_name if u else "Unknown"
        avg_percentage = round(sum(percentages) / len(percentages), 1)
        top_students.append({
            "student_id": student_id,
            "student_name": name,
            "average_percentage": avg_percentage,
            "tryouts_taken": len(percentages)
        })
    top_students.sort(key=lambda x: (x["average_percentage"], x["tryouts_taken"]), reverse=True)
    top_students = top_students[:5]

    return {
        "top_students": top_students,
        "popular_tryouts": popular_tryouts,
        "in_progress": _count_active_students(in_progress_rows, now_utc),
        "finished_today": finished_today,
    }


# ============================================================
# GET LAPORAN ANALITIK SISTEM (ADMIN)
#
# Ringkasan lintas seluruh guru & tryout: rata-rata skor per
# mata pelajaran, tren jumlah attempt 14 hari terakhir, guru
# paling aktif, dan soal paling sering salah secara global.
# ============================================================

TREND_DAYS = 14
MIN_ANSWERS_FOR_HARDEST = 3
TOP_TEACHERS_LIMIT = 5
HARDEST_QUESTIONS_LIMIT = 10


@router.get("/reports/overview")
def get_admin_report_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):

    # --------------------------------------------------------
    # Statistik dasar
    # --------------------------------------------------------

    total_students = db.query(Student).count()
    total_teachers = db.query(Teacher).count()
    total_tryouts = db.query(Tryout).count()

    tryouts_all = db.query(Tryout).all()
    tryout_map = {t.id: t for t in tryouts_all}

    completed_attempts = (
        db.query(Attempt)
        .filter(Attempt.status != "IN_PROGRESS")
        .all()
    )

    total_attempts = len(completed_attempts)

    attempt_ids = [a.id for a in completed_attempts]

    results_by_attempt = {}

    if attempt_ids:
        results = (
            db.query(Result)
            .filter(Result.attempt_id.in_(attempt_ids))
            .all()
        )

        results_by_attempt = {r.attempt_id: r for r in results}

    # --------------------------------------------------------
    # Cache nama mata pelajaran & guru (hindari query berulang)
    # --------------------------------------------------------

    subjects_by_id = {
        s.id: s for s in db.query(Subject).all()
    }

    users_by_id = {
        u.id: u for u in db.query(User).all()
    }

    # --------------------------------------------------------
    # Rata-rata skor keseluruhan & per mata pelajaran
    # --------------------------------------------------------

    all_scores = []

    subject_scores = defaultdict(list)

    # Persen dari skor maksimal tiap tryout. max_score bisa berbeda antar
    # tryout (default 100, tapi bisa diubah guru), jadi rata-rata skor
    # mentah lintas tryout bisa bercampur skala. Rata-rata persen aman
    # dibandingkan antar mapel/tryout.
    all_percentages = []

    subject_percentages = defaultdict(list)

    for attempt in completed_attempts:

        tryout = tryout_map.get(attempt.tryout_id)

        if not tryout:
            continue

        attempt_result = results_by_attempt.get(attempt.id)

        score = (
            attempt_result.score
            if attempt_result and attempt_result.score is not None
            else attempt.score
        )

        if score is None:
            continue

        all_scores.append(score)
        subject_scores[tryout.subject_id].append(score)

        max_score = tryout.max_score or 100
        percentage = score / max_score * 100

        all_percentages.append(percentage)
        subject_percentages[tryout.subject_id].append(percentage)

    average_score_overall = (
        round(sum(all_scores) / len(all_scores), 1)
        if all_scores
        else None
    )

    average_percentage_overall = (
        round(sum(all_percentages) / len(all_percentages), 1)
        if all_percentages
        else None
    )

    average_score_per_subject = []

    for subject_id, scores in subject_scores.items():

        subject = subjects_by_id.get(subject_id)

        average_score_per_subject.append({
            "subject_id": subject_id,
            "subject_name": subject.name if subject else "-",
            "average_score": round(sum(scores) / len(scores), 1),
            "average_percentage": round(
                sum(subject_percentages[subject_id])
                / len(subject_percentages[subject_id]),
                1,
            ),
            "total_attempts": len(scores),
        })

    # Urut berdasarkan persen (bukan skor mentah) supaya adil antar
    # tryout dengan skor maksimal berbeda.
    average_score_per_subject.sort(
        key=lambda s: s["average_percentage"],
        reverse=True,
    )

    # --------------------------------------------------------
    # Tren jumlah attempt (14 hari terakhir)
    # --------------------------------------------------------

    cutoff = datetime.utcnow() - timedelta(days=TREND_DAYS - 1)

    counts_by_date = defaultdict(int)

    for attempt in completed_attempts:

        if not attempt.finished_at:
            continue

        if attempt.finished_at < cutoff:
            continue

        day_key = attempt.finished_at.date().isoformat()

        counts_by_date[day_key] += 1

    attempts_trend = []

    for i in range(TREND_DAYS - 1, -1, -1):

        day = (datetime.utcnow() - timedelta(days=i)).date().isoformat()

        attempts_trend.append({
            "date": day,
            "count": counts_by_date.get(day, 0),
        })

    # --------------------------------------------------------
    # Guru paling aktif
    # --------------------------------------------------------

    teacher_tryout_count = defaultdict(int)

    for t in tryouts_all:
        teacher_tryout_count[t.created_by] += 1

    teacher_attempt_count = defaultdict(int)
    teacher_student_set = defaultdict(set)

    for attempt in completed_attempts:

        tryout = tryout_map.get(attempt.tryout_id)

        if not tryout:
            continue

        teacher_attempt_count[tryout.created_by] += 1
        teacher_student_set[tryout.created_by].add(attempt.student_id)

    top_teachers = []

    for teacher_id, tryout_count in teacher_tryout_count.items():

        creator = users_by_id.get(teacher_id)

        top_teachers.append({
            "teacher_id": teacher_id,
            "teacher_name": creator.full_name if creator else "-",
            "tryout_count": tryout_count,
            "total_attempts": teacher_attempt_count.get(teacher_id, 0),
            "student_reach": len(teacher_student_set.get(teacher_id, set())),
        })

    top_teachers.sort(
        key=lambda t: (t["total_attempts"], t["tryout_count"]),
        reverse=True,
    )

    top_teachers = top_teachers[:TOP_TEACHERS_LIMIT]

    # --------------------------------------------------------
    # Soal paling sering salah (global, dari soal yang dijawab)
    #
    # Dihitung dari jawaban yang benar-benar ada (t_answer),
    # sehingga soal dengan jumlah jawaban terlalu sedikit
    # (di bawah MIN_ANSWERS_FOR_HARDEST) diabaikan supaya
    # tidak bias oleh sampel yang terlalu kecil.
    # --------------------------------------------------------

    hardest_questions = []

    if attempt_ids:

        total_answer_counts = dict(
            db.query(
                Answer.question_id,
                func.count(Answer.id),
            )
            .filter(Answer.attempt_id.in_(attempt_ids))
            .group_by(Answer.question_id)
            .all()
        )

        correct_answer_counts = dict(
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

        question_ids = [
            qid
            for qid, total in total_answer_counts.items()
            if total >= MIN_ANSWERS_FOR_HARDEST
        ]

        if question_ids:

            questions_by_id = {
                q.id: q
                for q in db.query(Question)
                .filter(Question.id.in_(question_ids))
                .all()
            }

            for question_id in question_ids:

                question = questions_by_id.get(question_id)

                if not question:
                    continue

                total = total_answer_counts.get(question_id, 0)
                correct = correct_answer_counts.get(question_id, 0)
                wrong = max(total - correct, 0)

                wrong_percentage = (
                    round(wrong / total * 100, 1)
                    if total > 0
                    else 0
                )

                subject = subjects_by_id.get(question.subject_id)

                hardest_questions.append({
                    "question_id": question.id,
                    "question_text": question.question_text,
                    "subject_name": subject.name if subject else "-",
                    "total_answered": total,
                    "wrong_count": wrong,
                    "wrong_percentage": wrong_percentage,
                })

            hardest_questions.sort(
                key=lambda q: q["wrong_percentage"],
                reverse=True,
            )

            hardest_questions = hardest_questions[:HARDEST_QUESTIONS_LIMIT]


    # --------------------------------------------------------
    # Top Siswa & Paket Tryout Populer
    # --------------------------------------------------------

    popular_tryouts = []
    tryout_attempt_counts = defaultdict(int)
    for attempt in completed_attempts:
        tryout_attempt_counts[attempt.tryout_id] += 1
    
    for tryout_id, count in tryout_attempt_counts.items():
        t = tryout_map.get(tryout_id)
        if t:
            popular_tryouts.append({
                "tryout_id": tryout_id,
                "title": t.title,
                "attempt_count": count
            })
    popular_tryouts.sort(key=lambda x: x["attempt_count"], reverse=True)
    popular_tryouts = popular_tryouts[:5]

    student_scores = defaultdict(list)
    for attempt in completed_attempts:
        tryout = tryout_map.get(attempt.tryout_id)
        if not tryout:
            continue
            
        attempt_result = results_by_attempt.get(attempt.id)
        score = attempt_result.score if attempt_result and attempt_result.score is not None else attempt.score
        if score is None:
            continue
            
        max_score = tryout.max_score or 100
        percentage = score / max_score * 100
        student_scores[attempt.student_id].append(percentage)

    top_students = []
    students_by_id = {s.id: s for s in db.query(Student).all()}
    for student_id, percentages in student_scores.items():
        s = students_by_id.get(student_id)
        if not s: continue
        u = users_by_id.get(s.user_id)
        name = u.full_name if u else "Unknown"
        avg_percentage = round(sum(percentages) / len(percentages), 1)
        top_students.append({
            "student_id": student_id,
            "student_name": name,
            "average_percentage": avg_percentage,
            "tryouts_taken": len(percentages)
        })
    top_students.sort(key=lambda x: (x["average_percentage"], x["tryouts_taken"]), reverse=True)
    top_students = top_students[:5]

    return {
        "top_students": top_students,
        "popular_tryouts": popular_tryouts,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_tryouts": total_tryouts,
        "total_attempts": total_attempts,
        "average_score_overall": average_score_overall,
        "average_percentage_overall": average_percentage_overall,
        "average_score_per_subject": average_score_per_subject,
        "attempts_trend": attempts_trend,
        "top_teachers": top_teachers,
        "hardest_questions": hardest_questions,
    }