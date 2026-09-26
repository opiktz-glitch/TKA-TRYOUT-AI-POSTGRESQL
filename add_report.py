import re

with open('backend/routers/admin.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_logic = """
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
        "popular_tryouts": popular_tryouts,"""

content = content.replace("    return {", new_logic)

with open('backend/routers/admin.py', 'w', encoding='utf-8') as f:
    f.write(content)
