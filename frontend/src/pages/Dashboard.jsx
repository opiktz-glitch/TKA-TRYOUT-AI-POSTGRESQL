import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

import StatCard from "../components/StatCard";
import { readDashboardCache, writeDashboardCache } from "../services/dashboardCache";
import { parseUtcDate } from "../utils/date";
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
} from "../services/api";


// =====================================================
// HELPER — potong teks panjang untuk preview singkat
// =====================================================

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

  // INFORMASI SISTEM (API, Database, Auth, AI/Ollama)
  const [systemStatus, setSystemStatus] = useState(
    () => cached.system ?? null
  );
  const [systemLoading, setSystemLoading] = useState(() => !cached.system);
  const [systemError, setSystemError] = useState("");


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

    // Sudah ada status lama -> perbarui diam-diam (tanpa "Memeriksa...").
    loadSystemStatus({ silent: Boolean(readDashboardCache(user.id).system) });
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

    writeDashboardCache(currentUser.id, "student", {
      stats: nextStats,
      preview: data.preview,
    });
  }


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
        <div className="dashboard-card" style={{ borderColor: "#fca5a5" }}>
          <p style={{ color: "#dc2626", margin: 0 }}>
            {dashError}
          </p>
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
              value={dashLoading ? "…" : adminStats.totalStudents}
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
              value={dashLoading ? "…" : adminStats.activeTryouts}
              description={
                dashLoading
                  ? "Memuat…"
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
                      dashLoading
                        ? "info"
                        : attention.inactiveTryouts.count > 0
                          ? "warn"
                          : "ok"
                    )}
                  >
                    {dashLoading
                      ? "…"
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
                        : attention.withoutExplanation === 0
                          ? "Semua soal aktif sudah berpembahasan"
                          : "Pembahasan tampil saat siswa meninjau hasil"}
                    </small>

                  </div>

                  <span
                    style={attentionBadgeStyle(
                      dashLoading
                        ? "info"
                        : attention.withoutExplanation > 0
                          ? "warn"
                          : "ok"
                    )}
                  >
                    {dashLoading
                      ? "…"
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
                        : `${attention.imageStorage.count} gambar di database`}
                    </small>

                  </div>

                  <span style={attentionBadgeStyle("info")}>
                    {dashLoading
                      ? "…"
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
                        : attention.questionTableSize.bytes === null
                          ? "Hanya tersedia di database Postgres"
                          : "Termasuk gambar yang tersimpan di kolom soal"}
                    </small>

                  </div>

                  <span style={attentionBadgeStyle("info")}>
                    {dashLoading
                      ? "…"
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
              value={dashLoading ? "…" : teacherStats.totalSoal}
              description="Soal dibuat"
            />

            <StatCard
              icon={<IconClipboard />}
              title="Tryout Saya"
              value={dashLoading ? "…" : teacherStats.totalTryout}
              description="Paket tryout"
            />

            <StatCard
              icon={<IconGraduationCap />}
              title="Peserta"
              value={dashLoading ? "…" : teacherStats.totalPeserta}
              description="Peserta tryout"
            />

            <StatCard
              icon={<IconBarChart />}
              title="Hasil"
              value={dashLoading ? "…" : teacherStats.totalHasil}
              description="Hasil pengerjaan"
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

                <div className="activity-item">

                  <div className="activity-icon">
                    <IconNotebook size={18} />
                  </div>

                  <div className="activity-content">

                    <strong>
                      Bank Soal
                    </strong>

                    <span>
                      {teacherActivity.latestQuestion
                        ? truncateText(
                            teacherActivity.latestQuestion.question_text,
                            60
                          )
                        : "Belum ada soal yang Anda buat"}
                    </span>

                  </div>

                </div>


                <div className="activity-item">

                  <div className="activity-icon">
                    <IconClipboard size={18} />
                  </div>

                  <div className="activity-content">

                    <strong>
                      Tryout
                    </strong>

                    <span>
                      {teacherActivity.latestTryout
                        ? teacherActivity.latestTryout.title
                        : "Belum ada tryout yang Anda buat"}
                    </span>

                  </div>

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
              value={dashLoading ? "…" : studentStats.tryoutTersedia}
              description="Siap dikerjakan"
            />

            <StatCard
              icon={<IconTarget />}
              title="Tryout Diikuti"
              value={dashLoading ? "…" : studentStats.tryoutDiikuti}
              description="Sudah dikerjakan"
            />

            <StatCard
              icon={<IconTrophy />}
              title="Nilai Terakhir"
              value={
                dashLoading
                  ? "…"
                  : (studentStats.nilaiTerakhir ?? "-")
              }
              description={
                studentStats.lastAttemptDate
                  ? timeAgo(studentStats.lastAttemptDate)
                  : "Belum ada nilai"
              }
            />

            <StatCard
              icon={<IconTrendingUp />}
              title="Rata-rata"
              value={
                dashLoading
                  ? "…"
                  : (studentStats.rataRata ?? "-")
              }
              description={
                studentStats.tryoutDiikuti > 0
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

                {studentTryoutsPreview.length === 0 && (

                  <div className="activity-item">

                    <div className="activity-icon">
                      <IconClipboard size={18} />
                    </div>

                    <div className="activity-content">

                      <strong>
                        Belum ada tryout
                      </strong>

                      <span>
                        Tryout yang tersedia akan muncul di sini
                      </span>

                    </div>

                  </div>

                )}

                {studentTryoutsPreview.map((tryout) => (

                  <div className="activity-item" key={tryout.id}>

                    <div className="activity-icon">
                      <IconClipboard size={18} />
                    </div>

                    <div className="activity-content">

                      <strong>
                        {tryout.title}
                      </strong>

                      <span>
                        {tryout.subject_name || "-"}
                        {tryout.attempt_status === "SUBMITTED" &&
                          ` · Selesai (${tryout.score ?? "-"})`}
                        {tryout.attempt_status === "IN_PROGRESS" &&
                          " · Sedang dikerjakan"}
                        {!tryout.attempt_status &&
                          " · Belum dikerjakan"}
                      </span>

                    </div>

                  </div>

                ))}

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
                      Hasil Tryout
                    </strong>

                    <small>
                      Lihat hasil
                    </small>

                  </div>

                </button>


                <button
                  className="quick-menu-item"
                  onClick={() => navigate("/student/history")}
                >

                  <span>
                    <IconClock size={20} />
                  </span>

                  <div>

                    <strong>
                      Riwayat
                    </strong>

                    <small>
                      Riwayat pengerjaan
                    </small>

                  </div>

                </button>

              </div>

            </section>

          </div>

        </>

      )}


      {/* =========================================
          SYSTEM INFORMATION (interaktif, real-time)
      ========================================= */}

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
    </>
  );

}


export default Dashboard;
