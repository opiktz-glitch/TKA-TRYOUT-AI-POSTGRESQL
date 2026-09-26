import { IconShield, IconRefresh } from "../Icons";

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
    </>
  );
}
