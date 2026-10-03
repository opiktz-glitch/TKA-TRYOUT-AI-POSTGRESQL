import sys
import os
sys.path.insert(0, os.path.abspath('c:/Projects/TKA-TryOut-AI-Postgresql/backend'))

from database import SessionLocal
from models import Question, User
from routers.tryouts import _bank_filters, _bank_query

db = SessionLocal()
subject_id = 2
scope = 'all'

current_user = db.query(User).filter(User.role == 'ADMIN').first()
if not current_user:
    current_user = db.query(User).first()

conditions = _bank_filters(current_user, subject_id, scope, None)

q_type = 'MULTIPLE_CHOICE'
rows = (
    _bank_query(db)
    .filter(
        *conditions,
        Question.question_type == q_type
    )
    .limit(4)
    .all()
)
print('MULTIPLE_CHOICE count:', len(rows))
db.close()
