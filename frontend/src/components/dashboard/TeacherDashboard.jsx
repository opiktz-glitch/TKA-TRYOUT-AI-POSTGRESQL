import StatCard from "../StatCard";
import { Link } from "react-router-dom";
import "../ScoreTable.css";
import {
  IconBarChart,
  IconClipboard,
  IconGraduationCap,
  IconNotebook,
} from "../Icons";
import { truncateText } from "../../utils/dashboardUtils";

export default function TeacherDashboard({ data }) {
  const {
    teacherStats,
    teacherActivity,
    dashFailed,
    dashLoading,
    show,
    navigate,
  } = data;
  return (
    <>
        <div className="stat-grid dashboard-stat-grid">
          <StatCard
            icon={<IconNotebook />}
            title="Soal Saya"
            value={show(teacherStats.totalSoal)}
            description="Soal dibuat"
          />

          <StatCard
            icon={<IconClipboard />}
            title="Tryout Saya"
            value={show(teacherStats.totalTryout)}
            description="Paket tryout"
          />

          <StatCard
            icon={<IconGraduationCap />}
            title="Peserta"
            value={show(teacherStats.totalPeserta)}
            description="Peserta tryout"
            linkLabel="Lihat semua →"
            onLinkClick={() => navigate("/teacher/scores")}
          />

          <StatCard
            icon={<IconBarChart />}
            title="Hasil"
            value={show(teacherStats.totalHasil)}
            description="Hasil pengerjaan"
            linkLabel="Lihat semua →"
            onLinkClick={() => navigate("/teacher/scores")}
          />
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Aktivitas Guru</h3>

                <p>Aktivitas pengelolaan pembelajaran</p>
              </div>
            </div>

            <div className="activity-list">
              <Link
                to="/questions"
                className="activity-item activity-item-clickable"
              >
                <div className="activity-icon">
                  <IconNotebook size={18} />
                </div>

                <div className="activity-content">
                  <strong>Bank Soal</strong>

                  <span>
                    {dashLoading
                      ? "Memuat aktivitas soal..."
                      : dashFailed
                      ? "Gagal dimuat"
                      : teacherActivity.latestQuestion
                        ? truncateText(
                            teacherActivity.latestQuestion.question_text,
                            60,
                          )
                        : "Belum ada soal yang Anda buat"}
                  </span>
                </div>

                {!dashLoading && !dashFailed && !teacherActivity.latestQuestion && (
                  <span className="activity-cta">
                    + Tambah Soal
                  </span>
                )}
              </Link>

              <Link
                to="/tryouts"
                className="activity-item activity-item-clickable"
              >
                <div className="activity-icon">
                  <IconClipboard size={18} />
                </div>

                <div className="activity-content">
                  <strong>Tryout</strong>

                  <span>
                    {dashLoading
                      ? "Memuat aktivitas tryout..."
                      : dashFailed
                      ? "Gagal dimuat"
                      : teacherActivity.latestTryout
                        ? teacherActivity.latestTryout.title
                        : "Belum ada tryout yang Anda buat"}
                  </span>
                </div>

                {!dashLoading && !dashFailed && !teacherActivity.latestTryout && (
                  <span className="activity-cta">
                    + Buat Tryout
                  </span>
                )}
              </Link>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Akses Cepat</h3>

                <p>Menu guru</p>
              </div>
            </div>

            <div className="quick-menu">
              <button
                className="quick-menu-item"
                onClick={() => navigate("/questions")}
              >
                <span>
                  <IconNotebook size={20} />
                </span>

                <div>
                  <strong>Bank Soal</strong>

                  <small>Kelola soal</small>
                </div>
              </button>

              <button
                className="quick-menu-item"
                onClick={() => navigate("/tryouts")}
              >
                <span>
                  <IconClipboard size={20} />
                </span>

                <div>
                  <strong>Buat Tryout</strong>

                  <small>Buat paket tryout</small>
                </div>
              </button>

              <button
                className="quick-menu-item"
                onClick={() => navigate("/teacher/scores")}
              >
                <span>
                  <IconBarChart size={20} />
                </span>

                <div>
                  <strong>Hasil Peserta</strong>

                  <small>Lihat hasil tryout</small>
                </div>
              </button>
            </div>
          </section>
        </div>
    </>
  );
}
