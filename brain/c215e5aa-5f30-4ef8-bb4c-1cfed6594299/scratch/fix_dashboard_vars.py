import re

hook_file = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\hooks\useDashboard.js'
dashboard_file = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\Dashboard.jsx'

with open(hook_file, 'r', encoding='utf-8') as f:
    hook_text = f.read()

# Variables that were wrongly extracted and returned
bad_vars = ['attention', 'cached', 'data', 'updated']

for v in bad_vars:
    hook_text = re.sub(r'\n\s*' + v + r',?', '', hook_text)

with open(hook_file, 'w', encoding='utf-8') as f:
    f.write(hook_text)

with open(dashboard_file, 'r', encoding='utf-8') as f:
    dash_text = f.read()

for v in bad_vars:
    dash_text = re.sub(r'\b' + v + r'\b,?\s*', '', dash_text)

with open(dashboard_file, 'w', encoding='utf-8') as f:
    f.write(dash_text)

print("Removed bad vars")
