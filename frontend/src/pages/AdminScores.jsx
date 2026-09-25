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
import { useAdminScores } from "../hooks/useAdminScores";

function AdminScores() {
  const { user } = useAuth();
  const {
    loading,
    search,
    setSearch,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTeacherId,
    setSelectedTeacherId,
    selectedStatus,
    setSelectedStatus,
    subjectOptions,
    teacherOptions,
    filteredScores,
    hasActiveFilter,
    resetFilters,
    isOwnTeacherFilter,
    toggleOwnTeacherFilter,
    summary,
    handleDeleteAttempt,
  } = useAdminScores(user);

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

        {loading && <div className="loading-message">Memuat rekap nilai...</div>}

        {!loading && (
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
