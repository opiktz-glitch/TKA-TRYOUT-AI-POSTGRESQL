import { useEffect, useState } from "react";

import { IconEdit, IconTrash, IconCheck, IconSearch } from "../components/Icons";
import "../components/ScoreTable.css";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject as deleteSubjectApi,
} from "../services/api";


function SubjectManagement() {

  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  const [actionError, setActionError] = useState("");

  const [actionSuccess, setActionSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingSubject, setEditingSubject] = useState(null);

  const [search, setSearch] = useState("");

  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");

  const [formSuccess, setFormSuccess] = useState("");

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    is_active: true
  });


  useEffect(() => {
    loadSubjects();
  }, []);


  async function loadSubjects() {

    try {

      setLoading(true);
      setLoadError("");

      const data = await getSubjects();

      setSubjects(data);

    } catch (err) {

      console.error(err);

      setLoadError(
        err.message ||
        "Gagal mengambil mata pelajaran"
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


  function openModal() {

    setEditingSubject(null);

    setForm({
      code: "",
      name: "",
      description: "",
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
    setEditingSubject(null);
    setFormError("");
    setFormSuccess("");

  }


  function openEditModal(subject) {

    setEditingSubject(subject);

    setForm({
      code: subject.code,
      name: subject.name,
      description: subject.description || "",
      is_active: subject.is_active
    });

    setFormError("");
    setFormSuccess("");

    setShowModal(true);
  }


  async function handleSubmit(event) {

    event.preventDefault();

    setFormError("");
    setFormSuccess("");

    if (!form.code.trim()) {
      setFormError("Kode mata pelajaran wajib diisi");
      return;
    }

    if (!form.name.trim()) {
      setFormError("Nama mata pelajaran wajib diisi");
      return;
    }

    try {

      setSaving(true);

      const data = editingSubject
        ? await updateSubject(editingSubject.id, form)
        : await createSubject(form);

      setFormSuccess(
        data.message ||
        (editingSubject
          ? "Mata pelajaran berhasil diperbarui"
          : "Mata pelajaran berhasil ditambahkan")
      );

      await loadSubjects();

      /*
       * Tunggu sebentar supaya admin sempat melihat
       * pesan berhasil sebelum modal tertutup.
       */
      setTimeout(() => {
        setShowModal(false);
        setEditingSubject(null);
        setFormSuccess("");
      }, 900);

    } catch (err) {

      console.error(err);

      setFormError(
        err.message ||
        "Gagal menyimpan mata pelajaran"
      );

    } finally {

      setSaving(false);

    }
  }


  async function handleDelete(subject) {

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus mata pelajaran "${subject.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {

      setActionError("");
      setActionSuccess("");

      const data = await deleteSubjectApi(subject.id);

      setActionSuccess(
        data.message ||
        `Mata pelajaran "${subject.name}" berhasil dihapus`
      );

      await loadSubjects();

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);

    } catch (err) {

      console.error(err);

      setActionError(
        err.message ||
        "Gagal menghapus mata pelajaran"
      );

    }
  }


  const filteredSubjects = subjects.filter((item) => {

    const keyword = search.toLowerCase();

    return (
      item.code
        ?.toLowerCase()
        .includes(keyword)
      ||
      item.name
        ?.toLowerCase()
        .includes(keyword)
      ||
      item.description
        ?.toLowerCase()
        .includes(keyword)
    );

  });


  return (

    <>
      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>Mata Pelajaran</h1>

          <p>
            Kelola master mata pelajaran TKA Tryout
          </p>

        </div>

        <button
          className="primary-button"
          onClick={openModal}
        >
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


        {loading && (

          <div className="loading-message">
            Memuat data mata pelajaran...
          </div>

        )}


        {loadError && !showModal && (

          <div className="error-message">
            {loadError}
          </div>

        )}


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
                {search
                  ? "Mata pelajaran tidak ditemukan."
                  : "Belum ada mata pelajaran."
                }
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

                        <td className="is-center is-nowrap">
                          {index + 1}
                        </td>

                        <td className="is-center is-nowrap score-secondary">
                          {item.id}
                        </td>

                        <td>
                          <span className="score-primary is-strong">
                            {item.code}
                          </span>
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

      {/* MODAL TAMBAH / EDIT MATA PELAJARAN */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <h2>
                  {editingSubject
                    ? "Edit Mata Pelajaran"
                    : "Tambah Mata Pelajaran"
                  }
                </h2>

                <p>
                  {editingSubject
                    ? "Perbaharui data mata pelajaran"
                    : "Tambahkan mata pelajaran baru"
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

              {/* KODE */}

              <div className="form-group">

                <label>
                  Kode Mata Pelajaran
                </label>

                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Contoh: MAT"
                  maxLength="50"
                  disabled={saving}
                  required
                />

              </div>


              {/* NAMA */}

              <div className="form-group">

                <label>
                  Nama Mata Pelajaran
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: Matematika"
                  maxLength="100"
                  disabled={saving}
                  required
                />

              </div>


              {/* DESKRIPSI */}

              <div className="form-group">

                <label>
                  Deskripsi
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Deskripsi mata pelajaran"
                  disabled={saving}
                  rows="3"
                />

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
                  Mata pelajaran aktif
                </label>

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
                    : "Simpan"
                  }

                </button>

              </div>

            </form>

          </div>

        </div>

      )}
    </>
  );

}


export default SubjectManagement;