
# ============================================================
# ANALISIS KELEMAHAN SISWA
# ============================================================

@router.get("/weakness-analysis", response_model=list[schemas.SubjectWeaknessAnalysis])
def get_weakness_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = get_student(current_user, db)

    attempts = db.query(Attempt).filter(
        Attempt.student_id == student.id,
        Attempt.is_active == False,
        Attempt.score != None
    ).all()

    if not attempts:
        return []
        
    attempt_ids = [a.id for a in attempts]
    
    from models import AttemptAnswer
    import schemas
    
    # query all answers for this student
    # join with question to get subject_id
    answers = (
        db.query(AttemptAnswer, Question.subject_id)
        .join(Question, AttemptAnswer.question_id == Question.id)
        .filter(AttemptAnswer.attempt_id.in_(attempt_ids))
        .all()
    )
    
    # Group by subject
    subject_stats = {}
    
    for ans, subj_id in answers:
        if subj_id not in subject_stats:
            subject_stats[subj_id] = {
                "total_answered": 0,
                "correct_count": 0,
                "wrong_count": 0,
                "blank_count": 0
            }
            
        subject_stats[subj_id]["total_answered"] += 1
        if not ans.selected_option:
            subject_stats[subj_id]["blank_count"] += 1
        elif ans.is_correct:
            subject_stats[subj_id]["correct_count"] += 1
        else:
            subject_stats[subj_id]["wrong_count"] += 1

    # Format result
    result = []
    subjects = db.query(Subject).filter(Subject.id.in_(subject_stats.keys())).all()
    subject_map = {s.id: s.name for s in subjects}
    
    for subj_id, stats in subject_stats.items():
        total = stats["total_answered"]
        accuracy = (stats["correct_count"] / total * 100) if total > 0 else 0.0
        
        result.append({
            "subject_id": subj_id,
            "subject_name": subject_map.get(subj_id, "Unknown"),
            "total_answered": total,
            "correct_count": stats["correct_count"],
            "wrong_count": stats["wrong_count"],
            "blank_count": stats["blank_count"],
            "accuracy_percentage": round(accuracy, 1)
        })
        
    # Sort by lowest accuracy (weakest first)
    result.sort(key=lambda x: x["accuracy_percentage"])
    
    return result
