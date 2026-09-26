import { useState } from "react";
import { useSubjectManagement } from "../hooks/useSubjectManagement";
import SubjectFormModal from "../components/SubjectFormModal";
import { IconEdit, IconTrash, IconSearch } from "../components/Icons";
import "../components/ScoreTable.css";

function SubjectManagement() {
  const {
    loading,
    search,
    setSearch,
    filteredSubjects,
    handleDelete,
    loadSubjects,
  } = useSubjectManagement();

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  function openAddModal() {
    setEditingSubject(null);
    setShowModal(true);
  }

  function openEditModal(subject) {
    setEditingSubject(subject);
    setShowModal(true);
  }

  return (
    <>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Mata Pelajaran</h1>
          <p>Kelola master mata pelajaran TKA Tryout</p>
        </div>
        <button className="primary-button" onClick={openAddModal}>
          + Tambah Mata Pelajaran
        </button>
      </div>

      {/* TABLE */}
      <div className="score-card">
        <div className="score-toolbar">
          <label className="score-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Cari kode / nama / deskripsi..."
              aria-label="Cari mata pelajaran"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {loading && <div className="loading-message">Memuat data mata pelajaran...</div>}

        {!loading && (
          <>
            <div className="score-meta">
              <span>{filteredSubjects.length} mata pelajaran</span>
              {search && (
                <button
                  type="button"
                  className="score-reset"
                  onClick={() => setSearch("")}
                >
                  Reset filter
                </button>
              )}
            </div>

            {filteredSubjects.length === 0 ? (
              <div className="empty-message">
                {search ? "Mata pelajaran tidak ditemukan." : "Belum ada mata pelajaran."}
              </div>
            ) : (
              <div className="table-container">
                <table className="score-table">
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "29%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "16%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>ID</th>
                      <th className="is-left">Kode</th>
                      <th className="is-left">Nama</th>
                      <th className="is-left">Deskripsi</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map((item, index) => (
                      <tr key={item.id}>
                        <td className="is-center is-nowrap">{index + 1}</td>
                        <td className="is-center is-nowrap score-secondary">{item.id}</td>
                        <td>
                          <span className="score-primary is-strong">{item.code}</span>
                        </td>
                        <td className="score-ellipsis" title={item.name}>
                          {item.name}
                        </td>
                        <td
                          className="score-secondary score-ellipsis"
                          title={item.description || undefined}
                        >
                          {item.description || "-"}
                        </td>
                        <td className="is-center">
                          {item.is_active ? (
                            <span className="score-badge is-pass">Aktif</span>
                          ) : (
                            <span className="score-badge is-fail">Nonaktif</span>
                          )}
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
          </>
        )}
      </div>

      <SubjectFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSaveSuccess={loadSubjects}
        editingSubject={editingSubject}
      />
    </>
  );
}

export default SubjectManagement;