import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./settings.css";

import { IconUser, IconKey } from "../Icons";
import { updateMyAccountProfile } from "../../services/api";
import { useAuth } from "../../auth/AuthContext";

// ======================================================
// TAB "PROFIL SAYA" (Pengaturan)
//
// Kartu akun (read-only + tombol ubah password) dan form edit
// nama lengkap. Semua state-nya milik tab ini sendiri -- tidak
// ada yang dipakai tab lain di AdminSettings.jsx.
// ======================================================

function ProfileTab() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleCancel() {
    navigate(-1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Nama lengkap wajib diisi");
      return;
    }

    try {
      setSaving(true);

      const result = await updateMyAccountProfile(fullName.trim());

      await refreshUser();

      setSuccess(result.message || "Profil berhasil diperbarui");
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      setError(err.message || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-grid is-profile">

      {/* KARTU AKUN (read-only) + tombol ubah password */}

      <div className="dashboard-card settings-card">
        <div className="settings-account">
          <div className="settings-avatar">
            <IconUser size={24} />
          </div>

          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 16 }}>{user?.full_name}</strong>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              @{user?.username} &middot; {user?.role}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button settings-full"
          onClick={() => navigate("/change-password")}
        >
          <IconKey size={15} />
          Ubah Password
        </button>
      </div>

      {/* FORM EDIT PROFIL */}

      <div className="dashboard-card settings-card">

        <h2>Edit Profil</h2>
        <p className="settings-desc">
          Username dan role tidak bisa diubah di sini.
        </p>

        {error && (
          <div className="form-error-message" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" style={{ marginBottom: 14 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="settings-fields">
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={user?.username || ""}
                disabled
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "8px",
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={handleCancel}
            >
              Batal
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default ProfileTab;
