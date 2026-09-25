import os
import re

dashboard_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\Dashboard.jsx'
components_dir = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\dashboard'

os.makedirs(components_dir, exist_ok=True)

with open(dashboard_path, 'r', encoding='utf-8') as f:
    text = f.read()

# We extract imports.
imports = []
for line in text.splitlines():
    if line.startswith('import ') or '} from ' in line:
        imports.append(line)
        if '} from "../utils/dashboardUtils";' in line:
            break
    elif line.startswith('//'):
        pass
    else:
        if 'import' in line:
            imports.append(line)

imports_str = '\n'.join(imports)
# fix path for components (since it's inside components/dashboard, path to components is `..`, to hooks is `../../hooks`, to utils is `../../utils`)
imports_str = imports_str.replace('"../components/', '"../')
imports_str = imports_str.replace('"../auth/', '"../../auth/')
imports_str = imports_str.replace('"../services/', '"../../services/')
imports_str = imports_str.replace('"../utils/', '"../../utils/')
imports_str = imports_str.replace('"../hooks/', '"../../hooks/')

# Now we find the sections using regex or string splitting
# Each section looks like: `{user.role === "ADMIN" && ( ... )}`
# We can find them by looking for `{user.role === "ADMIN" && (` and matching braces.
# Since it's JSX, a simple string search is easier.

def extract_section(role_str):
    start_str = f'{{user.role === "{role_str}" && ('
    if start_str not in text:
        return ""
    start_idx = text.find(start_str)
    # find the matching `)}` at the end
    # We will just parse the string manually
    count = 0
    in_str = False
    for i in range(start_idx, len(text)):
        if text[i] == '{' and not in_str: count += 1
        elif text[i] == '}' and not in_str: count -= 1
        elif text[i] == '"': in_str = not in_str
        
        if count == 0 and i > start_idx + 2:
            return text[start_idx + len(start_str) : i-1] # without the parenthesis
    return ""

admin_jsx = extract_section('ADMIN')
teacher_jsx = extract_section('GURU')
student_jsx = extract_section('SISWA')

# Write AdminDashboard.jsx
with open(os.path.join(components_dir, 'AdminDashboard.jsx'), 'w', encoding='utf-8') as f:
    f.write(imports_str)
    f.write('\n\nexport default function AdminDashboard({ data }) {\n')
    f.write('  const { adminStats, aiCardError, aiCardLoading, aiCardStatus, attention, dashError, dashFailed, dashLoading, loadAdminData, show, user, navigate } = data;\n')
    f.write('  return (\n    <>\n')
    f.write(admin_jsx)
    f.write('\n    </>\n  );\n}\n')

# Write TeacherDashboard.jsx
with open(os.path.join(components_dir, 'TeacherDashboard.jsx'), 'w', encoding='utf-8') as f:
    f.write(imports_str)
    f.write('\n\nexport default function TeacherDashboard({ data }) {\n')
    f.write('  const { teacherStats, teacherActivity, aiCardError, aiCardLoading, aiCardStatus, dashError, dashFailed, dashLoading, loadTeacherData, show, user, navigate } = data;\n')
    f.write('  return (\n    <>\n')
    f.write(teacher_jsx)
    f.write('\n    </>\n  );\n}\n')

# Write StudentDashboard.jsx
with open(os.path.join(components_dir, 'StudentDashboard.jsx'), 'w', encoding='utf-8') as f:
    f.write(imports_str)
    f.write('\n\nexport default function StudentDashboard({ data }) {\n')
    f.write('  const { studentStats, studentTryoutsPreview, dashError, dashFailed, dashLoading, loadStudentData, show, user, navigate, areaPoints, badgeClass, baselineY, linePoints, points } = data;\n')
    f.write('  return (\n    <>\n')
    f.write(student_jsx)
    f.write('\n    </>\n  );\n}\n')

# Now rewrite Dashboard.jsx to just use these 3
new_dashboard = f"""import {{ useEffect, useState }} from "react";
import {{ useNavigate }} from "react-router-dom";
import {{ useAuth }} from "../auth/AuthContext";
import {{ useDashboard }} from "../hooks/useDashboard";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import TeacherDashboard from "../components/dashboard/TeacherDashboard";
import StudentDashboard from "../components/dashboard/StudentDashboard";
import "../components/ScoreTable.css";

function Dashboard() {{
  const {{ user }} = useAuth();
  const dashboardData = useDashboard();
  const navigate = useNavigate();

  if (!user) {{
    return (
      <div className="dashboard-card">
        <h2>Sesi tidak ditemukan. Silakan login ulang.</h2>
      </div>
    );
  }}

  const roleLabels = {{
    ADMIN: "Administrator",
    GURU: "Guru / Pengajar",
    SISWA: "Siswa",
  }};

  const commonData = {{ ...dashboardData, user, navigate }};

  return (
    <>
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>Selamat Datang, {{user.name}}!</h1>
          <p className="subtitle">
            Anda login sebagai <strong>{{roleLabels[user.role] || user.role}}</strong>
          </p>
        </div>
      </div>

      {{user.role === "ADMIN" && <AdminDashboard data={{commonData}} />}}
      {{user.role === "GURU" && <TeacherDashboard data={{commonData}} />}}
      {{user.role === "SISWA" && <StudentDashboard data={{commonData}} />}}
    </>
  );
}}

export default Dashboard;
"""

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(new_dashboard)

print('Dashboard split successfully!')
