// Forced Vite Reload - 2026-09-25T14:34:00+07:00
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getSystemStatus, getBackups, getSecretKeyStatus, getNetworkInfo, getAIProviders,
  updateSecretKey, rotateSecretKey, updateActiveProvider, updateProviderConfig, clearProviderConfig,
  createBackupNow, downloadBackup, restoreFromExistingBackup, restoreFromUpload
} from "../services/api";


const TABS = [
  { key: "profile", label: "Profil Saya" },
  { key: "ai-model", label: "AI" },
  { key: "security", label: "Keamanan" },
  { key: "backup", label: "Backup" },
  { key: "network", label: "Jaringan" },
];

export function useAdminSettings() {

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
          // Cuma relevan untuk provider yang punya konsep "model
          // vision terpisah" (saat ini: Ollama) — lihat vision_model
          // di ProviderStatus (backend/schemas.py).
          visionModel: p.vision_model || "",
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
    const trimmedVisionModel = (draft.visionModel || "").trim();
    const trimmedBaseUrl = (draft.baseUrl || "").trim();
    const supportsBaseUrl = !!providerOption?.configurable_base_url;
    // vision_model bernilai null (bukan "") untuk provider yang TIDAK
    // punya konsep model vision terpisah (mis. Gemini, karena model
    // teksnya sendiri sudah bisa baca gambar) — beda dari Ollama yang
    // selalu string (walau boleh kosong "" kalau belum diisi admin).
    const supportsVisionModel = providerOption?.vision_model != null;

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
        visionModel: supportsVisionModel ? trimmedVisionModel : undefined,
        baseUrl: supportsBaseUrl ? trimmedBaseUrl : undefined,
      });

      setProviders(data);

      const updated = data.providers.find((p) => p.provider === providerKey);

      setConfigDrafts((prev) => ({
        ...prev,
        [providerKey]: {
          apiKey: "",
          model: updated?.model || trimmedModel,
          visionModel: updated?.vision_model || trimmedVisionModel,
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
        [providerKey]: {
          apiKey: "",
          model: updated?.model || "",
          visionModel: updated?.vision_model || "",
        },
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

          return {
    activeTab,
    backupActionError,
    backupActionSuccess,
    backups,
    backupsError,
    backupsLoading,
    cancelRestoreConfirm,
    configDrafts,
    configError,
    configSaving,
    configSuccess,
    confirmRestore,
    creatingBackup,
    downloadingFilename,
    forceLogoutAfterSecretKeyChange,
    formatBytes,
    handleClearProviderConfig,
    handleCreateBackupNow,
    handleDownloadBackup,
    handleResetBaseUrl,
    handleRotateSecretKey,
    handleSaveProvider,
    handleSaveProviderConfig,
    handleSaveSecretKey,
    handleSelectUploadFile,
    loadBackups,
    loadNetworkInfo,
    loadProviders,
    loadSecretKeyStatus,
    loadSystemStatus,
    navigate,
    networkError,
    networkInfo,
    networkLoading,
    providerChoice,
    providerError,
    providerLoading,
    providerSaving,
    providerSuccess,
    providers,
    requestRestoreFromExisting,
    requestRestoreFromUpload,
    restoreActionError,
    restoreActionSuccess,
    restoreConfirmTarget,
    restoringFilename,
    restoringUpload,
    retentionDays,
    rotatingSecretKey,
    savingSecretKey,
    secretKeyConfirm,
    secretKeyDraft,
    secretKeyError,
    secretKeyLoading,
    secretKeyStatus,
    selectedUploadFile,
    setActiveTab,
    setBackupActionError,
    setBackupActionSuccess,
    setBackups,
    setBackupsError,
    setBackupsLoading,
    setConfigDrafts,
    setConfigError,
    setConfigSaving,
    setConfigSuccess,
    setCreatingBackup,
    setDownloadingFilename,
    setNetworkError,
    setNetworkInfo,
    setNetworkLoading,
    setProviderChoice,
    setProviderError,
    setProviderLoading,
    setProviderSaving,
    setProviderSuccess,
    setProviders,
    setRestoreActionError,
    setRestoreActionSuccess,
    setRestoreConfirmTarget,
    setRestoringFilename,
    setRestoringUpload,
    setRetentionDays,
    setRotatingSecretKey,
    setSavingSecretKey,
    setSecretKeyConfirm,
    setSecretKeyDraft,
    setSecretKeyError,
    setSecretKeyLoading,
    setSecretKeyStatus,
    setSelectedUploadFile,
    setSystemStatus,
    systemStatus,
    updateDraft,
    visibleTabs
  };
}
