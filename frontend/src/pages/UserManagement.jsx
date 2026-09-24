import { useEffect, useMemo, useState } from "react";

import Pagination from "../components/Pagination";
import "../components/ScoreTable.css";

import { IconEdit, IconTrash, IconKey, IconEye, IconEyeOff, IconCheck, IconLogOut, IconSearch } from "../components/Icons";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  forceLogoutUser
} from "../services/api";

const ROLES = ["ADMIN", "GURU", "SISWA"];

const USERS_PER_PAGE = 10;


function UserManagement() {

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  // --------------------------------------------------------
  // STATE HALAMAN (tabel & aksi hapus)
  // --------------------------------------------------------

  const [loadError, setLoadError] = useState("");

  const [actionError, setActionError] = useState("");

  const [actionSuccess, setActionSuccess] = useState("");

  const [search, setSearch] = useState("");

  // "" = Semua role / status
  const [roleFilter, setRoleFilter] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);


  // --------------------------------------------------------
  // STATE MODAL TAMBAH / EDIT USER
  // --------------------------------------------------------

  const [showModal, setShowModal] = useState(false);

  const [editingUser, setEditingUser] = useState(null);

  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");

  const [formSuccess, setFormSuccess] = useState("");

  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "SISWA",
    is_active: true
  });

  // Field khusus form Tambah User (tidak ikut dikirim ke API)
  const [formConfirmPassword, setFormConfirmPassword] = useState("");

  const [showFormPassword, setShowFormPassword] = useState(false);

  const [showFormConfirm, setShowFormConfirm] = useState(false);


  // --------------------------------------------------------
  // STATE MODAL RESET PASSWORD
  // --------------------------------------------------------

  const [passwordUser, setPasswordUser] = useState(null);

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordError, setPasswordError] = useState("");

  const [passwordSuccess, setPasswordSuccess] = useState("");


  useEffect(() => {
    loadUsers();
  }, []);


  async function loadUsers() {

    try {

      setLoading(true);
      setLoadError("");

      const data = await getUsers();

      setUsers(data);

    } catch (err) {

      console.error(err);

      setLoadError(
        err.message || "Gagal mengambil data user"
      );

    } finally {

      setLoading(false);

    }
  }


  function handleChange(event) {

    const { name, value, type, checked } = event.target;

    setForm({
      ...form,
      [name]: type === "checkbox"
        ? checked
        : value
    });

  }


  function resetFormPasswordFields() {
    setFormConfirmPassword("");
    setShowFormPassword(false);
    setShowFormConfirm(false);
  }


  function openModal() {

    setEditingUser(null);

    resetFormPasswordFields();

    setForm({
      username: "",
      password: "",
      full_name: "",
      role: "SISWA",
      is_active: true
    });

    setFormError("");
    setFormSuccess("");

    setShowModal(true);

  }


  function closeModal() {

    if (saving) {
      return;
    }

    setShowModal(false);

    resetFormPasswordFields();

    setFormError("");
    setFormSuccess("");

  }


  function openEditModal(user) {

    setEditingUser(user);

    resetFormPasswordFields();

    setForm({
      username: user.username,
      password: "",
      full_name: user.full_name || "",
      role: user.role,
      is_active: user.is_active
    });

    setFormError("");
    setFormSuccess("");

    setShowModal(true);
  }


  function openPasswordModal(user) {
    setPasswordUser(user);

    setNewPassword("");
    setConfirmPassword("");

    setPasswordError("");
    setPasswordSuccess("");

    setPasswordLoading(false);

    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }


  function closePasswordModal() {
    if (passwordLoading) {
      return;
    }

    setPasswordUser(null);

    setNewPassword("");
    setConfirmPassword("");

    setPasswordError("");
    setPasswordSuccess("");

    setPasswordLoading(false);

    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }


  async function handleSubmit(event) {

    event.preventDefault();

    setFormError("");
    setFormSuccess("");

    if (!form.username.trim()) {
      setFormError("Username wajib diisi");
      return;
    }

    if (!editingUser && !form.password.trim()) {
      setFormError("Password wajib diisi");
      return;
    }

    if (!editingUser && form.password.length < 6) {
      setFormError("Password minimal 6 karakter");
      return;
    }

    if (!editingUser && !formConfirmPassword) {
      setFormError("Konfirmasi password wajib diisi");
      return;
    }

    if (!editingUser && form.password !== formConfirmPassword) {
      setFormError("Konfirmasi password tidak sama");
      return;
    }

    try {

      setSaving(true);

      let result;

      if (editingUser) {

        result = await updateUser(
          editingUser.id,
          {
            username: form.username,
            full_name: form.full_name,
            role: form.role,
            is_active: form.is_active
          }
        );

      } else {

        result = await createUser(form);

      }

      setFormSuccess(
        result.message || "Data berhasil disimpan"
      );

      await loadUsers();

      /*
       * Tunggu sebentar supaya admin sempat melihat
       * pesan berhasil sebelum modal tertutup, sama
       * seperti pola di modal Reset Password.
       */
      setTimeout(() => {
        setShowModal(false);
        setEditingUser(null);
        setFormSuccess("");
        resetFormPasswordFields();
      }, 900);

    } catch (err) {

      console.error(err);

      setFormError(
        err.message || "Gagal menyimpan data"
      );

    } finally {

      setSaving(false);

    }
  }


  async function handleDelete(user) {

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus user "${user.username}"?`
    );

    if (!confirmed) {
      return;
    }

    try {

      setActionError("");
      setActionSuccess("");

      await deleteUser(user.id);

      setActionSuccess(
        `User "${user.username}" berhasil dihapus`
      );

      await loadUsers();

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);

    } catch (err) {

      console.error(err);

      setActionError(
        err.message || "Gagal menghapus user"
      );

    }
  }


  async function handleForceLogout(user) {

    const confirmed = window.confirm(
      `Paksa logout user "${user.username}"? Sesi aktifnya di `
      + `perangkat lain akan langsung berakhir, dan akun ini bisa `
      + `langsung dipakai login lagi di tempat baru.`
    );

    if (!confirmed) {
      return;
    }

    try {

      setActionError("");
      setActionSuccess("");

      await forceLogoutUser(user.id);

      setActionSuccess(
        `Sesi user "${user.username}" berhasil di-logout paksa`
      );

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);

    } catch (err) {

      console.error(err);

      setActionError(
        err.message || "Gagal memaksa logout user"
      );

    }
  }


  async function handleResetPassword(event) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordUser) {
      setPasswordError("User belum dipilih");
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError("Password baru wajib diisi");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password minimal 6 karakter");
      return;
    }

    if (!confirmPassword.trim()) {
      setPasswordError("Konfirmasi password wajib diisi");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak sama");
      return;
    }

    try {
      setPasswordLoading(true);

      const result = await resetUserPassword(
        passwordUser.id,
        newPassword
      );

      setPasswordSuccess(
        result.message || "Password berhasil diubah"
      );

      setNewPassword("");
      setConfirmPassword("");

      /*
       * Tunggu sebentar supaya admin
       * bisa melihat pesan berhasil.
       */
      setTimeout(() => {
        setPasswordUser(null);
        setPasswordSuccess("");
      }, 1200);

    } catch (err) {

      console.error(
        "RESET PASSWORD ERROR:",
        err
      );

      setPasswordError(
        err.message ||
        "Gagal mengubah password"
      );

    } finally {

      setPasswordLoading(false);

    }
  }

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.username?.toLowerCase().includes(keyword) ||
        item.full_name?.toLowerCase().includes(keyword);

      const matchesRole = !roleFilter || item.role === roleFilter;

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" ? item.is_active : !item.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Reset ke halaman 1 setiap kali pencarian/filter berubah, supaya
  // tidak "nyangkut" di halaman yang sudah tidak relevan.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / USERS_PER_PAGE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const hasActiveUserFilter = Boolean(search || roleFilter || statusFilter);

  function resetUserFilters() {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
  }

  return (

    <>
      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>Kelola User</h1>

          <p>
            Kelola pengguna aplikasi TKA Tryout
          </p>

        </div>

        <button
          className="primary-button"
          onClick={openModal}
        >
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
              <option key={role} value={role}>{role}</option>
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


        {/* -----------------------------------------------------
            FEEDBACK AKSI (hapus user) — banner kecil, tidak
            menyembunyikan tabel di bawahnya sama sekali,
            beda dengan loadError yang memang berarti tabel
            gagal dimuat sama sekali.
            ----------------------------------------------------- */}

        {actionSuccess && (

          <div
            className="success-message"
            style={{ margin: "0 16px", marginTop: "12px" }}
          >
            <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
            {actionSuccess}
          </div>

        )}


        {actionError && (

          <div
            className="form-error-message"
            style={{ margin: "0 16px", marginTop: "12px" }}
          >
            {actionError}
          </div>

        )}


        {loading && (

          <div className="loading-message">
            Memuat data user...
          </div>

        )}


        {loadError && (

          <div className="error-message">
            {loadError}
          </div>

        )}


        {!loading && !loadError && (

          <>

            <div className="score-meta">
              <span>{filteredUsers.length} user</span>

              {hasActiveUserFilter && (
                <button type="button" className="score-reset" onClick={resetUserFilters}>
                  Reset filter
                </button>
              )}
            </div>

            {filteredUsers.length === 0 ? (

              <div className="empty-message">
                {hasActiveUserFilter
                  ? "User tidak ditemukan."
                  : "Belum ada user."
                }
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

                        <td className="score-ellipsis" title={item.full_name || undefined}>
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

                            <span className="score-badge is-pass">
                              Aktif
                            </span>

                          ) : (

                            <span className="score-badge is-fail">
                              Nonaktif
                            </span>

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
              totalItems={filteredUsers.length}
              pageSize={USERS_PER_PAGE}
              itemLabel="user"
              onPageChange={setCurrentPage}
            />

          </>

        )}

      </div>

      {/* MODAL TAMBAH / EDIT USER */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <h2>
                  {editingUser
                    ? "Edit User"
                    : "Tambah User"
                  }
                </h2>

                <p>
                  {editingUser
                    ? "Perbaharui data pengguna"
                    : "Tambahkan pengguna baru"
                  }
                </p>

              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form onSubmit={handleSubmit}>

              {/* USERNAME */}

              <div className="form-group">

                <label>
                  Username
                </label>

                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Masukkan username"
                  disabled={saving}
                  required
                />

              </div>


              {/* PASSWORD + KONFIRMASI (hanya saat tambah user) */}

              {!editingUser && (

                <>

                  <div className="form-group">

                    <label>
                      Password
                    </label>

                    <div className="password-input-wrapper">

                      <input
                        type={showFormPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Minimal 6 karakter"
                        autoComplete="new-password"
                        disabled={saving}
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        disabled={saving}
                        tabIndex="-1"
                      >
                        {showFormPassword
                          ? <IconEyeOff size={17} />
                          : <IconEye size={17} />}
                      </button>

                    </div>

                  </div>


                  <div className="form-group">

                    <label>
                      Konfirmasi Password
                    </label>

                    <div className="password-input-wrapper">

                      <input
                        type={showFormConfirm ? "text" : "password"}
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        placeholder="Ulangi password"
                        autoComplete="new-password"
                        disabled={saving}
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowFormConfirm(!showFormConfirm)}
                        disabled={saving}
                        tabIndex="-1"
                      >
                        {showFormConfirm
                          ? <IconEyeOff size={17} />
                          : <IconEye size={17} />}
                      </button>

                    </div>

                  </div>


                  <div className="password-rules">

                    <div className={form.password.length >= 6 ? "rule-valid" : "rule-invalid"}>
                      {form.password.length >= 6
                        ? <IconCheck size={13} style={{ verticalAlign: "-2px" }} />
                        : "○"}{" "}
                      Minimal 6 karakter
                    </div>

                    <div
                      className={
                        formConfirmPassword && form.password === formConfirmPassword
                          ? "rule-valid"
                          : "rule-invalid"
                      }
                    >
                      {formConfirmPassword && form.password === formConfirmPassword
                        ? <IconCheck size={13} style={{ verticalAlign: "-2px" }} />
                        : "○"}{" "}
                      Password cocok
                    </div>

                  </div>

                </>

              )}


              {/* NAMA */}

              <div className="form-group">

                <label>
                  Nama Lengkap
                </label>

                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Masukkan nama lengkap"
                  disabled={saving}
                />

              </div>


              {/* ROLE */}

              <div className="form-group">

                <label>
                  Role
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={saving}
                  style={{ flex: 1 }}
                >

                  <option value="ADMIN">
                    ADMIN
                  </option>

                  <option value="GURU">
                    GURU
                  </option>

                  <option value="SISWA">
                    SISWA
                  </option>

                </select>

                <span className={`role-badge role-${form.role.toLowerCase()}`}>
                  {form.role}
                </span>

                </div>

              </div>


              {/* STATUS */}

              <div className="form-checkbox">

                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  id="is_active"
                  disabled={saving}
                />

                <label htmlFor="is_active">
                  User aktif
                </label>

                {/* Preview: pakai class yang sama dengan badge Status di tabel */}
                <span
                  className={`score-badge ${form.is_active ? "is-pass" : "is-fail"}`}
                  style={{ marginLeft: "auto" }}
                >
                  {form.is_active ? "Aktif" : "Nonaktif"}
                </span>

              </div>


              {/* ERROR */}

              {formError && (

                <div
                  className="form-error-message"
                  style={{ marginBottom: "15px" }}
                >
                  {formError}
                </div>

              )}


              {/* SUCCESS */}

              {formSuccess && (

                <div
                  className="success-message"
                  style={{ marginBottom: "15px" }}
                >
                  <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                  {formSuccess}
                </div>

              )}


              {/* BUTTON */}

              <div className="modal-footer">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >

                  {saving
                    ? "Menyimpan..."
                    : "Simpan User"
                  }

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =========================================================
          MODAL RESET PASSWORD
      ========================================================= */}

      {passwordUser && (

        <div className="modal-overlay">

          <div className="modal">

            {/* HEADER */}

            <div className="modal-header">

              <div>

                <h2>
                  Reset Password
                </h2>

                <p>
                  Ubah password pengguna
                </p>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closePasswordModal}
                disabled={passwordLoading}
              >
                ×
              </button>

            </div>


            {/* INFORMASI USER */}

            <div className="password-user-info">

              <strong>
                {passwordUser.full_name ||
                  passwordUser.username}
              </strong>

              <span>
                Username: {passwordUser.username}
              </span>

              <span>
                Role: {passwordUser.role}
              </span>

            </div>


            {/* FORM */}

            <form onSubmit={handleResetPassword}>

              {/* PASSWORD BARU */}

              <div className="form-group">

                <label>
                  Password Baru
                </label>

                <div className="password-input-wrapper">

                  <input
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                    disabled={passwordLoading}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowNewPassword(
                        !showNewPassword
                      )
                    }
                    disabled={passwordLoading}
                    tabIndex="-1"
                  >
                    {showNewPassword
                      ? <IconEyeOff size={17} />
                      : <IconEye size={17} />}
                  </button>

                </div>

              </div>


              {/* KONFIRMASI PASSWORD */}

              <div className="form-group">

                <label>
                  Konfirmasi Password
                </label>

                <div className="password-input-wrapper">

                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    disabled={passwordLoading}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    disabled={passwordLoading}
                    tabIndex="-1"
                  >
                    {showConfirmPassword
                      ? <IconEyeOff size={17} />
                      : <IconEye size={17} />}
                  </button>

                </div>

              </div>


              {/* VALIDASI PASSWORD */}

              <div className="password-rules">

                <div
                  className={
                    newPassword.length >= 6
                      ? "rule-valid"
                      : "rule-invalid"
                  }
                >
                  {newPassword.length >= 6
                    ? <IconCheck size={13} style={{ verticalAlign: "-2px" }} />
                    : "○"}{" "}
                  Minimal 6 karakter
                </div>


                <div
                  className={
                    confirmPassword &&
                    newPassword === confirmPassword
                      ? "rule-valid"
                      : "rule-invalid"
                  }
                >
                  {confirmPassword &&
                  newPassword === confirmPassword
                    ? <IconCheck size={13} style={{ verticalAlign: "-2px" }} />
                    : "○"}{" "}
                  Password cocok
                </div>

              </div>


              {/* ERROR */}

              {passwordError && (

                <div
                  className="form-error-message"
                  style={{
                    marginBottom: "15px"
                  }}
                >
                  {passwordError}
                </div>

              )}


              {/* SUCCESS */}

              {passwordSuccess && (

                <div
                  className="success-message"
                  style={{
                    marginBottom: "15px"
                  }}
                >
                  <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                  {passwordSuccess}
                </div>

              )}


              {/* FOOTER */}

              <div className="modal-footer">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                >
                  Batal
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={passwordLoading}
                >

                  {passwordLoading
                    ? "Menyimpan..."
                    : "Ubah Password"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}
    </>
  );

}


export default UserManagement;
