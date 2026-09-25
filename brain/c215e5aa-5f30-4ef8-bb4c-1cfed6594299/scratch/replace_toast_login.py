import os
import re

file_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\LoginForm.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add import toast
if 'import toast from' not in text:
    text = text.replace('import { useState } from "react";', 'import { useState } from "react";\nimport toast from "react-hot-toast";')

# Remove formError state
text = re.sub(r'const\s+\[formError,\s*setFormError\]\s*=\s*useState\(""\);\s*', '', text)

# Replace setFormError("") with nothing
text = re.sub(r'setFormError\(""\);\s*', '', text)

# Replace setFormError(msg) with toast.error(msg)
text = re.sub(r'setFormError\(\s*(.*?)\s*\);', r'toast.error(\1);', text, flags=re.DOTALL)

# Remove the inline error rendering
error_render_regex = r'\{formError && \(\s*<div\s*className="form-error-message"\s*style=\{\{\s*marginBottom:\s*"15px"\s*\}\}\s*>\s*\{formError\}\s*</div>\s*\)\}\s*'
text = re.sub(error_render_regex, '', text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated LoginForm.jsx')
