import re

# Fix useAdminSettings.js
with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\hooks\useAdminSettings.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect } from "react";\nimport { useNavigate } from "react-router-dom";')

tabs = """
const TABS = [
  { key: "profile", label: "Profil Saya" },
  { key: "ai-model", label: "AI" },
  { key: "security", label: "Keamanan" },
  { key: "backup", label: "Backup" },
  { key: "network", label: "Jaringan" },
];
"""

text = text.replace('export function useAdminSettings() {', tabs + '\nexport function useAdminSettings() {')

with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\hooks\useAdminSettings.js', 'w', encoding='utf-8') as f:
    f.write(text)

# Fix AdminSettings.jsx
with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\AdminSettings.jsx', 'r', encoding='utf-8') as f:
    admin_text = f.read()

for imp in ['useState', 'useEffect', 'useNavigate', 'getAIProviders', 'updateActiveProvider', 'updateProviderConfig', 'clearProviderConfig', 'getSecretKeyStatus', 'updateSecretKey', 'rotateSecretKey', 'getNetworkInfo', 'getSystemStatus', 'getBackups', 'createBackupNow', 'downloadBackup', 'restoreFromExistingBackup', 'restoreFromUpload']:
    admin_text = re.sub(r'\b' + imp + r'\b,?\s*', '', admin_text)

admin_text = re.sub(r'import\s+\{\s*\}\s*from\s*"[^"]+";', '', admin_text)
admin_text = re.sub(r'const TABS = \[.*?\];', '', admin_text, flags=re.DOTALL)
admin_text = admin_text.replace('import { useAuth } from "../auth/AuthContext";', '')

with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\AdminSettings.jsx', 'w', encoding='utf-8') as f:
    f.write(admin_text)

print('Done fixing')
