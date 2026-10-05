import re

# 1. Update questionConstants.js
with open('frontend/src/data/questionConstants.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'export const OPTION_CODES = [\"A\", \"B\", \"C\", \"D\"];',
    'export const OPTION_CODES = [\"A\", \"B\", \"C\", \"D\"];\nexport const OPTION_CODES_MCMA = [\"1\", \"2\", \"3\", \"4\"];\n'
)

with open('frontend/src/data/questionConstants.js', 'w', encoding='utf-8') as f:
    f.write(text)

# 2. Update QuestionManagement.jsx
with open('frontend/src/pages/QuestionManagement.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'import { OPTION_CODES, DIFFICULTIES }',
    'import { OPTION_CODES, OPTION_CODES_MCMA, DIFFICULTIES }'
)
text = text.replace(
    'useQuestionManagement(OPTION_CODES, DIFFICULTIES);',
    'useQuestionManagement(OPTION_CODES, OPTION_CODES_MCMA, DIFFICULTIES);'
)

with open('frontend/src/pages/QuestionManagement.jsx', 'w', encoding='utf-8') as f:
    f.write(text)

# 3. Update useQuestionManagement.js
with open('frontend/src/hooks/useQuestionManagement.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'export function useQuestionManagement(OPTION_CODES, DIFFICULTIES)',
    'export function useQuestionManagement(OPTION_CODES, OPTION_CODES_MCMA, DIFFICULTIES)'
)

text = text.replace(
    '''  const createEmptyForm = (questionType = "MULTIPLE_CHOICE") => {''',
    '''  const createEmptyForm = (questionType = "MULTIPLE_CHOICE") => {
    const codes = questionType === "MULTIPLE_RESPONSE" ? OPTION_CODES_MCMA : OPTION_CODES;'''
)
# Wait, createEmptyForm currently takes no arguments!
text = text.replace(
    '''  const createEmptyForm = () => ({
    subject_id: "",
    question_text: "",
    question_type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    true_label: "Benar",
    false_label: "Salah",
    explanation: "",
    points: 1,
    is_active: true,

    options: OPTION_CODES.map((code) => ({
      option_code: code,
      option_text: "",
      is_correct: false,
    })),
  });''',
    '''  const createEmptyForm = (qType = "MULTIPLE_CHOICE") => ({
    subject_id: "",
    question_text: "",
    question_type: qType,
    difficulty: "MEDIUM",
    true_label: "Benar",
    false_label: "Salah",
    explanation: "",
    points: 1,
    is_active: true,

    options: (qType === "MULTIPLE_RESPONSE" ? OPTION_CODES_MCMA : OPTION_CODES).map((code) => ({
      option_code: code,
      option_text: "",
      is_correct: false,
    })),
  });'''
)

text = text.replace(
    '''  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }''',
    '''  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "question_type") {
       setForm((prev) => {
         const newType = value;
         const codes = newType === "MULTIPLE_RESPONSE" ? OPTION_CODES_MCMA : OPTION_CODES;
         return {
           ...prev,
           question_type: newType,
           options: codes.map(code => {
             const existing = prev.options.find(o => o.option_code === code);
             return {
               option_code: code,
               option_text: existing ? existing.option_text : "",
               is_correct: existing ? existing.is_correct : false
             };
           })
         };
       });
       return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }'''
)

text = text.replace(
    '''      const optionCodesToMap = isTrueFalse 
        ? (question.options?.map(o => o.option_code) || [])
        : OPTION_CODES;''',
    '''      const isMcma = question.question_type === "MULTIPLE_RESPONSE";
      const optionCodesToMap = isTrueFalse 
        ? (question.options?.map(o => o.option_code) || [])
        : (isMcma ? OPTION_CODES_MCMA : OPTION_CODES);'''
)

text = text.replace(
    '''        options: result.options.map((option) => ({
            option_code: option.option_code,
            option_text: option.option_text || "",
            is_correct: option.is_correct || false,
          })),''',
    '''        options: result.options.map((option, idx) => ({
            option_code: result.question_type === "MULTIPLE_RESPONSE" ? OPTION_CODES_MCMA[idx] : OPTION_CODES[idx],
            option_text: option.option_text || "",
            is_correct: option.is_correct || false,
          })),'''
)

with open('frontend/src/hooks/useQuestionManagement.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Frontend refactored!')
