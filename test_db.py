from backend.database import SessionLocal
from backend.models import Question
from sqlalchemy.sql.expression import func

db = SessionLocal()
q_type = 'MULTIPLE_CHOICE'
subject_id = 2
scope = 'all'

rows = (
    db.query(Question.id, Question.question_type, Question.is_active, Question.subject_id)
    .filter(Question.subject_id == subject_id)
    .filter(Question.is_active == True)
    .filter(Question.question_type == q_type)
    .limit(4)
    .all()
)
print('MULTIPLE_CHOICE count:', len(rows))
for r in rows:
    print(r)

db.close()
