import re

file_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\AdminSettings.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

classes = set(re.findall(r'className=[\"\']([a-zA-Z0-9_\-\s]+)[\"\']', text))
print('CSS Classes used in AdminSettings:')
for c in sorted(classes):
    print('-', c)

# extract structure outline
lines = text.splitlines()
print('\nStructure outline:')
for i, line in enumerate(lines):
    if '<div className="settings-page' in line or 'tab-header' in line or 'tab-pane' in line or 'settings-section' in line:
        print(f'{i}: {line.strip()}')
