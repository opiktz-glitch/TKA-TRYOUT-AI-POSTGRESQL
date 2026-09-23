import math

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Tryout,
    TryoutQuestion,
    Question,
    QuestionOption,
    Subject,
    User,
    Attempt,
)
from schemas import TryoutCreate, TryoutUpdate, QuestionResponse
from dependencies import require_role


router = APIRouter(
    prefix="/api/tryouts",
    tags=["Tryouts"]
)


ALLOWED_DIFFICULTIES = [
    "EASY",
    "MEDIUM",
    "HARD"
]


# =========================================================
# VALIDASI DATA TRYOUT
# =========================================================

def validate_tryout_data(data):

    if not data.title or not data.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Judul tryout wajib diisi"
        )

    if data.duration_minutes <= 0:
        raise HTTPException(
            status_code=400,
            detail="Durasi harus lebih dari 0 menit"
        )

    if data.max_score <= 0:
        raise HTTPException(
            status_code=400,
            detail="Nilai maksimal harus lebih dari 0"
        )

    if (
        data.difficulty is not None
        and len(data.difficulty.strip()) > 150
    ):
        raise HTTPException(
            status_code=400,
            detail="Keterangan maksimal 150 karakter"
        )

    question_ids = set()
    question_numbers = set()

    for item in data.questions:

        # Cek soal duplikat
        if item.question_id in question_ids:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Soal ID {item.question_id} "
                    "dipilih lebih dari sekali"
                )
            )

        question_ids.add(item.question_id)

        # Cek nomor soal duplikat
        if item.question_number in question_numbers:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Nomor soal {item.question_number} "
                    "digunakan lebih dari sekali"
                )
            )

        question_numbers.add(item.question_number)

        if item.question_number <= 0:
            raise HTTPException(
                status_code=400,
                detail="Nomor soal harus lebih dari 0"
            )

        if item.points <= 0:
            raise HTTPException(
                status_code=400,
                detail="Point soal harus lebih dari 0"
            )


# =========================================================
# GET SEMUA TRYOUT
# =========================================================

@router.get("")
def get_tryouts(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):

    tryouts = (
        db.query(Tryout)
        .order_by(Tryout.id.desc())
        .all()
    )

    # Satu query untuk nama semua pembuat tryout (bukan query per baris),
    # dipakai untuk kolom "Pembuat Soal" di tabel Paket Tryout.
    creator_ids = {tryout.created_by for tryout in tryouts}

    creator_names = {}
    if creator_ids:
        creators = (
            db.query(User.id, User.full_name, User.username)
            .filter(User.id.in_(creator_ids))
            .all()
        )
        creator_names = {
            c.id: (c.full_name or c.username)
            for c in creators
        }

    # Satu query GROUP BY untuk jumlah peserta (attempt) per tryout --
    # bukan query per baris. Dipakai frontend untuk menampilkan info
    # "sudah ada peserta" dan menonaktifkan tombol Hapus, karena
    # backend memang menolak hapus tryout yang sudah dikerjakan siswa
    # (lihat delete_tryout di bawah).
    participant_counts = dict(
        db.query(Attempt.tryout_id, func.count(Attempt.id))
        .group_by(Attempt.tryout_id)
        .all()
    )

    result = []

    for tryout in tryouts:

        questions = (
            db.query(TryoutQuestion)
            .filter(
                TryoutQuestion.tryout_id == tryout.id
            )
            .order_by(
                TryoutQuestion.question_number
            )
            .all()
        )

        result.append({
            "id": tryout.id,
            "title": tryout.title,
            "description": tryout.description,
            "subject_id": tryout.subject_id,
            "grade": tryout.grade,
            "duration_minutes": tryout.duration_minutes,
            "total_questions": tryout.total_questions,
            "max_score": tryout.max_score,
            "difficulty": tryout.difficulty,
            "created_by": tryout.created_by,
            "created_by_name": creator_names.get(tryout.created_by, "-"),
            "is_active": tryout.is_active,
            "participant_count": participant_counts.get(tryout.id, 0),
            "questions": questions
        })

    return result


# =========================================================
# GET TRYOUT DETAIL
# =========================================================

@router.get("/{tryout_id}")
def get_tryout(
    tryout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
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

    questions = (
        db.query(TryoutQuestion)
        .filter(
            TryoutQuestion.tryout_id == tryout.id
        )
        .order_by(
            TryoutQuestion.question_number
        )
        .all()
    )

    # -----------------------------------------------------
    # Snapshot soal (teks, tingkat kesulitan, dst) untuk form
    # Edit Tryout.
    #
    # Daftar bank soal di form sekarang di-paginasi dari server,
    # jadi soal yang SUDAH terpilih tidak bisa lagi dicari teksnya
    # dari "daftar soal yang sedang dimuat" seperti dulu. Karena
    # itu teksnya dibawa langsung di sini — 1 query untuk semua
    # soal (bukan per soal), dan tanpa kolom image_data.
    # -----------------------------------------------------

    question_ids = [item.question_id for item in questions]

    question_info = {}

    if question_ids:

        rows = (
            db.query(
                Question.id,
                Question.question_text,
                Question.difficulty,
                Question.is_active,
                Question.image_data.is_not(None).label("has_image"),
            )
            .filter(Question.id.in_(question_ids))
            .all()
        )

        question_info = {row.id: row for row in rows}

    questions_payload = []

    for item in questions:

        info = question_info.get(item.question_id)

        questions_payload.append({
            "id": item.id,
            "tryout_id": item.tryout_id,
            "question_id": item.question_id,
            "question_number": item.question_number,
            "points": item.points,
            "question_text": (
                _shorten_text(info.question_text)
                if info else None
            ),
            "difficulty": info.difficulty if info else None,
            "is_active": bool(info.is_active) if info else False,
            "has_image": bool(info.has_image) if info else False,
        })

    return {
        "id": tryout.id,
        "title": tryout.title,
        "description": tryout.description,
        "subject_id": tryout.subject_id,
        "grade": tryout.grade,
        "duration_minutes": tryout.duration_minutes,
        "total_questions": tryout.total_questions,
        "max_score": tryout.max_score,
        "difficulty": tryout.difficulty,
        "created_by": tryout.created_by,
        "is_active": tryout.is_active,
        "questions": questions_payload
    }


# =========================================================
# GET REVIEW SOAL TRYOUT (untuk tombol "Review")
# =========================================================
# Menampilkan daftar soal & pilihan jawaban (tanpa pembahasan)
# dari sebuah paket tryout, dipakai untuk pratinjau seperti
# halaman cetak/PDF sebelum tryout dipakai siswa.

@router.get("/{tryout_id}/review")
def get_tryout_review(
    tryout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
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

    subject = (
        db.query(Subject)
        .filter(Subject.id == tryout.subject_id)
        .first()
    )

    tryout_questions = (
        db.query(TryoutQuestion)
        .filter(
            TryoutQuestion.tryout_id == tryout.id
        )
        .order_by(
            TryoutQuestion.question_number
        )
        .all()
    )

    questions_payload = []

    for tryout_question in tryout_questions:

        question = (
            db.query(Question)
            .filter(Question.id == tryout_question.question_id)
            .first()
        )

        if not question:
            continue

        options = (
            db.query(QuestionOption)
            .filter(
                QuestionOption.question_id == question.id
            )
            .order_by(
                QuestionOption.option_code
            )
            .all()
        )

        questions_payload.append({
            "question_number": tryout_question.question_number,
            "question_id": question.id,
            "question_text": question.question_text,
            "question_type": question.question_type,
            "points": tryout_question.points,
            "explanation": question.explanation,
            "has_image": question.has_image,
            "options": [
                {
                    "option_code": option.option_code,
                    "option_text": option.option_text,
                    "is_correct": option.is_correct,
                }
                for option in options
            ],
        })

    return {
        "id": tryout.id,
        "title": tryout.title,
        "description": tryout.description,
        "subject_name": subject.name if subject else "-",
        "grade": tryout.grade,
        "duration_minutes": tryout.duration_minutes,
        "total_questions": tryout.total_questions,
        "max_score": tryout.max_score,
        "difficulty": tryout.difficulty,
        "questions": questions_payload,
    }


# =========================================================
# GET SOAL YANG TERSEDIA (bank soal untuk form tryout)
# =========================================================
# ROUTE INI HARUS SEBELUM /{tryout_id}
#
# Dulu endpoint ini mengembalikan SEMUA soal aktif satu mata
# pelajaran lengkap dengan opsinya. Untuk bank ribuan soal itu
# berat: payload besar, kolom image_data (bytes gambar) ikut
# ter-load, dan browser merender ribuan baris sekaligus.
#
# Sekarang:
#   - dipaginasi di server (page & page_size, maks. 100/halaman)
#   - bisa dicari (search: isi soal atau ID soal)
#   - bisa dibatasi ke soal milik pengguna sendiri (scope=mine)
#   - kolom yang diambil hanya yang perlu untuk daftar; opsi
#     jawaban TIDAK ikut (dibuka per soal lewat GET
#     /api/questions/{id} saat baris di-expand), dan image_data
#     tidak pernah dibaca — has_image dihitung di database.
#
# scope:
#   "all"  -> semua soal aktif di mata pelajaran itu (ADMIN & GURU)
#   "mine" -> hanya soal yang dibuat pengguna yang sedang login

ALLOWED_BANK_SCOPES = ["all", "mine"]

BANK_PAGE_SIZE_MAX = 100

# Teks soal di daftar dipotong supaya payload tetap kecil (soal
# bacaan bisa sangat panjang). Teks lengkap diambil saat expand.
BANK_TEXT_PREVIEW_LENGTH = 300

RANDOM_PICK_MAX_PER_DIFFICULTY = 500


def _shorten_text(value, limit=BANK_TEXT_PREVIEW_LENGTH):

    if value is None:
        return ""

    if len(value) <= limit:
        return value

    return value[:limit].rstrip() + "…"


def _escape_like(value: str) -> str:

    return (
        value
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )


def _validate_scope(scope: str):

    if scope not in ALLOWED_BANK_SCOPES:
        raise HTTPException(
            status_code=400,
            detail="Scope tidak valid"
        )


def _bank_filters(current_user, subject_id, scope, search):
    """Kumpulan kondisi WHERE bank soal (tanpa filter kesulitan)."""

    conditions = [
        Question.subject_id == subject_id,
        Question.is_active == True
    ]

    if scope == "mine":
        conditions.append(
            Question.created_by == current_user.id
        )

    keyword = (search or "").strip()

    if keyword:

        text_condition = Question.question_text.ilike(
            f"%{_escape_like(keyword)}%",
            escape="\\"
        )

        # "#1048" atau "1048" -> cocokkan juga ID soal
        id_part = keyword.lstrip("#")

        if id_part.isdigit() and len(id_part) <= 9:
            conditions.append(
                or_(
                    text_condition,
                    Question.id == int(id_part)
                )
            )
        else:
            conditions.append(text_condition)

    return conditions


def _bank_query(db: Session):
    """Query kolom ringan untuk daftar bank soal.

    Sengaja select kolom (bukan entity Question) supaya kolom
    image_data (bytes gambar) tidak ikut terbaca dari database.
    """

    return (
        db.query(
            Question.id,
            Question.question_text,
            Question.question_type,
            Question.difficulty,
            Question.created_by,
            Question.image_data.is_not(None).label("has_image"),
            User.full_name.label("creator_full_name"),
            User.username.label("creator_username"),
        )
        .outerjoin(User, User.id == Question.created_by)
    )


def _bank_item(row, current_user):

    return {
        "id": row.id,
        "question_text": _shorten_text(row.question_text),
        "question_type": row.question_type,
        "difficulty": row.difficulty,
        "has_image": bool(row.has_image),
        "created_by": row.created_by,
        "created_by_name": (
            row.creator_full_name
            or row.creator_username
        ),
        "is_mine": (
            row.created_by is not None
            and row.created_by == current_user.id
        ),
    }


@router.get("/available/questions")
def get_available_questions(
    subject_id: int,
    difficulty: str | None = None,
    scope: str = "all",
    search: str | None = None,
    page: int = 1,
    page_size: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):

    _validate_scope(scope)

    if difficulty and difficulty not in ALLOWED_DIFFICULTIES:
        raise HTTPException(
            status_code=400,
            detail="Difficulty tidak valid"
        )

    page_size = max(1, min(page_size, BANK_PAGE_SIZE_MAX))

    conditions = _bank_filters(
        current_user, subject_id, scope, search
    )

    # -----------------------------------------------------
    # Jumlah soal per tingkat kesulitan (untuk label chip
    # filter). Dihitung TANPA filter difficulty, tapi dengan
    # filter scope & search yang sedang aktif.
    # -----------------------------------------------------

    count_rows = (
        db.query(Question.difficulty, func.count(Question.id))
        .filter(*conditions)
        .group_by(Question.difficulty)
        .all()
    )

    difficulty_counts = {
        item: 0 for item in ALLOWED_DIFFICULTIES
    }

    for difficulty_value, count_value in count_rows:
        if difficulty_value in difficulty_counts:
            difficulty_counts[difficulty_value] = count_value

    if difficulty:
        total = difficulty_counts[difficulty]
    else:
        total = sum(count_value for _, count_value in count_rows)

    total_pages = max(1, math.ceil(total / page_size))

    page = max(1, min(page, total_pages))

    list_conditions = list(conditions)

    if difficulty:
        list_conditions.append(
            Question.difficulty == difficulty
        )

    rows = (
        _bank_query(db)
        .filter(*list_conditions)
        .order_by(Question.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [_bank_item(row, current_user) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "difficulty_counts": difficulty_counts,
    }


# =========================================================
# PILIH SOAL ACAK (bank soal)
# =========================================================
# Mengambil sejumlah soal acak per tingkat kesulitan dari bank,
# memakai scope & pencarian yang sama dengan daftar di atas, dan
# melewati soal yang sudah dipilih (exclude_ids).

class RandomPickRequest(BaseModel):
    subject_id: int
    scope: str = "all"
    search: str | None = None
    exclude_ids: list[int] = Field(
        default_factory=list,
        max_length=5000
    )
    easy: int = Field(
        default=0, ge=0, le=RANDOM_PICK_MAX_PER_DIFFICULTY
    )
    medium: int = Field(
        default=0, ge=0, le=RANDOM_PICK_MAX_PER_DIFFICULTY
    )
    hard: int = Field(
        default=0, ge=0, le=RANDOM_PICK_MAX_PER_DIFFICULTY
    )


@router.post("/available/questions/random")
def pick_random_questions(
    data: RandomPickRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):

    _validate_scope(data.scope)

    conditions = _bank_filters(
        current_user, data.subject_id, data.scope, data.search
    )

    if data.exclude_ids:
        conditions.append(~Question.id.in_(data.exclude_ids))

    requested = {
        "EASY": data.easy,
        "MEDIUM": data.medium,
        "HARD": data.hard,
    }

    items = []
    picked = {}

    for difficulty_value, wanted in requested.items():

        picked[difficulty_value] = 0

        if wanted <= 0:
            continue

        rows = (
            _bank_query(db)
            .filter(
                *conditions,
                Question.difficulty == difficulty_value
            )
            .order_by(func.random())
            .limit(wanted)
            .all()
        )

        picked[difficulty_value] = len(rows)

        items.extend(
            _bank_item(row, current_user) for row in rows
        )

    return {
        "items": items,
        "requested": requested,
        "picked": picked,
    }


# =========================================================
# CREATE TRYOUT
# =========================================================

@router.post("")
def create_tryout(
    data: TryoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):

    validate_tryout_data(data)

    # -----------------------------------------------------
    # Cek subject
    # -----------------------------------------------------

    subject = (
        db.query(Subject)
        .filter(Subject.id == data.subject_id)
        .first()
    )

    if not subject:
        raise HTTPException(
            status_code=404,
            detail="Mata pelajaran tidak ditemukan"
        )

    if not subject.is_active:
        raise HTTPException(
            status_code=400,
            detail="Mata pelajaran tidak aktif"
        )

    # -----------------------------------------------------
    # Cek soal
    # -----------------------------------------------------

    question_ids = [
        item.question_id
        for item in data.questions
    ]

    if question_ids:

        questions = (
            db.query(Question)
            .filter(
                Question.id.in_(question_ids),
                Question.is_active == True
            )
            .all()
        )

        if len(questions) != len(question_ids):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Ada soal yang tidak ditemukan "
                    "atau tidak aktif"
                )
            )

        invalid_questions = [
            q.id
            for q in questions
            if q.subject_id != data.subject_id
        ]

        if invalid_questions:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Ada soal yang tidak sesuai "
                    "dengan mata pelajaran tryout: "
                    + str(invalid_questions)
                )
            )

    # -----------------------------------------------------
    # Buat TRYOUT
    # -----------------------------------------------------

    tryout = Tryout(
        title=data.title.strip(),
        description=data.description,
        subject_id=data.subject_id,
        grade=data.grade,
        duration_minutes=data.duration_minutes,
        total_questions=len(data.questions),
        max_score=data.max_score,
        difficulty=(data.difficulty.strip() if data.difficulty else None),
        created_by=current_user.id,
        is_active=data.is_active
    )

    db.add(tryout)
    db.flush()

    # -----------------------------------------------------
    # Tambahkan soal
    # -----------------------------------------------------

    for item in data.questions:

        tryout_question = TryoutQuestion(
            tryout_id=tryout.id,
            question_id=item.question_id,
            question_number=item.question_number,
            points=item.points
        )

        db.add(tryout_question)

    db.commit()
    db.refresh(tryout)

    return {
        "success": True,
        "message": "Tryout berhasil dibuat",
        "id": tryout.id
    }


# =========================================================
# UPDATE TRYOUT
# =========================================================

@router.put("/{tryout_id}")
def update_tryout(
    tryout_id: int,
    data: TryoutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):

    validate_tryout_data(data)

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

    # -----------------------------------------------------
    # Cek subject
    # -----------------------------------------------------

    subject = (
        db.query(Subject)
        .filter(Subject.id == data.subject_id)
        .first()
    )

    if not subject:
        raise HTTPException(
            status_code=404,
            detail="Mata pelajaran tidak ditemukan"
        )

    if not subject.is_active:
        raise HTTPException(
            status_code=400,
            detail="Mata pelajaran tidak aktif"
        )

    # -----------------------------------------------------
    # Cek soal
    # -----------------------------------------------------

    question_ids = [
        item.question_id
        for item in data.questions
    ]

    if question_ids:

        questions = (
            db.query(Question)
            .filter(
                Question.id.in_(question_ids),
                Question.is_active == True
            )
            .all()
        )

        if len(questions) != len(question_ids):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Ada soal yang tidak ditemukan "
                    "atau tidak aktif"
                )
            )

        invalid_questions = [
            q.id
            for q in questions
            if q.subject_id != data.subject_id
        ]

        if invalid_questions:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Ada soal yang tidak sesuai "
                    "dengan mata pelajaran tryout: "
                    + str(invalid_questions)
                )
            )

    # -----------------------------------------------------
    # Update data TRYOUT
    # -----------------------------------------------------

    tryout.title = data.title.strip()
    tryout.description = data.description
    tryout.subject_id = data.subject_id
    tryout.grade = data.grade
    tryout.duration_minutes = data.duration_minutes
    tryout.total_questions = len(data.questions)
    tryout.max_score = data.max_score
    tryout.difficulty = data.difficulty.strip() if data.difficulty else None
    tryout.is_active = data.is_active

    # -----------------------------------------------------
    # Hapus soal lama
    # -----------------------------------------------------

    db.query(TryoutQuestion).filter(
        TryoutQuestion.tryout_id == tryout.id
    ).delete(
        synchronize_session=False
    )

    # -----------------------------------------------------
    # Masukkan soal baru
    # -----------------------------------------------------

    for item in data.questions:

        db.add(
            TryoutQuestion(
                tryout_id=tryout.id,
                question_id=item.question_id,
                question_number=item.question_number,
                points=item.points
            )
        )

    db.commit()

    return {
        "success": True,
        "message": "Tryout berhasil diperbarui"
    }


# =========================================================
# DELETE TRYOUT
# =========================================================

@router.delete("/{tryout_id}")
def delete_tryout(
    tryout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
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

    # -----------------------------------------------------
    # Jangan hapus tryout yang sudah dikerjakan siswa
    # -----------------------------------------------------

    attempt = (
        db.query(Attempt)
        .filter(
            Attempt.tryout_id == tryout.id
        )
        .first()
    )

    if attempt:

        raise HTTPException(
            status_code=400,
            detail=(
                "Tryout tidak dapat dihapus "
                "karena sudah pernah dikerjakan siswa"
            )
        )

    # -----------------------------------------------------
    # Hapus relasi soal
    # -----------------------------------------------------

    db.query(TryoutQuestion).filter(
        TryoutQuestion.tryout_id == tryout.id
    ).delete(
        synchronize_session=False
    )

    # -----------------------------------------------------
    # Hapus tryout
    # -----------------------------------------------------

    db.delete(tryout)
    db.commit()

    return {
        "success": True,
        "message": "Tryout berhasil dihapus"
    }