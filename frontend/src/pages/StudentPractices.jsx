import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getStudentPractices, startPracticeAttempt } from "../services/api";
import "./StudentPractices.css";

function StudentPractices() {
  const navigate = useNavigate();
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState(null);
  const [error, setError] = useState("");

  const loadPractices = useCallback(async () => {
    try {
      const result = await getStudentPractices();
      setPractices(result.practices || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Gagal memuat daftar latihan.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function retryLoading() {
    setLoading(true);
    setError("");
    await loadPractices();
  }

  useEffect(() => {
    let active = true;
    getStudentPractices()
      .then((result) => {
        if (!active) return;
        setPractices(result.practices || []);
        setError("");
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || "Gagal memuat daftar latihan.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function openPractice(practice) {
    if (practice.active_attempt_id) {
      navigate(`/student/practice-attempts/${practice.active_attempt_id}`);
      return;
    }
    setStartingId(practice.id);
    try {
      const attempt = await startPracticeAttempt(practice.id);
      navigate(`/student/practice-attempts/${attempt.attempt_id}`);
    } catch (requestError) {
      toast.error(requestError.message || "Tidak dapat memulai latihan.");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div className="student-practice-page">
      <header className="page-header student-practice-header">
        <div>
          <h1>Latihan</h1>
          <p>Berlatih sebanyak yang diperlukan dan lihat pembahasan setelah menjawab.</p>
        </div>
      </header>

      {loading ? (
        <div className="student-practice-state">Memuat latihan...</div>
      ) : error ? (
        <div className="student-practice-state is-error" role="alert">
          <p>{error}</p>
          <button type="button" className="secondary-button" onClick={retryLoading}>
            Coba lagi
          </button>
        </div>
      ) : practices.length === 0 ? (
        <div className="student-practice-state">
          Belum ada latihan yang diterbitkan. Silakan periksa kembali nanti.
        </div>
      ) : (
        <div className="student-practice-grid">
          {practices.map((practice) => (
            <article className="student-practice-card" key={practice.id}>
              <div className="student-practice-card-heading">
                <span className="student-practice-subject">{practice.subject_name}</span>
                {practice.active_attempt_id && (
                  <span className="student-practice-resume">Sedang dikerjakan</span>
                )}
              </div>
              <h2>{practice.title}</h2>
              {practice.description && <p>{practice.description}</p>}
              <dl className="student-practice-stats">
                <div>
                  <dt>Jumlah soal</dt>
                  <dd>{practice.question_count}</dd>
                </div>
                <div>
                  <dt>Sudah selesai</dt>
                  <dd>{practice.completed_attempt_count} kali</dd>
                </div>
              </dl>
              <button
                type="button"
                className="primary-button"
                onClick={() => openPractice(practice)}
                disabled={startingId === practice.id}
              >
                {startingId === practice.id
                  ? "Membuka..."
                  : practice.active_attempt_id
                    ? "Lanjutkan latihan"
                    : practice.completed_attempt_count
                      ? "Ulangi latihan"
                      : "Mulai latihan"}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentPractices;
