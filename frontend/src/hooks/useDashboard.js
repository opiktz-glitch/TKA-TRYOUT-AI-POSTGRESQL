import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  getAdminDashboardSummary,
  getAdminLiveSummary,
  getTeacherDashboardSummary,
  getStudentDashboardSummary,
  getSystemStatus,
  getAIStatus
} from "../services/api";
import { readDashboardCache, writeDashboardCache } from "../services/dashboardCache";
import { LIVE_REFRESH_MS, roleCacheKey } from "../utils/dashboardUtils";
import { useNavigate } from "react-router-dom";

export function useDashboard() {
  const { user } = useAuth();
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
    () => cached.admin?.stats ?? {
        totalStudents: 0,
        totalTryouts: 0,
        activeTryouts: 0,
      }
  );

  // Angka "live" (Sedang Mengerjakan, Selesai Hari Ini). null = belum
  // pernah berhasil dimuat; failed = pemuatan terakhir gagal.
  const [liveStats, setLiveStats] = useState(() => cached.live
      ? { ...cached.live, failed: false }
      : {
          inProgress: null,
          finishedToday: null,
          failed: false,
        }
  );

  const [questionBank, setQuestionBank] = useState(
    () => cached.admin?.questionBank ?? {
        subjects: [],
        totalActive: 0,
        unusedCount: 0,
      }
  );

  const [attention, setAttention] = useState(
    () => cached.admin?.attention ?? {
        inactiveTryouts: { count: 0, items: [] },
        withoutExplanation: 0,
        imageStorage: { count: 0, bytes: 0 },
        questionTableSize: { bytes: null },
      }
  );

  // GURU
  const [teacherStats, setTeacherStats] = useState(
    () => cached.teacher?.stats ?? {
        totalSoal: 0,
        totalTryout: 0,
        totalPeserta: 0,
        totalHasil: 0,
      }
  );

  const [teacherActivity, setTeacherActivity] = useState(
    () => cached.teacher?.activity ?? {
        latestQuestion: null,
        latestTryout: null,
      }
  );

  // SISWA
  const [studentStats, setStudentStats] = useState(
    () => cached.student?.stats ?? {
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


    return {
    adminStats,
    aiCardError,
    aiCardLoading,
    aiCardStatus,
    attention,
    dashFailed,
    dashLoading,
    liveStats,
    navigate,
    questionBank,
    show,
    sortedStudentPreview,
    studentScoreTrend,
    studentStats,
    studentSubjectBreakdown,
    systemStatus,
    systemLoading,
    systemError,
    teacherActivity,
    teacherStats,
    user
  };
}
