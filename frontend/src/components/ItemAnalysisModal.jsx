import React, { useState, useEffect } from "react";
import { getItemAnalysis } from "../services/api";

function DifficultyBadge({ pct }) {
  let label, color, bg;
  if (pct >= 70) {
    label = "Mudah"; color = "#166534"; bg = "#dcfce7";
  } else if (pct >= 30) {
    label = "Sedang"; color = "#92400e"; bg = "#fef3c7";
  } else {
    label = "Sulit"; color = "#991b1b"; bg = "#fee2e2";
  }
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 10px",
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 600,
      color,
      background: bg,
    }}>
      {pct}% · {label}
    </span>
  );
}

function PreviewPanel({ q }) {
  const total = q.total_answered;
  return (
    <div style={{
      marginTop: 10,
      padding: "14px 16px",
      background: "#f8fafc",
      borderRadius: 10,
      border: "1px solid #e2e8f0",
    }}>
      {/* Full question text */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.05em" }}>
          TEKS SOAL LENGKAP
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {q.question_text || "(Soal berupa gambar atau format matematika)"}
        </p>
      </div>

      {/* Options */}
      {q.options_distribution && q.options_distribution.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8, letterSpacing: "0.05em" }}>
            OPSI JAWABAN & DISTRIBUSI
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {q.options_distribution.map(opt => {
              const pct = total > 0 ? Math.round((opt.count / total) * 100) : 0;
              const isCorrect = opt.is_correct;
              return (
                <div key={opt.option_code} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: isCorrect ? "#f0fdf4" : "#fff",
                  border: `1px solid ${isCorrect ? "#86efac" : "#e5e7eb"}`,
                }}>
                  {/* Option badge */}
                  <span style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 12,
                    background: isCorrect ? "#22c55e" : "#e5e7eb",
                    color: isCorrect ? "#fff" : "#6b7280",
                  }}>
                    {opt.option_code}
                  </span>

                  {/* Option text */}
                  <span style={{ flex: 1, fontSize: 13, color: "#374151", lineHeight: 1.4 }}>
                    {opt.option_text || "-"}
                    {isCorrect && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#16a34a", fontWeight: 600 }}>
                        ✓ Jawaban Benar
                      </span>
                    )}
                  </span>

                  {/* Bar + count */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <div style={{ width: 56, background: "#e5e7eb", borderRadius: 4, overflow: "hidden", height: 6 }}>
                      <div style={{
                        height: "100%",
                        borderRadius: 4,
                        background: isCorrect ? "#22c55e" : "var(--accent)",
                        width: `${pct}%`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", minWidth: 20, textAlign: "right" }}>
                      {opt.count}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af", minWidth: 30, textAlign: "right" }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q }) {
  const [showPreview, setShowPreview] = useState(false);
  const snippet = q.question_text && q.question_text.trim()
    ? (q.question_text.length > 100 ? q.question_text.substring(0, 100) + "…" : q.question_text)
    : "(Ada Gambar / LaTeX)";
  const diffPct = Math.round(q.difficulty_index * 100);

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${showPreview ? "#cbd5e1" : "#e5e7eb"}`,
      padding: "12px 16px",
      background: "#fff",
      marginBottom: 8,
      transition: "border-color 0.2s",
    }}>
      {/* Row 1: Number + snippet + preview button */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          background: "var(--accent)",
          color: "#fff",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 12,
          marginTop: 1,
        }}>{q.question_number}</span>

        <p style={{ margin: 0, flex: 1, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
          {snippet}
        </p>

        <button
          onClick={() => setShowPreview(s => !s)}
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            borderRadius: 6,
            padding: "4px 10px",
            background: showPreview ? "#e0f2fe" : "#f0fdf4",
            color: showPreview ? "#0284c7" : "#15803d",
            transition: "all 0.2s",
          }}
        >
          {showPreview ? "Tutup ▲" : "Preview ▼"}
        </button>
      </div>

      {/* Row 2: Stats + difficulty badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
        <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontWeight: 700, color: "var(--success)", fontSize: 15 }}>{q.correct_count}</span> benar
        </span>
        <span style={{ color: "#e5e7eb" }}>·</span>
        <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontWeight: 700, color: "var(--danger)", fontSize: 15 }}>{q.wrong_count}</span> salah
        </span>
        <span style={{ color: "#e5e7eb" }}>·</span>
        <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontWeight: 700, color: "#9ca3af", fontSize: 15 }}>{q.blank_count}</span> kosong
        </span>
        <span style={{ flex: 1 }} />
        <DifficultyBadge pct={diffPct} />
      </div>

      {/* Preview panel */}
      {showPreview && <PreviewPanel q={q} />}
    </div>
  );
}

export default function ItemAnalysisModal({ tryoutId, title, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        setLoading(true);
        setError(null);
        const result = await getItemAnalysis(tryoutId);
        setData(result);
      } catch (err) {
        setError(err.message || "Gagal memuat analisis soal");
      } finally {
        setLoading(false);
      }
    }
    if (tryoutId) fetchAnalysis();
  }, [tryoutId]);

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 720, width: "95%" }}>

        <div className="modal-header">
          <div>
            <h2>Analisis Butir Soal</h2>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{title}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading && <div className="loading-message">Memuat analisis butir soal...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && data && (
          <div className="modal-content" style={{ maxHeight: "72vh", overflowY: "auto", overflowX: "hidden" }}>

            {/* Summary */}
            <div style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 16,
              fontSize: 13,
              alignItems: "center",
            }}>
              <span>
                <span style={{ color: "#6b7280" }}>Siswa mengerjakan: </span>
                <strong style={{ color: "#166534" }}>{data.total_attempts}</strong>
              </span>
              <span style={{ color: "#bbf7d0" }}>|</span>
              <span>
                <span style={{ color: "#6b7280" }}>Jumlah soal: </span>
                <strong style={{ color: "#166534" }}>{data.questions.length}</strong>
              </span>
              <span style={{ color: "#bbf7d0" }}>|</span>
              <span style={{ color: "#6b7280", fontSize: 12 }}>
                Klik <strong style={{ color: "#15803d" }}>Preview ▼</strong> untuk melihat soal & opsi lengkap
              </span>
            </div>

            {data.questions.length === 0 ? (
              <div className="empty-message">Belum ada soal pada tryout ini.</div>
            ) : (
              data.questions.map((q) => <QuestionCard key={q.question_id} q={q} />)
            )}

          </div>
        )}

        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
