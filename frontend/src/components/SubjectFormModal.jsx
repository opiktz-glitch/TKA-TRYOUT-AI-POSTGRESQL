import { useState, useEffect } from "react";
import { createSubject, updateSubject } from "../services/api";
import { IconCheck } from "./Icons";

export default function SubjectFormModal({ isOpen, onClose, onSaveSuccess, editingSubject }) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormError("");
      setFormSuccess("");

      if (editingSubject) {
        setForm({
          code: editingSubject.code,
          name: editingSubject.name,
          description: editingSubject.description || "",
          is_active: editingSubject.is_active,
        });
      } else {
        setForm({
          code: "",
          name: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [isOpen, editingSubject]);

  if (!isOpen) return null;

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
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

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Gagal menyimpan mata pelajaran");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>{editingSubject ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}</h2>
            <p>{editingSubject ? "Perbaharui data mata pelajaran" : "Tambahkan mata pelajaran baru"}</p>
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Kode Mata Pelajaran</label>
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

          <div className="form-group">
            <label>Nama Mata Pelajaran</label>
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

          <div className="form-group">
            <label>Deskripsi</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Deskripsi mata pelajaran"
              disabled={saving}
              rows="3"
            />
          </div>

          <div className="form-checkbox">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              id="is_active"
              disabled={saving}
            />
            <label htmlFor="is_active">Mata pelajaran aktif</label>
          </div>

          {formError && (
            <div className="form-error-message" style={{ marginBottom: "15px" }}>
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="success-message" style={{ marginBottom: "15px" }}>
              <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              {formSuccess}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
