import re
with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\TryoutQuestionPicker.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'<div className="tqp-random-fields">.*?</div>'
replacement = r'''<div className="tqp-random-fields">
            <label>
              <span>
                PG
                {data ?  · tersedia  : ""}
              </span>
              <input
                type="number"
                min="0"
                max={RANDOM_MAX_PER_DIFFICULTY}
                placeholder="0"
                value={randomCounts.pg}
                onChange={(event) =>
                  handleRandomCountChange("pg", event.target.value)
                }
                disabled={disabled || randomLoading}
              />
            </label>

            <label>
              <span>
                PGK
                {data ?  · tersedia  : ""}
              </span>
              <input
                type="number"
                min="0"
                max={RANDOM_MAX_PER_DIFFICULTY}
                placeholder="0"
                value={randomCounts.pgk}
                onChange={(event) =>
                  handleRandomCountChange("pgk", event.target.value)
                }
                disabled={disabled || randomLoading}
              />
            </label>

            <label>
              <span>
                B/S
                {data ?  · tersedia  : ""}
              </span>
              <input
                type="number"
                min="0"
                max={RANDOM_MAX_PER_DIFFICULTY}
                placeholder="0"
                value={randomCounts.bs}
                onChange={(event) =>
                  handleRandomCountChange("bs", event.target.value)
                }
                disabled={disabled || randomLoading}
              />
            </label>
          </div>'''

new_text = re.sub(pattern, replacement, text, flags=re.DOTALL)

with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\TryoutQuestionPicker.jsx', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("regex replaced")
