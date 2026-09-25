import re
import os

files = [
    r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\dashboard\AdminDashboard.jsx',
    r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\dashboard\TeacherDashboard.jsx'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    icons_used = set(re.findall(r'<(Icon[A-Za-z0-9_]+)', text))
    if not icons_used:
        continue
    
    icons_str = ', '.join(sorted(icons_used))
    import_stmt = 'import { ' + icons_str + ' } from "../Icons";\n'
    
    if import_stmt not in text and 'from "../Icons"' not in text:
        text = import_stmt + text
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print('Added icons to ' + os.path.basename(file_path) + ': ' + icons_str)
    elif 'from "../Icons"' in text or "from '../Icons'" in text or 'from "@tabler/icons-react"' in text or "from '@tabler/icons-react'" in text:
        text = re.sub(r'import\s+\{.*\}\s+from\s+[\"\'](\.\./Icons|@tabler/icons-react)[\"\'];?\n?', import_stmt, text)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print('Updated icons in ' + os.path.basename(file_path) + ': ' + icons_str)
