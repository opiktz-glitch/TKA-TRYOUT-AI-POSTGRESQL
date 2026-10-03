import re
with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\TryoutQuestionPicker.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = r'''          <div className="tqp-random-fields">
            {DIFFICULTIES.map((difficulty) => {
              const name = difficulty.value.toLowerCase();

              return (
                <label key={difficulty.value}>
                  <span>
                    {difficulty.label}
                    {data ?  · tersedia  : ""}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={RANDOM_MAX_PER_DIFFICULTY}
                    placeholder="0"
                    value={randomCounts[name]}
                    onChange={(event) =>
                      handleRandomCountChange(name, event.target.value)
                    }
                    disabled={disabled || randomLoading}
                  />
                </label>
              );
            })}
          </div>'''

replacement = r'''          <div className="tqp-random-fields">
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

# Normalize newlines to match safely
import re

text_norm = re.sub(r'\r\n', '\n', text)
target_norm = re.sub(r'\r\n', '\n', target)
replacement_norm = re.sub(r'\r\n', '\n', replacement)

if target_norm in text_norm:
    new_text = text_norm.replace(target_norm, replacement_norm)
    with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\TryoutQuestionPicker.jsx', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print('SUCCESS')
else:
    print('TARGET NOT FOUND')
