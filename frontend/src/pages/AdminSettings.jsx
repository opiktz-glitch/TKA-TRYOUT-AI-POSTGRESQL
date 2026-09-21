import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { IconShield, IconRefresh, IconClipboard } from "../components/Icons";
import ProfileTab from "../components/settings/ProfileTab";
import NetworkTab from "../components/settings/NetworkTab";
import "../components/settings/settings.css";

import {
  getAIProviders,
  updateActiveProvider,
  updateProviderConfig,
  clearProviderConfig,
  getSecretKeyStatus,
  updateSecretKey,
  rotateSecretKey,
  getNetworkInfo,
  getSystemStatus,
  getBackups,
  createBackupNow,
  downloadBackup,
  restoreFromExistingBackup,
  restoreFromUpload,
} from "../services/api";
import { useAuth } from "../auth/AuthContext";


const TABS = [
  { key: "profile", label: "Profil Saya" },
  { key: "ai-model", label: "AI" },
  { key: "security", label: "Keamanan" },
  { key: "backup", label: "Backup" },
  { key: "network", label: "Jaringan" },
];


function AdminSettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState("profile");

  // ======================================================
  // PROVIDER AI — GENERIK
  //
  // "providers" datang dari backend sebagai LIST (bukan field
  // terpisah per nama seperti "ollama"/"gemini"). Jadi kalau nanti
  // ada provider baru didaftarkan di backend/ai_providers.py, UI
  // di bawah ini otomatis ikut menampilkannya tanpa perlu tambahan
  // state atau komponen baru.
  // ======================================================

  const [providers, setProviders] = useState(null);
  const [providerChoice, setProviderChoice] = useState("");
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [providerSuccess, setProviderSuccess] = useState("");

  // Form konfigurasi (API key & model) per provider, key-nya =
  // provider key (mis. "GEMINI"). apiKey sengaja SELALU dimulai
  // kosong (key asli tidak pernah dikirim balik oleh backend);
  // model diisi dari nilai yang sedang aktif supaya enak diedit.
  const [configDrafts, setConfigDrafts] = useState({});
  const [configSaving, setConfigSaving] = useState({});
  const [configError, setConfigError] = useState({});
  const [configSuccess, setConfigSuccess] = useState({});


  // ======================================================
  // SECRET_KEY (Pengaturan > Keamanan)
  //
  // Mengganti/merotasi SECRET_KEY membuat SEMUA sesi login
  // (termasuk sesi admin yang melakukan aksi ini) langsung tidak
  // valid — begitu backend membalas sukses, kita langsung logout
  // sendiri & arahkan ke halaman login, alih-alih menunggu
  // request berikutnya gagal dengan 401.
  // ======================================================

  const [secretKeyStatus, setSecretKeyStatus] = useState(null);
  const [secretKeyLoading, setSecretKeyLoading] = useState(true);
  const [secretKeyError, setSecretKeyError] = useState("");

  const [secretKeyDraft, setSecretKeyDraft] = useState("");
  const [savingSecretKey, setSavingSecretKey] = useState(false);
  const [rotatingSecretKey, setRotatingSecretKey] = useState(false);

  // "confirm" -> null | "save" | "rotate". Dipakai untuk
  // menampilkan dialog konfirmasi sebelum benar-benar
  // mengeksekusi, karena aksi ini me-logout SEMUA orang yang
  // sedang login (termasuk siswa yang mungkin sedang tryout).
  const [secretKeyConfirm, setSecretKeyConfirm] = useState(null);


  // ======================================================
  // JARINGAN (Pengaturan > Jaringan)
  //
  // Menampilkan IP address laptop ini di WiFi/LAN yang aktif,
  // supaya admin tinggal membagikan URL-nya ke laptop/HP lain
  // di jaringan yang sama, tanpa perlu buka Command Prompt.
  // ======================================================

  const [networkInfo, setNetworkInfo] = useState(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [networkError, setNetworkError] = useState("");

  // Dipakai HANYA untuk mengetahui database.is_sqlite — supaya tab
  // "Backup" bisa disembunyikan sepenuhnya kalau database aktif
  // Postgres/Neon (fitur backup ini memang cuma mendukung SQLite,
  // lihat backup_service.py & routers/system.py).
  const [systemStatus, setSystemStatus] = useState(null);


  // ======================================================
  // BACKUP (Pengaturan > Backup)
  //
  // Daftar backup database yang sudah ada (dari service Docker
  // "backup" yang jalan otomatis tiap 24 jam, ATAU dari tombol
  // "Backup Sekarang" di sini) + tombol untuk membuat backup baru
  // kapan saja di luar jadwal otomatis, dan tombol download tiap
  // file backup.
  // ======================================================

  const [backups, setBackups] = useState([]);
  const [retentionDays, setRetentionDays] = useState(null);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [backupsError, setBackupsError] = useState("");

  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupActionError, setBackupActionError] = useState("");
  const [backupActionSuccess, setBackupActionSuccess] = useState("");

  const [downloadingFilename, setDownloadingFilename] = useState("");


  // ======================================================
  // IMPORT / RESTORE DATABASE (Pengaturan > Backup > Import)
  //
  // Dua sumber restore:
  // - "existing"  -> pilih salah satu file dari daftar `backups` di
  //                  atas (sudah ada di server).
  // - "upload"     -> file dipilih admin dari komputernya sendiri
  //                  lewat <input type="file">.
  //
  // restoreConfirmTarget menampung AKSI YANG SEDANG MENUNGGU
  // KONFIRMASI (bukan langsung dieksekusi begitu tombol diklik) —
  // restore MENIMPA SELURUH DATABASE aktif, jadi selalu lewat modal
  // konfirmasi dulu, baru benar-benar dipanggil ke API kalau admin
  // menekan tombol konfirmasi di dalam modal itu.
  // ======================================================

  const [selectedUploadFile, setSelectedUploadFile] = useState(null);

  const [restoreConfirmTarget, setRestoreConfirmTarget] = useState(null);
  // { source: "existing", filename } atau { source: "upload", file }

  const [restoringFilename, setRestoringFilename] = useState("");
  const [restoringUpload, setRestoringUpload] = useState(false);

  const [restoreActionError, setRestoreActionError] = useState("");
  const [restoreActionSuccess, setRestoreActionSuccess] = useState("");


  useEffect(() => {
    loadProviders();
    loadSecretKeyStatus();
    // Dimuat di awal (bukan cuma saat tab "Jaringan" diklik) supaya
    // kita tahu APP_MODE lebih dulu, untuk memutuskan apakah tab
    // "Jaringan" perlu ditampilkan sama sekali (disembunyikan kalau
    // mode "production" — IP LAN tidak relevan di server cloud).
    loadNetworkInfo();
    // Sama seperti di atas: dimuat di awal (bukan cuma saat tab
    // "Backup" diklik) supaya kita tahu database.is_sqlite lebih
    // dulu, untuk memutuskan apakah tab "Backup" perlu ditampilkan.
    loadSystemStatus();
  }, []);


  async function loadSystemStatus() {
    try {
      const data = await getSystemStatus();
      setSystemStatus(data);
    } catch (err) {
      console.error("GET SYSTEM STATUS ERROR:", err);
      // Sengaja tidak set error state terpisah — kegagalan di sini
      // cuma berarti tab "Backup" tetap ditampilkan apa adanya
      // (fallback aman di visibleTabs di bawah), bukan bug fatal.
    }
  }


  useEffect(() => {
    if (activeTab === "network") {
      loadNetworkInfo();
    }

    if (activeTab === "backup") {
      loadBackups();
    }
  }, [activeTab]);


  async function loadBackups() {
    setBackupsLoading(true);
    setBackupsError("");

    try {
      const data = await getBackups();
      setBackups(data.backups || []);
      setRetentionDays(data.retention_days);
    } catch (err) {
      console.error("GET BACKUPS ERROR:", err);
      setBackupsError(err.message || "Gagal memuat daftar backup");
    } finally {
      setBackupsLoading(false);
    }
  }


  async function handleCreateBackupNow() {
    setBackupActionError("");
    setBackupActionSuccess("");

    try {
      setCreatingBackup(true);

      const data = await createBackupNow();

      setBackupActionSuccess(data.message);

      // Muat ulang daftar supaya backup baru langsung muncul di
      // tabel, tanpa admin perlu pindah tab lalu balik lagi.
      await loadBackups();
    } catch (err) {
      console.error("CREATE BACKUP ERROR:", err);
      setBackupActionError(err.message || "Gagal membuat backup");
    } finally {
      setCreatingBackup(false);
    }
  }


  async function handleDownloadBackup(filename) {
    setBackupActionError("");

    try {
      setDownloadingFilename(filename);
      await downloadBackup(filename);
    } catch (err) {
      console.error("DOWNLOAD BACKUP ERROR:", err);
      setBackupActionError(err.message || "Gagal mengunduh backup");
    } finally {
      setDownloadingFilename("");
    }
  }


  function handleSelectUploadFile(e) {
    const file = e.target.files?.[0] || null;
    setSelectedUploadFile(file);
    setRestoreActionError("");
    setRestoreActionSuccess("");
  }


  // Dipanggil dari tombol "Restore" di tiap baris daftar backup —
  // BELUM langsung restore, cuma membuka modal konfirmasi.
  function requestRestoreFromExisting(filename) {
    setRestoreActionError("");
    setRestoreActionSuccess("");
    setRestoreConfirmTarget({ source: "existing", filename });
  }


  // Dipanggil dari tombol "Import File Ini" di bagian upload —
  // sama, cuma membuka modal konfirmasi dulu.
  function requestRestoreFromUpload() {
    if (!selectedUploadFile) return;

    setRestoreActionError("");
    setRestoreActionSuccess("");
    setRestoreConfirmTarget({ source: "upload", file: selectedUploadFile });
  }


  function cancelRestoreConfirm() {
    setRestoreConfirmTarget(null);
  }


  // Benar-benar menjalankan restore — HANYA dipanggil dari tombol
  // konfirmasi di dalam modal, setelah admin membaca peringatannya.
  async function confirmRestore() {
    if (!restoreConfirmTarget) return;

    setRestoreActionError("");
    setRestoreActionSuccess("");

    try {
      let data;

      if (restoreConfirmTarget.source === "existing") {
        setRestoringFilename(restoreConfirmTarget.filename);
        data = await restoreFromExistingBackup(restoreConfirmTarget.filename);
      } else {
        setRestoringUpload(true);
        data = await restoreFromUpload(restoreConfirmTarget.file);
      }

      setRestoreActionSuccess(
        `${data.message} (Backup pengaman dari kondisi sebelum restore: ${data.safety_backup_filename})`
      );

      setSelectedUploadFile(null);

      // Muat ulang daftar backup — restore barusan otomatis membuat
      // 1 backup pengaman baru, jadi daftar perlu di-refresh supaya
      // itu langsung terlihat.
      await loadBackups();
    } catch (err) {
      console.error("RESTORE BACKUP ERROR:", err);
      setRestoreActionError(err.message || "Gagal melakukan restore database");
    } finally {
      setRestoringFilename("");
      setRestoringUpload(false);
      setRestoreConfirmTarget(null);
    }
  }


  // Format ukuran file (bytes) jadi satuan yang gampang dibaca
  // (KB/MB) untuk ditampilkan di tabel backup.
  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }


  async function loadNetworkInfo() {
    setNetworkLoading(true);
    setNetworkError("");

    try {
      const data = await getNetworkInfo();
      setNetworkInfo(data);
    } catch (err) {
      console.error("GET NETWORK INFO ERROR:", err);
      setNetworkError(err.message || "Gagal memuat info jaringan");
    } finally {
      setNetworkLoading(false);
    }
  }

  // Tab "Jaringan" disembunyikan sepenuhnya kalau backend berjalan
  // dalam mode "production" (server cloud) — fitur share IP LAN
  // tidak relevan di situ. Selama networkInfo belum termuat, tab
  // tetap ditampilkan dulu (menghindari salah sembunyi sebelum
  // tahu mode-nya).
  //
  // Tab "Backup" disembunyikan sepenuhnya kalau database aktif
  // BUKAN SQLite (mis. Postgres/Neon) — fitur backup ini memang
  // cuma mendukung SQLite (backup_service.py). Untuk Postgres/Neon,
  // backup diserahkan ke fitur bawaan provider-nya (point-in-time
  // restore), bukan ditampilkan di sini sebagai tombol yang error.
  // Sama seperti tab Jaringan: selama systemStatus belum termuat,
  // tab tetap ditampilkan dulu (fallback aman, bukan default salah
  // sembunyi).
  const visibleTabs = TABS.filter((tab) => {
    if (tab.key === "network") {
      return networkInfo?.mode !== "production";
    }
    if (tab.key === "backup") {
      return systemStatus?.database?.is_sqlite !== false;
    }
    return true;
  });

  // Kalau tab "Jaringan"/"Backup" sedang aktif tapi ternyata sudah
  // seharusnya disembunyikan (misal admin sempat klik sebelum data
  // termuat), otomatis pindah ke tab Profil supaya tidak terjebak
  // di tab yang sudah disembunyikan.
  useEffect(() => {
    if (activeTab === "network" && networkInfo?.mode === "production") {
      setActiveTab("profile");
    }
    if (activeTab === "backup" && systemStatus?.database?.is_sqlite === false) {
      setActiveTab("profile");
    }
  }, [activeTab, networkInfo, systemStatus]);



  async function loadSecretKeyStatus() {
    setSecretKeyLoading(true);
    setSecretKeyError("");

    try {
      const data = await getSecretKeyStatus();
      setSecretKeyStatus(data);
    } catch (err) {
      console.error("GET SECRET KEY STATUS ERROR:", err);
      setSecretKeyError(err.message || "Gagal memuat status SECRET_KEY");
    } finally {
      setSecretKeyLoading(false);
    }
  }


  // Dipanggil setelah "Simpan"/"Rotasi" berhasil — backend sudah
  // mengganti key, jadi token yang sedang dipakai browser ini
  // pasti sudah tidak valid untuk request berikutnya. Logout
  // sendiri di sini lebih ramah daripada membiarkan user mengklik
  // sesuatu lalu tiba-tiba "terlempar" oleh error 401.
  function forceLogoutAfterSecretKeyChange(message) {
    logout();
    navigate("/login", {
      replace: true,
      state: { message },
    });
  }


  async function handleSaveSecretKey() {
    setSecretKeyError("");

    const value = secretKeyDraft.trim();

    if (value.length < 32) {
      setSecretKeyError("SECRET_KEY minimal 32 karakter demi keamanan.");
      return;
    }

    try {
      setSavingSecretKey(true);

      const data = await updateSecretKey(value);

      forceLogoutAfterSecretKeyChange(
        data.message ||
          "SECRET_KEY berhasil disimpan. Silakan login kembali."
      );
    } catch (err) {
      console.error("UPDATE SECRET KEY ERROR:", err);
      setSecretKeyError(err.message || "Gagal menyimpan SECRET_KEY");
      setSavingSecretKey(false);
      setSecretKeyConfirm(null);
    }
  }


  async function handleRotateSecretKey() {
    setSecretKeyError("");

    try {
      setRotatingSecretKey(true);

      const data = await rotateSecretKey();

      forceLogoutAfterSecretKeyChange(
        data.message ||
          "SECRET_KEY berhasil dirotasi. Silakan login kembali."
      );
    } catch (err) {
      console.error("ROTATE SECRET KEY ERROR:", err);
      setSecretKeyError(err.message || "Gagal merotasi SECRET_KEY");
      setRotatingSecretKey(false);
      setSecretKeyConfirm(null);
    }
  }


  async function loadProviders() {
    setProviderLoading(true);
    setProviderError("");

    try {
      const data = await getAIProviders();

      setProviders(data);
      setProviderChoice(data.active_provider);

      const drafts = {};
      for (const p of data.providers) {
        drafts[p.provider] = {
          apiKey: "",
          model: p.model || "",
          // Alamat EFEKTIF yang sedang dipakai (override admin kalau
          // ada, atau default bawaan) — bukan dikosongkan seperti
          // apiKey, supaya admin langsung lihat & bisa edit nilainya.
          baseUrl: p.base_url || p.default_base_url || "",
        };
      }
      setConfigDrafts(drafts);
    } catch (err) {
      console.error("GET AI PROVIDERS ERROR:", err);
      setProviderError(err.message || "Gagal memuat status provider AI");
    } finally {
      setProviderLoading(false);
    }
  }


  async function handleSaveProvider() {
    setProviderError("");
    setProviderSuccess("");

    try {
      setProviderSaving(true);

      const data = await updateActiveProvider(providerChoice);

      setProviders(data);
      setProviderChoice(data.active_provider);

      const activeLabel =
        data.providers.find((p) => p.provider === data.active_provider)?.label ||
        data.active_provider;

      setProviderSuccess(`Provider AI aktif sekarang: ${activeLabel}.`);
    } catch (err) {
      console.error("UPDATE AI PROVIDER ERROR:", err);
      setProviderError(err.message || "Gagal mengganti provider AI aktif");
    } finally {
      setProviderSaving(false);
    }
  }


  function updateDraft(providerKey, field, value) {
    setConfigDrafts((prev) => ({
      ...prev,
      [providerKey]: { ...prev[providerKey], [field]: value },
    }));
  }


  async function handleSaveProviderConfig(providerKey) {
    setConfigError((prev) => ({ ...prev, [providerKey]: "" }));
    setConfigSuccess((prev) => ({ ...prev, [providerKey]: "" }));

    const providerOption = (providers?.providers || []).find(
      (p) => p.provider === providerKey
    );

    const draft = configDrafts[providerKey] || {};
    const trimmedKey = (draft.apiKey || "").trim();
    const trimmedModel = (draft.model || "").trim();
    const trimmedBaseUrl = (draft.baseUrl || "").trim();
    const supportsBaseUrl = !!providerOption?.configurable_base_url;

    if (!trimmedModel) {
      setConfigError((prev) => ({
        ...prev,
        [providerKey]: "Nama model wajib diisi",
      }));
      return;
    }

    if (supportsBaseUrl && !trimmedBaseUrl) {
      setConfigError((prev) => ({
        ...prev,
        [providerKey]: "Alamat server wajib diisi (atau tekan \"Kembalikan ke Default\")",
      }));
      return;
    }

    try {
      setConfigSaving((prev) => ({ ...prev, [providerKey]: true }));

      // Kalau input key dikosongkan, jangan kirim api_key sama
      // sekali (undefined) supaya key lama yang sudah tersimpan
      // di database tidak ikut terhapus hanya karena admin cuma
      // mau ganti nama model. baseUrl cuma dikirim untuk provider
      // yang memang mendukungnya (mis. Ollama).
      const data = await updateProviderConfig(providerKey, {
        apiKey: trimmedKey ? trimmedKey : undefined,
        model: trimmedModel,
        baseUrl: supportsBaseUrl ? trimmedBaseUrl : undefined,
      });

      setProviders(data);

      const updated = data.providers.find((p) => p.provider === providerKey);

      setConfigDrafts((prev) => ({
        ...prev,
        [providerKey]: {
          apiKey: "",
          model: updated?.model || trimmedModel,
          baseUrl: updated?.base_url || updated?.default_base_url || trimmedBaseUrl,
        },
      }));

      setConfigSuccess((prev) => ({
        ...prev,
        [providerKey]: trimmedKey
          ? "API key & model berhasil disimpan."
          : "Pengaturan berhasil diperbarui.",
      }));
    } catch (err) {
      console.error("UPDATE PROVIDER CONFIG ERROR:", err);
      setConfigError((prev) => ({
        ...prev,
        [providerKey]: err.message || "Gagal menyimpan pengaturan",
      }));
    } finally {
      setConfigSaving((prev) => ({ ...prev, [providerKey]: false }));
    }
  }


  async function handleClearProviderConfig(providerKey) {
    setConfigError((prev) => ({ ...prev, [providerKey]: "" }));
    setConfigSuccess((prev) => ({ ...prev, [providerKey]: "" }));

    try {
      setConfigSaving((prev) => ({ ...prev, [providerKey]: true }));

      const data = await clearProviderConfig(providerKey);

      setProviders(data);
      setProviderChoice(data.active_provider);

      const updated = data.providers.find((p) => p.provider === providerKey);

      setConfigDrafts((prev) => ({
        ...prev,
        [providerKey]: { apiKey: "", model: updated?.model || "" },
      }));

      setConfigSuccess((prev) => ({
        ...prev,
        [providerKey]: "API key telah dihapus.",
      }));
    } catch (err) {
      console.error("CLEAR PROVIDER CONFIG ERROR:", err);
      setConfigError((prev) => ({
        ...prev,
        [providerKey]: err.message || "Gagal menghapus API key",
      }));
    } finally {
      setConfigSaving((prev) => ({ ...prev, [providerKey]: false }));
    }
  }


  // Kembalikan alamat server (base URL) provider ke default bawaan
  // (mesin sendiri, mis. http://localhost:11434) — mengirim base_url
  // kosong secara eksplisit supaya backend menghapus override yang
  // tersimpan, BUKAN cuma mengosongkan input di layar.
  async function handleResetBaseUrl(providerKey) {
    setConfigError((prev) => ({ ...prev, [providerKey]: "" }));
    setConfigSuccess((prev) => ({ ...prev, [providerKey]: "" }));

    try {
      setConfigSaving((prev) => ({ ...prev, [providerKey]: true }));

      const data = await updateProviderConfig(providerKey, { baseUrl: "" });

      setProviders(data);

      const updated = data.providers.find((p) => p.provider === providerKey);

      setConfigDrafts((prev) => ({
        ...prev,
        [providerKey]: {
          ...prev[providerKey],
          baseUrl: updated?.base_url || updated?.default_base_url || "",
        },
      }));

      setConfigSuccess((prev) => ({
        ...prev,
        [providerKey]: `Alamat server dikembalikan ke default (${updated?.default_base_url || "mesin sendiri"}).`,
      }));
    } catch (err) {
      console.error("RESET BASE URL ERROR:", err);
      setConfigError((prev) => ({
        ...prev,
        [providerKey]: err.message || "Gagal mengembalikan alamat default",
      }));
    } finally {
      setConfigSaving((prev) => ({ ...prev, [providerKey]: false }));
    }
  }


  return (
    <>
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Pengaturan</h1>
          <p>Kelola profil, keamanan akun, dan konfigurasi sistem</p>
        </div>
      </div>

      {/* TAB SWITCHER */}

      <div className="settings-tabs" role="tablist">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`settings-tab${isActive ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============================================= */}
      {/* TAB: PROFIL SAYA                                */}
      {/* ============================================= */}

      {activeTab === "profile" && <ProfileTab />}

      {/* ============================================= */}
      {/* TAB: AI — GENERIK, MENGIKUTI DAFTAR PROVIDER    */}
      {/* DARI BACKEND (backend/ai_providers.py). NAMBAH  */}
      {/* PROVIDER BARU DI BACKEND OTOMATIS MUNCUL DI SINI */}
      {/* TANPA UBAH KOMPONEN INI.                         */}
      {/* ============================================= */}

      {activeTab === "ai-model" && (
        <div className="settings-grid">

          {/* ============================================= */}
          {/* KARTU: PROVIDER AI AKTIF                       */}
          {/* ============================================= */}

          <div className="dashboard-card settings-card settings-span-all">
            <h2>Provider AI Aktif</h2>
            <p className="settings-desc">
              Pilih AI mana yang dipakai fitur "Generate Soal AI" di Bank Soal.
              Guru hanya memakai satu provider yang aktif di sini.
            </p>

            {providerLoading ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>Memuat status provider...</p>
            ) : (
              <>
                {providerError && (
                  <div className="error-message" style={{ marginBottom: 18 }}>
                    {providerError}
                  </div>
                )}

                {providerSuccess && (
                  <div
                    className="alert-success"
                    style={{
                      backgroundColor: "#d4edda",
                      color: "#155724",
                      padding: "10px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      marginBottom: "18px",
                    }}
                  >
                    {providerSuccess}
                  </div>
                )}

                <div className="settings-options">

                  {(providers?.providers || []).map((option) => {
                    const isChecked = providerChoice === option.provider;

                    return (
                      <label
                        key={option.provider}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          border: isChecked ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                          borderRadius: 8,
                          padding: "12px 14px",
                          cursor: "pointer",
                          background: isChecked ? "rgba(var(--accent-rgb), 0.06)" : "transparent",
                        }}
                      >
                        <input
                          type="radio"
                          name="ai-provider-choice"
                          value={option.provider}
                          checked={isChecked}
                          onChange={() => setProviderChoice(option.provider)}
                        />

                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {option.label}
                            {providers?.active_provider === option.provider && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "var(--accent)",
                                }}
                              >
                                &middot; SEDANG AKTIF
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                            Model: <code>{option.model || "-"}</code>
                          </div>

                          {option.detail && (
                            <div style={{ fontSize: 12, color: "#856404", marginTop: 2 }}>
                              {option.detail}
                            </div>
                          )}
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 9px",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                            backgroundColor: option.online ? "#d4edda" : "#f8d7da",
                            color: option.online ? "#155724" : "#721c24",
                          }}
                        >
                          {option.online ? "Online" : "Offline"}
                        </span>
                      </label>
                    );
                  })}

                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    disabled={providerSaving || providerChoice === providers?.active_provider}
                    onClick={handleSaveProvider}
                  >
                    {providerSaving ? "Menyimpan..." : "Jadikan Provider Aktif"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ============================================= */}
          {/* KARTU KONFIGURASI — SATU KARTU PER PROVIDER    */}
          {/* (di-render dari list, bukan hardcode per nama)  */}
          {/* ============================================= */}

          {!providerLoading && (providers?.providers || []).map((option) => {
            const draft = configDrafts[option.provider] || { apiKey: "", model: "", baseUrl: "" };
            const isSaving = !!configSaving[option.provider];
            const errMsg = configError[option.provider];
            const okMsg = configSuccess[option.provider];

            return (
              <div key={option.provider} className="dashboard-card settings-card">
                <h2>
                  Konfigurasi {option.label}
                </h2>

                <p className="settings-desc">
                  {option.requires_api_key
                    ? "API key disimpan di database, bukan di file .env — bisa diganti kapan saja dari sini tanpa perlu akses server."
                    : "Provider ini berjalan lokal dan tidak memerlukan API key. Cukup atur nama model yang dipakai."}
                </p>

                {errMsg && (
                  <div className="error-message" style={{ marginBottom: 18 }}>
                    {errMsg}
                  </div>
                )}

                {okMsg && (
                  <div
                    className="alert-success"
                    style={{
                      backgroundColor: "#d4edda",
                      color: "#155724",
                      padding: "10px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      marginBottom: "18px",
                    }}
                  >
                    {okMsg}
                  </div>
                )}

                {!option.online && option.detail && (
                  <div
                    style={{
                      backgroundColor: "#fff3cd",
                      color: "#856404",
                      padding: "10px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      marginBottom: "18px",
                    }}
                  >
                    {option.detail}
                  </div>
                )}

                {option.requires_api_key && (
                  <div className="form-group" style={{ marginBottom: 18 }}>
                    <label>API Key</label>

                    <input
                      type="password"
                      value={draft.apiKey}
                      onChange={(e) => updateDraft(option.provider, "apiKey", e.target.value)}
                      placeholder={
                        option.masked_key
                          ? `Tersimpan: ${option.masked_key} (isi untuk mengganti)`
                          : "Tempel API key di sini"
                      }
                      autoComplete="off"
                    />

                    <small style={{ color: "#6b7280" }}>
                      {option.configured
                        ? "Sudah ada key tersimpan. Kosongkan kalau cuma mau ganti model, jangan ganti key."
                        : "Belum ada API key tersimpan."}
                    </small>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label>Model</label>

                  <input
                    type="text"
                    value={draft.model}
                    onChange={(e) => updateDraft(option.provider, "model", e.target.value)}
                    placeholder="mis. nama-model"
                  />
                </div>

                {option.configurable_base_url && (
                  <div className="form-group" style={{ marginBottom: 18 }}>
                    <label>Alamat Server (Base URL)</label>

                    <input
                      type="text"
                      value={draft.baseUrl}
                      onChange={(e) => updateDraft(option.provider, "baseUrl", e.target.value)}
                      placeholder={option.default_base_url || "http://localhost:11434"}
                      autoComplete="off"
                    />

                    <small style={{ color: "#6b7280" }}>
                      Kosongkan lalu klik "Kembalikan ke Default" untuk
                      pakai mesin sendiri ({option.default_base_url || "http://localhost:11434"}).
                      Untuk production, isi manual dengan alamat server
                      tempat Ollama benar-benar berjalan, mis.{" "}
                      <code>http://ollama:11434</code> (service Docker
                      Compose) atau <code>http://10.0.0.5:11434</code>{" "}
                      (server terpisah di jaringan).
                    </small>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  {option.configurable_base_url && (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isSaving}
                      onClick={() => handleResetBaseUrl(option.provider)}
                    >
                      Kembalikan ke Default
                    </button>
                  )}

                  {option.requires_api_key && option.configured && (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isSaving}
                      onClick={() => handleClearProviderConfig(option.provider)}
                    >
                      Hapus API Key
                    </button>
                  )}

                  <button
                    type="button"
                    className="primary-button"
                    disabled={isSaving}
                    onClick={() => handleSaveProviderConfig(option.provider)}
                  >
                    {isSaving ? "Menyimpan..." : `Simpan ${option.label}`}
                  </button>
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* ============================================= */}
      {/* TAB: KEAMANAN — SECRET_KEY (JWT)               */}
      {/* ============================================= */}

      {activeTab === "security" && (
        <div className="dashboard-card settings-card">
          <h2>
            <IconShield size={18} />
            SECRET_KEY
          </h2>

          <p className="settings-desc">
            Kunci rahasia untuk menandatangani sesi login (JWT) seluruh
            aplikasi. Tersimpan di database — tidak perlu edit file .env
            atau restart server untuk menggantinya.
          </p>

          <div
            style={{
              backgroundColor: "#fff3cd",
              color: "#856404",
              padding: "10px 12px",
              borderRadius: "6px",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            ⚠️ Menyimpan atau merotasi SECRET_KEY langsung membuat{" "}
            <strong>semua sesi login yang sedang aktif tidak valid</strong>{" "}
            — termasuk sesi Anda sendiri (Anda akan diminta login ulang),
            guru, dan siswa yang mungkin sedang mengerjakan tryout.
            Sebaiknya lakukan di luar jam ujian.
          </div>

          {secretKeyError && (
            <div className="error-message" style={{ marginBottom: 18 }}>
              {secretKeyError}
            </div>
          )}

          {secretKeyLoading ? (
            <p style={{ color: "#6b7280", fontSize: 13 }}>Memuat status...</p>
          ) : (
            <>
              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  <strong>Key saat ini:</strong>{" "}
                  <code>{secretKeyStatus?.masked_key || "-"}</code>
                </div>

                {secretKeyStatus?.updated_at && (
                  <div style={{ color: "#6b7280" }}>
                    Terakhir diganti:{" "}
                    {new Date(secretKeyStatus.updated_at).toLocaleString("id-ID")}
                    {secretKeyStatus?.changed_by
                      ? ` oleh @${secretKeyStatus.changed_by}`
                      : ""}
                  </div>
                )}
              </div>

              <div className="settings-cols">

              {/* ROTASI OTOMATIS */}

              <div className="settings-block">
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>
                  Rotasi Otomatis
                </label>
                <p style={{ marginTop: 0, marginBottom: 12, color: "#6b7280", fontSize: 13 }}>
                  Generate key acak baru secara otomatis — cara yang
                  direkomendasikan untuk rotasi rutin, tidak perlu
                  mengetik apa pun.
                </p>

                {secretKeyConfirm === "rotate" ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#721c24" }}>
                      Yakin? Semua orang akan ter-logout.
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={rotatingSecretKey}
                      onClick={() => setSecretKeyConfirm(null)}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={rotatingSecretKey}
                      onClick={handleRotateSecretKey}
                    >
                      {rotatingSecretKey ? "Merotasi..." : "Ya, Rotasi Sekarang"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={rotatingSecretKey}
                    onClick={() => setSecretKeyConfirm("rotate")}
                  >
                    <IconRefresh size={15} />
                    Rotasi Otomatis
                  </button>
                )}
              </div>

              {/* ISI MANUAL */}

              <div className="settings-block">
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>
                  Isi Manual
                </label>
                <p style={{ marginTop: 0, marginBottom: 12, color: "#6b7280", fontSize: 13 }}>
                  Tempel SECRET_KEY Anda sendiri (mis. untuk menyamakan
                  dengan environment lain). Minimal 32 karakter.
                </p>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <input
                    type="password"
                    value={secretKeyDraft}
                    onChange={(e) => setSecretKeyDraft(e.target.value)}
                    placeholder="Tempel SECRET_KEY baru di sini"
                    autoComplete="off"
                  />
                </div>

                {secretKeyConfirm === "save" ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#721c24" }}>
                      Yakin? Semua orang akan ter-logout.
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={savingSecretKey}
                      onClick={() => setSecretKeyConfirm(null)}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={savingSecretKey}
                      onClick={handleSaveSecretKey}
                    >
                      {savingSecretKey ? "Menyimpan..." : "Ya, Simpan Sekarang"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={savingSecretKey || secretKeyDraft.trim().length < 32}
                      onClick={() => setSecretKeyConfirm("save")}
                    >
                      Simpan
                    </button>
                  </div>
                )}
              </div>

              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================= */}
      {/* TAB: BACKUP — BACKUP DATABASE SQLITE           */}
      {/* ============================================= */}

      {activeTab === "backup" && (
        <div className="dashboard-card settings-card">
          <h2>
            <IconClipboard size={18} />
            Backup Database
          </h2>

          <p className="settings-desc">
            Backup otomatis berjalan sendiri tiap 24 jam di server.
            Gunakan tombol di bawah untuk membuat backup tambahan
            kapan saja — misalnya sebelum mengganti SECRET_KEY atau
            menghapus data dalam jumlah besar.
            {retentionDays != null && (
              <> Backup lebih tua dari {retentionDays} hari otomatis dihapus.</>
            )}
          </p>

          {backupActionError && (
            <div className="error-message" style={{ marginBottom: 18 }}>
              {backupActionError}
            </div>
          )}

          {backupActionSuccess && (
            <div
              className="alert-success"
              style={{
                backgroundColor: "#d4edda",
                color: "#155724",
                padding: "10px",
                borderRadius: "6px",
                fontSize: "13px",
                marginBottom: "18px",
              }}
            >
              {backupActionSuccess}
            </div>
          )}

          <div className="settings-cols is-wide-left">

          {/* KIRI: daftar backup */}

          <div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Daftar Backup</h3>

            <button
              type="button"
              className="primary-button"
              disabled={creatingBackup}
              onClick={handleCreateBackupNow}
            >
              {creatingBackup ? "Membuat Backup..." : "Backup Sekarang"}
            </button>
          </div>

          {backupsError && (
            <div className="error-message" style={{ marginBottom: 18 }}>
              {backupsError}
            </div>
          )}

          {backupsLoading ? (
            <p style={{ color: "#6b7280", fontSize: 13 }}>Memuat daftar backup...</p>
          ) : backups.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 13 }}>
              Belum ada backup. Klik "Backup Sekarang" di atas, atau
              tunggu jadwal otomatis berikutnya.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto", paddingRight: 2 }}>
              {backups.map((backup) => (
                <div
                  key={backup.filename}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {backup.filename}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {new Date(backup.created_at).toLocaleString("id-ID")}
                      {" · "}
                      {formatBytes(backup.size_bytes)}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={downloadingFilename === backup.filename}
                    onClick={() => handleDownloadBackup(backup.filename)}
                  >
                    {downloadingFilename === backup.filename
                      ? "Mengunduh..."
                      : "Download"}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    style={{ color: "#b45309", borderColor: "#fbbf24" }}
                    disabled={restoringFilename === backup.filename}
                    onClick={() => requestRestoreFromExisting(backup.filename)}
                  >
                    {restoringFilename === backup.filename
                      ? "Me-restore..."
                      : "Restore"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ===================================== */}
          {/* IMPORT DARI FILE LOKAL                 */}
          {/* ===================================== */}

          </div>

          {/* KANAN: import dari file lokal */}

          <div className="settings-block">
            <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 15 }}>
              Import Database dari File Lokal
            </h3>

            <p style={{ marginTop: 0, marginBottom: 14, color: "#6b7280", fontSize: 13 }}>
              Upload file backup (.db/.sqlite/.sqlite3) dari komputer Anda
              sendiri — misalnya backup lama yang pernah di-download, atau
              dipindah dari server lain. File yang diupload akan
              MENGGANTIKAN seluruh database yang sedang aktif.
            </p>

            {restoreActionError && (
              <div className="error-message" style={{ marginBottom: 14 }}>
                {restoreActionError}
              </div>
            )}

            {restoreActionSuccess && (
              <div
                className="alert-success"
                style={{
                  backgroundColor: "#d4edda",
                  color: "#155724",
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  marginBottom: "14px",
                }}
              >
                {restoreActionSuccess}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <input
                type="file"
                accept=".db,.sqlite,.sqlite3"
                onChange={handleSelectUploadFile}
                style={{ fontSize: 13 }}
              />

              <button
                type="button"
                className="primary-button"
                disabled={!selectedUploadFile || restoringUpload}
                onClick={requestRestoreFromUpload}
              >
                {restoringUpload ? "Me-restore..." : "Import File Ini"}
              </button>
            </div>
          </div>

          </div>
        </div>
      )}

      {/* ===================================== */}
      {/* MODAL KONFIRMASI RESTORE DATABASE      */}
      {/* ===================================== */}

      {restoreConfirmTarget && (
        <div className="modal-overlay" onClick={cancelRestoreConfirm}>
          <div
            className="modal"
            style={{ width: "480px", maxWidth: "92vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Konfirmasi Restore Database</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={cancelRestoreConfirm}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "4px 22px 22px" }}>
              <p style={{ fontSize: 13, marginTop: 0 }}>
                Anda akan me-restore database dari{" "}
                <strong>
                  {restoreConfirmTarget.source === "existing"
                    ? restoreConfirmTarget.filename
                    : restoreConfirmTarget.file.name}
                </strong>
                .
              </p>

              <p style={{ fontSize: 13, color: "#b45309" }}>
                Tindakan ini akan MENGGANTIKAN seluruh data yang sedang
                aktif sekarang (semua user, soal, dan hasil tryout) dengan
                isi file ini. Database saat ini akan otomatis di-backup
                dulu sebelum ditimpa, jadi masih bisa dikembalikan lewat
                Restore sekali lagi kalau ternyata salah pilih file — tapi
                perubahan APA PUN yang terjadi SETELAH backup pengaman itu
                tetap akan hilang.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cancelRestoreConfirm}
                  disabled={restoringUpload || !!restoringFilename}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="primary-button"
                  style={{ backgroundColor: "#b45309" }}
                  onClick={confirmRestore}
                  disabled={restoringUpload || !!restoringFilename}
                >
                  {restoringUpload || restoringFilename
                    ? "Me-restore..."
                    : "Ya, Timpa Database Sekarang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* TAB: JARINGAN — AKSES DARI LAPTOP LAIN (WIFI)  */}
      {/* ============================================= */}

      {activeTab === "network" && (
        <NetworkTab
          networkInfo={networkInfo}
          networkLoading={networkLoading}
          networkError={networkError}
        />
      )}
    </>
  );
}

export default AdminSettings;
