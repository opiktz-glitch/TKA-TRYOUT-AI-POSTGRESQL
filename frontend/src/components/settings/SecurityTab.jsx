import { IconShield, IconRefresh } from "../Icons";
import { formatDateTime } from "../../utils/date";

export default function SecurityTab({ data }) {
          const {
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
    setSecretKeyDraft
  } = data;





  return (
    <>
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

          <div className="settings-notice--warning" role="note">
            ⚠️ Menyimpan atau merotasi SECRET_KEY langsung membuat{" "}
            <strong>semua sesi login yang sedang aktif tidak valid</strong>{" "}
            — termasuk sesi Anda sendiri (Anda akan diminta login ulang),
            guru, dan siswa yang mungkin sedang mengerjakan tryout.
            Sebaiknya lakukan di luar jam ujian.
          </div>

          {secretKeyError && (
            <div className="error-message">
              {secretKeyError}
            </div>
          )}

          {secretKeyLoading ? (
            <p className="settings-loading">Memuat status...</p>
          ) : (
            <>
              <div className="settings-secret-key-status">
                <div className="settings-secret-key-value">
                  <strong>Key saat ini:</strong>{" "}
                  <code>{secretKeyStatus?.masked_key || "-"}</code>
                </div>

                {secretKeyStatus?.updated_at && (
                  <div className="settings-muted">
                    Terakhir diganti:{" "}
                    {formatDateTime(secretKeyStatus.updated_at)}
                    {secretKeyStatus?.changed_by
                      ? ` oleh @${secretKeyStatus.changed_by}`
                      : ""}
                  </div>
                )}
              </div>

              <div className="settings-cols">

              {/* ROTASI OTOMATIS */}

              <div className="settings-block">
                <h3 className="settings-block-title">
                  Rotasi Otomatis
                </h3>
                <p className="settings-block-description">
                  Generate key acak baru secara otomatis — cara yang
                  direkomendasikan untuk rotasi rutin, tidak perlu
                  mengetik apa pun.
                </p>

                {secretKeyConfirm === "rotate" ? (
                  <div className="settings-confirm-actions">
                    <span className="settings-confirm-message">
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
                <h3 className="settings-block-title">
                  Isi Manual
                </h3>
                <p className="settings-block-description">
                  Tempel SECRET_KEY Anda sendiri (mis. untuk menyamakan
                  dengan environment lain). Minimal 32 karakter.
                </p>

                <div className="form-group">
                  <label htmlFor="secret-key-draft">SECRET_KEY baru</label>
                  <input
                    id="secret-key-draft"
                    type="password"
                    value={secretKeyDraft}
                    onChange={(e) => setSecretKeyDraft(e.target.value)}
                    placeholder="Tempel SECRET_KEY baru di sini"
                    autoComplete="off"
                  />
                </div>

                {secretKeyConfirm === "save" ? (
                  <div className="settings-confirm-actions">
                    <span className="settings-confirm-message">
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
                  <div className="settings-form-actions">
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
    </>
  );
}
