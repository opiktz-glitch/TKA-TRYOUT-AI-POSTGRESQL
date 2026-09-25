import StatCard from "../components/StatCard";
import ScoreTable from "../components/ScoreTable";
import {
  IconBarChart,
  IconCheck,
  IconSearch,
  IconTarget,
  IconUsers,
} from "../components/Icons";
import { useAuth } from "../auth/AuthContext";
import { useTeacherScores } from "../hooks/useTeacherScores";

function TeacherScores() {
  const { user } = useAuth();
  const {
    loading,
    error,
    search,
    setSearch,
    tryoutFilterId,
    setTryoutFilterId,
    selectedStatus,
    setSelectedStatus,
    filteredScores,
    hasActiveFilter,
    tryoutFilterTitle,
    resetFilters,
    summary,
  } = useTeacherScores(user);

  return (
    <>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Nilai</h1>
          <p>Rekap skor siswa dari tryout yang kamu buat</p>
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
              placeholder="Cari siswa, NIS, tryout"
              aria-label="Cari nilai"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

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

          {tryoutFilterId && (
            <button
              type="button"
              className="score-filter-chip"
              onClick={() => setTryoutFilterId("")}
              title="Hapus filter tryout"
            >
              Tryout: {tryoutFilterTitle || "terpilih"} ×
            </button>
          )}
        </div>

        {loading && <div className="loading-message">Memuat rekap nilai...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && (
          <ScoreTable
            rows={filteredScores}
            resetKey={[search.trim(), selectedStatus, tryoutFilterId].join("|")}
            hasActiveFilter={hasActiveFilter}
            onReset={resetFilters}
            emptyMessage={
              hasActiveFilter
                ? "Tidak ada hasil yang cocok."
                : "Belum ada siswa yang menyelesaikan tryout kamu."
            }
          />
        )}
      </div>
    </>
  );
}

export default TeacherScores;
