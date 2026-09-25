import {
  IconClipboard,
  IconTarget,
  IconTrophy,
  IconTrendingUp,
  IconBarChart,
} from "../Icons";
import StatCard from "../StatCard";
import "../ScoreTable.css";
import { timeAgo, shortDate, scoreTier, TREND_WIDTH, TREND_HEIGHT, TREND_PADDING_X, TREND_PADDING_BOTTOM, TREND_GRID_VALUES, trendValueToY, buildTrendPoints } from "../../utils/dashboardUtils";

export default function StudentDashboard({ data }) {
  const { studentStats, sortedStudentPreview, dashFailed, show, navigate, studentScoreTrend, studentSubjectBreakdown } = data;
  return (
    <>
        <div className="stat-grid">
          <StatCard
            icon={<IconClipboard />}
            title="Tryout Tersedia"
            value={show(studentStats.tryoutTersedia)}
            description="Siap dikerjakan"
          />

          <StatCard
            icon={<IconTarget />}
            title="Tryout Diikuti"
            value={show(studentStats.tryoutDiikuti)}
            description="Sudah dikerjakan"
          />

          <StatCard
            icon={<IconTrophy />}
            title="Nilai Terakhir"
            value={show(studentStats.nilaiTerakhir ?? "-")}
            description={
              dashFailed
                ? "Gagal dimuat"
                : studentStats.lastAttemptDate
                  ? timeAgo(studentStats.lastAttemptDate)
                  : "Belum ada nilai"
            }
            linkLabel="Lihat semua →"
            onLinkClick={() => navigate("/student/history")}
          />

          <StatCard
            icon={<IconTrendingUp />}
            title="Rata-rata"
            value={show(studentStats.rataRata ?? "-")}
            description={
              dashFailed
                ? "Gagal dimuat"
                : studentStats.tryoutDiikuti > 0
                  ? `Dari ${studentStats.tryoutDiikuti} tryout`
                  : "Belum ada data"
            }
          />
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Tryout Terbaru</h3>

                <p>Tryout yang tersedia untuk Anda</p>
              </div>
            </div>

            <div className="activity-list">
              {sortedStudentPreview.length === 0 && (
                <div className="activity-item">
                  <div className="activity-icon">
                    <IconClipboard size={18} />
                  </div>

                  <div className="activity-content">
                    <strong>
                      {dashFailed ? "Gagal memuat tryout" : "Belum ada tryout"}
                    </strong>

                    <span>
                      {dashFailed
                        ? 'Klik "Coba lagi" di atas untuk memuat ulang'
                        : "Tryout yang tersedia akan muncul di sini"}
                    </span>
                  </div>
                </div>
              )}

              {sortedStudentPreview.map((tryout) => {
                const isSubmitted = tryout.attempt_status === "SUBMITTED";
                const isInProgress = tryout.attempt_status === "IN_PROGRESS";

                // Selesai -> lihat hasilnya di Riwayat, belum
                // dikerjakan/sedang dikerjakan -> lanjut/mulai
                // dari Daftar Tryout (mengikuti alur yang sama
                // dengan tombol "Mulai Tryout" di Akses Cepat).
                const targetPath = isSubmitted
                  ? "/student/history"
                  : "/student/tryouts";

                return (
                  <div
                    className={`activity-item activity-item-clickable${
                      isInProgress ? " activity-item-urgent" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    key={tryout.id}
                    onClick={() => navigate(targetPath)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(targetPath);
                    }}
                  >
                    <div className="activity-icon">
                      <IconClipboard size={18} />
                    </div>

                    <div className="activity-content">
                      <strong>{tryout.title}</strong>

                      <span>{tryout.subject_name || "-"}</span>
                    </div>

                    {isSubmitted && (
                      <span className="score-badge is-pass">
                        Selesai ({tryout.score ?? "-"})
                      </span>
                    )}

                    {isInProgress && (
                      <span className="score-badge is-incomplete">
                        Sedang dikerjakan
                      </span>
                    )}

                    {!tryout.attempt_status && (
                      <span className="score-badge is-none">
                        Belum dikerjakan
                      </span>
                    )}

                    {isInProgress && (
                      <button
                        type="button"
                        className="activity-cta"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(targetPath);
                        }}
                      >
                        Lanjutkan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Akses Cepat</h3>

                <p>Menu siswa</p>
              </div>
            </div>

            <div className="quick-menu">
              <button
                className="quick-menu-item"
                onClick={() => navigate("/student/tryouts")}
              >
                <span>
                  <IconClipboard size={20} />
                </span>

                <div>
                  <strong>Mulai Tryout</strong>

                  <small>Ikuti tryout tersedia</small>
                </div>
              </button>

              <button
                className="quick-menu-item"
                onClick={() => navigate("/student/history")}
              >
                <span>
                  <IconBarChart size={20} />
                </span>

                <div>
                  <strong>Riwayat & Nilai</strong>

                  <small>Hasil semua tryout</small>
                </div>
              </button>
            </div>
          </section>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Tren Nilai</h3>

              <p>Perkembangan dari beberapa tryout terakhir</p>
            </div>
          </div>

          <div className="trend-chart-body">
            {studentScoreTrend.length === 0 && (
              <div className="activity-item">
                <div className="activity-icon">
                  <IconTrendingUp size={18} />
                </div>

                <div className="activity-content">
                  <strong>
                    {dashFailed
                      ? "Gagal memuat tren nilai"
                      : "Belum ada tren nilai"}
                  </strong>

                  <span>
                    {dashFailed
                      ? 'Klik "Coba lagi" di atas untuk memuat ulang'
                      : "Selesaikan beberapa tryout untuk melihat grafiknya di sini"}
                  </span>
                </div>
              </div>
            )}

            {studentScoreTrend.length > 0 &&
              (() => {
                const scores = studentScoreTrend.map((item) => item.score);
                const points = buildTrendPoints(scores);
                const baselineY = TREND_HEIGHT - TREND_PADDING_BOTTOM;

                const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

                const areaPoints =
                  points.length > 1
                    ? `${points[0].x},${baselineY} ${linePoints} ${
                        points[points.length - 1].x
                      },${baselineY}`
                    : "";

                const lastScore = scores[scores.length - 1];
                const prevScore =
                  scores.length > 1 ? scores[scores.length - 2] : null;
                const delta = prevScore !== null ? lastScore - prevScore : null;

                return (
                  <>
                    <div className="trend-chart-top">
                      <span className={`score-badge ${scoreTier(lastScore)}`}>
                        Terakhir: {lastScore}
                      </span>

                      {delta !== null && delta !== 0 && (
                        <span
                          className={`trend-delta ${
                            delta > 0 ? "is-up" : "is-down"
                          }`}
                        >
                          {delta > 0
                            ? `▲ Naik ${delta.toFixed(1)} poin`
                            : `▼ Turun ${Math.abs(delta).toFixed(1)} poin`}{" "}
                          dari tryout sebelumnya
                        </span>
                      )}

                      {delta === 0 && (
                        <span className="trend-delta is-flat">
                          → Sama dengan tryout sebelumnya
                        </span>
                      )}
                    </div>

                    <div style={{ position: "relative", width: "100%", height: "110px" }}>
                      <svg
                        className="trend-chart-svg"
                        viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
                        preserveAspectRatio="none"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                      >
                        {TREND_GRID_VALUES.map((value) => (
                          <line
                            key={value}
                            x1={TREND_PADDING_X}
                            x2={TREND_WIDTH - TREND_PADDING_X}
                            y1={trendValueToY(value)}
                            y2={trendValueToY(value)}
                            className="trend-chart-grid"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}

                        {areaPoints && (
                          <polygon
                            points={areaPoints}
                            className="trend-chart-area"
                          />
                        )}

                        {points.length > 1 && (
                          <polyline
                            points={linePoints}
                            className="trend-chart-line"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                      </svg>

                      {/* Label Sumbu Y (HTML) */}
                      {TREND_GRID_VALUES.map((value) => (
                        <span
                          key={value}
                          style={{
                            position: "absolute",
                            left: "2px",
                            top: `${(trendValueToY(value) / TREND_HEIGHT) * 100}%`,
                            transform: "translateY(-50%)",
                            fontSize: "10px",
                            color: "#9ca3af",
                            fontWeight: "500",
                          }}
                        >
                          {value}
                        </span>
                      ))}

                      {/* Titik Data & Nilai (HTML) */}
                      {points.map((p, i) => (
                        <div
                          key={studentScoreTrend[i].attempt_id}
                          style={{
                            position: "absolute",
                            left: `${(p.x / TREND_WIDTH) * 100}%`,
                            top: `${(p.y / TREND_HEIGHT) * 100}%`,
                            transform: "translate(-50%, -50%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            pointerEvents: "none",
                            zIndex: 10,
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              bottom: "10px",
                              fontSize: "13px",
                              fontWeight: "700",
                              color: "#374151",
                              whiteSpace: "nowrap",
                              textShadow: "0 1px 3px rgba(255,255,255,0.9)"
                            }}
                          >
                            {scores[i]}
                          </span>

                          <div
                            className={`trend-chart-dot-html ${scoreTier(scores[i])}`}
                            style={{ pointerEvents: "auto" }}
                            title={`${studentScoreTrend[i].tryout_title} — ${scores[i]} (${shortDate(studentScoreTrend[i].finished_at)})`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="trend-chart-axis">
                      {studentScoreTrend.length <= 5 ? (
                        points.map((p, i) => (
                          <span
                            key={studentScoreTrend[i].attempt_id}
                            style={{
                              position: "absolute",
                              left: `${(p.x / TREND_WIDTH) * 100}%`,
                              transform: "translateX(-50%)",
                            }}
                          >
                            {shortDate(studentScoreTrend[i].finished_at)}
                          </span>
                        ))
                      ) : (
                        <>
                          <span>
                            {shortDate(studentScoreTrend[0].finished_at)}
                          </span>

                          <span>
                            {shortDate(
                              studentScoreTrend[studentScoreTrend.length - 1]
                                .finished_at,
                            )}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="trend-chart-legend">
                      <span className="trend-chart-legend-item">
                        <span className="trend-chart-legend-dot is-pass" />
                        Baik (≥75)
                      </span>

                      <span className="trend-chart-legend-item">
                        <span className="trend-chart-legend-dot is-medium" />
                        Cukup (60–74)
                      </span>

                      <span className="trend-chart-legend-item">
                        <span className="trend-chart-legend-dot is-fail" />
                        Perlu ditingkatkan (&lt;60)
                      </span>
                    </div>

                    {studentScoreTrend.length === 1 && (
                      <p className="trend-chart-hint">
                        Kerjakan tryout lain untuk mulai melihat tren
                        naik/turun.
                      </p>
                    )}
                  </>
                );
              })()}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Nilai per Mata Pelajaran</h3>

              <p>
                Rata-rata dari percobaan terakhir tiap tryout, diurutkan dari
                yang paling lemah
              </p>
            </div>
          </div>

          <div className="activity-list">
            {studentSubjectBreakdown.length === 0 && (
              <div className="activity-item">
                <div className="activity-icon">
                  <IconBarChart size={18} />
                </div>

                <div className="activity-content">
                  <strong>
                    {dashFailed ? "Gagal memuat nilai" : "Belum ada nilai"}
                  </strong>

                  <span>
                    {dashFailed
                      ? 'Klik "Coba lagi" di atas untuk memuat ulang'
                      : "Kerjakan tryout untuk melihat breakdown nilai per mata pelajaran"}
                  </span>
                </div>
              </div>
            )}

            {studentSubjectBreakdown.map((subject, index) => {
              const badgeClass = scoreTier(subject.avg_score);

              return (
                <div className="subject-breakdown-row" key={subject.subject_id}>
                  <div className="subject-breakdown-head">
                    <span className="subject-breakdown-name">
                      {subject.subject_name}
                      {index === 0 && studentSubjectBreakdown.length > 1 && (
                        <span className="subject-breakdown-flag">
                          Paling lemah
                        </span>
                      )}
                    </span>

                    <span className={`score-badge ${badgeClass}`}>
                      {subject.avg_score}
                    </span>
                  </div>

                  <div className="subject-breakdown-track">
                    <div
                      className={`subject-breakdown-fill ${badgeClass}`}
                      style={{
                        width: `${Math.max(0, Math.min(100, subject.avg_score))}%`,
                      }}
                    />
                  </div>

                  <span className="subject-breakdown-meta">
                    Dari {subject.attempt_count} tryout
                  </span>
                </div>
              );
            })}
          </div>
        </div>
    </>
  );
}
