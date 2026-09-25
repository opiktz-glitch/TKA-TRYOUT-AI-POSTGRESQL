import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAvailableStudentUsers, createStudentProfile, updateStudentProfile } from "../services/api";
import { IconCheck } from "./Icons";

const EMPTY_FORM = {
  user_id: "",
  student_code: "",
  full_name: "",
  school_name: "",
  grade: "",
  class_name: "",
};

export default function StudentFormModal({ isOpen, onClose, onSaveSuccess, editingStudent }) {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [lastOpenState, setLastOpenState] = useState({ isOpen: false, editingStudent: null });

  // Inisialisasi state saat modal dibuka (dilakukan saat render)
  if (isOpen !== lastOpenState.isOpen || editingStudent !== lastOpenState.editingStudent) {
    setLastOpenState({ isOpen, editingStudent });
    if (isOpen) {
      setFormError("");
      setFormSuccess("");

      if (editingStudent) {
        setForm({
          user_id: editingStudent.user_id,
          student_code: editingStudent.student_code,
          full_name: editingStudent.full_name,
          school_name: editingStudent.school_name || "",
          grade: editingStudent.grade || "",
          class_name: editingStudent.class_name || "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }

  useEffect(() => {
    async function loadAvailableUsers() {
      try {
        const data = await getAvailableStudentUsers();
        setAvailableUsers(data);
      } catch (err) {
        console.error(err);
        setAvailableUsers([]);
      }
    }

    if (isOpen && !editingStudent) {
      loadAvailableUsers();
    }
  }, [isOpen, editingStudent]);

  if (!isOpen) return null;

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "user_id" && !editingStudent) {
      const prevAccount = availableUsers.find((user) => String(user.id) === String(form.user_id));
      const nextAccount = availableUsers.find((user) => String(user.id) === String(value));

      const isUntouched = !form.full_name || form.full_name === (prevAccount?.full_name || "");

      setForm({
        ...form,
        user_id: value,
        full_name: isUntouched ? (nextAccount?.full_name || "") : form.full_name,
      });
      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
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
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Gagal menyimpan data siswa");
    } finally {
      setSaving(false);
    }
  }

  const selectedAccount = availableUsers.find((user) => String(user.id) === String(form.user_id));

  return (
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
          <button className="modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
                {selectedAccount && (
                  <span className={`score-badge ${selectedAccount.is_active ? "is-pass" : "is-fail"}`}>
                    {selectedAccount.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                )}
              </div>
              {availableUsers.length === 0 && (
                <small style={{ fontSize: "13px", lineHeight: 1.5, color: "#6b7280" }}>
                  Semua user SISWA sudah punya profil, atau belum ada user dengan role SISWA. Buat
                  dulu akunnya lewat{" "}
                  <Link to="/users" style={{ color: "var(--accent-hover)", fontWeight: 600, fontSize: "inherit" }}>
                    Kelola User
                  </Link>.
                </small>
              )}
            </div>
          )}

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
              {saving ? "Menyimpan..." : "Simpan Siswa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
