import re
with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\AdminSettings.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

tabs = re.findall(r'activeTab === "(.*?)"', text)
print("Tabs found:", set(tabs))
