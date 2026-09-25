import os
import re

file_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\AdminSettings.jsx'
hook_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\hooks\useAdminSettings.js'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Identify where `function AdminSettings() {` starts.
start_match = re.search(r'function\s+AdminSettings\s*\(\)\s*\{', text)
start_idx = start_match.end()
start_pos = start_match.start()

# 2. Identify where the main `return (` starts.
# We will search from start_idx for `\n  return (`
main_return_match = re.search(r'\n\s*return\s*\(', text[start_idx:])
main_return_idx = start_idx + main_return_match.start()

# 3. The extracted logic is everything from start_idx to main_return_idx
logic_body = text[start_idx:main_return_idx]

# 4. Find all local variables/functions that need to be returned by the hook
# We look for `const something =`, `function something(`, `let something =`
# Simple regex to catch top-level declarations within this block
declarations = re.findall(r'^\s*(?:const|let|function)\s+([a-zA-Z0-9_]+)(?:\s*=|\[|\()', logic_body, re.MULTILINE)

# Some constants are array destructuring `const [val, setVal] = useState(...)`
# We can find them with another regex
array_destructs = re.findall(r'^\s*const\s*\[(.*?)\]\s*=', logic_body, re.MULTILINE)
vars_to_return = []
for var in declarations:
    if var not in vars_to_return:
        vars_to_return.append(var)

for destruct in array_destructs:
    parts = [p.strip() for p in destruct.split(',')]
    for p in parts:
        if p and p not in vars_to_return:
            vars_to_return.append(p)

# Clean up any keywords caught accidentally
keywords = ['if', 'return', 'else', 'switch']
vars_to_return = sorted([v for v in vars_to_return if v not in keywords])

# 5. Build the useAdminSettings.js content
# We need the API imports that the logic uses. Let's just import all the api functions.
api_imports = []
api_functions = ['getAIStatus', 'updateAIProvider', 'updateAIApiKey', 'updateDatabaseKey', 'getSystemStatus', 'adminClearCache', 'getBackups', 'createBackup', 'deleteBackup', 'restoreBackup', 'uploadBackup', 'fetchNetworkInfo', 'updateNetworkMode']
for f in api_functions:
    if f in logic_body:
        api_imports.append(f)

hook_content = f"""import {{ useState, useEffect }} from "react";
import {{ useAuth }} from "../auth/AuthContext";
import {{
  {', '.join(api_imports)}
}} from "../services/api";

export function useAdminSettings() {{
{logic_body}

  return {{
    {', '.join(vars_to_return)}
  }};
}}
"""

with open(hook_path, 'w', encoding='utf-8') as f:
    f.write(hook_content)

# 6. Re-write AdminSettings.jsx
# We need to replace the logic body with `const { ... } = useAdminSettings();`

new_admin_settings = text[:start_idx] + f"""
  const {{
    {', '.join(vars_to_return)}
  }} = useAdminSettings();
""" + text[main_return_idx:]

# Also add the import to useAdminSettings at the top if not present
if 'useAdminSettings' not in new_admin_settings:
    # insert before function AdminSettings
    insert_pos = new_admin_settings.rfind('\n', 0, start_pos)
    new_admin_settings = new_admin_settings[:insert_pos] + '\nimport { useAdminSettings } from "../hooks/useAdminSettings";' + new_admin_settings[insert_pos:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_admin_settings)

print("Extraction to useAdminSettings.js complete!")
