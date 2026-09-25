import StatCard from "../StatCard";
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
    show,
    navigate,
  } = data;
  return (
    <>
        <div className="stat-grid">
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
              <div
                className="activity-item activity-item-clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/questions")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate("/questions");
                }}
              >
                <div className="activity-icon">
                  <IconNotebook size={18} />
                </div>

                <div className="activity-content">
                  <strong>Bank Soal</strong>

                  <span>
                    {dashFailed
                      ? "Gagal dimuat"
                      : teacherActivity.latestQuestion
                        ? truncateText(
                            teacherActivity.latestQuestion.question_text,
                            60,
                          )
                        : "Belum ada soal yang Anda buat"}
                  </span>
                </div>

                {!dashFailed && !teacherActivity.latestQuestion && (
                  <button
                    type="button"
                    className="activity-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/questions");
                    }}
                  >
                    + Tambah Soal
                  </button>
                )}
              </div>

              <div
                className="activity-item activity-item-clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/tryouts")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate("/tryouts");
                }}
              >
                <div className="activity-icon">
                  <IconClipboard size={18} />
                </div>

                <div className="activity-content">
                  <strong>Tryout</strong>

                  <span>
                    {dashFailed
                      ? "Gagal dimuat"
                      : teacherActivity.latestTryout
                        ? teacherActivity.latestTryout.title
                        : "Belum ada tryout yang Anda buat"}
                  </span>
                </div>

                {!dashFailed && !teacherActivity.latestTryout && (
                  <button
                    type="button"
                    className="activity-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/tryouts");
                    }}
                  >
                    + Buat Tryout
                  </button>
                )}
              </div>
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
