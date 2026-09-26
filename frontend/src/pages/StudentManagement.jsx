import { useState } from "react";
import { IconEdit, IconTrash, IconSearch } from "../components/Icons";
import Pagination from "../components/Pagination";
import StudentFormModal from "../components/StudentFormModal";
import { useStudentManagement } from "../hooks/useStudentManagement";
import "../components/ScoreTable.css";

function StudentManagement() {
  const {
    loading,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedStudents,
    filteredStudentsCount,
    hasActiveStudentFilter,
    resetStudentFilters,
    handleDelete,
    loadStudents,
    STUDENTS_PER_PAGE,
  } = useStudentManagement();

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  function openAddModal() {
    setEditingStudent(null);
    setShowModal(true);
  }

  function openEditModal(student) {
    setEditingStudent(student);
    setShowModal(true);
  }

  return (
    <>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Data Siswa</h1>
          <p>Kelola profil siswa (NIS, sekolah, kelas)</p>
        </div>
        <button className="primary-button" onClick={openAddModal}>
          + Tambah Siswa
        </button>
      </div>

      {/* TABLE & FILTER */}
      <div className="score-card">
        <div className="score-toolbar">
          <label className="score-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Cari nama / NIS / username / sekolah..."
              aria-label="Cari siswa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {loading && <div className="loading-message">Memuat data siswa...</div>}

        {!loading && (
          <>
            <div className="score-meta">
              <span>{filteredStudentsCount} siswa</span>
              {hasActiveStudentFilter && (
                <button type="button" className="score-reset" onClick={resetStudentFilters}>
                  Reset filter
                </button>
              )}
            </div>

            {filteredStudentsCount === 0 ? (
              <div className="empty-message">
                {hasActiveStudentFilter ? "Siswa tidak ditemukan." : "Belum ada data siswa."}
              </div>
            ) : (
              <div className="table-container">
                <table className="score-table">
                  <colgroup>
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>ID</th>
                      <th className="is-left">NIS</th>
                      <th className="is-left">Nama</th>
                      <th className="is-left">Username</th>
                      <th className="is-left">Sekolah</th>
                      <th>Kelas</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((item, index) => (
                      <tr key={item.id}>
                        <td className="is-center is-nowrap">
                          {(currentPage - 1) * STUDENTS_PER_PAGE + index + 1}
                        </td>
                        <td className="is-center is-nowrap score-secondary">{item.id}</td>
                        <td className="score-ellipsis" title={item.student_code}>
                          <span className="score-primary is-strong">{item.student_code}</span>
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
                          {item.grade || "-"}
                          {item.class_name ? ` / ${item.class_name}` : ""}
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
              totalItems={filteredStudentsCount}
              pageSize={STUDENTS_PER_PAGE}
              itemLabel="siswa"
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <StudentFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSaveSuccess={loadStudents}
        editingStudent={editingStudent}
      />
    </>
  );
}

export default StudentManagement;
