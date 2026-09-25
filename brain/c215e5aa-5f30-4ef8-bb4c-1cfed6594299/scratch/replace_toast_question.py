import os
import re

hook_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\hooks\useQuestionManagement.js'
with open(hook_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Import toast
if 'import toast' not in text:
    text = text.replace('import { useAuth } from "../auth/AuthContext";', 'import { useAuth } from "../auth/AuthContext";\nimport toast from "react-hot-toast";')

# Remove states
states_to_remove = [
    r'const \[loadError, setLoadError\] = useState\(""\);\s*',
    r'const \[actionError, setActionError\] = useState\(""\);\s*',
    r'const \[formError, setFormError\] = useState\(""\);\s*',
    r'const \[imageActionError, setImageActionError\] = useState\(""\);\s*',
    r'const \[actionSuccess, setActionSuccess\] = useState\(""\);\s*',
    r'const \[formSuccess, setFormSuccess\] = useState\(""\);\s*',
]
for state_regex in states_to_remove:
    text = re.sub(state_regex, '', text)

# Replace set*("") with nothing or comments
text = re.sub(r'setLoadError\(""\);?\s*', '', text)
text = re.sub(r'setActionError\(""\);?\s*', '', text)
text = re.sub(r'setFormError\(""\);?\s*', '', text)
text = re.sub(r'setImageActionError\(""\);?\s*', '', text)
text = re.sub(r'setActionSuccess\(""\);?\s*', '', text)
text = re.sub(r'setFormSuccess\(""\);?\s*', '', text)

# Replace set*(msg) with toast.error or toast.success
def replacer(match):
    func = match.group(1)
    msg = match.group(2)
    if 'Success' in func:
        return f'toast.success({msg})'
    else:
        return f'toast.error({msg})'

text = re.sub(r'(set(?:Load|Action|Form|ImageAction)(?:Error|Success))\((.*?)\)', replacer, text)

# Remove the exported variables
vars_to_remove = [
    'actionError', 'actionSuccess', 'formError', 'formSuccess', 'imageActionError', 'loadError',
    'setActionError', 'setActionSuccess', 'setFormError', 'setFormSuccess', 'setImageActionError', 'setLoadError'
]

for var in vars_to_remove:
    text = re.sub(rf'\b{var},\s*', '', text)

with open(hook_path, 'w', encoding='utf-8') as f:
    f.write(text)

# Also update QuestionManagement.jsx
jsx_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\QuestionManagement.jsx'
with open(jsx_path, 'r', encoding='utf-8') as f:
    jsx_text = f.read()

for var in vars_to_remove:
    jsx_text = re.sub(rf'\b{var},\s*', '', jsx_text)

# Remove the inline error renderings
# Example: {loadError && <div className="error-message">{loadError}</div>}
jsx_text = re.sub(r'\{loadError\s*&&\s*<div[^>]*>\{loadError\}</div>\}\s*', '', jsx_text)
jsx_text = re.sub(r'\{actionError\s*&&\s*<div[^>]*>\{actionError\}</div>\}\s*', '', jsx_text)
jsx_text = re.sub(r'\{actionSuccess\s*&&\s*<div[^>]*>\{actionSuccess\}</div>\}\s*', '', jsx_text)

# Update modals that were receiving these props
# QuestionFormModal, etc. Since we are passing them? No, we don't pass them in QuestionManagement, 
# QuestionManagement passes them directly, wait, let's check if they are passed as props
jsx_text = re.sub(r'\s*formError=\{formError\}', '', jsx_text)
jsx_text = re.sub(r'\s*formSuccess=\{formSuccess\}', '', jsx_text)
jsx_text = re.sub(r'\s*imageActionError=\{imageActionError\}', '', jsx_text)

# In case some were passed down to QuestionFormModal
# The form modal might still have them in its prop list, but they will be undefined. 
# We'll fix QuestionFormModal next.

with open(jsx_path, 'w', encoding='utf-8') as f:
    f.write(jsx_text)

print('Updated hook and jsx')
