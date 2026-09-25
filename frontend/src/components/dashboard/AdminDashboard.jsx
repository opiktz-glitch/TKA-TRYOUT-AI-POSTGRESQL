import StatCard from "../StatCard";
import "../ScoreTable.css";
import {
  IconBarChart,
  IconCheck,
  IconClipboard,
  IconClock,
  IconCpu,
  IconGraduationCap,
  IconNotebook,
} from "../Icons";
import { truncateText, MIN_QUESTIONS_PER_CELL, getBankBadgeClass, formatBytes, attentionBadgeStyle } from "../../utils/dashboardUtils";

export default function AdminDashboard({ data }) {
  const { adminStats, attention, dashFailed, dashLoading, show, navigate, liveStats, questionBank } = data;
  return (
    <>
        <div className="stat-grid">
          <StatCard
            icon={<IconGraduationCap />}
            title="Siswa"
            value={show(adminStats.totalStudents)}
            description="Siswa terdaftar"
          />

          <StatCard
            icon={<IconClock />}
            title="Sedang Mengerjakan"
            value={liveStats.inProgress ?? (liveStats.failed ? "–" : "…")}
            description="Siswa sedang tryout"
          />

          <StatCard
            icon={<IconCheck />}
            title="Selesai Hari Ini"
            value={liveStats.finishedToday ?? (liveStats.failed ? "–" : "…")}
            description="Pengerjaan tryout selesai"
          />

          <StatCard
            icon={<IconClipboard />}
            title="Paket Tryout Aktif"
            value={show(adminStats.activeTryouts)}
            description={
              dashLoading
                ? "Memuat…"
                : dashFailed
                  ? "Gagal dimuat"
                  : `dari ${adminStats.totalTryouts} paket tryout`
            }
          />
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Komposisi Bank Soal</h3>

                <p>Soal aktif per mata pelajaran dan tingkat kesulitan</p>
              </div>
            </div>

            {dashLoading ? (
              <div className="loading-message">
                Memuat komposisi bank soal...
              </div>
            ) : dashFailed ? (
              <div className="error-message">
                Gagal memuat komposisi bank soal.
              </div>
            ) : questionBank.subjects.length === 0 ? (
              <div className="empty-message">
                Belum ada mata pelajaran aktif.
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="user-table">
                    <thead>
                      <tr>
                        <th>Mata Pelajaran</th>
                        <th className="align-center">Mudah</th>
                        <th className="align-center">Sedang</th>
                        <th className="align-center">Sulit</th>
                        <th className="align-center">Total</th>
                        <th className="align-center">Bergambar</th>
                        <th className="align-center">Belum Dipakai</th>
                      </tr>
                    </thead>

                    <tbody>
                      {questionBank.subjects.map((subject) => (
                        <tr key={subject.subject_id}>
                          <td>
                            <strong>{subject.name}</strong>
                          </td>

                          <td className="align-center">
                            <span className={getBankBadgeClass(subject.easy)}>
                              {subject.easy}
                            </span>
                          </td>

                          <td className="align-center">
                            <span className={getBankBadgeClass(subject.medium)}>
                              {subject.medium}
                            </span>
                          </td>

                          <td className="align-center">
                            <span className={getBankBadgeClass(subject.hard)}>
                              {subject.hard}
                            </span>
                          </td>

                          <td className="align-center">
                            <strong>{subject.total}</strong>
                          </td>

                          <td className="align-center">
                            <span className="score-badge is-image">
                              {subject.image_count ?? 0}
                            </span>
                          </td>

                          <td className="align-center">
                            <span className={subject.unused_count > 0 ? "score-badge is-warning" : "score-badge is-pass"}>
                              {subject.unused_count ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    padding: "12px 18px",
                    fontSize: 12,
                    color: "#6b7280",
                    borderTop: "1px solid #f3f4f6",
                    lineHeight: 1.7,
                  }}
                >
                  <div>
                    Pill Merah = belum ada soal, Kuning = kurang dari{" "}
                    {MIN_QUESTIONS_PER_CELL} soal, Hijau = jumlah soal memadai.
                  </div>

                  {questionBank.totalActive > 0 && (
                    <div>
                      Secara keseluruhan, {questionBank.unusedCount > 0
                        ? `${questionBank.unusedCount} dari ${questionBank.totalActive} soal aktif belum masuk paket tryout mana pun.`
                        : "Semua soal aktif sudah dipakai di paket tryout."}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Perlu Perhatian</h3>

                <p>Hal yang sebaiknya dicek admin</p>
              </div>
            </div>

            <div className="quick-menu">
              <button
                className="quick-menu-item"
                onClick={() => navigate("/tryouts")}
              >
                <span>
                  <IconClipboard size={20} />
                </span>

                <div>
                  <strong>Paket berisi soal nonaktif</strong>

                  <small>
                    {dashLoading
                      ? "Memuat…"
                      : dashFailed
                        ? "Gagal dimuat"
                        : attention.inactiveTryouts.count === 0
                          ? "Semua soal di paket aktif masih aktif"
                          : attention.inactiveTryouts.items
                              .map(
                                (item) =>
                                  `${truncateText(item.title, 28)} (${item.inactive_count})`,
                              )
                              .join(", ") +
                            (attention.inactiveTryouts.count >
                            attention.inactiveTryouts.items.length
                              ? ` +${
                                  attention.inactiveTryouts.count -
                                  attention.inactiveTryouts.items.length
                                } lainnya`
                              : "")}
                  </small>
                </div>

                <span
                  style={attentionBadgeStyle(
                    dashLoading || dashFailed
                      ? "info"
                      : attention.inactiveTryouts.count > 0
                        ? "warn"
                        : "ok",
                  )}
                >
                  {dashLoading
                    ? "…"
                    : dashFailed
                      ? "–"
                      : attention.inactiveTryouts.count > 0
                        ? attention.inactiveTryouts.count
                        : "Aman"}
                </span>
              </button>

              <button
                className="quick-menu-item"
                onClick={() => navigate("/questions")}
              >
                <span>
                  <IconNotebook size={20} />
                </span>

                <div>
                  <strong>Soal aktif tanpa pembahasan</strong>

                  <small>
                    {dashLoading
                      ? "Memuat…"
                      : dashFailed
                        ? "Gagal dimuat"
                        : attention.withoutExplanation === 0
                          ? "Semua soal aktif sudah berpembahasan"
                          : "Pembahasan tampil saat siswa meninjau hasil"}
                  </small>
                </div>

                <span
                  style={attentionBadgeStyle(
                    dashLoading || dashFailed
                      ? "info"
                      : attention.withoutExplanation > 0
                        ? "warn"
                        : "ok",
                  )}
                >
                  {dashLoading
                    ? "…"
                    : dashFailed
                      ? "–"
                      : attention.withoutExplanation > 0
                        ? attention.withoutExplanation
                        : "Aman"}
                </span>
              </button>

              <button
                className="quick-menu-item"
                onClick={() => navigate("/questions")}
              >
                <span>
                  <IconBarChart size={20} />
                </span>

                <div>
                  <strong>Penyimpanan gambar soal</strong>

                  <small>
                    {dashLoading
                      ? "Memuat…"
                      : dashFailed
                        ? "Gagal dimuat"
                        : `${attention.imageStorage.count} gambar di database`}
                  </small>
                </div>

                <span style={attentionBadgeStyle("info")}>
                  {dashLoading
                    ? "…"
                    : dashFailed
                      ? "–"
                      : formatBytes(attention.imageStorage.bytes)}
                </span>
              </button>

              <button
                className="quick-menu-item"
                onClick={() => navigate("/questions")}
              >
                <span>
                  <IconCpu size={20} />
                </span>

                <div>
                  <strong>Ukuran tabel bank soal</strong>

                  <small>
                    {dashLoading
                      ? "Memuat…"
                      : dashFailed
                        ? "Gagal dimuat"
                        : attention.questionTableSize.bytes === null
                          ? "Hanya tersedia di database Postgres"
                          : "Termasuk gambar yang tersimpan di kolom soal"}
                  </small>
                </div>

                <span style={attentionBadgeStyle("info")}>
                  {dashLoading
                    ? "…"
                    : dashFailed
                      ? "–"
                      : attention.questionTableSize.bytes === null
                        ? "N/A"
                        : formatBytes(attention.questionTableSize.bytes)}
                </span>
              </button>
            </div>
          </section>
        </div>
    </>
  );
}
