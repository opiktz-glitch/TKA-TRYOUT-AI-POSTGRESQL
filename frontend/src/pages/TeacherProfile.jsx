import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../components/settings/settings.css";

import { IconUser, IconKey, IconCheck } from "../components/Icons";

import { getMyTeacherProfile, updateMyTeacherProfile } from "../services/api";


// ======================================================
// PROFIL GURU
//
// UI-nya sengaja disamakan dengan tab "Profil Saya" milik
// admin (lihat components/settings/ProfileTab.jsx): kartu
// akun read-only + tombol ubah password di kiri, form edit
// profil di kanan, memakai class CSS yang sama
// (settings-grid is-profile, settings-card, dst).
// ======================================================

function TeacherProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  useEffect(() => {
    loadProfile();
  }, []);


  async function loadProfile() {
    try {
      setLoading(true);
      setLoadError("");

      const data = await getMyTeacherProfile();

      setProfile(data);
      setFullName(data.full_name || "");
      setSchoolName(data.school_name || "");
    } catch (err) {
      console.error("LOAD TEACHER PROFILE ERROR:", err);
      setLoadError(err.message || "Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  }


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

      const result = await updateMyTeacherProfile({
        full_name: fullName.trim(),
        school_name: schoolName.trim() || null,
      });

      setSuccess(result.message || "Profil berhasil diperbarui");

      await loadProfile();

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error("UPDATE TEACHER PROFILE ERROR:", err);
      setError(err.message || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  }


  return (
    <>
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Profil</h1>
          <p>Data diri kamu sebagai guru</p>
        </div>
      </div>

      {loading && (
        <div className="dashboard-card">
          <div className="loading-message">Memuat profil...</div>
        </div>
      )}

      {loadError && (
        <div className="dashboard-card">
          <div className="error-message">{loadError}</div>
        </div>
      )}

      {!loading && !loadError && profile && (
        <div className="settings-grid is-profile">

          {/* KARTU AKUN (read-only) + tombol ubah password */}

          <div className="dashboard-card settings-card">
            <div className="settings-account">
              <div className="settings-avatar">
                <IconUser size={24} />
              </div>

              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 16 }}>{profile.full_name}</strong>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  @{profile.username} &middot; {profile.teacher_code}
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
              Username dan kode guru tidak bisa diubah di sini.
            </p>

            {error && (
              <div className="form-error-message" style={{ marginBottom: 14 }}>
                {error}
              </div>
            )}

            {success && (
              <div className="success-message" style={{ marginBottom: 14 }}>
                <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
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
                  <label>Asal Sekolah</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Masukkan nama sekolah"
                  />
                </div>

                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={profile.username || ""}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>Kode Guru</label>
                  <input
                    type="text"
                    value={profile.teacher_code || ""}
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
      )}
    </>
  );
}

export default TeacherProfile;
