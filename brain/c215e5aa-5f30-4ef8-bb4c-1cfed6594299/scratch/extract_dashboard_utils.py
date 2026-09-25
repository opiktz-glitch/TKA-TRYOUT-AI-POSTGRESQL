import os
import re

dashboard_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\Dashboard.jsx'
utils_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\utils\dashboardUtils.js'

with open(dashboard_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find function Dashboard() {
dashboard_idx = -1
for i, line in enumerate(lines):
    if line.startswith('function Dashboard() {'):
        dashboard_idx = i
        break

# The end of imports at the top
end_imports_idx = -1
for i in range(dashboard_idx):
    # stop checking when we hit the first helper or comment block
    if lines[i].startswith('// ======'):
        break
    if lines[i].startswith('import ') or '} from ' in lines[i]:
        end_imports_idx = i

# The utility logic is from end_imports_idx + 1 to dashboard_idx - 1
utils_lines = lines[end_imports_idx + 1 : dashboard_idx]
# filter out the import useDashboard if it got caught in utils
filtered_utils = []
for line in utils_lines:
    if line.startswith('import { useDashboard }'):
        pass
    else:
        filtered_utils.append(line)
utils_lines = filtered_utils

exports = []
new_utils_lines = []

new_utils_lines.append('import { parseUtcDate } from "./date";\n\n')

for line in utils_lines:
    if line.startswith('function '):
        new_utils_lines.append('export ' + line)
        m = re.match(r'function\s+([a-zA-Z0-9_]+)\(', line)
        if m: exports.append(m.group(1))
    elif line.startswith('const '):
        new_utils_lines.append('export ' + line)
        m = re.match(r'const\s+([a-zA-Z0-9_]+)\s*=', line)
        if m: exports.append(m.group(1))
    else:
        new_utils_lines.append(line)

with open(utils_path, 'w', encoding='utf-8') as f:
    f.writelines(new_utils_lines)

# Now, rewrite Dashboard.jsx
new_dashboard = []
for i in range(end_imports_idx + 1):
    new_dashboard.append(lines[i])

import_stmt = 'import {\n  ' + ',\n  '.join(exports) + '\n} from "../utils/dashboardUtils";\n\n'
new_dashboard.append(import_stmt)

# ensure we bring back import useDashboard
new_dashboard.append('import { useDashboard } from "../hooks/useDashboard";\n\n')

for i in range(dashboard_idx, len(lines)):
    new_dashboard.append(lines[i])

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.writelines(new_dashboard)

print("Extraction to dashboardUtils.js complete!")
