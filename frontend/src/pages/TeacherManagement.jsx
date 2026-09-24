import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IconEdit, IconTrash, IconCheck, IconSearch } from "../components/Icons";
import Pagination from "../components/Pagination";
import "../components/ScoreTable.css";

import {
  getTeacherProfiles,
  getAvailableTeacherUsers,
  createTeacherProfile,
  updateTeacherProfile,
  deleteTeacherProfile,
} from "../services/api";


const EMPTY_FORM = {
  user_id: "",
  teacher_code: "",
  full_name: "",
  school_name: "",
};

const TEACHERS_PER_PAGE = 10;


function TeacherManagement() {

  const [teachers, setTeachers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);


  useEffect(() => {
    loadTeachers();
  }, []);


  async function loadTeachers() {
    try {
      setLoading(true);
      setError("");

      const data = await getTeacherProfiles();

      setTeachers(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal mengambil data guru");
    } finally {
      setLoading(false);
    }
  }


  // Dipanggil setiap kali modal "Tambah Guru" dibuka, supaya
  // daftar user yang bisa dipilih selalu yang terbaru (belum
  // punya profil guru).
  async function loadAvailableUsers() {
    try {
      const data = await getAvailableTeacherUsers();
      setAvailableUsers(data);
    } catch (err) {
      console.error(err);
      setAvailableUsers([]);
    }
  }


  function handleChange(event) {
    const { name, value } = event.target;

    // Saat akun dipilih, isi Nama Lengkap otomatis dari nama akun.
    // Hanya menimpa jika kolom masih kosong atau masih berisi nama
    // hasil isi otomatis dari akun sebelumnya — ketikan manual admin
    // tidak pernah ditimpa.
    if (name === "user_id" && !editingTeacher) {
      const prevAccount = availableUsers.find(
        (user) => String(user.id) === String(form.user_id)
      );
      const nextAccount = availableUsers.find(
        (user) => String(user.id) === String(value)
      );

      const isUntouched =
        !form.full_name || form.full_name === (prevAccount?.full_name || "");

      setForm({
        ...form,
        user_id: value,
        full_name: isUntouched
          ? (nextAccount?.full_name || "")
          : form.full_name,
      });

      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
  }


  async function openModal() {
    setEditingTeacher(null);
    setForm(EMPTY_FORM);

    setFormError("");
    setFormSuccess("");

    await loadAvailableUsers();

    setShowModal(true);
  }


  function openEditModal(teacher) {
    setEditingTeacher(teacher);

    setForm({
      user_id: teacher.user_id,
      teacher_code: teacher.teacher_code,
      full_name: teacher.full_name,
      school_name: teacher.school_name || "",
    });

    setFormError("");
    setFormSuccess("");

    setShowModal(true);
  }


  // Akun GURU yang sedang dipilih di dropdown (untuk preview status)
  const selectedAccount = availableUsers.find(
    (user) => String(user.id) === String(form.user_id)
  );


  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);

    setFormError("");
    setFormSuccess("");
  }


  async function handleSubmit(event) {
    event.preventDefault();

    setFormError("");
    setFormSuccess("");

    if (!editingTeacher && !form.user_id) {
      setFormError("Silakan pilih akun guru terlebih dahulu");
      return;
    }

    try {
      setSaving(true);

      let result;

      if (editingTeacher) {

        result = await updateTeacherProfile(editingTeacher.id, {
          teacher_code: form.teacher_code,
          full_name: form.full_name,
          school_name: form.school_name || null,
        });

      } else {

        result = await createTeacherProfile({
          user_id: Number(form.user_id),
          teacher_code: form.teacher_code,
          full_name: form.full_name,
          school_name: form.school_name || null,
        });

      }

      setFormSuccess(result.message || "Data berhasil disimpan");

      await loadTeachers();

      /*
       * Tunggu sebentar supaya admin sempat melihat
       * pesan berhasil sebelum modal tertutup.
       */
      setTimeout(() => {
        setShowModal(false);
        setEditingTeacher(null);
        setFormSuccess("");
      }, 900);

    } catch (err) {
      console.error(err);
      setFormError(err.message || "Gagal menyimpan data guru");
    } finally {
      setSaving(false);
    }
  }


  async function handleDelete(teacher) {
    const confirmed = window.confirm(
      `Hapus data guru "${teacher.full_name}"? Akun login-nya tidak akan ikut terhapus.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionError("");
      setActionSuccess("");

      await deleteTeacherProfile(teacher.id);

      setActionSuccess(`Data guru "${teacher.full_name}" berhasil dihapus`);

      await loadTeachers();

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);

    } catch (err) {
      console.error(err);
      setActionError(err.message || "Gagal menghapus data guru");
    }
  }


  const filteredTeachers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return teachers.filter((item) => {
      return (
        !keyword ||
        item.full_name?.toLowerCase().includes(keyword) ||
        item.teacher_code?.toLowerCase().includes(keyword) ||
        item.username?.toLowerCase().includes(keyword) ||
        item.school_name?.toLowerCase().includes(keyword)
      );
    });
  }, [teachers, search]);

  // Reset ke halaman 1 setiap kali pencarian berubah, supaya
  // tidak "nyangkut" di halaman yang sudah tidak relevan.
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTeachers.length / TEACHERS_PER_PAGE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * TEACHERS_PER_PAGE;
    return filteredTeachers.slice(start, start + TEACHERS_PER_PAGE);
  }, [filteredTeachers, currentPage]);

  const hasActiveTeacherFilter = Boolean(search);

  function resetTeacherFilters() {
    setSearch("");
  }


  return (
    <>
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Data Guru</h1>
          <p>Kelola profil guru (NIP, sekolah)</p>
        </div>

        <button className="primary-button" onClick={openModal}>
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

        {loading && (
          <div className="loading-message">Memuat data guru...</div>
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
          <>
            <div className="score-meta">
              <span>{filteredTeachers.length} guru</span>

              {hasActiveTeacherFilter && (
                <button type="button" className="score-reset" onClick={resetTeacherFilters}>
                  Reset filter
                </button>
              )}
            </div>

            {filteredTeachers.length === 0 ? (
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

                        <td className="is-center is-nowrap score-secondary">
                          {item.id}
                        </td>

                        <td className="score-ellipsis" title={item.teacher_code}>
                          <span className="score-primary is-strong">
                            {item.teacher_code}
                          </span>
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
              totalItems={filteredTeachers.length}
              pageSize={TEACHERS_PER_PAGE}
              itemLabel="guru"
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT GURU */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">

            <div className="modal-header">
              <div>
                <h2>{editingTeacher ? "Edit Guru" : "Tambah Guru"}</h2>
                <p>
                  {editingTeacher
                    ? "Perbaharui data profil guru"
                    : "Hubungkan akun GURU dengan data profilnya"}
                </p>
              </div>

              <button className="modal-close" onClick={closeModal} disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              {/* AKUN — hanya saat tambah baru, tidak bisa diubah saat edit */}

              {!editingTeacher && (
                <div className="form-group">
                  <label>Akun Login (User GURU)</label>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <select
                      name="user_id"
                      value={form.user_id}
                      onChange={handleChange}
                      disabled={saving}
                      required
                      style={{ flex: 1 }}
                    >
                      <option value="">-- Pilih akun guru --</option>

                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username} {user.full_name ? `(${user.full_name})` : ""}
                        </option>
                      ))}
                    </select>

                    {/* Preview status akun terpilih — class sama dengan badge Status di tabel Kelola User */}
                    {selectedAccount && (
                      <span
                        className={`score-badge ${selectedAccount.is_active ? "is-pass" : "is-fail"}`}
                      >
                        {selectedAccount.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    )}
                  </div>

                  {availableUsers.length === 0 && (
                    <small style={{ fontSize: "13px", lineHeight: 1.5, color: "#6b7280" }}>
                      Semua user GURU sudah punya profil, atau belum ada user
                      dengan role GURU. Buat dulu akunnya lewat{" "}
                      <Link to="/users" style={{ color: "var(--accent-hover)", fontWeight: 600, fontSize: "inherit" }}>
                        Kelola User
                      </Link>.
                    </small>
                  )}
                </div>
              )}

              {/* NIP */}

              <div className="form-group">
                <label>NIP / Kode Guru</label>
                <input
                  type="text"
                  name="teacher_code"
                  value={form.teacher_code}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="Masukkan NIP"
                  required
                />
              </div>

              {/* NAMA */}

              <div className="form-group">
                <label>Nama Lengkap</label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              {/* SEKOLAH */}

              <div className="form-group">
                <label>Asal Sekolah</label>
                <input
                  type="text"
                  name="school_name"
                  value={form.school_name}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="Masukkan nama sekolah"
                />
              </div>

              {/* ERROR */}

              {formError && (
                <div className="form-error-message" style={{ marginBottom: "15px" }}>
                  {formError}
                </div>
              )}

              {/* SUCCESS */}

              {formSuccess && (
                <div className="success-message" style={{ marginBottom: "15px" }}>
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

                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Guru"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}


export default TeacherManagement;
