import { useEffect, useMemo, useRef, useState } from "react";

import StatCard from "../components/StatCard";
import ScoreTable from "../components/ScoreTable";
import {
  IconBarChart,
  IconCheck,
  IconSearch,
  IconTarget,
  IconUsers,
} from "../components/Icons";

import {
  getAdminScores,
  getScoreCreators,
  getSubjects,
  deleteAttempt,
} from "../services/api";
import { useAuth } from "../auth/AuthContext";
import { readPageCache, writePageCache } from "../services/pageCache";


// =====================================================
// CACHE — kunci (lihat services/pageCache.js)
// Rekap nilai di-cache per KOMBINASI FILTER yang dikirim ke server.
// =====================================================

const SCORE_OPTIONS_CACHE_KEY = "admin-scores-options";

function scoresCacheKey(subjectId, teacherId) {
  return `admin-scores:${subjectId}|${teacherId}`;
}


function AdminScores() {
  const { user } = useAuth();

  // Data dari kunjungan sebelumnya di sesi ini. Filter selalu mulai dari
  // "semua" saat halaman dibuka, jadi yang dipakai di awal adalah cache
  // untuk kombinasi filter kosong. Kalau ada, langsung tampil (tanpa
  // "Memuat rekap nilai...") lalu diperbarui diam-diam.
  const cachedScores = readPageCache(user?.id, scoresCacheKey("", ""));
  const cachedOptions = readPageCache(user?.id, SCORE_OPTIONS_CACHE_KEY);

  // Kombinasi filter yang hasilnya sedang ditunggu. Dipakai untuk
  // mengabaikan respons yang sudah usang (filter keburu diganti).
  const latestScoresKeyRef = useRef(null);

  const [scores, setScores] = useState(() => cachedScores ?? []);
  const [subjectOptions, setSubjectOptions] = useState(
    () => cachedOptions?.subjects ?? []
  );
  const [teacherOptions, setTeacherOptions] = useState(
    () => cachedOptions?.teachers ?? []
  );

  const [loading, setLoading] = useState(() => !cachedScores);
  const [error, setError] = useState("");

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // Filter status hanya di sisi browser (tidak dikirim ke server),
  // jadi tidak ikut kunci cache.
  const [selectedStatus, setSelectedStatus] = useState("");


  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId, selectedTeacherId]);


  async function loadFilterOptions() {
    try {
      const [subjects, teachers] = await Promise.all([
        getSubjects(),
        getScoreCreators(),
      ]);

      setSubjectOptions(subjects);
      setTeacherOptions(teachers);

      writePageCache(user?.id, SCORE_OPTIONS_CACHE_KEY, {
        subjects,
        teachers,
      });
    } catch (err) {
      console.error("LOAD FILTER OPTIONS ERROR:", err);
    }
  }


  async function loadScores() {
    const cacheKey = scoresCacheKey(selectedSubjectId, selectedTeacherId);

    const cachedData = readPageCache(user?.id, cacheKey);

    latestScoresKeyRef.current = cacheKey;

    if (cachedData) {
      // Kombinasi filter ini pernah dimuat: tampilkan langsung, lalu
      // perbarui diam-diam (tanpa loading; kalau gagal, data lama dibiarkan).
      setScores(cachedData);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getAdminScores({
        subjectId: selectedSubjectId || undefined,
        teacherId: selectedTeacherId || undefined,
      });

      writePageCache(user?.id, cacheKey, data);

      // Abaikan hasil kalau filter sudah berganti selama menunggu.
      if (latestScoresKeyRef.current === cacheKey) {
        setScores(data);
      }
    } catch (err) {
      console.error("LOAD ADMIN SCORES ERROR:", err);

      if (!cachedData && latestScoresKeyRef.current === cacheKey) {
        setError(err.message || "Gagal memuat rekap nilai");
      }
    } finally {
      if (latestScoresKeyRef.current === cacheKey) {
        setLoading(false);
      }
    }
  }


  // Hapus satu baris nilai (attempt). Khusus admin -- lihat
  // routers/attempts.py. Dipakai untuk membersihkan satu attempt
  // yang salah (mis. data uji coba, siswa salah pilih tryout)
  // tanpa harus menghapus seluruh paket tryout.
  async function handleDeleteAttempt(item) {
    const attemptLabel =
      item.attempt_total > 1
        ? ` (percobaan ke-${item.attempt_number} dari ${item.attempt_total})`
        : "";

    const confirmed = window.confirm(
      `Hapus nilai "${item.student_name || "-"}" untuk tryout "${item.tryout_title || "-"}"${attemptLabel}? Tindakan ini tidak bisa dibatalkan.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionError("");
      setActionSuccess("");

      await deleteAttempt(item.attempt_id);

      setActionSuccess(
        `Nilai "${item.student_name || "-"}" untuk tryout "${item.tryout_title || "-"}"${attemptLabel} berhasil dihapus`
      );

      // Muat ulang dari server (bukan sekadar hapus di state lokal)
      // supaya ringkasan di atas (rata-rata, tingkat lulus, dst) dan
      // cache halaman ini ikut konsisten dengan data terbaru.
      await loadScores();

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);
    } catch (err) {
      console.error("DELETE ATTEMPT ERROR:", err);
      setActionError(err.message || "Gagal menghapus nilai");
    }
  }


  const filteredScores = scores.filter((item) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      !keyword ||
      item.student_name?.toLowerCase().includes(keyword) ||
      item.student_code?.toLowerCase().includes(keyword) ||
      item.tryout_title?.toLowerCase().includes(keyword) ||
      item.teacher_name?.toLowerCase().includes(keyword);

    const matchesStatus =
      !selectedStatus ||
      (selectedStatus === "PASSED" && item.passed === true) ||
      (selectedStatus === "FAILED" && item.passed === false);

    return matchesSearch && matchesStatus;
  });


  const hasActiveFilter = Boolean(
    search.trim() ||
      selectedSubjectId ||
      selectedTeacherId ||
      selectedStatus
  );

  function resetFilters() {
    setSearch("");
    setSelectedSubjectId("");
    setSelectedTeacherId("");
    setSelectedStatus("");
  }

  // Toggle cepat "Guru Saya" -- setara memilih nama sendiri di dropdown
  // Guru Pembuat, tapi tidak perlu scroll cari nama sendiri di daftar
  // yang bisa panjang. Sama seperti "Soal Saya" di Bank Soal.
  const isOwnTeacherFilter = Boolean(user) && String(selectedTeacherId) === String(user.id);

  function toggleOwnTeacherFilter() {
    setSelectedTeacherId((prev) =>
      String(prev) === String(user?.id) ? "" : String(user.id)
    );
  }

  const summary = useMemo(() => {
    if (scores.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        totalTryouts: 0,
      };
    }

    const totalAttempts = scores.length;

    const validScores = scores.filter(
      (s) => s.score !== null && s.score !== undefined
    );

    const averageScore =
      validScores.length > 0
        ? validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length
        : 0;

    const passedCount = scores.filter((s) => s.passed === true).length;
    const passRate = (passedCount / totalAttempts) * 100;

    const totalTryouts = new Set(scores.map((s) => s.tryout_id)).size;

    return {
      totalAttempts,
      averageScore: Math.round(averageScore * 10) / 10,
      passRate: Math.round(passRate),
      totalTryouts,
    };
  }, [scores]);


  return (
    <>
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Nilai</h1>
          <p>Rekap skor siswa dari seluruh tryout di sistem</p>
        </div>
      </div>

      {/* RINGKASAN */}

      <div className="stat-grid">
        <StatCard
          icon={<IconUsers />}
          title="Total Peserta"
          value={summary.totalAttempts}
          description="Attempt selesai"
        />

        <StatCard
          icon={<IconTarget />}
          title="Rata-rata Skor"
          value={summary.averageScore}
          description="Dari semua peserta"
        />

        <StatCard
          icon={<IconCheck />}
          title="Tingkat Lulus"
          value={`${summary.passRate}%`}
          description="Dari peserta yang selesai"
        />

        <StatCard
          icon={<IconBarChart />}
          title="Paket Tryout"
          value={summary.totalTryouts}
          description="Sudah ada peserta"
        />
      </div>

      {/* TABLE */}

      <div className="score-card">

        <div className="score-toolbar">
          <label className="score-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Cari siswa, NIS, tryout, guru"
              aria-label="Cari nilai"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select
            className={`score-select${selectedSubjectId ? " is-active" : ""}`}
            aria-label="Filter mata pelajaran"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            <option value="">Semua Mata Pelajaran</option>

            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            className={`score-select${selectedTeacherId ? " is-active" : ""}`}
            aria-label="Filter guru pembuat"
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
          >
            <option value="">Semua Guru</option>

            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>

          <select
            className={`score-select${selectedStatus ? " is-active" : ""}`}
            aria-label="Filter status kelulusan"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="PASSED">Lulus</option>
            <option value="FAILED">Tidak lulus</option>
          </select>
        </div>

        {loading && (
          <div className="loading-message">Memuat rekap nilai...</div>
        )}

        {error && <div className="error-message">{error}</div>}

        {actionError && (
          <div className="form-error-message" style={{ margin: "0 16px", marginTop: "12px" }}>
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div className="success-message" style={{ margin: "0 16px", marginTop: "12px" }}>
            <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
            {actionSuccess}
          </div>
        )}

        {!loading && !error && (
          <ScoreTable
            rows={filteredScores}
            showTeacher
            resetKey={[
              search.trim(),
              selectedSubjectId,
              selectedTeacherId,
              selectedStatus,
            ].join("|")}
            hasActiveFilter={hasActiveFilter}
            onReset={resetFilters}
            onDeleteAttempt={handleDeleteAttempt}
            toggle={
              user && (
                <button
                  type="button"
                  className={`filter-toggle${isOwnTeacherFilter ? " is-active" : ""}`}
                  onClick={toggleOwnTeacherFilter}
                  aria-pressed={isOwnTeacherFilter}
                >
                  Guru Saya
                </button>
              )
            }
            emptyMessage={
              hasActiveFilter
                ? "Tidak ada hasil yang cocok."
                : "Belum ada siswa yang menyelesaikan tryout."
            }
          />
        )}
      </div>
    </>
  );
}

export default AdminScores;
