import { IconClipboard } from "../Icons";

export default function BackupTab({ data }) {
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
    setSecretKeyDraft,
    setSecretKeyError,
    setSecretKeyLoading,
    setSecretKeyStatus,
    setSelectedUploadFile,
    setSystemStatus,
    systemStatus,
    updateDraft,
    visibleTabs
  } = data;





  return (
    <>
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
    </>
  );
}
