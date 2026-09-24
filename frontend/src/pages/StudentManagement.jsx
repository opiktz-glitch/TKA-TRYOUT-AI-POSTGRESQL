import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IconEdit, IconTrash, IconCheck, IconSearch } from "../components/Icons";
import Pagination from "../components/Pagination";
import "../components/ScoreTable.css";

import {
  getStudentProfiles,
  getAvailableStudentUsers,
  createStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
} from "../services/api";


const EMPTY_FORM = {
  user_id: "",
  student_code: "",
  full_name: "",
  school_name: "",
  grade: "",
  class_name: "",
};

const STUDENTS_PER_PAGE = 10;


function StudentManagement() {

  const [students, setStudents] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);


  useEffect(() => {
    loadStudents();
  }, []);


  async function loadStudents() {
    try {
      setLoading(true);
      setError("");

      const data = await getStudentProfiles();

      setStudents(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal mengambil data siswa");
    } finally {
      setLoading(false);
    }
  }


  // Dipanggil setiap kali modal "Tambah Siswa" dibuka, supaya
  // daftar user yang bisa dipilih selalu yang terbaru (belum
  // punya profil siswa).
  async function loadAvailableUsers() {
    try {
      const data = await getAvailableStudentUsers();
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
    if (name === "user_id" && !editingStudent) {
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
    setEditingStudent(null);
    setForm(EMPTY_FORM);

    setFormError("");
    setFormSuccess("");

    await loadAvailableUsers();

    setShowModal(true);
  }


  function openEditModal(student) {
    setEditingStudent(student);

    setForm({
      user_id: student.user_id,
      student_code: student.student_code,
      full_name: student.full_name,
      school_name: student.school_name || "",
      grade: student.grade || "",
      class_name: student.class_name || "",
    });

    setFormError("");
    setFormSuccess("");

    setShowModal(true);
  }


  // Akun SISWA yang sedang dipilih di dropdown (untuk preview status)
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

    if (!editingStudent && !form.user_id) {
      setFormError("Silakan pilih akun siswa terlebih dahulu");
      return;
    }

    try {
      setSaving(true);

      let result;

      if (editingStudent) {

        result = await updateStudentProfile(editingStudent.id, {
          student_code: form.student_code,
          full_name: form.full_name,
          school_name: form.school_name || null,
          grade: form.grade || null,
          class_name: form.class_name || null,
        });

      } else {

        result = await createStudentProfile({
          user_id: Number(form.user_id),
          student_code: form.student_code,
          full_name: form.full_name,
          school_name: form.school_name || null,
          grade: form.grade || null,
          class_name: form.class_name || null,
        });

      }

      setFormSuccess(result.message || "Data berhasil disimpan");

      await loadStudents();

      /*
       * Tunggu sebentar supaya admin sempat melihat
       * pesan berhasil sebelum modal tertutup.
       */
      setTimeout(() => {
        setShowModal(false);
        setEditingStudent(null);
        setFormSuccess("");
      }, 900);

    } catch (err) {
      console.error(err);
      setFormError(err.message || "Gagal menyimpan data siswa");
    } finally {
      setSaving(false);
    }
  }


  async function handleDelete(student) {
    const confirmed = window.confirm(
      `Hapus data siswa "${student.full_name}"? Akun login-nya tidak akan ikut terhapus.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionError("");
      setActionSuccess("");

      await deleteStudentProfile(student.id);

      setActionSuccess(`Data siswa "${student.full_name}" berhasil dihapus`);

      await loadStudents();

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);

    } catch (err) {
      console.error(err);
      setActionError(err.message || "Gagal menghapus data siswa");
    }
  }


  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return students.filter((item) => {
      return (
        !keyword ||
        item.full_name?.toLowerCase().includes(keyword) ||
        item.student_code?.toLowerCase().includes(keyword) ||
        item.username?.toLowerCase().includes(keyword) ||
        item.school_name?.toLowerCase().includes(keyword)
      );
    });
  }, [students, search]);

  // Reset ke halaman 1 setiap kali pencarian berubah, supaya
  // tidak "nyangkut" di halaman yang sudah tidak relevan.
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * STUDENTS_PER_PAGE;
    return filteredStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const hasActiveStudentFilter = Boolean(search);

  function resetStudentFilters() {
    setSearch("");
  }


  return (
    <>
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Data Siswa</h1>
          <p>Kelola profil siswa (NIS, sekolah, kelas)</p>
        </div>

        <button className="primary-button" onClick={openModal}>
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

        {loading && (
          <div className="loading-message">Memuat data siswa...</div>
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
              <span>{filteredStudents.length} siswa</span>

              {hasActiveStudentFilter && (
                <button type="button" className="score-reset" onClick={resetStudentFilters}>
                  Reset filter
                </button>
              )}
            </div>

            {filteredStudents.length === 0 ? (
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

                        <td className="is-center is-nowrap score-secondary">
                          {item.id}
                        </td>

                        <td className="score-ellipsis" title={item.student_code}>
                          <span className="score-primary is-strong">
                            {item.student_code}
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
              totalItems={filteredStudents.length}
              pageSize={STUDENTS_PER_PAGE}
              itemLabel="siswa"
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT SISWA */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">

            <div className="modal-header">
              <div>
                <h2>{editingStudent ? "Edit Siswa" : "Tambah Siswa"}</h2>
                <p>
                  {editingStudent
                    ? "Perbaharui data profil siswa"
                    : "Hubungkan akun SISWA dengan data profilnya"}
                </p>
              </div>

              <button className="modal-close" onClick={closeModal} disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              {/* AKUN — hanya saat tambah baru, tidak bisa diubah saat edit */}

              {!editingStudent && (
                <div className="form-group">
                  <label>Akun Login (User SISWA)</label>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <select
                      name="user_id"
                      value={form.user_id}
                      onChange={handleChange}
                      disabled={saving}
                      required
                      style={{ flex: 1 }}
                    >
                      <option value="">-- Pilih akun siswa --</option>

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
                      Semua user SISWA sudah punya profil, atau belum ada user
                      dengan role SISWA. Buat dulu akunnya lewat{" "}
                      <Link to="/users" style={{ color: "var(--accent-hover)", fontWeight: 600, fontSize: "inherit" }}>
                        Kelola User
                      </Link>.
                    </small>
                  )}
                </div>
              )}

              {/* NIS */}

              <div className="form-group">
                <label>NIS / Kode Siswa</label>
                <input
                  type="text"
                  name="student_code"
                  value={form.student_code}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="Masukkan NIS"
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

              {/* KELAS / TINGKAT */}

              <div style={{ display: "flex", gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Tingkat / Kelas</label>
                  <input
                    type="text"
                    name="grade"
                    value={form.grade}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Contoh: XII"
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Rombel</label>
                  <input
                    type="text"
                    name="class_name"
                    value={form.class_name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Contoh: IPA 1"
                  />
                </div>
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
                  {saving ? "Menyimpan..." : "Simpan Siswa"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}


export default StudentManagement;
