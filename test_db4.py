import sys
import os
sys.path.insert(0, os.path.abspath('c:/Projects/TKA-TryOut-AI-Postgresql/backend'))

from database import SessionLocal
from models import User
from routers.tryouts import pick_random_questions, RandomPickRequest

db = SessionLocal()

current_user = db.query(User).filter(User.role == 'ADMIN').first()
if not current_user:
    current_user = db.query(User).first()

req = RandomPickRequest(
    subject_id=2,
    scope='all',
    search=None,
    exclude_ids=[],
    pg=4,
    pgk=0,
    bs=4
)

res = pick_random_questions(req, db, current_user)
print("Requested:", res['requested'])
print("Picked:", res['picked'])
print("Items length:", len(res['items']))

db.close()
