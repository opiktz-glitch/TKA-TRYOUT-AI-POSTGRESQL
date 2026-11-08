import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import QuestionImage from "../components/QuestionImage";
import {
  answerPracticeQuestion,
  finishPracticeAttempt,
  getPracticeAttempt,
} from "../services/api";
import "./StudentPracticeAttempt.css";

function parseTrueFalse(value) {
  return Object.fromEntries(
    (value || "")
      .split(",")
      .filter(Boolean)
      .map((part) => {
        const [code, answer] = part.split(":");
        return [code, answer];
      })
  );
}

function StudentPracticeAttempt() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState(null);

  const loadAttempt = useCallback(async () => {
    try {
      const data = await getPracticeAttempt(attemptId);
      setAttempt(data);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Gagal memuat sesi latihan.");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  async function retryLoadAttempt() {
    setLoading(true);
    setError("");
    await loadAttempt();
  }

  useEffect(() => {
    let active = true;
    getPracticeAttempt(attemptId)
      .then((data) => {
        if (!active) return;
        setAttempt(data);
        setQuestionIndex(0);
        setSelections({});
        setResult(null);
        setError("");
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || "Gagal memuat sesi latihan.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attemptId]);

  const question = attempt?.questions?.[questionIndex];
  const selection = question
    ? selections[question.id] ?? question.selected_option ?? ""
    : "";
  const trueFalseSelection = useMemo(
    () => parseTrueFalse(selection),
    [selection]
  );

  function updateSelection(value) {
    if (!question) return;
    setSelections((current) => ({ ...current, [question.id]: value }));
  }

  function toggleMultipleResponse(code) {
    const selected = new Set(selection ? selection.split(",") : []);
    if (selected.has(code)) selected.delete(code);
    else selected.add(code);
    updateSelection([...selected].sort().join(","));
  }

  function setTrueFalseAnswer(code, answer) {
    const updated = { ...trueFalseSelection, [code]: answer };
    updateSelection(
      question.options
        .map((option) => `${option.option_code}:${updated[option.option_code] || ""}`)
        .filter((entry) => !entry.endsWith(":"))
        .join(",")
    );
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!question || !selection) {
      toast.error("Pilih jawaban terlebih dahulu.");
      return;
    }
    if (
      question.question_type === "TRUE_FALSE" &&
      Object.keys(trueFalseSelection).length !== question.options.length
    ) {
      toast.error("Tentukan jawaban untuk setiap pernyataan.");
      return;
    }
    setSaving(true);
    try {
      const answer = await answerPracticeQuestion(attemptId, {
        question_id: question.id,
        selected_option: selection,
      });
      setAttempt((current) => ({
        ...current,
        current_answers: current.questions.filter(
          (item) => item.selected_option
        ).length + (question.selected_option ? 0 : 1),
        correct_count:
          current.correct_count -
          (question.is_correct ? 1 : 0) +
          (answer.is_correct ? 1 : 0),
        questions: current.questions.map((item) =>
          item.id === question.id
            ? {
                ...item,
                selected_option: answer.selected_option,
                is_correct: answer.is_correct,
                correct_option_codes: answer.correct_option_codes,
                correct_answers: answer.correct_answers,
                explanation: answer.explanation,
              }
            : item
        ),
      }));
    } catch (requestError) {
      toast.error(requestError.message || "Jawaban belum tersimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function finishAttempt() {
    const unanswered = attempt.question_count - attempt.current_answers;
    const message = unanswered > 0
      ? `Masih ada ${unanswered} soal yang belum dijawab. Selesaikan latihan sekarang?`
      : "Selesaikan latihan ini?";
    if (!window.confirm(message)) return;
    setFinishing(true);
    try {
      const data = await finishPracticeAttempt(attemptId);
      setResult(data);
      setAttempt((current) => ({ ...current, status: "COMPLETED" }));
      try {
        const completedAttempt = await getPracticeAttempt(attemptId);
        setAttempt(completedAttempt);
      } catch (requestError) {
        toast.error(
          requestError.message ||
          "Latihan selesai, tetapi pembahasan belum dapat dimuat. Muat ulang halaman untuk mencoba lagi."
        );
      }
    } catch (requestError) {
      toast.error(requestError.message || "Latihan belum dapat diselesaikan.");
    } finally {
      setFinishing(false);
    }
  }

  const correctAnswerLabels = question?.correct_answers?.map((answer) => {
    if (question.question_type === "TRUE_FALSE") return answer;
    const option = question.options.find((item) => item.option_code === answer);
    return option ? `${answer}. ${option.option_text}` : answer;
  });

  if (loading) {
    return <div className="student-attempt-state">Memuat latihan...</div>;
  }
  if (error) {
    return (
      <div className="student-attempt-state is-error" role="alert">
        <p>{error}</p>
        <button type="button" className="secondary-button" onClick={retryLoadAttempt}>
          Coba lagi
        </button>
      </div>
    );
  }
  if (attempt && attempt.attempt_id !== Number(attemptId)) {
    return <div className="student-attempt-state">Memuat latihan...</div>;
  }
  if (!attempt) return null;

  if (result || attempt.status === "COMPLETED") {
    const summary = result || attempt;
    return (
      <div className="student-attempt-page">
        <section className="student-attempt-result">
          <span className="student-attempt-result-mark" aria-hidden="true">✓</span>
          <h1>Latihan selesai</h1>
          <p>{attempt.title}</p>
          <div className="student-attempt-result-stats">
            <div><strong>{summary.correct_count}</strong><span>Benar</span></div>
            <div><strong>{summary.wrong_count}</strong><span>Salah</span></div>
            <div><strong>{summary.unanswered_count}</strong><span>Belum dijawab</span></div>
          </div>
          <p className="student-attempt-result-note">
            Hasil ini hanya untuk latihan dan tidak memengaruhi nilai Tryout.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/student/practices")}
          >
            Kembali ke daftar latihan
          </button>
        </section>
        <section className="student-attempt-review">
          <h2>Ringkasan pembahasan</h2>
          {attempt.questions.map((item, index) => (
            <article key={item.id} className="student-attempt-review-item">
              <h3>Soal {index + 1}</h3>
              <p>{item.question_text}</p>
              <strong className={item.is_correct ? "is-correct" : "is-wrong"}>
                {item.selected_option
                  ? item.is_correct ? "Benar" : "Belum tepat"
                  : "Tidak dijawab"}
              </strong>
              {item.correct_answers?.length > 0 && (
                <p>
                  Jawaban benar: {item.question_type === "TRUE_FALSE"
                    ? item.correct_answers.join("; ")
                    : item.correct_answers
                      .map((code) => {
                        const option = item.options.find(
                          (candidate) => candidate.option_code === code
                        );
                        return option ? `${code}. ${option.option_text}` : code;
                      })
                      .join("; ")}
                </p>
              )}
              {item.explanation && <p>{item.explanation}</p>}
            </article>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="student-attempt-page">
      <header className="student-attempt-header">
        <div>
          <button
            type="button"
            className="student-attempt-back"
            onClick={() => navigate("/student/practices")}
          >
            ← Daftar latihan
          </button>
          <h1>{attempt.title}</h1>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={finishAttempt}
          disabled={finishing || saving}
        >
          {finishing ? "Menyelesaikan..." : "Selesaikan latihan"}
        </button>
      </header>

      <div className="student-attempt-progress">
        <span>Soal {questionIndex + 1} dari {attempt.question_count}</span>
        <span>{attempt.current_answers} sudah dijawab</span>
      </div>
      <div
        className="student-attempt-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={attempt.question_count}
        aria-valuenow={attempt.current_answers}
        aria-label="Jumlah soal yang sudah dijawab"
      >
        <span
          style={{
            width: `${(attempt.current_answers / Math.max(attempt.question_count, 1)) * 100}%`,
          }}
        />
      </div>

      {question && (
        <section className="student-attempt-question">
          <div className="student-attempt-question-heading">
            <span>Soal {question.question_number}</span>
            <span>{question.question_type.replaceAll("_", " ")}</span>
          </div>
          <p className="student-attempt-question-text">{question.question_text}</p>
          {question.has_image && <QuestionImage questionId={question.id} />}

          <form onSubmit={submitAnswer}>
            <div className="student-attempt-options">
              {question.options.map((option) => {
                if (question.question_type === "TRUE_FALSE") {
                  return (
                    <fieldset className="student-attempt-true-false" key={option.option_code}>
                      <legend>{option.option_code}. {option.option_text}</legend>
                      {[
                        ["T", question.true_label || "Benar"],
                        ["F", question.false_label || "Salah"],
                      ].map(([value, label]) => (
                        <label key={value}>
                          <input
                            type="radio"
                            name={`answer-${question.id}-${option.option_code}`}
                            value={value}
                            checked={trueFalseSelection[option.option_code] === value}
                            onChange={() => setTrueFalseAnswer(option.option_code, value)}
                            disabled={saving || finishing}
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                  );
                }

                const checked = question.question_type === "MULTIPLE_RESPONSE"
                  ? selection.split(",").includes(option.option_code)
                  : selection === option.option_code;
                return (
                  <label className="student-attempt-option" key={option.option_code}>
                    <input
                      type={question.question_type === "MULTIPLE_RESPONSE" ? "checkbox" : "radio"}
                      name={`answer-${question.id}`}
                      value={option.option_code}
                      checked={checked}
                      onChange={() =>
                        question.question_type === "MULTIPLE_RESPONSE"
                          ? toggleMultipleResponse(option.option_code)
                          : updateSelection(option.option_code)
                      }
                      disabled={saving || finishing}
                    />
                    <span><strong>{option.option_code}.</strong> {option.option_text}</span>
                  </label>
                );
              })}
            </div>

            {question.selected_option && (
              <div
                className={`student-attempt-feedback ${question.is_correct ? "is-correct" : "is-wrong"}`}
                role="status"
              >
                <strong>{question.is_correct ? "Jawaban benar" : "Jawaban belum tepat"}</strong>
                {correctAnswerLabels?.length > 0 && (
                  <p>Jawaban benar: {correctAnswerLabels.join("; ")}</p>
                )}
                {question.explanation && <p>{question.explanation}</p>}
              </div>
            )}

            <div className="student-attempt-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving || finishing || !selection}
              >
                {saving ? "Menyimpan jawaban..." : "Periksa jawaban"}
              </button>
              <div className="student-attempt-nav">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
                  disabled={questionIndex === 0 || saving || finishing}
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setQuestionIndex((index) =>
                      Math.min(attempt.questions.length - 1, index + 1)
                    )
                  }
                  disabled={questionIndex >= attempt.questions.length - 1 || saving || finishing}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      <nav className="student-attempt-question-nav" aria-label="Pilih nomor soal">
        {attempt.questions.map((item, index) => (
          <button
            type="button"
            key={item.id}
            className={[
              index === questionIndex ? "is-current" : "",
              item.selected_option ? "is-answered" : "",
            ].filter(Boolean).join(" ")}
            aria-label={`Soal ${index + 1}${item.selected_option ? ", sudah dijawab" : ", belum dijawab"}`}
            aria-current={index === questionIndex ? "step" : undefined}
            onClick={() => setQuestionIndex(index)}
            disabled={saving || finishing}
          >
            {index + 1}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default StudentPracticeAttempt;
