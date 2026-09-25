import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

import StatCard from "../components/StatCard";
import { readDashboardCache, writeDashboardCache } from "../services/dashboardCache";
import { parseUtcDate } from "../utils/date";
import "../components/ScoreTable.css";
import {
  IconGraduationCap,
  IconNotebook,
  IconClipboard,
  IconBarChart,
  IconTarget,
  IconTrophy,
  IconTrendingUp,
  IconClock,
  IconCheck,
  IconRefresh,
  IconCpu,
} from "../components/Icons";

import {
  getAdminDashboardSummary,
  getAdminLiveSummary,
  getTeacherDashboardSummary,
  getStudentDashboardSummary,
  getSystemStatus,
  getAIStatus,
} from "../services/api";


// =====================================================
// HELPER — potong teks panjang untuk preview singkat
// =====================================================

// =====================================================
// HELPER — nama tampilan provider AI untuk kartu "Status AI"
// milik GURU (GET /api/settings/ai-status cuma mengirim kode
// provider, mis. "OLLAMA", bukan label siap-tampil).
// =====================================================

function providerLabel(activeProvider) {
  if (activeProvider === "OLLAMA") {
    return "Ollama";
  }

  if (activeProvider === "GEMINI") {
    return "Google Gemini";
  }

  return activeProvider || "-";
}

function truncateText(text, maxLength = 70) {
  if (!text) {
    return "";
  }

  return text.length > maxLength
    ? `${text.slice(0, maxLength)}…`
    : text;
}


// =====================================================
// HELPER — format tanggal jadi relatif ("2 jam lalu", dst)
// =====================================================

function timeAgo(dateString) {
  // parseUtcDate: timestamp backend berupa UTC tanpa "Z", jangan
  // langsung new Date() (meleset 7 jam di WIB, lihat utils/date.js).
  const date = parseUtcDate(dateString);

  if (!date) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Baru saja";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} menit lalu`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} jam lalu`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} hari lalu`;
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


// =====================================================
// HELPER — format tanggal singkat ("21 Sep") untuk label
// sumbu grafik "Tren Nilai" (dashboard Siswa), beda dari
// timeAgo() yang untuk teks relatif di kartu lain.
// =====================================================

function shortDate(dateString) {
  const date = parseUtcDate(dateString);

  if (!date) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}


// =====================================================
// KOMPOSISI BANK SOAL (widget dashboard admin)
//
// Sel dengan jumlah soal di bawah batas ini diberi warna supaya
// admin langsung melihat "celah" bank soal. Ubah angkanya kalau
// dirasa terlalu ketat/longgar untuk skala soal Anda.
// =====================================================

const MIN_QUESTIONS_PER_CELL = 5;


// =====================================================
// Jeda refresh angka "live" di dashboard admin (Sedang
// Mengerjakan, Selesai Hari Ini), dalam milidetik.
// =====================================================

const LIVE_REFRESH_MS = 30000;

function bankCellStyle(count) {
  if (count === 0) {
    return { background: "#f8d7da", color: "#842029", fontWeight: 600 };
  }

  if (count < MIN_QUESTIONS_PER_CELL) {
    return { background: "#fff3cd", color: "#856404", fontWeight: 600 };
  }

  return undefined;
}


// =====================================================
// PANEL "PERLU PERHATIAN" (dashboard admin)
// =====================================================

function formatBytes(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ATTENTION_BADGE_BASE = {
  marginLeft: "auto",
  flexShrink: 0,
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

// tone: "warn" (perlu dicek), "ok" (aman), "info" (netral)
function attentionBadgeStyle(tone) {
  if (tone === "warn") {
    return { ...ATTENTION_BADGE_BASE, background: "#fff3cd", color: "#856404" };
  }

  if (tone === "ok") {
    return { ...ATTENTION_BADGE_BASE, background: "#d1e7dd", color: "#0f5132" };
  }

  return { ...ATTENTION_BADGE_BASE, background: "#f3f4f6", color: "#374151" };
}


// =====================================================
// TINGKAT NILAI (dashboard Siswa) -- dipakai bareng oleh
// kartu "Nilai per Mata Pelajaran" (badge + bar) dan kartu
// "Tren Nilai" (warna titik di grafik), supaya ambang batas
// hijau/kuning/merahnya konsisten di kedua tempat.
// =====================================================

function scoreTier(score) {
  if (score >= 75) {
    return "is-pass";
  }

  if (score >= 60) {
    return "is-medium";
  }

  return "is-fail";
}


// =====================================================
// TITIK GRAFIK "TREN NILAI" (dashboard Siswa)
//
// Ubah daftar {score, ...} jadi koordinat SVG. Asumsi skala
// nilai 0-100 (sama seperti scoreTier() di atas dan bar di
// kartu "Nilai per Mata Pelajaran"). Nilai di-clamp ke 0-100
// supaya data yang di luar dugaan tidak menggambar titik di
// luar area grafik.
//
// Padding atas/bawah SENGAJA tidak simetris: atas perlu ruang
// lebih supaya angka nilai yang ditulis di atas tiap titik
// (lihat render-nya di JSX) tidak kepotong kalau nilainya
// mendekati 100, bawah cukup untuk sumbu tanggal.
// =====================================================

const TREND_WIDTH = 320;
const TREND_HEIGHT = 110;
const TREND_PADDING_X = 20;
const TREND_PADDING_TOP = 26;
const TREND_PADDING_BOTTOM = 14;

// Garis bantu skala nilai (bukan cuma dekorasi kosong) --
// ditandai di 0/50/100 supaya posisi titik di grafik punya
// acuan angka, bukan cuma naik/turun relatif tanpa skala.
const TREND_GRID_VALUES = [0, 50, 100];

function trendValueToY(value) {
  const usableHeight = TREND_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM;
  const clamped = Math.max(0, Math.min(100, value));

  return TREND_PADDING_TOP + usableHeight - (clamped / 100) * usableHeight;
}

function buildTrendPoints(scores) {
  const n = scores.length;

  if (n === 0) {
    return [];
  }

  const usableWidth = TREND_WIDTH - TREND_PADDING_X * 2;

  return scores.map((score, i) => {
    const x =
      n === 1
        ? TREND_WIDTH / 2
        : TREND_PADDING_X + (i * usableWidth) / (n - 1);

    return { x, y: trendValueToY(score) };
  });
}


// =====================================================
// CACHE DASHBOARD — kunci cache per role
// (lihat services/dashboardCache.js)
// =====================================================

function roleCacheKey(role) {
  if (role === "ADMIN") {
    return "admin";
  }

  if (role === "GURU") {
    return "teacher";
  }

  if (role === "SISWA") {
    return "student";
  }

  return null;
}


function Dashboard() {
  // Tambahkan 'loading' dari useAuth()
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Data dari kunjungan dashboard sebelumnya di sesi ini (lihat
  // services/dashboardCache.js). Kosong ({}) saat pertama kali login
  // atau setelah halaman di-refresh -- saat itu loading tampil seperti
  // biasa. Kalau ada, langsung ditampilkan (tanpa "..." / kartu kosong)
  // lalu diperbarui diam-diam di belakang layar.
  const cached = readDashboardCache(user?.id);

  // "Sedang memuat" hanya kalau BELUM ada data lama untuk role ini.
  const [dashLoading, setDashLoading] = useState(
    () => !cached[roleCacheKey(user?.role)]
  );
  const [dashError, setDashError] = useState("");

  // Pemuatan PERTAMA gagal (belum ada data lama): dashError terisi
  // dan state masih bernilai awal (0 / kosong). Nilai awal itu jangan
  // ditampilkan seolah data asli -- pakai "–" / "Gagal dimuat". Kalau
  // sudah ada data lama, dashError tidak pernah terisi (lihat
  // loadDashboardData), jadi data lama tetap tampil.
  const dashFailed = Boolean(dashError);

  // Nilai kartu angka: "…" saat memuat, "–" kalau gagal.
  const show = (value) => (dashLoading ? "…" : dashFailed ? "–" : value);

  // ADMIN
  const [adminStats, setAdminStats] = useState(
    () =>
      cached.admin?.stats ?? {
        totalStudents: 0,
        totalTryouts: 0,
        activeTryouts: 0,
      }
  );

  // Angka "live" (Sedang Mengerjakan, Selesai Hari Ini). null = belum
  // pernah berhasil dimuat; failed = pemuatan terakhir gagal.
  const [liveStats, setLiveStats] = useState(() =>
    cached.live
      ? { ...cached.live, failed: false }
      : {
          inProgress: null,
          finishedToday: null,
          failed: false,
        }
  );

  const [questionBank, setQuestionBank] = useState(
    () =>
      cached.admin?.questionBank ?? {
        subjects: [],
        totalActive: 0,
        unusedCount: 0,
      }
  );

  const [attention, setAttention] = useState(
    () =>
      cached.admin?.attention ?? {
        inactiveTryouts: { count: 0, items: [] },
        withoutExplanation: 0,
        imageStorage: { count: 0, bytes: 0 },
        questionTableSize: { bytes: null },
      }
  );

  // GURU
  const [teacherStats, setTeacherStats] = useState(
    () =>
      cached.teacher?.stats ?? {
        totalSoal: 0,
        totalTryout: 0,
        totalPeserta: 0,
        totalHasil: 0,
      }
  );

  const [teacherActivity, setTeacherActivity] = useState(
    () =>
      cached.teacher?.activity ?? {
        latestQuestion: null,
        latestTryout: null,
      }
  );

  // SISWA
  const [studentStats, setStudentStats] = useState(
    () =>
      cached.student?.stats ?? {
        tryoutTersedia: 0,
        tryoutDiikuti: 0,
        nilaiTerakhir: null,
        rataRata: null,
        lastAttemptDate: null,
      }
  );

  const [studentTryoutsPreview, setStudentTryoutsPreview] = useState(
    () => cached.student?.preview ?? []
  );

  const [studentSubjectBreakdown, setStudentSubjectBreakdown] = useState(
    () => cached.student?.subjectBreakdown ?? []
  );

  const [studentScoreTrend, setStudentScoreTrend] = useState(
    () => cached.student?.scoreTrend ?? []
  );

  // INFORMASI SISTEM (API, Database, Auth, AI/Ollama)
  const [systemStatus, setSystemStatus] = useState(
    () => cached.system ?? null
  );
  const [systemLoading, setSystemLoading] = useState(() => !cached.system);
  const [systemError, setSystemError] = useState("");

  // Kartu "Status AI" milik GURU -- ringkasan, bukan status sistem
  // penuh (lihat loadAiCardStatus dan GET /api/settings/ai-status).
  const [aiCardStatus, setAiCardStatus] = useState(
    () => cached.aiCard ?? null
  );
  const [aiCardLoading, setAiCardLoading] = useState(() => !cached.aiCard);
  const [aiCardError, setAiCardError] = useState("");


  // =====================================================
  // LOAD DATA — sesuai role user yang sedang login
  // =====================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    loadDashboardData(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  // =====================================================
  // LOAD — Informasi Sistem
  //
  // Dicek langsung ke backend (bukan teks statis), termasuk
  // status koneksi ke server AI (Ollama). Hanya dicek saat
  // dashboard dibuka / di-refresh, atau lewat tombol
  // "Cek Ulang" manual — tidak ada auto-refresh berkala.
  // =====================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    // Kartu "Informasi Sistem" cuma untuk ADMIN (lengkap) dan GURU
    // (ringkas, guru perlu tahu AI hidup untuk membuat soal). SISWA
    // tidak melihat kartu ini sama sekali, jadi tidak ada panggilan API.
    if (user.role === "ADMIN") {
      // Sudah ada status lama -> perbarui diam-diam (tanpa "Memeriksa...").
      loadSystemStatus({ silent: Boolean(readDashboardCache(user.id).system) });
    } else if (user.role === "GURU") {
      loadAiCardStatus({ silent: Boolean(readDashboardCache(user.id).aiCard) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  // =====================================================
  // LOAD — Angka "live" dashboard ADMIN (polling ringan)
  //
  // Diambil dari endpoint tersendiri (/api/admin/live-summary),
  // bukan dari ringkasan utama, dan di-refresh tiap
  // LIVE_REFRESH_MS. Refresh berkala HANYA jalan saat tab
  // terlihat; begitu tab dibuka lagi, langsung di-refresh sekali.
  // Kalau gagal, angka lama dibiarkan (jangan mengganggu
  // dashboard karena widget kecil ini).
  // =====================================================

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      return undefined;
    }

    const userId = user.id;

    let cancelled = false;

    async function refreshLiveStats() {
      try {
        const data = await getAdminLiveSummary();

        if (!cancelled) {
          const nextLive = {
            inProgress: data.in_progress,
            finishedToday: data.finished_today,
          };

          setLiveStats({ ...nextLive, failed: false });
          writeDashboardCache(userId, "live", nextLive);
        }
      } catch (err) {
        console.error("LOAD LIVE SUMMARY ERROR:", err);

        if (!cancelled) {
          setLiveStats((prev) => ({ ...prev, failed: true }));
        }
      }
    }

    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        refreshLiveStats();
      }
    }

    refreshLiveStats();

    const timerId = setInterval(refreshIfVisible, LIVE_REFRESH_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      cancelled = true;
      clearInterval(timerId);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [user?.role, user?.id]);

  // silent = true: sudah ada data lama di layar, jadi tidak menampilkan
  // "Memeriksa..." dan kegagalan tidak menimpa data lama (cukup dicatat
  // di console). Tombol "Cek Ulang" memanggilnya TANPA silent karena itu
  // permintaan eksplisit dari user.
  async function loadSystemStatus({ silent = false } = {}) {
    try {
      if (!silent) {
        setSystemLoading(true);
      }

      setSystemError("");

      const data = await getSystemStatus();
      setSystemStatus(data);
      writeDashboardCache(user?.id, "system", data);
    } catch (err) {
      console.error("LOAD SYSTEM STATUS ERROR:", err);

      if (!silent) {
        setSystemError(
          err.message || "Gagal memuat status sistem"
        );
      }
    } finally {
      setSystemLoading(false);
    }
  }

  // Sama seperti loadSystemStatus di atas, tapi untuk kartu ringkas
  // GURU: cuma memanggil GET /api/settings/ai-status (tidak membawa
  // detail infrastruktur seperti direktori DB / alamat server AI).
  async function loadAiCardStatus({ silent = false } = {}) {
    try {
      if (!silent) {
        setAiCardLoading(true);
      }

      setAiCardError("");

      const data = await getAIStatus();
      setAiCardStatus(data);
      writeDashboardCache(user?.id, "aiCard", data);
    } catch (err) {
      console.error("LOAD AI CARD STATUS ERROR:", err);

      if (!silent) {
        setAiCardError(
          err.message || "Gagal memuat status AI"
        );
      }
    } finally {
      setAiCardLoading(false);
    }
  }

  // Kalau sudah ada data lama untuk role ini (kunjungan sebelumnya),
  // data itu sudah tampil: TIDAK menampilkan loading, dan kalau
  // pembaruan gagal, data lama dibiarkan (cukup dicatat di console).
  // Loading & pesan error hanya untuk pemuatan pertama.
  async function loadDashboardData(currentUser) {
    const hasCachedData = Boolean(
      readDashboardCache(currentUser.id)[roleCacheKey(currentUser.role)]
    );

    try {
      if (!hasCachedData) {
        setDashLoading(true);
      }

      setDashError("");

      if (currentUser.role === "ADMIN") {
        await loadAdminData(currentUser);
      } else if (currentUser.role === "GURU") {
        await loadTeacherData(currentUser);
      } else if (currentUser.role === "SISWA") {
        await loadStudentData(currentUser);
      }
    } catch (err) {
      console.error("LOAD DASHBOARD DATA ERROR:", err);

      if (!hasCachedData) {
        setDashError(
          err.message || "Gagal memuat data dashboard"
        );
      }
    } finally {
      setDashLoading(false);
    }
  }

  async function loadAdminData(currentUser) {
    const data = await getAdminDashboardSummary();

    const nextStats = {
      totalStudents: data.stats.total_students,
      totalTryouts: data.stats.total_tryouts,
      activeTryouts: data.stats.active_tryouts,
    };

    const nextQuestionBank = {
      subjects: data.question_bank.subjects,
      totalActive: data.question_bank.total_active,
      unusedCount: data.question_bank.unused_count,
    };

    const nextAttention = {
      inactiveTryouts: data.attention.tryouts_with_inactive_questions,
      withoutExplanation: data.attention.questions_without_explanation,
      imageStorage: data.attention.image_storage,
      questionTableSize: data.attention.question_table_size,
    };

    setAdminStats(nextStats);
    setQuestionBank(nextQuestionBank);
    setAttention(nextAttention);

    writeDashboardCache(currentUser.id, "admin", {
      stats: nextStats,
      questionBank: nextQuestionBank,
      attention: nextAttention,
    });
  }

  async function loadTeacherData(currentUser) {
    const data = await getTeacherDashboardSummary();

    const nextStats = {
      totalSoal: data.stats.total_soal,
      totalTryout: data.stats.total_tryout,
      totalPeserta: data.stats.total_peserta,
      totalHasil: data.stats.total_hasil,
    };

    const nextActivity = {
      latestQuestion: data.activity.latest_question,
      latestTryout: data.activity.latest_tryout,
    };

    setTeacherStats(nextStats);
    setTeacherActivity(nextActivity);

    writeDashboardCache(currentUser.id, "teacher", {
      stats: nextStats,
      activity: nextActivity,
    });
  }

  async function loadStudentData(currentUser) {
    const data = await getStudentDashboardSummary();

    const nextStats = {
      tryoutTersedia: data.stats.tryout_tersedia,
      tryoutDiikuti: data.stats.tryout_diikuti,
      nilaiTerakhir: data.stats.nilai_terakhir,
      rataRata: data.stats.rata_rata,
      lastAttemptDate: data.stats.last_attempt_date,
    };

    setStudentStats(nextStats);
    setStudentTryoutsPreview(data.preview);
    setStudentSubjectBreakdown(data.subject_breakdown ?? []);
    setStudentScoreTrend(data.score_trend ?? []);

    writeDashboardCache(currentUser.id, "student", {
      stats: nextStats,
      preview: data.preview,
      subjectBreakdown: data.subject_breakdown ?? [],
      scoreTrend: data.score_trend ?? [],
    });
  }


  // Tryout "Sedang Dikerjakan" ditonjolkan ke urutan pertama di
  // kartu "Tryout Terbaru" -- itu yang paling mendesak buat siswa
  // (kemungkinan ada deadline berjalan), jangan sampai ketimbun
  // rata di antara tryout lain yang belum/sudah dikerjakan.
  // Pakai .slice() + sort stabil supaya urutan asli antar tryout
  // dengan status sama tidak berubah.
  const sortedStudentPreview = [...studentTryoutsPreview].sort(
    (a, b) =>
      (b.attempt_status === "IN_PROGRESS" ? 1 : 0) -
      (a.attempt_status === "IN_PROGRESS" ? 1 : 0)
  );

  // Jika masih proses memuat data user dari token
  if (loading) {
    return <div className="loading-screen">Memuat sesi...</div>;
  }

  // Jika tidak ada user setelah loading selesai
  if (!user) {
    return (
      <div className="dashboard-card">
        <h2>Sesi tidak ditemukan. Silakan login ulang.</h2>
      </div>
    );
  }

  return (

    <>
      {/* =========================================
          WELCOME
      ========================================= */}

      <div className="welcome-section">

        <div>

          <h1>
            Selamat datang,{" "}
            {user.full_name || user.username}
          </h1>

          <p>
            {user.role === "ADMIN" &&
              "Kelola seluruh sistem TKA Tryout melalui Dashboard Admin."}

            {user.role === "GURU" &&
              "Kelola soal, tryout, peserta, dan hasil belajar siswa."}

            {user.role === "SISWA" &&
              "Ikuti tryout, lihat hasil, dan pantau perkembangan belajar Anda."}
          </p>

        </div>

      </div>


      {dashError && (
        <div
          className="dashboard-card"
          style={{
            borderColor: "#fca5a5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <p style={{ color: "#dc2626", margin: 0 }}>
            {dashError}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => loadDashboardData(user)}
          >
            Coba lagi
          </button>
        </div>
      )}


      {/* =========================================
          ADMIN DASHBOARD
      ========================================= */}

      {user.role === "ADMIN" && (

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

                  <h3>
                    Komposisi Bank Soal
                  </h3>

                  <p>
                    Soal aktif per mata pelajaran dan tingkat kesulitan
                  </p>

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
                        </tr>
                      </thead>

                      <tbody>
                        {questionBank.subjects.map((subject) => (
                          <tr key={subject.subject_id}>

                            <td>
                              <strong>{subject.name}</strong>
                            </td>

                            <td
                              className="align-center"
                              style={bankCellStyle(subject.easy)}
                            >
                              {subject.easy}
                            </td>

                            <td
                              className="align-center"
                              style={bankCellStyle(subject.medium)}
                            >
                              {subject.medium}
                            </td>

                            <td
                              className="align-center"
                              style={bankCellStyle(subject.hard)}
                            >
                              {subject.hard}
                            </td>

                            <td className="align-center">
                              <strong>{subject.total}</strong>
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
                      Merah = belum ada soal, kuning = kurang dari{" "}
                      {MIN_QUESTIONS_PER_CELL} soal.
                    </div>

                    {questionBank.totalActive > 0 && (
                      <div>
                        {questionBank.unusedCount > 0
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

                  <h3>
                    Perlu Perhatian
                  </h3>

                  <p>
                    Hal yang sebaiknya dicek admin
                  </p>

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

                    <strong>
                      Paket berisi soal nonaktif
                    </strong>

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
                                    `${truncateText(item.title, 28)} (${item.inactive_count})`
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
                          : "ok"
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

                    <strong>
                      Soal aktif tanpa pembahasan
                    </strong>

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
                          : "ok"
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

                    <strong>
                      Penyimpanan gambar soal
                    </strong>

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

                    <strong>
                      Ukuran tabel bank soal
                    </strong>

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

      )}


      {/* =========================================
          GURU DASHBOARD
      ========================================= */}

      {user.role === "GURU" && (

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

                  <h3>
                    Aktivitas Guru
                  </h3>

                  <p>
                    Aktivitas pengelolaan pembelajaran
                  </p>

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

                    <strong>
                      Bank Soal
                    </strong>

                    <span>
                      {dashFailed
                        ? "Gagal dimuat"
                        : teacherActivity.latestQuestion
                          ? truncateText(
                              teacherActivity.latestQuestion.question_text,
                              60
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

                    <strong>
                      Tryout
                    </strong>

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

                  <h3>
                    Akses Cepat
                  </h3>

                  <p>
                    Menu guru
                  </p>

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

                    <strong>
                      Bank Soal
                    </strong>

                    <small>
                      Kelola soal
                    </small>

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

                    <strong>
                      Buat Tryout
                    </strong>

                    <small>
                      Buat paket tryout
                    </small>

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

                    <strong>
                      Hasil Peserta
                    </strong>

                    <small>
                      Lihat hasil tryout
                    </small>

                  </div>

                </button>

              </div>

            </section>

          </div>

        </>

      )}


      {/* =========================================
          SISWA DASHBOARD
      ========================================= */}

      {user.role === "SISWA" && (

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

                  <h3>
                    Tryout Terbaru
                  </h3>

                  <p>
                    Tryout yang tersedia untuk Anda
                  </p>

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
                          ? "Klik \"Coba lagi\" di atas untuk memuat ulang"
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

                        <strong>
                          {tryout.title}
                        </strong>

                        <span>
                          {tryout.subject_name || "-"}
                        </span>

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

                  <h3>
                    Akses Cepat
                  </h3>

                  <p>
                    Menu siswa
                  </p>

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

                    <strong>
                      Mulai Tryout
                    </strong>

                    <small>
                      Ikuti tryout tersedia
                    </small>

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

                    <strong>
                      Riwayat & Nilai
                    </strong>

                    <small>
                      Hasil semua tryout
                    </small>

                  </div>

                </button>

              </div>

            </section>

          </div>


          <div className="dashboard-card">

            <div className="card-header">

              <div>

                <h3>
                  Tren Nilai
                </h3>

                <p>
                  Perkembangan dari beberapa tryout terakhir
                </p>

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
                      {dashFailed ? "Gagal memuat tren nilai" : "Belum ada tren nilai"}
                    </strong>

                    <span>
                      {dashFailed
                        ? "Klik \"Coba lagi\" di atas untuk memuat ulang"
                        : "Selesaikan beberapa tryout untuk melihat grafiknya di sini"}
                    </span>

                  </div>

                </div>

              )}

              {studentScoreTrend.length > 0 && (() => {

                const scores = studentScoreTrend.map((item) => item.score);
                const points = buildTrendPoints(scores);
                const baselineY = TREND_HEIGHT - TREND_PADDING_BOTTOM;

                const linePoints = points
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ");

                const areaPoints =
                  points.length > 1
                    ? `${points[0].x},${baselineY} ${linePoints} ${
                        points[points.length - 1].x
                      },${baselineY}`
                    : "";

                const lastScore = scores[scores.length - 1];
                const prevScore =
                  scores.length > 1 ? scores[scores.length - 2] : null;
                const delta =
                  prevScore !== null ? lastScore - prevScore : null;

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
                            : `▼ Turun ${Math.abs(delta).toFixed(1)} poin`}
                          {" "}dari tryout sebelumnya
                        </span>
                      )}

                      {delta === 0 && (
                        <span className="trend-delta is-flat">
                          → Sama dengan tryout sebelumnya
                        </span>
                      )}

                    </div>


                    <svg
                      className="trend-chart-svg"
                      viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
                      preserveAspectRatio="none"
                    >

                      {TREND_GRID_VALUES.map((value) => (
                        <g key={value}>

                          <line
                            x1={TREND_PADDING_X}
                            x2={TREND_WIDTH - TREND_PADDING_X}
                            y1={trendValueToY(value)}
                            y2={trendValueToY(value)}
                            className="trend-chart-grid"
                          />

                          <text
                            x={2}
                            y={trendValueToY(value)}
                            dy={value === 0 ? -2 : value === 100 ? 8 : 3}
                            className="trend-chart-grid-label"
                          >
                            {value}
                          </text>

                        </g>
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
                        />
                      )}

                      {points.map((p, i) => (
                        <g key={studentScoreTrend[i].attempt_id}>

                          <text
                            x={p.x}
                            y={p.y}
                            dy={-9}
                            className="trend-chart-value-label"
                          >
                            {scores[i]}
                          </text>

                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={3.5}
                            className={`trend-chart-dot ${scoreTier(scores[i])}`}
                          >
                            <title>
                              {studentScoreTrend[i].tryout_title} — {scores[i]}
                              {" "}({shortDate(studentScoreTrend[i].finished_at)})
                            </title>
                          </circle>

                        </g>
                      ))}

                    </svg>


                    <div className="trend-chart-axis">

                      {studentScoreTrend.length <= 5
                        ? points.map((p, i) => (
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
                        : (
                          <>
                            <span>
                              {shortDate(studentScoreTrend[0].finished_at)}
                            </span>

                            <span>
                              {shortDate(
                                studentScoreTrend[studentScoreTrend.length - 1]
                                  .finished_at
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
                        Kerjakan tryout lain untuk mulai melihat tren naik/turun.
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

                <h3>
                  Nilai per Mata Pelajaran
                </h3>

                <p>
                  Rata-rata dari percobaan terakhir tiap tryout, diurutkan dari yang paling lemah
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
                        ? "Klik \"Coba lagi\" di atas untuk memuat ulang"
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

      )}


      {/* =========================================
          SYSTEM INFORMATION (interaktif, real-time)
          Hanya ADMIN -- lihat kartu ringkas GURU di bawah.
      ========================================= */}

      {user?.role === "ADMIN" && (

      <section className="dashboard-card system-card">

        <div className="card-header">

          <div>

            <h3>
              Informasi Sistem
            </h3>

            <p>
              Status aplikasi TKA Tryout
              {systemStatus && !systemLoading && (
                <span className="system-updated">
                  {" "}· diperbarui baru saja
                </span>
              )}
            </p>

          </div>

          <button
            type="button"
            className={
              "system-refresh-btn" +
              (systemLoading ? " spinning" : "")
            }
            onClick={() => loadSystemStatus()}
            disabled={systemLoading}
            title="Cek ulang status sistem"
          >
            <IconRefresh size={16} />
            {systemLoading ? "Memeriksa..." : "Cek Ulang"}
          </button>

        </div>


        {systemError && !systemLoading && (
          <div className="system-error-banner">
            Gagal memeriksa status sistem: {systemError}
          </div>
        )}


        <div className="system-status">

          {/* --- API SERVER --- */}
          <div className="status-item">

            <div className="status-item-title">
              <span
                className={
                  "status-dot" +
                  (systemLoading
                    ? " checking"
                    : systemStatus?.api?.online
                    ? ""
                    : " offline")
                }
              ></span>

              <strong>API Server</strong>
            </div>

            <small>
              {systemStatus?.api?.framework || "FastAPI"}
            </small>

            <small className="status-sub">
              {systemLoading
                ? "Memeriksa..."
                : systemStatus?.api?.online
                ? "Online"
                : "Offline"}
            </small>
          </div>


          {/* --- DATABASE --- */}
          <div className="status-item">

            <div className="status-item-title">
              <span
                className={
                  "status-dot" +
                  (systemLoading
                    ? " checking"
                    : systemStatus?.database?.online
                    ? ""
                    : " offline")
                }
              ></span>

              <strong>Database</strong>
            </div>

            <small>
              {systemStatus?.database?.engine || "SQLite"}
            </small>

            <small
              className="status-sub"
              title={systemStatus?.database?.directory}
            >
              {systemLoading
                ? "Memeriksa..."
                : systemStatus?.database?.online
                ? "Online"
                : "Offline"}
            </small>
          </div>


          {/* --- AUTHENTICATION --- */}
          <div className="status-item">

            <div className="status-item-title">
              <span
                className={
                  "status-dot" +
                  (systemLoading
                    ? " checking"
                    : systemStatus?.auth?.online
                    ? ""
                    : " offline")
                }
              ></span>

              <strong>Authentication</strong>
            </div>

            <small>
              {systemStatus?.auth?.label || "JWT aktif"}
            </small>

            <small className="status-sub">
              {systemLoading
                ? "Memeriksa..."
                : systemStatus?.auth?.online
                ? "Online"
                : "Offline"}
            </small>
          </div>


          {/* --- AI (OLLAMA) --- */}
          <div className="status-item">

            <div className="status-item-title">
              <span
                className={
                  "status-dot" +
                  (systemLoading
                    ? " checking"
                    : systemStatus?.ai?.online
                    ? ""
                    : " offline")
                }
              ></span>

              <strong>AI</strong>
            </div>

            <small>
              {systemStatus?.ai?.provider || "Ollama"} -{" "}
              {systemStatus?.ai?.model || "-"}
            </small>

            <small className="status-sub">
              {systemLoading
                ? "Memeriksa..."
                : systemStatus?.ai?.online
                ? `Online - IP ${systemStatus?.ai?.host || "-"}`
                : "Offline"}
            </small>
          </div>

        </div>

      </section>

      )}


      {/* =========================================
          STATUS AI (ringkas, khusus GURU)

          Guru perlu tahu AI hidup sebelum mencoba membuat soal
          dengan AI (tombol "Pembahasan dengan AI" & sejenisnya
          sudah punya pengecekannya sendiri lewat useAiStatusGate,
          kartu ini cuma pratinjau di Dashboard).
      ========================================= */}

      {user?.role === "GURU" && (

      <section className="dashboard-card system-card">

        <div className="card-header">

          <div>

            <h3>
              Status AI
            </h3>

            <p>
              Perlu online untuk membuat soal dengan AI
              {aiCardStatus && !aiCardLoading && (
                <span className="system-updated">
                  {" "}· diperbarui baru saja
                </span>
              )}
            </p>

          </div>

          <button
            type="button"
            className={
              "system-refresh-btn" +
              (aiCardLoading ? " spinning" : "")
            }
            onClick={() => loadAiCardStatus()}
            disabled={aiCardLoading}
            title="Cek ulang status AI"
          >
            <IconRefresh size={16} />
            {aiCardLoading ? "Memeriksa..." : "Cek Ulang"}
          </button>

        </div>


        {aiCardError && !aiCardLoading && (
          <div className="system-error-banner">
            Gagal memeriksa status AI: {aiCardError}
          </div>
        )}


        <div className="system-status">

          <div className="status-item">

            <div className="status-item-title">
              <span
                className={
                  "status-dot" +
                  (aiCardLoading
                    ? " checking"
                    : aiCardStatus?.online
                    ? ""
                    : " offline")
                }
              ></span>

              <strong>AI</strong>
            </div>

            <small>
              {providerLabel(aiCardStatus?.active_provider)}
            </small>

            <small className="status-sub">
              {aiCardLoading
                ? "Memeriksa..."
                : aiCardStatus?.online
                ? "Online"
                : aiCardStatus?.reason || "Offline"}
            </small>
          </div>

        </div>

      </section>

      )}
    </>
  );

}


export default Dashboard;
