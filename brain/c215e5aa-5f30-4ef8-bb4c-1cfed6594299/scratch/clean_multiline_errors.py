import re
import os

def clean_file(path, patterns):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    for pat in patterns:
        text = re.sub(pat, '', text, flags=re.DOTALL)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

# 1. QuestionManagement.jsx
q_jsx = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\QuestionManagement.jsx'
q_pats = [
    r'\{loadError && !showModal && <div className="error-message">\{loadError\}</div>\}\s*',
    r'\{actionError && \(\s*<div className="error-message" style=\{\{ margin: "1rem" \}\}>\s*\{actionError\}\s*</div>\s*\)\}\s*',
    r'\{actionSuccess && \(\s*<div className="success-message" style=\{\{ margin: "1rem" \}\}>\s*<IconCheck />\s*\{actionSuccess\}\s*</div>\s*\)\}\s*'
]
clean_file(q_jsx, q_pats)

# 2. TryoutManagement.jsx
# Wait, TryoutManagement has them passed to TryoutHeader?
# TryoutManagement.jsx:98: loading={loading} loadError={loadError} showModal={showModal}
# TryoutManagement.jsx:99: actionError={actionError} actionSuccess={actionSuccess}
t_jsx = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\TryoutManagement.jsx'
with open(t_jsx, 'r', encoding='utf-8') as f:
    t_text = f.read()
t_text = re.sub(r'\s*loadError=\{loadError\}', '', t_text)
t_text = re.sub(r'\s*actionError=\{actionError\}', '', t_text)
t_text = re.sub(r'\s*actionSuccess=\{actionSuccess\}', '', t_text)
with open(t_jsx, 'w', encoding='utf-8') as f:
    f.write(t_text)

# And inside TryoutHeader component? But TryoutManagement doesn't define TryoutHeader, wait it might be a component in the same file or imported?
# Actually, the python output showed them at line 98 in TryoutManagement.jsx. Let's see what that is. It was probably:
# <Header title="..." loading={loading} loadError={loadError} ... />
# So the above re.sub will remove them!

# 3. QuestionFormModal.jsx
q_modal = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\QuestionFormModal.jsx'
qm_pats = [
    r'\{formError && \(\s*<div className="error-message" style=\{\{ margin: "1rem 1rem 0" \}\}>\s*\{formError\}\s*</div>\s*\)\}\s*',
    r'\{formSuccess && \(\s*<div className="success-message" style=\{\{ margin: "1rem 1rem 0" \}\}>\s*<IconCheck />\s*\{formSuccess\}\s*</div>\s*\)\}\s*'
]
clean_file(q_modal, qm_pats)

# 4. TryoutFormWizardModal.jsx
t_modal = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\TryoutFormWizardModal.jsx'
tm_pats = [
    r'\{\(formError \|\| formSuccess\) && \(\s*<div className="wizard-form-messages">\s*\{formError && \(\s*<div className="error-message">\s*<IconTrash />\s*\{formError\}\s*</div>\s*\)\}\s*\{formSuccess && \(\s*<div className="success-message">\s*<IconCheck />\s*\{formSuccess\}\s*</div>\s*\)\}\s*</div>\s*\)\}\s*'
]
clean_file(t_modal, tm_pats)

print('Cleaned leftover multiline error renderings!')
