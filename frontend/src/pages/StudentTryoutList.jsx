import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";
import "../components/ScoreTable.css";

import {
  IconBarChart,
  IconCheck,
  IconClipboard,
  IconClock,
  IconHistory,
  IconRefresh,
  IconSearch,
  IconTarget,
  IconTrophy,
} from "../components/Icons";

import {
  getSubjects,
  getStudentTryouts,
  startStudentTryout,
  getMyProfile,
} from "../services/api";

import LeaderboardModal from "../components/LeaderboardModal";

// =====================================================
// DIFFICULTY
// =====================================================

const DIFFICULTIES = [
  {
    value: "EASY",
    label: "Mudah",
  },
  {
    value: "MEDIUM",
    label: "Sedang",
  },
  {
    value: "HARD",
    label: "Sulit",
  },
];

const TRYOUTS_PER_PAGE = 10;

// =====================================================
// COMPONENT
//
// UI-nya disamakan dengan pola "Nilai" / Riwayat & Hasil
// (lihat components/ScoreTable.css & pages/StudentHistory.jsx):
// stat-grid ringkasan + score-card berisi toolbar cari &
// filter + tabel score-table + Pagination. Kolomnya sendiri
// tetap spesifik untuk daftar tryout (bukan skor), mengikuti
// preseden pages/TryoutManagement.jsx yang juga memakai
// class score-* langsung tanpa lewat komponen ScoreTable.
// =====================================================

function StudentTryoutList() {
  const navigate = useNavigate();

  // =====================================================
  // DATA
  // =====================================================

  const [tryouts, setTryouts] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // =====================================================
  // UI STATE
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [profile, setProfile] = useState(null);

  const [leaderboardTryoutId, setLeaderboardTryoutId] = useState(null);
  const [leaderboardTitle, setLeaderboardTitle] = useState("");

  // =====================================================
  // FILTER
  // =====================================================

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [tryoutData, subjectData, profileData] = await Promise.all([
        getStudentTryouts(),
        getSubjects(),
        getMyProfile(),
      ]);

      setProfile(profileData);

      // -------------------------------------------------
      // TRYOUT
      // -------------------------------------------------

      if (Array.isArray(tryoutData)) {
        setTryouts(tryoutData);
      } else if (Array.isArray(tryoutData?.tryouts)) {
        setTryouts(tryoutData.tryouts);
      } else {
        setTryouts([]);
      }

      // -------------------------------------------------
      // SUBJECT
      // -------------------------------------------------

      if (Array.isArray(subjectData)) {
        setSubjects(subjectData);
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.error("LOAD STUDENT TRYOUT ERROR:", err);
      toast.error(err.message || "Gagal mengambil daftar tryout", { id: "load-student-tryouts" });
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // LOAD AWAL
  // =====================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =====================================================
  // MANUAL REFRESH
  // =====================================================

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // =====================================================
  // GET SUBJECT NAME
  // =====================================================

  function getSubjectName(subjectId) {
    const subject = subjects.find(
      (item) => Number(item.id) === Number(subjectId)
    );

    return subject ? subject.name : "-";
  }

  // =====================================================
  // GET DIFFICULTY LABEL
  // =====================================================

  function getDifficultyLabel(difficulty) {
    const item = DIFFICULTIES.find(
      (difficultyItem) => difficultyItem.value === difficulty
    );

    return item ? item.label : difficulty || "-";
  }

  // =====================================================
  // FILTER TRYOUT
  // =====================================================

  const filteredTryouts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return tryouts.filter((tryout) => {
      const subjectName = getSubjectName(tryout.subject_id).toLowerCase();
      const title = (tryout.title || "").toLowerCase();
      const description = (tryout.description || "").toLowerCase();

      const matchesSearch =
        !keyword ||
        title.includes(keyword) ||
        description.includes(keyword) ||
        subjectName.includes(keyword);

      const matchesSubject =
        !subjectFilter || String(tryout.subject_id) === String(subjectFilter);

      const matchesDifficulty =
        !difficultyFilter || tryout.difficulty === difficultyFilter;

      return matchesSearch && matchesSubject && matchesDifficulty;
    });
  }, [tryouts, subjects, search, subjectFilter, difficultyFilter]);

  const hasActiveFilter = Boolean(
    search.trim() || subjectFilter || difficultyFilter
  );

  function resetFilters() {
    setSearch("");
    setSubjectFilter("");
    setDifficultyFilter("");
  }

  // Filter berubah -> kembali ke halaman 1.
  const resetKey = [search.trim(), subjectFilter, difficultyFilter].join("|");
  const [lastResetKey, setLastResetKey] = useState(resetKey);

  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setCurrentPage(1);
  }

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTryouts.length / TRYOUTS_PER_PAGE)
  );

  const paginatedTryouts = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const start = (page - 1) * TRYOUTS_PER_PAGE;

    return filteredTryouts.slice(start, start + TRYOUTS_PER_PAGE);
  }, [filteredTryouts, currentPage, totalPages]);

  // =====================================================
  // RINGKASAN
  // =====================================================

  const summary = useMemo(() => {
    const totalTryouts = tryouts.length;
    const activeCount = tryouts.filter((t) => t.is_active).length;

    const totalSubjects = new Set(
      tryouts.map((t) => t.subject_id).filter((id) => id !== null && id !== undefined)
    ).size;

    const totalQuestions = tryouts.reduce(
      (sum, t) => sum + (t.total_questions || 0),
      0
    );

    return {
      totalTryouts,
      activeCount,
      totalSubjects,
      totalQuestions,
    };
  }, [tryouts]);

  // =====================================================
  // START TRYOUT
  // =====================================================

  async function handleStartTryout(tryout) {
    const confirmed = window.confirm(
      `Apakah Anda siap mengerjakan tryout "${tryout.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setStartingId(tryout.id);

      const result = await startStudentTryout(tryout.id);

      console.log("START TRYOUT RESULT:", result);

      if (!result?.attempt_id) {
        throw new Error("Server tidak mengembalikan attempt_id.");
      }

      // -------------------------------------------------
      // MASUK KE HALAMAN PENGERJAAN
      // -------------------------------------------------

      navigate(`/student/attempt/${result.attempt_id}`);
    } catch (err) {
      console.error("START STUDENT TRYOUT ERROR:", err);

      toast.error(err.message || "Gagal memulai tryout");
    } finally {
      setStartingId(null);
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="page-header">
        <div>
          <h1>Daftar Tryout</h1>
          <p>Pilih paket tryout yang ingin Anda kerjakan.</p>
        </div>
        <button
          className="secondary-button"
          onClick={() => navigate("/student/history")}
          title="Lihat riwayat & hasil tryout"
        >
          <IconHistory size={15} />
          Riwayat Saya
        </button>
      </div>

      {/* =================================================
          RINGKASAN
      ================================================= */}

      <div className="stat-grid">
        <StatCard
          icon={<IconClipboard />}
          title="Total Tryout"
          value={summary.totalTryouts}
          description="Tersedia untuk dikerjakan"
        />

        <StatCard
          icon={<IconCheck />}
          title="Aktif"
          value={summary.activeCount}
          description="Bisa langsung dikerjakan"
        />

        <StatCard
          icon={<IconBarChart />}
          title="Mata Pelajaran"
          value={summary.totalSubjects}
          description="Tercakup dalam daftar"
        />

        <StatCard
          icon={<IconTarget />}
          title="Total Soal"
          value={summary.totalQuestions}
          description="Dari semua tryout"
        />
      </div>

      {/* =================================================
          TABLE CARD & FILTER
      ================================================= */}

      <div className="score-card">

        <div className="score-toolbar">
          <label className="score-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Cari judul tryout..."
              aria-label="Cari tryout"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select
            className={`score-select${subjectFilter ? " is-active" : ""}`}
            aria-label="Filter mata pelajaran"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">Semua Mapel</option>
            {subjects
              .filter((subject) => subject.is_active)
              .map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
          </select>

          <select
            className={`score-select${difficultyFilter ? " is-active" : ""}`}
            aria-label="Filter tingkat kesulitan"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="">Semua Tingkat Kesulitan</option>
            {DIFFICULTIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="secondary-button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Perbarui daftar tryout"
            style={{ marginLeft: "auto", gap: "6px" }}
          >
            <IconRefresh
              size={15}
              style={refreshing ? { animation: "status-spin 0.8s linear infinite" } : undefined}
            />
            {refreshing ? "Memperbarui..." : "Refresh"}
          </button>
        </div>

        {loading && (
          <div className="loading-message">Memuat daftar tryout...</div>
        )}

        {!loading && (
          <>
            <div className="score-meta">
              <div className="score-meta-left">
                <span>{filteredTryouts.length} tryout</span>
              </div>

              {hasActiveFilter && (
                <button type="button" className="score-reset" onClick={resetFilters}>
                  Reset filter
                </button>
              )}
            </div>

            {filteredTryouts.length === 0 ? (
              <div className="empty-message">
                {hasActiveFilter
                  ? "Tryout tidak ditemukan."
                  : "Belum ada tryout yang tersedia."}
              </div>
            ) : (
              <div className="table-container">
                <table className="score-table">
                  <colgroup>
                    <col style={{ width: "32%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "19%" }} />
                  </colgroup>

                  <thead>
                    <tr>
                      <th className="is-left">Tryout</th>
                      <th>Soal</th>
                      <th><IconClock size={13} style={{ verticalAlign: "-2px", marginRight: 2 }} />Durasi</th>
                      <th>Keterangan</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedTryouts.map((tryout) => {
                      const meta = [
                        getSubjectName(tryout.subject_id),
                        tryout.grade ? `Kelas ${tryout.grade}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");

                      return (
                        <tr key={tryout.id}>
                          <td>
                            <div
                              className="score-primary is-strong score-ellipsis"
                              title={tryout.title}
                            >
                              {tryout.title}
                            </div>
                            <div
                              className="score-secondary score-ellipsis"
                              title={meta || undefined}
                            >
                              {meta || "-"}
                            </div>
                          </td>

                          <td className="is-center is-nowrap">
                            <span className="score-value">
                              {tryout.total_questions ?? 0}
                            </span>
                          </td>

                          <td className="is-center is-nowrap">
                            {tryout.duration_minutes ?? 0} menit
                          </td>

                          <td className="is-center">
                            <span
                              className={`score-badge is-${(tryout.difficulty || "").toLowerCase()}`}
                            >
                              {getDifficultyLabel(tryout.difficulty)}
                            </span>
                          </td>

                          <td className="is-center">
                            {tryout.is_active ? (
                              <span className="score-badge is-pass">Tersedia</span>
                            ) : (
                              <span className="score-badge is-fail">Tidak tersedia</span>
                            )}
                          </td>

                          <td className="is-center is-nowrap">
                            <button
                              className="primary-button"
                              onClick={() => handleStartTryout(tryout)}
                              disabled={!tryout.is_active || startingId === tryout.id}
                              title="Mulai Tryout"
                            >
                              {startingId === tryout.id ? (
                                "Menyiapkan..."
                              ) : (
                                <>
                                  <IconClipboard size={15} />
                                  Mulai
                                </>
                              )}
                            </button>

                            <button
                              className="secondary-button"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                setLeaderboardTryoutId(tryout.id);
                                setLeaderboardTitle(tryout.title);
                              }}
                              title="Lihat Papan Peringkat"
                            >
                              <IconTrophy size={15} />
                              Peringkat
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              currentPage={Math.min(currentPage, totalPages)}
              totalPages={totalPages}
              totalItems={filteredTryouts.length}
              pageSize={TRYOUTS_PER_PAGE}
              itemLabel="tryout"
              onPageChange={setCurrentPage}
            />
          </>
        )}

      </div>

      {leaderboardTryoutId && (
        <LeaderboardModal
          tryoutId={leaderboardTryoutId}
          title={leaderboardTitle}
          onClose={() => setLeaderboardTryoutId(null)}
          currentUserId={profile?.id}
          currentUserRole={profile?.role}
        />
      )}
    </>
  );
}

export default StudentTryoutList;
