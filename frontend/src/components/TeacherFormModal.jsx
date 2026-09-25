import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAvailableTeacherUsers, createTeacherProfile, updateTeacherProfile } from "../services/api";
import { IconCheck } from "./Icons";

const EMPTY_FORM = {
  user_id: "",
  teacher_code: "",
  full_name: "",
  school_name: "",
};

export default function TeacherFormModal({ isOpen, onClose, onSaveSuccess, editingTeacher }) {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormError("");
      setFormSuccess("");

      if (editingTeacher) {
        setForm({
          user_id: editingTeacher.user_id,
          teacher_code: editingTeacher.teacher_code,
          full_name: editingTeacher.full_name,
          school_name: editingTeacher.school_name || "",
        });
      } else {
        setForm(EMPTY_FORM);
        loadAvailableUsers();
      }
    }
  }, [isOpen, editingTeacher]);

  async function loadAvailableUsers() {
    try {
      const data = await getAvailableTeacherUsers();
      setAvailableUsers(data);
    } catch (err) {
      console.error(err);
      setAvailableUsers([]);
    }
  }

  if (!isOpen) return null;

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "user_id" && !editingTeacher) {
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
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Gagal menyimpan data guru");
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
            <h2>{editingTeacher ? "Edit Guru" : "Tambah Guru"}</h2>
            <p>
              {editingTeacher
                ? "Perbaharui data profil guru"
                : "Hubungkan akun GURU dengan data profilnya"}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
                {selectedAccount && (
                  <span className={`score-badge ${selectedAccount.is_active ? "is-pass" : "is-fail"}`}>
                    {selectedAccount.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                )}
              </div>
              {availableUsers.length === 0 && (
                <small style={{ fontSize: "13px", lineHeight: 1.5, color: "#6b7280" }}>
                  Semua user GURU sudah punya profil, atau belum ada user dengan role GURU. Buat
                  dulu akunnya lewat{" "}
                  <Link to="/users" style={{ color: "var(--accent-hover)", fontWeight: 600, fontSize: "inherit" }}>
                    Kelola User
                  </Link>.
                </small>
              )}
            </div>
          )}

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
              {saving ? "Menyimpan..." : "Simpan Guru"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
