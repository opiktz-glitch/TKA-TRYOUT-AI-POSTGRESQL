import re

with open('backend/routers/questions.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'ALLOWED_OPTIONS = [\n    \"A\",\n    \"B\",\n    \"C\",\n    \"D\",\n]',
    'ALLOWED_OPTIONS_PG = [\"A\", \"B\", \"C\", \"D\"]\nALLOWED_OPTIONS_MCMA = [\"1\", \"2\", \"3\", \"4\"]\n\ndef get_allowed_options(qtype):\n    if qtype == \"TRUE_FALSE\": return [\"1\", \"2\", \"3\", \"4\", \"5\"]\n    if qtype == \"MULTIPLE_RESPONSE\": return ALLOWED_OPTIONS_MCMA\n    return ALLOWED_OPTIONS_PG\n'
)

# Fix validations
text = re.sub(
    r'if len\(question_data\.options\) != len\(ALLOWED_OPTIONS\):(.*?)f\"\{len\(ALLOWED_OPTIONS\)\} pilihan\"',
    r'allowed = get_allowed_options(question_data.question_type)\n        if len(question_data.options) != len(allowed):\1f"{len(allowed)} pilihan"',
    text,
    flags=re.DOTALL
)

with open('backend/routers/questions.py', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
