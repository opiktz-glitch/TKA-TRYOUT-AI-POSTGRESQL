import { useState } from "react";
import { IconEdit, IconTrash, IconCheck, IconSearch } from "../components/Icons";
import Pagination from "../components/Pagination";
import TeacherFormModal from "../components/TeacherFormModal";
import { useTeacherManagement } from "../hooks/useTeacherManagement";
import "../components/ScoreTable.css";

function TeacherManagement() {
  const {
    loading,
    error,
    actionError,
    actionSuccess,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedTeachers,
    filteredTeachersCount,
    hasActiveTeacherFilter,
    resetTeacherFilters,
    handleDelete,
    loadTeachers,
    TEACHERS_PER_PAGE,
  } = useTeacherManagement();

  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);

  function openAddModal() {
    setEditingTeacher(null);
    setShowModal(true);
  }

  function openEditModal(teacher) {
    setEditingTeacher(teacher);
    setShowModal(true);
  }

  return (
    <>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Data Guru</h1>
          <p>Kelola profil guru (NIP, sekolah)</p>
        </div>
        <button className="primary-button" onClick={openAddModal}>
          + Tambah Guru
        </button>
      </div>

      {/* TABLE & FILTER */}
      <div className="score-card">
        <div className="score-toolbar">
          <label className="score-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Cari nama / NIP / username / sekolah..."
              aria-label="Cari guru"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {loading && <div className="loading-message">Memuat data guru...</div>}
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
          <>
            <div className="score-meta">
              <span>{filteredTeachersCount} guru</span>
              {hasActiveTeacherFilter && (
                <button type="button" className="score-reset" onClick={resetTeacherFilters}>
                  Reset filter
                </button>
              )}
            </div>

            {filteredTeachersCount === 0 ? (
              <div className="empty-message">
                {hasActiveTeacherFilter ? "Guru tidak ditemukan." : "Belum ada data guru."}
              </div>
            ) : (
              <div className="table-container">
                <table className="score-table">
                  <colgroup>
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>ID</th>
                      <th className="is-left">NIP</th>
                      <th className="is-left">Nama</th>
                      <th className="is-left">Username</th>
                      <th className="is-left">Sekolah</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTeachers.map((item, index) => (
                      <tr key={item.id}>
                        <td className="is-center is-nowrap">
                          {(currentPage - 1) * TEACHERS_PER_PAGE + index + 1}
                        </td>
                        <td className="is-center is-nowrap score-secondary">{item.id}</td>
                        <td className="score-ellipsis" title={item.teacher_code}>
                          <span className="score-primary is-strong">{item.teacher_code}</span>
                        </td>
                        <td className="score-ellipsis" title={item.full_name}>
                          {item.full_name}
                        </td>
                        <td className="score-ellipsis" title={item.username || undefined}>
                          {item.username || "-"}
                        </td>
                        <td className="score-ellipsis" title={item.school_name || undefined}>
                          {item.school_name || "-"}
                        </td>
                        <td className="is-center is-nowrap">
                          <div className="action-buttons" style={{ justifyContent: "center" }}>
                            <button
                              className="edit-button"
                              onClick={() => openEditModal(item)}
                              title="Edit"
                            >
                              <IconEdit size={16} />
                            </button>
                            <button
                              className="delete-button"
                              onClick={() => handleDelete(item)}
                              title="Hapus"
                            >
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTeachersCount}
              pageSize={TEACHERS_PER_PAGE}
              itemLabel="guru"
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <TeacherFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSaveSuccess={loadTeachers}
        editingTeacher={editingTeacher}
      />
    </>
  );
}

export default TeacherManagement;
