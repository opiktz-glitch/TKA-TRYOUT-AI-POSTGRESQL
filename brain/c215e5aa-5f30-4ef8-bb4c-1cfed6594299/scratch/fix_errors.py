import re

# 1. FIX useTryoutManagement.js
path_hook = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\hooks\useTryoutManagement.js'
with open(path_hook, 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'reviewingTryout,\s*', '', text)
text = re.sub(r'reviewingTryout', '', text) # Just in case

with open(path_hook, 'w', encoding='utf-8') as f:
    f.write(text)


# 2. FIX TryoutManagement.jsx
path_jsx = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\TryoutManagement.jsx'
with open(path_jsx, 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'reviewingTryout,\s*', '', text)
text = re.sub(r'reviewingTryout', '', text)

with open(path_jsx, 'w', encoding='utf-8') as f:
    f.write(text)


# 3. FIX QuestionManagement.jsx
path_q_jsx = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\QuestionManagement.jsx'
with open(path_q_jsx, 'r', encoding='utf-8') as f:
    text = f.read()

if 'ImportImageButton' not in text:
    text = text.replace('import ImportDocumentModal from "../components/ImportDocumentModal";',
                        'import ImportDocumentModal from "../components/ImportDocumentModal";\nimport ImportImageButton from "../components/ImportImageButton";')

if 'ExplanationField' not in text:
    text = text.replace('import ImportDocumentModal from "../components/ImportDocumentModal";',
                        'import ImportDocumentModal from "../components/ImportDocumentModal";\nimport ExplanationField from "../components/ExplanationField";')

if 'OptionsEditor' not in text:
    text = text.replace('import ImportDocumentModal from "../components/ImportDocumentModal";',
                        'import ImportDocumentModal from "../components/ImportDocumentModal";\nimport OptionsEditor from "../components/OptionsEditor";')

if 'QuestionImage' not in text:
    text = text.replace('import ImportDocumentModal from "../components/ImportDocumentModal";',
                        'import ImportDocumentModal from "../components/ImportDocumentModal";\nimport QuestionImage from "../components/QuestionImage";')

if 'IconTrash' not in text:
    text = text.replace('import { IconCheck } from "../components/Icons";',
                        'import { IconCheck, IconTrash, IconEdit, IconBook, IconEye } from "../components/Icons";')

with open(path_q_jsx, 'w', encoding='utf-8') as f:
    f.write(text)

print('Fixed reviewingTryout and QuestionManagement imports')
