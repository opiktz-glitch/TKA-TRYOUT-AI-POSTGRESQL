import json
import random
from collections import defaultdict

from database import get_db, utc_now
from dependencies import require_role
from fastapi import APIRouter, Depends, HTTPException
from models import (
    Practice,
    PracticeAnswer,
    PracticeAttempt,
    PracticeQuestion,
    Question,
    QuestionOption,
    Student,
    Subject,
    User,
)
from schemas import (
    PracticeAnswerRequest,
    PracticeAnswerResponse,
    PracticeAttemptDetailResponse,
    PracticeAttemptFinishResponse,
    PracticeAttemptQuestion,
    PracticeAttemptQuestionOption,
    PracticeAttemptStartResponse,
    PracticeManagementListResponse,
    PracticeManagementResponse,
    PracticeQuestionPickerResponse,
    PracticeStudentListItem,
    PracticeStudentListResponse,
    PracticeUpsertRequest,
)
from sqlalchemy import and_, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, load_only

router = APIRouter(tags=["Practice"])
PRACTICE_STATUSES = {"DRAFT", "PUBLISHED", "ARCHIVED"}


def _practice_or_404(
    db: Session,
    practice_id: int,
    current_user: User,
) -> Practice:
    practice = (
        db.query(Practice)
        .filter(Practice.id == practice_id)
        .with_for_update()
        .first()
    )
    if not practice:
        raise HTTPException(status_code=404, detail="Latihan tidak ditemukan.")
    if current_user.role == "GURU" and practice.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Guru hanya dapat mengelola latihan yang dibuat sendiri.",
        )
    return practice


def _validate_questions(
    db: Session,
    current_user: User,
    subject_id: int,
    question_ids: list[int],
    allowed_inactive_ids: set[int] | None = None,
) -> list[Question]:
    if len(set(question_ids)) != len(question_ids):
        raise HTTPException(
            status_code=400,
            detail="Soal yang sama tidak boleh dipilih lebih dari sekali.",
        )
    if not db.query(Subject.id).filter(
        Subject.id == subject_id,
        Subject.is_active.is_(True),
    ).first():
        raise HTTPException(status_code=400, detail="Mata pelajaran tidak aktif.")

    questions = (
        db.query(Question)
        .filter(
            Question.id.in_(question_ids),
            Question.subject_id == subject_id,
        )
        .options(
            load_only(
                Question.id,
                Question.subject_id,
                Question.created_by,
                Question.is_active,
            )
        )
        .order_by(Question.id)
        .with_for_update()
        .all()
    )
    if len(questions) != len(question_ids):
        raise HTTPException(
            status_code=400,
            detail="Pastikan semua soal berasal dari mata pelajaran yang dipilih.",
        )
    inactive_ids = {question.id for question in questions if not question.is_active}
    if inactive_ids - (allowed_inactive_ids or set()):
        raise HTTPException(
            status_code=400,
            detail="Latihan hanya dapat menggunakan soal aktif yang tersedia.",
        )
    if current_user.role == "GURU" and any(
        question.created_by != current_user.id for question in questions
    ):
        raise HTTPException(
            status_code=403,
            detail="Guru hanya dapat memakai soal yang dibuat sendiri.",
        )
    return questions


def _management_items(
    db: Session,
    practices: list[Practice],
) -> list[PracticeManagementResponse]:
    if not practices:
        return []

    practice_ids = [practice.id for practice in practices]
    creator_ids = {practice.created_by for practice in practices}
    subject_ids = {practice.subject_id for practice in practices}
    subjects = {
        subject.id: subject.name
        for subject in db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
    }
    users = {
        user.id: user.full_name or user.username
        for user in db.query(User).filter(User.id.in_(creator_ids)).all()
    }
    question_ids_by_practice: dict[int, list[int]] = defaultdict(list)
    for row in (
        db.query(PracticeQuestion)
        .filter(PracticeQuestion.practice_id.in_(practice_ids))
        .order_by(PracticeQuestion.question_number)
        .all()
    ):
        question_ids_by_practice[row.practice_id].append(row.question_id)

    question_counts = dict(
        db.query(PracticeQuestion.practice_id, func.count(PracticeQuestion.id))
        .filter(PracticeQuestion.practice_id.in_(practice_ids))
        .group_by(PracticeQuestion.practice_id)
        .all()
    )
    attempt_stats = {
        practice_id: (student_count, attempt_count)
        for practice_id, student_count, attempt_count in (
            db.query(
                PracticeAttempt.practice_id,
                func.count(func.distinct(PracticeAttempt.student_id)),
                func.count(PracticeAttempt.id),
            )
            .filter(PracticeAttempt.practice_id.in_(practice_ids))
            .group_by(PracticeAttempt.practice_id)
            .all()
        )
    }

    return [
        PracticeManagementResponse(
            id=practice.id,
            title=practice.title,
            description=practice.description,
            subject_id=practice.subject_id,
            subject_name=subjects.get(practice.subject_id, "Mata pelajaran diarsipkan"),
            created_by=practice.created_by,
            created_by_name=users.get(practice.created_by, "Pengguna"),
            status=practice.status,
            shuffle_questions=practice.shuffle_questions,
            shuffle_options=practice.shuffle_options,
            question_ids=question_ids_by_practice.get(practice.id, []),
            question_count=question_counts.get(practice.id, 0),
            student_count=attempt_stats.get(practice.id, (0, 0))[0],
            attempt_count=attempt_stats.get(practice.id, (0, 0))[1],
            created_at=practice.created_at,
            updated_at=practice.updated_at,
        )
        for practice in practices
    ]


@router.get(
    "/api/practices",
    response_model=PracticeManagementListResponse,
)
def list_practices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "GURU")),
):
    query = db.query(Practice)
    if current_user.role == "GURU":
        query = query.filter(Practice.created_by == current_user.id)
    practices = query.order_by(Practice.updated_at.desc(), Practice.id.desc()).all()
    return PracticeManagementListResponse(
        practices=_management_items(db, practices)
    )


@router.get(
    "/api/practices/question-bank",
    response_model=PracticeQuestionPickerResponse,
)
def list_practice_question_bank(
    subject_id: int,
    page: int = 1,
    limit: int = 100,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "GURU")),
):
    if page < 1 or limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="Nomor halaman harus positif dan batas soal maksimal 100.",
        )
    query = db.query(
        Question.id,
        Question.question_text,
        Question.question_type,
        Question.is_active,
        Question.image_data.is_not(None).label("has_image"),
    ).filter(Question.subject_id == subject_id)
    if current_user.role == "GURU":
        query = query.filter(Question.created_by == current_user.id)
    if search and search.strip():
        query = query.filter(Question.question_text.ilike(f"%{search.strip()}%"))

    total = query.count()
    questions = (
        query.order_by(Question.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    question_ids = [question.id for question in questions]
    options_by_question: dict[int, list[dict[str, str]]] = defaultdict(list)
    if question_ids:
        for option in (
            db.query(
                QuestionOption.question_id,
                QuestionOption.option_code,
                QuestionOption.option_text,
            )
            .filter(QuestionOption.question_id.in_(question_ids))
            .order_by(QuestionOption.question_id, QuestionOption.option_code)
            .all()
        ):
            options_by_question[option.question_id].append(
                {
                    "option_code": option.option_code,
                    "option_text": option.option_text,
                }
            )
    return PracticeQuestionPickerResponse(
        data=[
            {
                "id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "is_active": question.is_active,
                "has_image": question.has_image,
                "options": options_by_question.get(question.id, []),
            }
            for question in questions
        ],
        total=total,
    )


@router.post(
    "/api/practices",
    response_model=PracticeManagementResponse,
)
def create_practice(
    data: PracticeUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "GURU")),
):
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Nama latihan wajib diisi.")
    if data.status not in PRACTICE_STATUSES:
        raise HTTPException(status_code=400, detail="Status latihan tidak valid.")
    _validate_questions(db, current_user, data.subject_id, data.question_ids)

    practice = Practice(
        title=title,
        description=(data.description or "").strip() or None,
        subject_id=data.subject_id,
        created_by=current_user.id,
        status=data.status,
        shuffle_questions=data.shuffle_questions,
        shuffle_options=data.shuffle_options,
    )
    db.add(practice)
    db.flush()
    for question_number, question_id in enumerate(data.question_ids, start=1):
        db.add(
            PracticeQuestion(
                practice_id=practice.id,
                question_id=question_id,
                question_number=question_number,
            )
        )
    db.commit()
    db.refresh(practice)
    return _management_items(db, [practice])[0]


@router.put(
    "/api/practices/{practice_id}",
    response_model=PracticeManagementResponse,
)
def update_practice(
    practice_id: int,
    data: PracticeUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "GURU")),
):
    practice = _practice_or_404(db, practice_id, current_user)
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Nama latihan wajib diisi.")
    if data.status not in PRACTICE_STATUSES:
        raise HTTPException(status_code=400, detail="Status latihan tidak valid.")
    attempt_count = (
        db.query(PracticeAttempt.id)
        .filter(PracticeAttempt.practice_id == practice.id)
        .count()
    )
    current_question_ids = [
        row.question_id
        for row in (
            db.query(PracticeQuestion.question_id)
            .filter(PracticeQuestion.practice_id == practice.id)
            .order_by(PracticeQuestion.question_number)
            .all()
        )
    ]
    if attempt_count and (
        data.subject_id != practice.subject_id
        or current_question_ids != data.question_ids
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Mata pelajaran dan daftar soal tidak dapat diubah setelah "
                "siswa mulai berlatih. Buat latihan baru untuk susunan soal berbeda."
            ),
        )

    if attempt_count:
        questions = (
            db.query(Question)
            .filter(Question.id.in_(current_question_ids))
            .options(load_only(Question.id, Question.is_active))
            .all()
        )
    else:
        questions = _validate_questions(
            db,
            current_user,
            data.subject_id,
            data.question_ids,
            allowed_inactive_ids=set(current_question_ids),
        )

    if data.status == "PUBLISHED" and any(
        not question.is_active for question in questions
    ):
        raise HTTPException(
            status_code=400,
            detail="Latihan hanya dapat diterbitkan jika semua soalnya aktif.",
        )

    if data.status == "PUBLISHED" and not questions:
        raise HTTPException(
            status_code=400,
            detail="Latihan harus memiliki minimal satu soal sebelum diterbitkan.",
        )

    practice.title = title
    practice.description = (data.description or "").strip() or None
    practice.subject_id = data.subject_id
    practice.status = data.status
    practice.shuffle_questions = data.shuffle_questions
    practice.shuffle_options = data.shuffle_options
    practice.updated_at = utc_now()

    if not attempt_count:
        db.query(PracticeQuestion).filter(
            PracticeQuestion.practice_id == practice.id
        ).delete(synchronize_session=False)
        for question_number, question in enumerate(questions, start=1):
            db.add(
                PracticeQuestion(
                    practice_id=practice.id,
                    question_id=question.id,
                    question_number=question_number,
                )
            )

    db.commit()
    db.refresh(practice)
    return _management_items(db, [practice])[0]


@router.get(
    "/api/student/practices",
    response_model=PracticeStudentListResponse,
)
def list_student_practices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SISWA")),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil siswa tidak ditemukan.")

    practices = (
        db.query(Practice, Subject.name)
        .join(Subject, Subject.id == Practice.subject_id)
        .filter(
            or_(
                and_(
                    Practice.status == "PUBLISHED",
                    Subject.is_active.is_(True),
                ),
                Practice.id.in_(
                    db.query(PracticeAttempt.practice_id).filter(
                        PracticeAttempt.student_id == student.id,
                        PracticeAttempt.status == "IN_PROGRESS",
                    )
                ),
            ),
        )
        .order_by(Practice.updated_at.desc(), Practice.id.desc())
        .all()
    )
    if not practices:
        return PracticeStudentListResponse(practices=[])

    practice_ids = [practice.id for practice, _ in practices]
    question_counts = dict(
        db.query(PracticeQuestion.practice_id, func.count(PracticeQuestion.id))
        .filter(PracticeQuestion.practice_id.in_(practice_ids))
        .group_by(PracticeQuestion.practice_id)
        .all()
    )
    active_attempt_ids = dict(
        db.query(PracticeAttempt.practice_id, PracticeAttempt.id)
        .filter(
            PracticeAttempt.practice_id.in_(practice_ids),
            PracticeAttempt.student_id == student.id,
            PracticeAttempt.status == "IN_PROGRESS",
        )
        .all()
    )
    completed_attempt_counts = dict(
        db.query(PracticeAttempt.practice_id, func.count(PracticeAttempt.id))
        .filter(
            PracticeAttempt.practice_id.in_(practice_ids),
            PracticeAttempt.student_id == student.id,
            PracticeAttempt.status == "COMPLETED",
        )
        .group_by(PracticeAttempt.practice_id)
        .all()
    )
    all_attempt_counts = dict(
        db.query(PracticeAttempt.practice_id, func.count(PracticeAttempt.id))
        .filter(PracticeAttempt.practice_id.in_(practice_ids))
        .group_by(PracticeAttempt.practice_id)
        .all()
    )

    return PracticeStudentListResponse(
        practices=[
            PracticeStudentListItem(
                id=practice.id,
                title=practice.title,
                description=practice.description,
                subject_id=practice.subject_id,
                subject_name=subject_name,
                question_count=question_counts.get(practice.id, 0),
                attempt_count=all_attempt_counts.get(practice.id, 0),
                completed_attempt_count=completed_attempt_counts.get(practice.id, 0),
                active_attempt_id=active_attempt_ids.get(practice.id),
            )
            for practice, subject_name in practices
            if question_counts.get(practice.id, 0) > 0
        ]
    )


def _student_or_404(db: Session, user_id: int) -> Student:
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil siswa tidak ditemukan.")
    return student


def _owned_attempt_or_404(
    db: Session,
    attempt_id: int,
    student_id: int,
    *,
    lock: bool = False,
) -> PracticeAttempt:
    query = db.query(PracticeAttempt).filter(
        PracticeAttempt.id == attempt_id,
        PracticeAttempt.student_id == student_id,
    )
    if lock:
        query = query.with_for_update()
    attempt = query.first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Sesi latihan tidak ditemukan.")
    return attempt


@router.post(
    "/api/student/practices/{practice_id}/attempts",
    response_model=PracticeAttemptStartResponse,
)
def start_practice_attempt(
    practice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SISWA")),
):
    student = _student_or_404(db, current_user.id)
    practice = db.query(Practice).filter(Practice.id == practice_id).first()
    if not practice:
        raise HTTPException(status_code=404, detail="Latihan tidak ditemukan.")

    existing_attempt = (
        db.query(PracticeAttempt)
        .filter(
            PracticeAttempt.practice_id == practice.id,
            PracticeAttempt.student_id == student.id,
            PracticeAttempt.status == "IN_PROGRESS",
        )
        .first()
    )
    if existing_attempt:
        return PracticeAttemptStartResponse(
            attempt_id=existing_attempt.id,
            practice_id=practice.id,
            title=practice.title,
            question_count=len(json.loads(existing_attempt.question_order)),
            status=existing_attempt.status,
        )

    subject_is_active = db.query(Subject.id).filter(
        Subject.id == practice.subject_id,
        Subject.is_active.is_(True),
    ).first()
    if practice.status != "PUBLISHED" or not subject_is_active:
        raise HTTPException(status_code=404, detail="Latihan tidak ditemukan.")

    question_ids = [
        row.question_id
        for row in (
            db.query(PracticeQuestion)
            .filter(PracticeQuestion.practice_id == practice.id)
            .order_by(PracticeQuestion.question_number)
            .all()
        )
    ]
    if not question_ids:
        raise HTTPException(
            status_code=409,
            detail="Latihan ini belum memiliki soal aktif.",
        )
    ordered_question_ids = list(question_ids)
    if practice.shuffle_questions:
        random.shuffle(ordered_question_ids)

    option_order: dict[str, list[str]] = {}
    option_codes_by_question: dict[int, list[str]] = defaultdict(list)
    for question_id, option_code in (
        db.query(QuestionOption.question_id, QuestionOption.option_code)
        .filter(QuestionOption.question_id.in_(question_ids))
        .order_by(QuestionOption.question_id, QuestionOption.option_code)
        .all()
    ):
        option_codes_by_question[question_id].append(option_code)
    for question_id in question_ids:
        codes = option_codes_by_question[question_id]
        if practice.shuffle_options:
            random.shuffle(codes)
        option_order[str(question_id)] = codes

    attempt = PracticeAttempt(
        practice_id=practice.id,
        student_id=student.id,
        status="IN_PROGRESS",
        question_order=json.dumps(ordered_question_ids),
        option_order=json.dumps(option_order),
        unanswered_count=len(question_ids),
        started_at=utc_now(),
    )
    db.add(attempt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing_attempt = (
            db.query(PracticeAttempt)
            .filter(
                PracticeAttempt.practice_id == practice.id,
                PracticeAttempt.student_id == student.id,
                PracticeAttempt.status == "IN_PROGRESS",
            )
            .first()
        )
        if not existing_attempt:
            raise
        attempt = existing_attempt
    else:
        db.refresh(attempt)

    return PracticeAttemptStartResponse(
        attempt_id=attempt.id,
        practice_id=practice.id,
        title=practice.title,
        question_count=len(json.loads(attempt.question_order)),
        status=attempt.status,
    )


def _attempt_detail(
    db: Session,
    attempt: PracticeAttempt,
) -> PracticeAttemptDetailResponse:
    practice = db.query(Practice).filter(Practice.id == attempt.practice_id).first()
    if not practice:
        raise HTTPException(status_code=404, detail="Latihan tidak ditemukan.")
    question_ids = json.loads(attempt.question_order)
    option_order: dict[str, list[str]] = json.loads(attempt.option_order)
    linked_questions = {
        row.question_id: row.question_number
        for row in (
            db.query(PracticeQuestion)
            .filter(
                PracticeQuestion.practice_id == practice.id,
                PracticeQuestion.question_id.in_(question_ids),
            )
            .all()
        )
    }
    question_rows = (
        db.query(Question, Question.image_data.is_not(None))
        .options(
            load_only(
                Question.id,
                Question.question_text,
                Question.question_type,
                Question.true_label,
                Question.false_label,
                Question.explanation,
            )
        )
        .filter(Question.id.in_(question_ids))
        .all()
    )
    questions_by_id = {question.id: question for question, _ in question_rows}
    image_by_question_id = {
        question.id: has_image for question, has_image in question_rows
    }
    answers_by_question = {
        answer.question_id: answer
        for answer in (
            db.query(PracticeAnswer)
            .filter(
                PracticeAnswer.attempt_id == attempt.id,
                PracticeAnswer.question_id.in_(question_ids),
            )
            .all()
        )
    }
    option_rows = (
        db.query(QuestionOption)
        .filter(QuestionOption.question_id.in_(question_ids))
        .order_by(QuestionOption.option_code)
        .all()
    )
    options_by_question_id: dict[int, list[QuestionOption]] = defaultdict(list)
    for option in option_rows:
        options_by_question_id[option.question_id].append(option)

    questions = []
    for question_number, question_id in enumerate(question_ids, start=1):
        question = questions_by_id.get(question_id)
        if not question or question_id not in linked_questions:
            continue
        question_options = options_by_question_id.get(question_id, [])
        options_by_code = {option.option_code: option for option in question_options}
        options = [
            PracticeAttemptQuestionOption(
                option_code=code,
                option_text=options_by_code[code].option_text,
            )
            for code in option_order.get(str(question_id), [])
            if code in options_by_code
        ]
        answer = answers_by_question.get(question_id)
        correct_options = [
            option for option in options_by_code.values() if option.is_correct
        ]
        correct_codes = sorted(option.option_code for option in correct_options)
        correct_answers = None
        reveal_feedback = answer is not None
        if reveal_feedback:
            if question.question_type == "TRUE_FALSE":
                correct_answers = [
                    f"{option.option_code}: "
                    f"{question.true_label if option.is_correct else question.false_label}"
                    for option in sorted(correct_options + [
                        option for option in options_by_code.values()
                        if not option.is_correct
                    ], key=lambda item: item.option_code)
                ]
            else:
                correct_answers = correct_codes

        questions.append(
            PracticeAttemptQuestion(
                id=question.id,
                question_number=question_number,
                question_text=question.question_text,
                question_type=question.question_type,
                true_label=question.true_label,
                false_label=question.false_label,
                has_image=image_by_question_id.get(question_id, False),
                options=options,
                selected_option=answer.selected_option if answer else None,
                is_correct=answer.is_correct if answer else None,
                correct_option_codes=correct_codes if answer else None,
                correct_answers=correct_answers,
                explanation=question.explanation if reveal_feedback else None,
            )
        )

    answered_count = len(answers_by_question)
    correct_count = sum(answer.is_correct for answer in answers_by_question.values())
    return PracticeAttemptDetailResponse(
        attempt_id=attempt.id,
        practice_id=practice.id,
        title=practice.title,
        description=practice.description,
        status=attempt.status,
        question_count=len(question_ids),
        current_answers=answered_count,
        correct_count=correct_count,
        wrong_count=answered_count - correct_count,
        unanswered_count=len(question_ids) - answered_count,
        questions=questions,
    )


@router.get(
    "/api/student/practice-attempts/{attempt_id}",
    response_model=PracticeAttemptDetailResponse,
)
def get_practice_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SISWA")),
):
    student = _student_or_404(db, current_user.id)
    attempt = _owned_attempt_or_404(db, attempt_id, student.id)
    return _attempt_detail(db, attempt)


@router.post(
    "/api/student/practice-attempts/{attempt_id}/answers",
    response_model=PracticeAnswerResponse,
)
def answer_practice_question(
    attempt_id: int,
    data: PracticeAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SISWA")),
):
    student = _student_or_404(db, current_user.id)
    attempt = _owned_attempt_or_404(
        db,
        attempt_id,
        student.id,
        lock=True,
    )
    if attempt.status != "IN_PROGRESS":
        raise HTTPException(status_code=409, detail="Sesi latihan sudah selesai.")
    if not db.query(PracticeQuestion.id).filter(
        PracticeQuestion.practice_id == attempt.practice_id,
        PracticeQuestion.question_id == data.question_id,
    ).first():
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan dalam latihan.")

    question = db.query(Question).filter(Question.id == data.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan.")
    options = (
        db.query(QuestionOption)
        .filter(QuestionOption.question_id == question.id)
        .all()
    )
    options_by_code = {option.option_code: option for option in options}
    selected_option = data.selected_option.strip()
    if not selected_option:
        raise HTTPException(status_code=400, detail="Jawaban harus dipilih.")

    correct_codes = sorted(option.option_code for option in options if option.is_correct)
    correct_answers: list[str]
    if question.question_type == "TRUE_FALSE":
        selected_map = {}
        for part in selected_option.split(","):
            pieces = part.split(":", 1)
            if len(pieces) != 2 or pieces[1] not in {"T", "F"}:
                raise HTTPException(status_code=400, detail="Format jawaban Benar/Salah tidak valid.")
            if pieces[0] in selected_map:
                raise HTTPException(status_code=400, detail="Jawaban pernyataan tidak boleh ganda.")
            selected_map[pieces[0]] = pieces[1] == "T"
        if set(selected_map) != set(options_by_code):
            raise HTTPException(status_code=400, detail="Jawab semua pernyataan terlebih dahulu.")
        is_correct = all(
            selected_map[code] == option.is_correct
            for code, option in options_by_code.items()
        )
        correct_answers = [
            f"{option.option_code}: "
            f"{question.true_label if option.is_correct else question.false_label}"
            for option in sorted(options, key=lambda item: item.option_code)
        ]
    elif question.question_type == "MULTIPLE_RESPONSE":
        selected_codes = selected_option.split(",")
        if (
            len(set(selected_codes)) != len(selected_codes)
            or any(code not in options_by_code for code in selected_codes)
        ):
            raise HTTPException(status_code=400, detail="Pilihan jawaban tidak valid.")
        is_correct = set(selected_codes) == set(correct_codes)
        correct_answers = correct_codes
    else:
        if selected_option not in options_by_code:
            raise HTTPException(status_code=400, detail="Pilihan jawaban tidak valid.")
        is_correct = selected_option in correct_codes
        correct_answers = correct_codes

    answer = (
        db.query(PracticeAnswer)
        .filter(
            PracticeAnswer.attempt_id == attempt.id,
            PracticeAnswer.question_id == question.id,
        )
        .first()
    )
    if answer:
        answer.selected_option = selected_option
        answer.is_correct = is_correct
        answer.answered_at = utc_now()
    else:
        db.add(
            PracticeAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                selected_option=selected_option,
                is_correct=is_correct,
                answered_at=utc_now(),
            )
        )
    db.commit()
    return PracticeAnswerResponse(
        question_id=question.id,
        selected_option=selected_option,
        is_correct=is_correct,
        correct_option_codes=correct_codes,
        correct_answers=correct_answers,
        explanation=question.explanation,
    )


@router.post(
    "/api/student/practice-attempts/{attempt_id}/finish",
    response_model=PracticeAttemptFinishResponse,
)
def finish_practice_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SISWA")),
):
    student = _student_or_404(db, current_user.id)
    attempt = _owned_attempt_or_404(db, attempt_id, student.id, lock=True)
    question_count = len(json.loads(attempt.question_order))
    answers = (
        db.query(PracticeAnswer)
        .filter(PracticeAnswer.attempt_id == attempt.id)
        .all()
    )
    correct_count = sum(answer.is_correct for answer in answers)
    wrong_count = len(answers) - correct_count
    unanswered_count = max(0, question_count - len(answers))
    if attempt.status == "IN_PROGRESS":
        attempt.status = "COMPLETED"
        attempt.correct_count = correct_count
        attempt.wrong_count = wrong_count
        attempt.unanswered_count = unanswered_count
        attempt.finished_at = utc_now()
        db.commit()
    else:
        correct_count = attempt.correct_count
        wrong_count = attempt.wrong_count
        unanswered_count = attempt.unanswered_count

    return PracticeAttemptFinishResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        question_count=question_count,
        correct_count=correct_count,
        wrong_count=wrong_count,
        unanswered_count=unanswered_count,
        message="Latihan selesai. Hasil ini tidak masuk ke nilai resmi tryout.",
    )
