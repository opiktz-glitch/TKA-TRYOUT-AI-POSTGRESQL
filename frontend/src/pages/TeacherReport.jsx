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

import { getTeacherReport, getTryouts } from "../services/api";
import "./Report.css";
import { useAuth } from "../auth/AuthContext";
import { readPageCache, writePageCache } from "../services/pageCache";
import {
  WRONG_MEDIUM_PERCENT,
  PASS_THRESHOLD_PERCENT,
  bucketPassState,
} from "../utils/report";


// =====================================================
// INSIGHT — kalimat ringkas di atas kartu laporan
// =====================================================

function buildInsights(report) {
  if (!report || !report.total_attempts) {
    return [];
  }

  const insights = [];
  const total = report.total_attempts;

  // --- Kelulusan ---
  if (report.pass_rate !== null && report.pass_rate !== undefined) {
    // pass_rate dibulatkan di backend, jadi jumlah pastinya hanya
    // dihitung ulang saat kelasnya kecil (di bawah 100 peserta, hasil
    // pembulatan masih akurat). Selain itu pakai persentase.
    if (total < 100) {
      const passed = Math.round((total * report.pass_rate) / 100);
      const failed = total - passed;

      insights.push(
        failed === 0
          ? `Semua ${total} peserta lulus (batas lulus ${PASS_THRESHOLD_PERCENT}%).`
          : `${failed} dari ${total} peserta belum lulus (batas lulus ${PASS_THRESHOLD_PERCENT}%).`
      );
    } else {
      insights.push(
        `${100 - report.pass_rate}% peserta belum lulus (batas lulus ${PASS_THRESHOLD_PERCENT}%).`
      );
    }
  }

  // --- Soal tersulit ---
  const hardest = report.hardest_questions?.[0];

  if (hardest) {
    insights.push(
      hardest.wrong_percentage >= WRONG_MEDIUM_PERCENT
        ? `Soal no. ${hardest.question_number} paling sulit: ${hardest.wrong_percentage}% peserta salah atau tidak menjawab.`
        : `Tidak ada soal dengan tingkat salah di atas ${WRONG_MEDIUM_PERCENT}%.`
    );
  }

  return insights;
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

  // Penyebut persen = jumlah peserta yang masuk bucket, supaya persen
  // semua bar berjumlah 100%.
  const bucketTotal = report
    ? report.score_distribution.reduce((sum, b) => sum + b.count, 0)
    : 0;

  // Skala skor tryout ini (skor maksimal) dan rata-rata dalam persen,
  // supaya angka rata-rata langsung punya konteks ("72.5 dari 100 = 72%").
  const scoreScale = report?.max_score > 0 ? report.max_score : null;

  const insights = buildInsights(report);

  // Info singkat tryout yang sedang dipilih (dari daftar tryout yang sudah
  // di-cache, jadi langsung tampil). Nama mapel baru ada di laporan, jadi
  // dipakai hanya kalau laporan yang tampil memang milik tryout terpilih.
  // Daftar dari backend sudah urut terbaru dulu (id menurun), jadi dropdown
  // dan pilihan awal otomatis tryout paling baru.
  const selectedTryout = tryoutOptions.find(
    (t) => String(t.id) === selectedTryoutId
  );

  const reportIsForSelected =
    report && String(report.tryout_id) === selectedTryoutId;

  // Tautan "siswa yang belum lulus" hanya kalau memang ada yang belum lulus.
  const showFailedLink =
    reportIsForSelected &&
    report.pass_rate !== null &&
    report.pass_rate !== undefined &&
    report.pass_rate < 100;

  const tryoutInfo = selectedTryout
    ? [
        reportIsForSelected ? report.subject_name : null,
        selectedTryout.grade ? `Kelas ${selectedTryout.grade}` : null,
        selectedTryout.total_questions
          ? `${selectedTryout.total_questions} soal`
          : null,
        selectedTryout.duration_minutes
          ? `${selectedTryout.duration_minutes} menit`
          : null,
        selectedTryout.difficulty || null,
      ].filter(Boolean)
    : [];

  const averagePercent =
    scoreScale && report?.average_score !== null && report?.average_score !== undefined
      ? Math.round((report.average_score / scoreScale) * 100)
      : null;


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
