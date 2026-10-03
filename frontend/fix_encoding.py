import re

file_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\TryoutQuestionPicker.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix encoding issues (mojibake)
# Ã· -> ·
# â€œ -> “
# â€ -> ”
# â€” -> —
text = text.replace('Ã·', '·')
text = text.replace('â€œ', '“')
text = text.replace('â€', '”')
text = text.replace('â€”', '—')
text = text.replace('?"', '—') # For the weird characters in comments

# Add the button back if it's missing
if 'tqp-random-submit' not in text:
    pattern = r'(</label>\s*</div>)'
    replacement = r'''</label>
          </div>

          <button
            type="button"
            className="primary-button tqp-random-submit"
            onClick={handleRandomPick}
            disabled={disabled || randomLoading}
          >
            {randomLoading ? "Mengambil..." : "Ambil soal"}
          </button>'''
    
    # We need to find the specific closing div of tqp-random-fields
    # Let's use a more precise replacement
    text = text.replace('</label>\n          </div>', replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed encoding and added button back")
