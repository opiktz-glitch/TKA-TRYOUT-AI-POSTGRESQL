import { useState } from "react";
import Pagination from "../components/Pagination";
import UserFormModal from "../components/UserFormModal";
import ResetPasswordModal from "../components/ResetPasswordModal";
import { useUserManagement } from "../hooks/useUserManagement";
import "../components/ScoreTable.css";

import {
  IconEdit,
  IconTrash,
  IconKey,
  IconCheck,
  IconLogOut,
  IconSearch,
} from "../components/Icons";

const ROLES = ["ADMIN", "GURU", "SISWA"];

function UserManagement() {
  const {
    loading,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedUsers,
    filteredUsersCount,
    hasActiveUserFilter,
    resetUserFilters,
    handleDelete,
    handleForceLogout,
    loadUsers,
    USERS_PER_PAGE,
  } = useUserManagement();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);

  function openAddModal() {
    setEditingUser(null);
    setShowFormModal(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setShowFormModal(true);
  }

  function openPasswordModal(user) {
    setPasswordUser(user);
    setShowPasswordModal(true);
  }

  return (
    <>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Kelola User</h1>
          <p>Kelola pengguna aplikasi TKA Tryout</p>
        </div>
        <button className="primary-button" onClick={openAddModal}>
          + Tambah User
        </button>
      </div>

      {/* TABLE & FILTER */}
      <div className="score-card">
        <div className="score-toolbar">
          <label className="score-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Cari username / nama..."
              aria-label="Cari user"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select
            className={`score-select${roleFilter ? " is-active" : ""}`}
            aria-label="Filter role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Semua Role</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <select
            className={`score-select${statusFilter ? " is-active" : ""}`}
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>

        {loading && <div className="loading-message">Memuat data user...</div>}

        {!loading && (
          <>
            <div className="score-meta">
              <span>{filteredUsersCount} user</span>
              {hasActiveUserFilter && (
                <button
                  type="button"
                  className="score-reset"
                  onClick={resetUserFilters}
                >
                  Reset filter
                </button>
              )}
            </div>

            {filteredUsersCount === 0 ? (
              <div className="empty-message">
                {hasActiveUserFilter
                  ? "User tidak ditemukan."
                  : "Belum ada user."}
              </div>
            ) : (
              <div className="table-container">
                <table className="score-table">
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "29%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>ID</th>
                      <th className="is-left">Username</th>
                      <th className="is-left">Nama</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((item, index) => (
                      <tr key={item.id}>
                        <td className="is-center is-nowrap">
                          {(currentPage - 1) * USERS_PER_PAGE + index + 1}
                        </td>
                        <td className="is-center is-nowrap score-secondary">
                          {item.id}
                        </td>
                        <td className="score-ellipsis" title={item.username}>
                          <span className="score-primary is-strong">
                            {item.username}
                          </span>
                        </td>
                        <td
                          className="score-ellipsis"
                          title={item.full_name || undefined}
                        >
                          {item.full_name || "-"}
                        </td>
                        <td className="is-center">
                          <span
                            className={`role-badge role-${item.role.toLowerCase()}`}
                          >
                            {item.role}
                          </span>
                        </td>
                        <td className="is-center">
                          {item.is_active ? (
                            <span className="score-badge is-pass">Aktif</span>
                          ) : (
                            <span className="score-badge is-fail">
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="is-center is-nowrap">
                          <div
                            className="action-buttons"
                            style={{ justifyContent: "center" }}
                          >
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
                            <button
                              className="password-button"
                              onClick={() => openPasswordModal(item)}
                              title="Reset Password"
                            >
                              <IconKey size={16} />
                            </button>
                            <button
                              className="password-button"
                              title="Paksa Logout"
                              onClick={() => handleForceLogout(item)}
                            >
                              <IconLogOut size={16} />
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
              totalItems={filteredUsersCount}
              pageSize={USERS_PER_PAGE}
              itemLabel="user"
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <UserFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSaveSuccess={loadUsers}
        editingUser={editingUser}
      />

      <ResetPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        passwordUser={passwordUser}
      />
    </>
  );
}

export default UserManagement;
