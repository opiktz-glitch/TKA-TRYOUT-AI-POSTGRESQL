
import StatCard from "../components/StatCard";
import HardestQuestionList from "../components/HardestQuestionList";
import TrendChart from "../components/TrendChart";
import {
  IconGraduationCap,
  IconUser,
  IconClipboard,
  IconTarget,
  IconTrendingUp,
} from "../components/Icons";

import "../components/ScoreTable.css";
import "./Report.css";
import { useAdminReport } from "../hooks/useAdminReport";
function AdminReport() {
  const {
    report,
    loading,
    overallPercentage,
    subjectPercentage,
    scoreBarWidth,
    maxTrendCount,
    trendDays,
    trendTotal,
    busiestDay,
  } = useAdminReport();


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

          <div className="report-2-col">
          {/* RATA-RATA SKOR PER MAPEL */}

          <div className="dashboard-card" style={{ height: "100%" }}>

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


          {/* GURU PALING AKTIF */}

          <div className="dashboard-card" style={{ height: "100%" }}>

            <div className="card-header">
              <div>
                <h3>Mata Pelajaran Tersulit</h3>
                <p>5 mata pelajaran dengan rata-rata nilai terendah dari seluruh siswa</p>
              </div>
            </div>

            {report.average_score_per_subject.length === 0 ? (
              <div className="empty-message">
                Belum ada data nilai mata pelajaran.
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="score-table is-compact">
                    <thead>
                      <tr>
                        <th className="is-left">Mata Pelajaran</th>
                        <th title="Rata-rata persentase skor">Rata-rata Skor (%)</th>
                        <th title="Jumlah percobaan siswa pada mata pelajaran ini">Jumlah Percobaan</th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...report.average_score_per_subject]
                        .sort((a, b) => a.average_percentage - b.average_percentage)
                        .slice(0, 5)
                        .map((s, index) => (
                        <tr key={s.subject_id}>
                          <td>
                            <span className="teacher-rank-badge">{index + 1}</span>
                            <span className="score-primary is-strong">{s.subject_name}</span>
                          </td>
                          <td className="is-center" style={{ color: "var(--danger)", fontWeight: 600 }}>{s.average_percentage}%</td>
                          <td className="is-center">{s.total_attempts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>


          </div>

          <div className="report-2-col">

          {/* TREN JUMLAH ATTEMPT */}

          <div className="dashboard-card" style={{ height: "100%" }}>

            <div className="card-header">
              <div>
                <h3>Tren Jumlah Attempt</h3>
                <p>Jumlah tryout yang diselesaikan siswa, 14 hari terakhir</p>
              </div>
            </div>

            <TrendChart 
              attemptsTrend={report.attempts_trend} 
              maxTrendCount={maxTrendCount} 
              trendTotal={trendTotal} 
              trendDays={trendDays} 
              busiestDay={busiestDay} 
            />

          </div>


          {/* SOAL PALING SERING SALAH (GLOBAL) */}

          <div className="dashboard-card" style={{ height: "100%" }}>

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

          </div>

          <div className="report-2-col">

          {/* TOP SISWA */}
          <div className="dashboard-card" style={{ height: "100%" }}>
            <div className="card-header">
              <div>
                <h3>Top 5 Siswa Berprestasi</h3>
                <p>Berdasarkan rata-rata nilai dari seluruh tryout yang dikerjakan</p>
              </div>
            </div>
            {(!report.top_students || report.top_students.length === 0) ? (
              <div className="empty-message">Belum ada data siswa.</div>
            ) : (
              <div className="table-container">
                <table className="score-table is-compact">
                  <thead>
                    <tr>
                      <th className="is-left">Nama Siswa</th>
                      <th className="is-center" title="Jumlah paket tryout yang diselesaikan">Tryout Selesai</th>
                      <th className="is-center">Rata-rata Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_students.map((student, index) => (
                      <tr key={student.student_id}>
                        <td>
                          <span className="teacher-rank-badge">{index + 1}</span>
                          <span className="score-primary">{student.student_name}</span>
                        </td>
                        <td className="is-center">{student.tryouts_taken}</td>
                        <td className="is-center" style={{ color: "var(--accent)", fontWeight: 600 }}>{student.average_percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* POPULAR TRYOUTS */}
          <div className="dashboard-card" style={{ height: "100%" }}>
            <div className="card-header">
              <div>
                <h3>Paket Tryout Paling Populer</h3>
                <p>Berdasarkan total attempt yang diselesaikan siswa</p>
              </div>
            </div>
            {(!report.popular_tryouts || report.popular_tryouts.length === 0) ? (
              <div className="empty-message">Belum ada tryout yang dikerjakan.</div>
            ) : (
              <div className="table-container">
                <table className="score-table is-compact">
                  <thead>
                    <tr>
                      <th className="is-left">Judul Tryout</th>
                      <th className="is-center">Total Attempt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.popular_tryouts.map((tryout, index) => (
                      <tr key={tryout.tryout_id}>
                        <td>
                          <span className="teacher-rank-badge" style={{ background: "var(--secondary-color, #8b5cf6)", color: "white" }}>{index + 1}</span>
                          <span className="score-primary is-strong">{tryout.title}</span>
                        </td>
                        <td className="is-center" style={{ fontWeight: 600 }}>{tryout.attempt_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          </div>

        </>
      )}
    </>
  );
}

export default AdminReport;
