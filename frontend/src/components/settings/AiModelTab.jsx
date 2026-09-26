
export default function AiModelTab({ data }) {
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
            const draft = configDrafts[option.provider] || {
              apiKey: "",
              model: "",
              visionModel: "",
              baseUrl: "",
            };
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

                  <small style={{ color: "#6b7280" }}>
                    Dipakai untuk generate soal, pembahasan, dan Impor Soal
                    dari Dokumen (teks).
                  </small>
                </div>

                {option.vision_model != null && (
                  <div className="form-group" style={{ marginBottom: 18 }}>
                    <label>Model Vision</label>

                    <input
                      type="text"
                      value={draft.visionModel}
                      onChange={(e) =>
                        updateDraft(option.provider, "visionModel", e.target.value)
                      }
                      placeholder="mis. qwen3vl:8b"
                    />

                    <small style={{ color: "#6b7280" }}>
                      Model TERPISAH khusus untuk fitur "Impor Soal dari
                      Gambar" — harus model vision (bisa membaca gambar),
                      BEDA dari Model di atas yang cuma untuk teks. Kosongkan
                      untuk menonaktifkan fitur impor gambar lewat provider
                      ini. Pastikan modelnya sudah di-pull di server
                      (<code>ollama pull &lt;model&gt;</code>) sebelum diisi
                      di sini.
                    </small>
                  </div>
                )}

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
    </>
  );
}
