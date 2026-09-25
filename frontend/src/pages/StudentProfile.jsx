import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import "../components/settings/settings.css";

import { IconUser, IconKey, IconCheck } from "../components/Icons";

import { getMyProfile, updateMyProfile } from "../services/api";


// ======================================================
// PROFIL SISWA
//
// UI-nya disamakan dengan tab "Profil Saya" milik admin /
// halaman Profil Guru (lihat components/settings/ProfileTab.jsx
// dan pages/TeacherProfile.jsx): kartu akun read-only + tombol
// ubah password di kiri, form edit profil di kanan, memakai
// class CSS yang sama (settings-grid is-profile, settings-card,
// dst).
// ======================================================

function StudentProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: "",
    school_name: "",
    grade: "",
    class_name: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  useEffect(() => {
    loadProfile();
  }, []);


  async function loadProfile() {
    try {
      setLoading(true);

      const data = await getMyProfile();

      setProfile(data);

      setForm({
        full_name: data.full_name || "",
        school_name: data.school_name || "",
        grade: data.grade || "",
        class_name: data.class_name || "",
      });
    } catch (err) {
      console.error("LOAD PROFILE ERROR:", err);
      toast.error(err.message || "Gagal memuat profil", { id: "load-student-profile" });
    } finally {
      setLoading(false);
    }
  }


  function handleChange(event) {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  }


  function handleCancel() {
    navigate(-1);
  }


  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.full_name.trim()) {
      setError("Nama lengkap wajib diisi");
      return;
    }

    try {
      setSaving(true);

      const result = await updateMyProfile({
        full_name: form.full_name.trim(),
        school_name: form.school_name || null,
        grade: form.grade || null,
        class_name: form.class_name || null,
      });

      setSuccess(result.message || "Profil berhasil diperbarui");

      await loadProfile();

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
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
          <p>Data diri kamu sebagai siswa</p>
        </div>
      </div>

      {loading && (
        <div className="dashboard-card">
          <div className="loading-message">Memuat profil...</div>
        </div>
      )}

      {!loading && profile && (
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
                  @{profile.username} &middot; NIS {profile.student_code}
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

            <h2>Edit Data Diri</h2>
            <p className="settings-desc">
              Username dan NIS tidak bisa diubah di sini — hubungi
              admin kalau ada kesalahan data NIS.
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
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
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
                    placeholder="Masukkan nama sekolah"
                  />
                </div>

                <div className="form-group">
                  <label>Tingkat / Kelas</label>
                  <input
                    type="text"
                    name="grade"
                    value={form.grade}
                    onChange={handleChange}
                    placeholder="Contoh: XII"
                  />
                </div>

                <div className="form-group">
                  <label>Rombel</label>
                  <input
                    type="text"
                    name="class_name"
                    value={form.class_name}
                    onChange={handleChange}
                    placeholder="Contoh: IPA 1"
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
                  <label>NIS</label>
                  <input
                    type="text"
                    value={profile.student_code || ""}
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

export default StudentProfile;
