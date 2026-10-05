import re
import os
import sys

# 1. Update questions.py
f = 'backend/routers/questions.py'
with open(f, 'r', encoding='utf-8') as file:
    text = file.read()

# Replace ALLOWED_OPTIONS definition
text = text.replace(
    'ALLOWED_OPTIONS = [\n    "A",\n    "B",\n    "C",\n    "D",\n]',
    'ALLOWED_OPTIONS_PG = ["A", "B", "C", "D"]\nALLOWED_OPTIONS_MCMA = ["1", "2", "3", "4"]\n\ndef get_allowed_options(qtype: str):\n    if qtype == "TRUE_FALSE": return ["1", "2", "3", "4", "5"]\n    if qtype == "MULTIPLE_RESPONSE": return ALLOWED_OPTIONS_MCMA\n    return ALLOWED_OPTIONS_PG\n'
)

# Fix validations
text = re.sub(
    r'if len\(question_data\.options\) != len\(ALLOWED_OPTIONS\):(.*?)raise HTTPException\((.*?)\"\{len\(ALLOWED_OPTIONS\)\} pilihan\"',
    r'allowed = get_allowed_options(question_data.question_type)\n        if len(question_data.options) != len(allowed):\1raise HTTPException(\2f"{len(allowed)} pilihan"',
    text,
    flags=re.DOTALL
)

# Replace 'in ALLOWED_OPTIONS'
text = text.replace('if code not in ALLOWED_OPTIONS:', 'if code not in allowed:')
text = text.replace('if set(option_codes) != set(ALLOWED_OPTIONS):', 'if set(option_codes) != set(allowed):')
text = text.replace('c not in ALLOWED_OPTIONS', 'c not in get_allowed_options(question_type)')
text = text.replace('verified_code not in ALLOWED_OPTIONS', 'verified_code not in get_allowed_options(question_type)')
text = text.replace('len(raw_options) != len(ALLOWED_OPTIONS)', 'len(raw_options) != len(get_allowed_options(question_type))')
text = text.replace('AI tidak menghasilkan {len(ALLOWED_OPTIONS)} pilihan', 'AI tidak menghasilkan {len(get_allowed_options(question_type))} pilihan')
text = text.replace('code not in ALLOWED_OPTIONS', 'code not in get_allowed_options(question_type)')
text = text.replace('seen_codes != set(ALLOWED_OPTIONS)', 'seen_codes != set(get_allowed_options(question_type))')
text = text.replace('option["option_code"] = ALLOWED_OPTIONS[index]', 'option["option_code"] = get_allowed_options(question_type)[index]')
text = text.replace('is_allowed_code = code in ALLOWED_OPTIONS', 'is_allowed_code = code in get_allowed_options(question_type)')
text = text.replace('allowed_codes = ALLOWED_OPTIONS if question_type in ("MULTIPLE_CHOICE", "MULTIPLE_RESPONSE") else ["1", "2", "3", "4", "5"]', 'allowed_codes = get_allowed_options(question_type)')

with open(f, 'w', encoding='utf-8') as file:
    file.write(text)

# 2. Database Migration
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from database import SessionLocal
from models import Question, QuestionOption

db = SessionLocal()
questions = db.query(Question).filter(Question.question_type == 'MULTIPLE_RESPONSE').all()

mapping = {'A': '1', 'B': '2', 'C': '3', 'D': '4'}

for q in questions:
    options = db.query(QuestionOption).filter(QuestionOption.question_id == q.id).all()
    for opt in options:
        if opt.option_code in mapping:
            opt.option_code = mapping[opt.option_code]

db.commit()
print('Refactor and migration complete!')
