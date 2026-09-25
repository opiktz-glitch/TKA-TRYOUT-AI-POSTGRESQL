import { useState, useEffect } from "react";
import { createUser, updateUser } from "../services/api";
import { IconEye, IconEyeOff, IconCheck } from "./Icons";

export default function UserFormModal({ isOpen, onClose, onSaveSuccess, editingUser }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "SISWA",
    is_active: true,
  });

  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showFormConfirm, setShowFormConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormError("");
      setFormSuccess("");
      setFormConfirmPassword("");
      setShowFormPassword(false);
      setShowFormConfirm(false);

      if (editingUser) {
        setForm({
          username: editingUser.username,
          password: "",
          full_name: editingUser.full_name || "",
          role: editingUser.role,
          is_active: editingUser.is_active,
        });
      } else {
        setForm({
          username: "",
          password: "",
          full_name: "",
          role: "SISWA",
          is_active: true,
        });
      }
    }
  }, [isOpen, editingUser]);

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
        result = await updateUser(editingUser.id, {
          username: form.username,
          full_name: form.full_name,
          role: form.role,
          is_active: form.is_active,
        });
      } else {
        result = await createUser(form);
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
      setFormError(err.message || "Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>{editingUser ? "Edit User" : "Tambah User"}</h2>
            <p>{editingUser ? "Perbaharui data pengguna" : "Tambahkan pengguna baru"}</p>
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
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

          {!editingUser && (
            <>
              <div className="form-group">
                <label>Password</label>
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
                    {showFormPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Konfirmasi Password</label>
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
                    {showFormConfirm ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                  </button>
                </div>
              </div>

              <div className="password-rules">
                <div className={form.password.length >= 6 ? "rule-valid" : "rule-invalid"}>
                  {form.password.length >= 6 ? <IconCheck size={13} style={{ verticalAlign: "-2px" }} /> : "○"} Minimal 6 karakter
                </div>
                <div className={formConfirmPassword && form.password === formConfirmPassword ? "rule-valid" : "rule-invalid"}>
                  {formConfirmPassword && form.password === formConfirmPassword ? <IconCheck size={13} style={{ verticalAlign: "-2px" }} /> : "○"} Password cocok
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Nama Lengkap</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select name="role" value={form.role} onChange={handleChange} disabled={saving} style={{ flex: 1 }}>
                <option value="ADMIN">ADMIN</option>
                <option value="GURU">GURU</option>
                <option value="SISWA">SISWA</option>
              </select>
              <span className={`role-badge role-${form.role.toLowerCase()}`}>{form.role}</span>
            </div>
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
            <label htmlFor="is_active">User aktif</label>
            <span className={`score-badge ${form.is_active ? "is-pass" : "is-fail"}`} style={{ marginLeft: "auto" }}>
              {form.is_active ? "Aktif" : "Nonaktif"}
            </span>
          </div>

          {formError && <div className="form-error-message" style={{ marginBottom: "15px" }}>{formError}</div>}
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
              {saving ? "Menyimpan..." : "Simpan User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
