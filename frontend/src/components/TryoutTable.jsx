import React from 'react';
import { IconEdit, IconEye, IconTrash, IconTrophy, IconBarChart } from './Icons';
import Pagination from './Pagination';

export default function TryoutTable({
  search, setSearch,
  subjectFilter, setSubjectFilter, subjects,
  statusFilter, setStatusFilter,
  loading, showModal,
  filteredTryouts, user, onlyMine, setOnlyMine,
  hasActiveTryoutFilter, resetTryoutFilters,
  paginatedTryouts, getSubjectName,
  openEditModal, openReviewModal, handleDelete, deletingId, openLeaderboardModal, openAnalysisModal,
  currentPage, totalPages, TRYOUTS_PER_PAGE, setCurrentPage
}) {
  return (
    <>
{/* =================================================
    TABLE CARD & FILTER
================================================= */}

<div className="score-card">
  <div className="question-filter" style={{ marginBottom: 0, padding: "12px 14px 12px", borderBottom: "1px solid #e5e7eb" }}>
    <div className="question-filter-row question-filter-row-primary">
      <div className="filter-group">
        <input
          type="text"
          placeholder="Cari judul tryout..."
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="search-input"
        >
          <option value="">Semua Mapel</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="search-input"
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
      </div>
    </div>
  </div>

  {loading && (
    <div className="loading-message">Memuat data tryout...</div>
  )}



  {!loading && (
    <>
      <div className="score-meta">
        <div className="score-meta-left">
          <span>{filteredTryouts.length} tryout</span>

          {user && (
            <button
              type="button"
              className={`filter-toggle${onlyMine ? " is-active" : ""}`}
              onClick={() => setOnlyMine((prev) => !prev)}
              aria-pressed={onlyMine}
            >
              Tryout Saya
            </button>
          )}
        </div>

        {hasActiveTryoutFilter && (
          <button type="button" className="score-reset" onClick={resetTryoutFilters}>
            Reset filter
          </button>
        )}
      </div>

      {filteredTryouts.length === 0 ? (
        <div className="empty-message">
          {hasActiveTryoutFilter
            ? "Paket tryout tidak ditemukan."
            : "Belum ada paket tryout."}
        </div>
      ) : (
        <div className="table-container">
          <table className="score-table">
            <colgroup>
              <col style={{ width: "32%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "17%" }} />
            </colgroup>

            <thead>
              <tr>
                <th className="is-left">Tryout</th>
                <th>Soal</th>
                <th>Durasi</th>
                <th className="is-left">Pembuat Tryout</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {paginatedTryouts.map((tryout) => {
                const participantCount = tryout.participant_count ?? 0;
                const hasParticipants = participantCount > 0;

                const meta = [
                  getSubjectName(tryout.subject_id),
                  tryout.grade ? `Kelas ${tryout.grade}` : null,
                  hasParticipants
                    ? `${participantCount} peserta`
                    : "Belum ada peserta",
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
                      {tryout.duration_minutes} menit
                    </td>

                    <td className="score-ellipsis" title={tryout.created_by_name || undefined}>
                      {tryout.created_by_name || "-"}
                    </td>

                    <td className="is-center">
                      {tryout.is_active ? (
                        <span className="score-badge is-pass">Aktif</span>
                      ) : (
                        <span className="score-badge is-fail">Nonaktif</span>
                      )}
                    </td>

                    <td className="is-center is-nowrap">
                      <div className="action-buttons" style={{ justifyContent: "center" }}>
                        <button
                          className="edit-button"
                          onClick={() => openEditModal(tryout)}
                          title="Edit"
                        >
                          <IconEdit size={16} />
                        </button>

                        <button
                          className="review-button"
                          onClick={() => openReviewModal(tryout)}
                          title="Review Soal"
                        >
                          <IconEye size={16} />
                        </button>
                        
                        {openLeaderboardModal && (
                          <button
                            className="review-button"
                            onClick={() => openLeaderboardModal(tryout)}
                            title="Papan Peringkat"
                          >
                            <IconTrophy size={16} />
                          </button>
                        )}

                        {hasParticipants && (
                          <button
                            className="icon-button"
                            onClick={() => openAnalysisModal(tryout)}
                            title="Analisis Butir Soal"
                          >
                            <IconBarChart size={16} />
                          </button>
                        )}

                        <button
                          className="delete-button"
                          onClick={() => handleDelete(tryout)}
                          disabled={
                            deletingId === tryout.id || hasParticipants
                          }
                          title={
                            hasParticipants
                              ? "Tidak bisa dihapus — sudah ada peserta"
                              : "Hapus"
                          }
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredTryouts.length}
        pageSize={TRYOUTS_PER_PAGE}
        itemLabel="tryout"
        onPageChange={setCurrentPage}
      />
    </>
  )}
</div>

    </>
  );
}
