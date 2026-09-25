import os
import re

dashboard_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\Dashboard.jsx'
hook_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\hooks\useDashboard.js'

with open(dashboard_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find imports
imports = []
for line in lines:
    if line.startswith('import'):
        imports.append(line)

start_idx = 297
loading_idx = 710

logic_lines = lines[start_idx + 1 : loading_idx]

hook_content = []
hook_content.append('import { useState, useEffect, useRef } from "react";\n')
hook_content.append('import { useAuth } from "../auth/AuthContext";\n')
api_calls = [
    'getAdminDashboardStats', 'getTeacherDashboardStats', 'getStudentDashboardStats', 'getSystemStatus', 'getAiCardStatus'
]
hook_content.append('import {\n  ' + ',\n  '.join(api_calls) + '\n} from "../services/api";\n')
hook_content.append('import { readDashboardCache, writeDashboardCache } from "../services/dashboardCache";\n')

hook_content.append('\nexport function useDashboard() {\n')
hook_content.append('  const { user } = useAuth();\n')

# Find vars to export
vars_to_export = set()
for line in logic_lines:
    # State vars
    m = re.search(r'const\s+\[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]\s*=\s*useState', line)
    if m:
        vars_to_export.add(m.group(1))
        vars_to_export.add(m.group(2))
    
    # Functions
    m2 = re.search(r'(?:const|function|async function)\s+([a-zA-Z0-9_]+)\s*(?:=|=>|\()', line)
    if m2:
        fn_name = m2.group(1)
        if fn_name not in ['user', 'navigate', 'useEffect', 'useState']:
            vars_to_export.add(fn_name)

# Ensure 'user' is exported
vars_to_export.add('user')

# If `user` is destructured again in logic_lines, we need to remove it to avoid conflicts.
# The original code has `const { user, loading } = useAuth();`
# Let's filter it out.
filtered_logic = []
for line in logic_lines:
    if 'const { user, loading } = useAuth();' in line:
        # We already declared user at the top. Let's declare loading.
        filtered_logic.append('  const { loading } = useAuth();\n')
        vars_to_export.add('loading')
    elif 'const navigate = useNavigate();' in line:
        pass # don't add useNavigate because it uses react-router-dom which we didn't import, we'll leave it in component.
    else:
        filtered_logic.append(line)

for line in filtered_logic:
    hook_content.append(line)

# Add return object
hook_content.append('\n  return {\n')
for var in sorted(list(vars_to_export)):
    if var != "navigate":
        hook_content.append(f'    {var},\n')
hook_content.append('  };\n}\n')

with open(hook_path, 'w', encoding='utf-8') as f:
    f.writelines(hook_content)

# Now rewrite Dashboard
new_dashboard = []
for i in range(start_idx + 1):
    new_dashboard.append(lines[i])

new_dashboard.insert(start_idx, 'import { useDashboard } from "../hooks/useDashboard";\n')

# In Dashboard:
new_dashboard.append('  const {\n')
for var in sorted(list(vars_to_export)):
    if var != "navigate":
        new_dashboard.append(f'    {var},\n')
new_dashboard.append('  } = useDashboard();\n\n')
new_dashboard.append('  const navigate = useNavigate();\n\n')

for i in range(loading_idx, len(lines)):
    new_dashboard.append(lines[i])

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.writelines(new_dashboard)

print("Extraction complete!")
