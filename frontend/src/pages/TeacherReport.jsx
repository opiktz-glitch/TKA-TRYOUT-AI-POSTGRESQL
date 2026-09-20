import { useEffect, useRef, useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import StatCard from "../components/StatCard";
import {
  IconUsers,
  IconTarget,
  IconCheck,
  IconTrophy,
  IconTrendingUp,
} from "../components/Icons";

import { getTeacherReport, getTryouts } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import { readPageCache, writePageCache } from "../services/pageCache";


// =====================================================
// HELPER — warna badge berdasarkan tingkat kesalahan
// =====================================================

function wrongBadgeStyle(percentage) {
  if (percentage >= 60) {
    return { background: "#fef2f2", color: "#dc2626" };
  }

  if (percentage >= 30) {
    return { background: "#fffbeb", color: "#b45309" };
  }

  return { background: "var(--accent-soft, #E2F4F1)", color: "var(--success, #3F7D58)" };
}


// =====================================================
// CACHE — kunci (lihat services/pageCache.js)
// Daftar tryout di-cache satu kali; laporan di-cache PER TRYOUT.
// =====================================================

const TRYOUT_OPTIONS_CACHE_KEY = "teacher-report-options";

function reportCacheKey(tryoutId) {
  return `teacher-report:${tryoutId}`;
}


function TeacherReport() {
  const { user } = useAuth();

  // Data dari kunjungan sebelumnya di sesi ini. Pilihan tryout selalu
  // mulai dari tryout PERTAMA di daftar (seperti sebelumnya), jadi cache
  // yang dipakai di awal adalah daftar tryout + laporan tryout pertama.
  // Kalau ada, langsung tampil (tanpa "Memuat...") lalu diperbarui
  // diam-diam.
  const cachedOptions = readPageCache(user?.id, TRYOUT_OPTIONS_CACHE_KEY);

  const initialTryoutId =
    cachedOptions && cachedOptions.length > 0 ? String(cachedOptions[0].id) : "";

  const cachedReport = initialTryoutId
    ? readPageCache(user?.id, reportCacheKey(initialTryoutId))
    : undefined;

  // Tryout yang laporannya sedang ditunggu. Dipakai untuk mengabaikan
  // respons yang sudah usang (pilihan keburu diganti).
  const latestReportKeyRef = useRef(null);

  const [tryoutOptions, setTryoutOptions] = useState(() => cachedOptions ?? []);
  const [selectedTryoutId, setSelectedTryoutId] = useState(initialTryoutId);

  const [report, setReport] = useState(() => cachedReport ?? null);

  const [loadingOptions, setLoadingOptions] = useState(() => !cachedOptions);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    loadTryoutOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTryoutId) {
      loadReport(selectedTryoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTryoutId]);


  async function loadTryoutOptions() {
    // Sudah ada daftar lama di layar -> perbarui diam-diam: tanpa
    // "Memuat daftar tryout...", dan kalau gagal, daftar lama dibiarkan.
    const hasCachedOptions = Boolean(
      readPageCache(user?.id, TRYOUT_OPTIONS_CACHE_KEY)
    );

    try {
      if (!hasCachedOptions) {
        setLoadingOptions(true);
      }

      setError("");

      const data = await getTryouts();

      // Hanya tryout milik guru yang sedang login yang
      // muncul di dropdown pemilihan laporan.
      const mine = user
        ? data.filter((t) => t.created_by === user.id)
        : data;

      setTryoutOptions(mine);
      writePageCache(user?.id, TRYOUT_OPTIONS_CACHE_KEY, mine);

      // Pilih tryout pertama kalau belum ada pilihan. Kalau user sudah
      // memilih tryout lain selagi daftar diperbarui, pilihannya
      // dipertahankan (selama tryout itu masih ada di daftar).
      setSelectedTryoutId((current) => {
        if (current && mine.some((t) => String(t.id) === current)) {
          return current;
        }

        return mine.length > 0 ? String(mine[0].id) : "";
      });

      if (mine.length === 0) {
        setReport(null);
      }
    } catch (err) {
      console.error("LOAD TRYOUT OPTIONS ERROR:", err);

      if (!hasCachedOptions) {
        setError(err.message || "Gagal memuat daftar tryout");
      }
    } finally {
      setLoadingOptions(false);
    }
  }


  async function loadReport(tryoutId) {
    const cacheKey = reportCacheKey(tryoutId);

    const cachedData = readPageCache(user?.id, cacheKey);

    latestReportKeyRef.current = cacheKey;

    if (cachedData) {
      // Tryout ini pernah dimuat: tampilkan langsung, lalu perbarui
      // diam-diam (tanpa loading; kalau gagal, laporan lama dibiarkan).
      setReport(cachedData);
      setLoadingReport(false);
    } else {
      setLoadingReport(true);
    }

    setError("");

    try {
      const data = await getTeacherReport(tryoutId);

      writePageCache(user?.id, cacheKey, data);

      // Abaikan hasil kalau pilihan tryout sudah berganti selama menunggu.
      if (latestReportKeyRef.current === cacheKey) {
        setReport(data);
      }
    } catch (err) {
      console.error("LOAD REPORT ERROR:", err);

      if (!cachedData && latestReportKeyRef.current === cacheKey) {
        setError(err.message || "Gagal memuat laporan");
        setReport(null);
      }
    } finally {
      if (latestReportKeyRef.current === cacheKey) {
        setLoadingReport(false);
      }
    }
  }


  const maxBucketCount = report
    ? Math.max(1, ...report.score_distribution.map((b) => b.count))
    : 1;


  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="content">

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
                  description={report.max_score ? `Dari maksimal ${report.max_score}` : "Dari semua peserta"}
                />

                <StatCard
                  icon={<IconTrophy />}
                  title="Skor Tertinggi / Terendah"
                  value={
                    report.highest_score !== null
                      ? `${report.highest_score} / ${report.lowest_score}`
                      : "-"
                  }
                  description="Rentang perolehan skor"
                />

                <StatCard
                  icon={<IconCheck />}
                  title="Tingkat Lulus"
                  value={report.pass_rate !== null ? `${report.pass_rate}%` : "-"}
                  description="Dari peserta yang selesai"
                />
              </div>

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
                          className="dist-bar-fill"
                          style={{
                            width: `${(bucket.count / maxBucketCount) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="dist-bar-count">{bucket.count}</div>

                    </div>
                  ))}

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

                <div style={{ padding: "4px 18px 10px" }}>

                  {report.hardest_questions.length === 0 && (
                    <div className="empty-message">
                      Belum ada data jawaban untuk tryout ini.
                    </div>
                  )}

                  {report.hardest_questions.map((q, index) => (
                    <div className="hardest-question-item" key={q.question_id}>

                      <div className="hardest-question-body">

                        <div className="hardest-question-rank">
                          {index + 1}
                        </div>

                        <div>
                          <div className="hardest-question-text">
                            {q.question_text}
                          </div>

                          <div className="hardest-question-meta">
                            No. {q.question_number} &middot; {q.correct_count} dari {report.total_attempts} peserta menjawab benar
                          </div>
                        </div>

                      </div>

                      <span
                        className="wrong-badge"
                        style={wrongBadgeStyle(q.wrong_percentage)}
                      >
                        {q.wrong_percentage}% salah
                      </span>

                    </div>
                  ))}

                </div>

              </div>

            </>
          )}

        </div>

      </main>
    </div>
  );
}

export default TeacherReport;
