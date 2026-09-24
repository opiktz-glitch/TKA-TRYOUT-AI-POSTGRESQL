import { useEffect, useState } from "react";

import StatCard from "../components/StatCard";
import HardestQuestionList from "../components/HardestQuestionList";
import {
  IconGraduationCap,
  IconUser,
  IconClipboard,
  IconTarget,
  IconTrendingUp,
} from "../components/Icons";

import { getAdminReportOverview } from "../services/api";
import "../components/ScoreTable.css";
import "./Report.css";
import { useAuth } from "../auth/AuthContext";
import { readPageCache, writePageCache } from "../services/pageCache";


// =====================================================
// HELPER — format "8 Sep" dari tanggal ISO "2026-09-08"
// =====================================================

function formatShortDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}


// Kunci cache halaman ini (lihat services/pageCache.js).
const REPORT_CACHE_KEY = "admin-report";


function AdminReport() {
  const { user } = useAuth();

  // Laporan dari kunjungan sebelumnya di sesi ini. Kalau ada, langsung
  // ditampilkan (tanpa "Memuat laporan...") lalu diperbarui diam-diam.
  const cachedReport = readPageCache(user?.id, REPORT_CACHE_KEY);

  const [report, setReport] = useState(() => cachedReport ?? null);
  const [loading, setLoading] = useState(() => !cachedReport);
  const [error, setError] = useState("");


  useEffect(() => {
    loadReport();
  }, []);


  async function loadReport() {
    // Sudah ada laporan lama di layar -> perbarui diam-diam: tanpa
    // loading, dan kalau gagal, laporan lama dibiarkan.
    const hasCachedReport = Boolean(readPageCache(user?.id, REPORT_CACHE_KEY));

    try {
      if (!hasCachedReport) {
        setLoading(true);
      }

      setError("");

      const data = await getAdminReportOverview();

      setReport(data);
      writePageCache(user?.id, REPORT_CACHE_KEY, data);
    } catch (err) {
      console.error("LOAD ADMIN REPORT ERROR:", err);

      if (!hasCachedReport) {
        setError(err.message || "Gagal memuat laporan");
      }
    } finally {
      setLoading(false);
    }
  }


  // Rata-rata per mapel dalam PERSEN dari skor maksimal tiap tryout
  // (dihitung backend), jadi aman walau skor maksimal antar tryout beda.
  // Fallback ke skor mentah untuk data cache lama yang belum punya field
  // persen (cache halaman dari sesi sebelum pembaruan ini).
  function subjectPercentage(subject) {
    return subject.average_percentage ?? subject.average_score;
  }

  const overallPercentage =
    report?.average_percentage_overall ?? report?.average_score_overall ?? null;

  // Bar memakai skala tetap 0-100 (bukan dinormalisasi ke mapel tertinggi),
  // supaya panjang bar mencerminkan persentase sebenarnya.
  function scoreBarWidth(percentage) {
    return Math.min(100, Math.max(0, percentage));
  }

  const maxTrendCount = report
    ? Math.max(1, ...report.attempts_trend.map((d) => d.count))
    : 1;

  // Ringkasan tren: total attempt, hari tersibuk, dan lama periode.
  const trendDays = report ? report.attempts_trend.length : 0;

  const trendTotal = report
    ? report.attempts_trend.reduce((sum, d) => sum + d.count, 0)
    : 0;

  const busiestDay = report
    ? report.attempts_trend.reduce(
        (best, d) => (d.count > (best?.count ?? 0) ? d : best),
        null
      )
    : null;


  return (
    <>
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Laporan</h1>
          <p>Ringkasan analitik seluruh sistem: mata pelajaran, guru, dan soal tersulit</p>
        </div>
      </div>

      {loading && (
        <div className="loading-message">Memuat laporan...</div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!loading && report && (
        <>

          {/* RINGKASAN */}

          <div className="stat-grid">
            <StatCard
              icon={<IconGraduationCap />}
              title="Total Siswa"
              value={report.total_students}
              description="Terdaftar di sistem"
            />

            <StatCard
              icon={<IconUser />}
              title="Total Guru"
              value={report.total_teachers}
              description="Terdaftar di sistem"
            />

            <StatCard
              icon={<IconClipboard />}
              title="Total Tryout"
              value={report.total_tryouts}
              description={`${report.total_attempts} attempt selesai`}
            />

            <StatCard
              icon={<IconTarget />}
              title="Rata-rata Skor Sistem"
              value={overallPercentage !== null ? `${overallPercentage}%` : "-"}
              description="Persen dari skor maksimal, semua tryout"
            />
          </div>

          {/* RATA-RATA SKOR PER MAPEL */}

          <div className="dashboard-card" style={{ marginBottom: 14 }}>

            <div className="card-header">
              <div>
                <h3>Rata-rata Skor per Mata Pelajaran</h3>
                <p>Persen dari skor maksimal tiap tryout, dihitung dari seluruh tryout yang sudah diselesaikan siswa</p>
              </div>
            </div>

            <div style={{ padding: "6px 18px 18px" }}>

              {report.average_score_per_subject.length === 0 && (
                <div className="empty-message">
                  Belum ada attempt yang selesai.
                </div>
              )}

              {report.average_score_per_subject.map((subject) => (
                <div className="dist-bar-row" key={subject.subject_id}>

                  <div className="subject-bar-label">{subject.subject_name}</div>

                  <div className="dist-bar-track">
                    <div
                      className="dist-bar-fill"
                      style={{
                        width: `${scoreBarWidth(subjectPercentage(subject))}%`,
                      }}
                    />
                  </div>

                  <div className="dist-bar-count is-wide">
                    {subjectPercentage(subject)}%
                  </div>

                </div>
              ))}

            </div>

          </div>

          {/* TREN JUMLAH ATTEMPT */}

          <div className="dashboard-card" style={{ marginBottom: 14 }}>

            <div className="card-header">
              <div>
                <h3>Tren Jumlah Attempt</h3>
                <p>Jumlah tryout yang diselesaikan siswa, 14 hari terakhir</p>
              </div>
            </div>

            <div className="trend-summary">
              {trendTotal === 0
                ? `Belum ada attempt dalam ${trendDays} hari terakhir.`
                : `Total ${trendTotal} attempt dalam ${trendDays} hari terakhir` +
                  (busiestDay
                    ? ` · tersibuk ${formatShortDate(busiestDay.date)} (${busiestDay.count})`
                    : "")}
            </div>

            {trendTotal > 0 && (
              <div className="trend-chart">

                {report.attempts_trend.map((day, index) => {
                  // Label tanggal selang-seling agar tidak berdesakan;
                  // hari terakhir (terbaru) selalu tampil.
                  const showDate =
                    (report.attempts_trend.length - 1 - index) % 2 === 0;

                  return (
                    <div className="trend-bar-col" key={day.date}>

                      {day.count > 0 && (
                        <div className="trend-bar-value">{day.count}</div>
                      )}

                      <div
                        className="trend-bar"
                        style={{
                          // maks 80% tinggi kolom, sisanya untuk angka di atas bar
                          height: `${(day.count / maxTrendCount) * 80}%`,
                        }}
                        title={`${formatShortDate(day.date)}: ${day.count} attempt`}
                      />

                      <div
                        className="trend-bar-date"
                        style={showDate ? undefined : { visibility: "hidden" }}
                      >
                        {formatShortDate(day.date)}
                      </div>

                    </div>
                  );
                })}

              </div>
            )}

          </div>

          {/* GURU PALING AKTIF */}

          <div className="dashboard-card" style={{ marginBottom: 14 }}>

            <div className="card-header">
              <div>
                <h3>Guru Paling Aktif</h3>
                <p>5 guru teratas berdasarkan jumlah attempt siswa pada tryout yang dibuat</p>
              </div>
            </div>

            {report.top_teachers.length === 0 ? (
              <div className="empty-message">
                Belum ada guru yang membuat tryout.
              </div>
            ) : (
              <>
                <div className="table-container">
                  {/* Gaya tabel sama dengan halaman Nilai (score-table) */}
                  <table className="score-table is-compact">
                    <thead>
                      <tr>
                        <th className="is-left">Guru</th>
                        <th title="Jumlah tryout yang dibuat guru ini">Jumlah Tryout</th>
                        <th title="Jumlah tryout yang sudah diselesaikan siswa">Jumlah Attempt</th>
                        <th title="Jumlah siswa berbeda yang pernah menyelesaikan tryout guru ini">Jangkauan Siswa</th>
                      </tr>
                    </thead>

                    <tbody>
                      {report.top_teachers.map((t, index) => (
                        <tr key={t.teacher_id}>
                          <td>
                            <span className="teacher-rank-badge">{index + 1}</span>
                            <span className="score-primary is-strong">{t.teacher_name}</span>
                          </td>
                          <td className="is-center">{t.tryout_count}</td>
                          <td className="is-center">{t.total_attempts}</td>
                          <td className="is-center">{t.student_reach}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="report-table-note">
                  Jangkauan siswa = jumlah siswa berbeda yang pernah menyelesaikan
                  tryout guru tersebut (satu siswa dihitung sekali).
                </div>
              </>
            )}

          </div>

          {/* SOAL PALING SERING SALAH (GLOBAL) */}

          <div className="dashboard-card">

            <div className="card-header">
              <div>
                <h3>Soal Paling Sering Salah</h3>
                <p>10 soal dengan persentase jawaban salah tertinggi di seluruh sistem</p>
              </div>

              <span className="menu-icon" style={{ color: "var(--accent)" }}>
                <IconTrendingUp size={20} />
              </span>
            </div>

            <HardestQuestionList
              questions={report.hardest_questions}
              getSubjectName={(q) => q.subject_name || "-"}
              getMeta={(q) =>
                `${q.subject_name} · dijawab ${q.total_answered} kali`
              }
              emptyMessage="Belum cukup data jawaban untuk ditampilkan."
            />

          </div>

        </>
      )}
    </>
  );
}

export default AdminReport;
