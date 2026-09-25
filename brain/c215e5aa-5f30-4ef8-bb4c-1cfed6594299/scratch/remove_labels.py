import re

def remove_labels(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove all label tags
    content = re.sub(r'<label>.*?</label>\s*', '', content)
    
    # Change "Semua" to "Semua Tingkat" for difficulty
    content = re.sub(
        r'<option value="">Semua</option>',
        r'<option value="">Semua Tingkat</option>',
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

remove_labels(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\QuestionFilters.jsx')
remove_labels(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\TryoutTable.jsx')

print('Labels removed from filters')
