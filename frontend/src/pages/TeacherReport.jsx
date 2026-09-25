import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import StatCard from "../components/StatCard";
import HardestQuestionList from "../components/HardestQuestionList";
import {
  IconUsers,
  IconTarget,
  IconCheck,
  IconTrophy,
  IconTrendingUp,
} from "../components/Icons";

import "./Report.css";
import {
  WRONG_MEDIUM_PERCENT,
  PASS_THRESHOLD_PERCENT,
  bucketPassState,
} from "../utils/report";
import { useTeacherReport } from "../hooks/useTeacherReport";
function TeacherReport() {
  const {
    tryoutOptions,
    selectedTryoutId,
    setSelectedTryoutId,
    report,
    loadingOptions,
    loadingReport,
    error,
    maxBucketCount,
    bucketTotal,
    scoreScale,
    insights,
    selectedTryout,
    reportIsForSelected,
    showFailedLink,
    tryoutInfo,
    averagePercent
  } = useTeacherReport();

  return (
    <>
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Laporan</h1>
          <p>Analitik hasil tryout: rata-rata skor, distribusi nilai, dan soal tersulit</p>
        </div>
      </div>

      {/* PEMILIH TRYOUT */}

      <div className="dashboard-card" style={{ padding: "14px 18px", marginBottom: 14 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

          <label style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
            Pilih Tryout
          </label>

          <select
            className="report-select"
            value={selectedTryoutId}
            onChange={(e) => setSelectedTryoutId(e.target.value)}
            disabled={loadingOptions || tryoutOptions.length === 0}
          >
            {tryoutOptions.length === 0 && (
              <option value="">Belum ada tryout</option>
            )}

            {tryoutOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

        </div>

        {selectedTryout && (
          <div className="report-tryout-info">
            {tryoutInfo.join(" · ")}

            {selectedTryout.is_active === false && (
              <span className="report-tryout-flag">Nonaktif</span>
            )}
          </div>
        )}

        {selectedTryout && (
          <div className="report-tryout-links">
            <Link to={`/teacher/scores?tryout=${selectedTryout.id}`}>
              Lihat daftar nilai
            </Link>

            {showFailedLink && (
              <Link to={`/teacher/scores?tryout=${selectedTryout.id}&status=FAILED`}>
                Lihat siswa yang belum lulus
              </Link>
            )}
          </div>
        )}

      </div>

      {loadingOptions && (
        <div className="loading-message">Memuat daftar tryout...</div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!loadingOptions && tryoutOptions.length === 0 && !error && (
        <div className="empty-message">
          Kamu belum membuat tryout. Buat tryout terlebih dahulu untuk melihat laporan analitiknya.
        </div>
      )}

      {loadingReport && (
        <div className="loading-message">Memuat laporan...</div>
      )}

      {!loadingReport && report && (
        <>

          {/* RINGKASAN */}

          <div className="stat-grid">
            <StatCard
              icon={<IconUsers />}
              title="Total Peserta"
              value={report.total_attempts}
              description="Sudah menyelesaikan tryout"
            />

            <StatCard
              icon={<IconTarget />}
              title="Rata-rata Skor"
              value={report.average_score ?? "-"}
              description={
                scoreScale
                  ? `Dari skor maksimal ${scoreScale}${averagePercent !== null ? ` (${averagePercent}%)` : ""}`
                  : "Dari semua peserta"
              }
            />

            <StatCard
              icon={<IconTrophy />}
              title="Skor Tertinggi"
              value={report.highest_score ?? "-"}
              description={
                report.lowest_score !== null && report.lowest_score !== undefined
                  ? `Terendah: ${report.lowest_score}`
                  : "Belum ada peserta"
              }
            />

            <StatCard
              icon={<IconCheck />}
              title="Tingkat Lulus"
              value={report.pass_rate !== null ? `${report.pass_rate}%` : "-"}
              description="Dari peserta yang selesai"
            />
          </div>

          {/* INSIGHT */}

          {insights.length > 0 && (
            <div className="report-insight">
              {insights.map((text) => (
                <div key={text}>{text}</div>
              ))}
            </div>
          )}

          {/* DISTRIBUSI NILAI */}

          <div className="dashboard-card" style={{ marginBottom: 14 }}>

            <div className="card-header">
              <div>
                <h3>Distribusi Nilai</h3>
                <p>Sebaran perolehan skor peserta (persentase dari skor maksimal)</p>
              </div>
            </div>

            <div style={{ padding: "6px 18px 18px" }}>

              {report.total_attempts === 0 && (
                <div className="empty-message">
                  Belum ada peserta yang menyelesaikan tryout ini.
                </div>
              )}

              {report.total_attempts > 0 && report.score_distribution.map((bucket) => (
                <div className="dist-bar-row" key={bucket.range}>

                  <div className="dist-bar-label">{bucket.range}%</div>

                  <div className="dist-bar-track">
                    <div
                      className={`dist-bar-fill is-${bucketPassState(bucket.range)}`}
                      style={{
                        width: `${(bucket.count / maxBucketCount) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="dist-bar-count is-wide">
                    {bucket.count}
                    <span className="dist-bar-percent">
                      {bucketTotal > 0
                        ? `${Math.round((bucket.count / bucketTotal) * 100)}%`
                        : "0%"}
                    </span>
                  </div>

                </div>
              ))}

              {report.total_attempts > 0 && (
                <div className="dist-legend">
                  <span>
                    <i className="dist-swatch is-below" />
                    Di bawah batas lulus
                  </span>
                  <span>
                    <i className="dist-swatch is-pass" />
                    Lulus
                  </span>
                  <span>
                    <i className="dist-swatch is-mixed" />
                    Batas lulus ({PASS_THRESHOLD_PERCENT}%) ada di rentang ini
                  </span>
                </div>
              )}

            </div>

          </div>

          {/* SOAL PALING SERING SALAH */}

          <div className="dashboard-card">

            <div className="card-header">
              <div>
                <h3>Soal Paling Sering Salah</h3>
                <p>10 soal dengan persentase jawaban salah tertinggi</p>
              </div>

              <span className="menu-icon" style={{ color: "var(--accent)" }}>
                <IconTrendingUp size={20} />
              </span>
            </div>

            <HardestQuestionList
              questions={report.hardest_questions}
              getSubjectName={() => report.subject_name || "-"}
              getMeta={(q) =>
                `No. ${q.question_number} · ${q.correct_count} dari ${report.total_attempts} peserta menjawab benar`
              }
              emptyMessage="Belum ada data jawaban untuk tryout ini."
            />

          </div>

        </>
      )}
    </>
  );
}

export default TeacherReport;
