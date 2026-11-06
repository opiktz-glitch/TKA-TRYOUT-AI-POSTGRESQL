
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
              <p className="settings-loading">Memuat status provider...</p>
            ) : (
              <>
                {providerError && (
                  <div className="error-message">
                    {providerError}
                  </div>
                )}

                {providerSuccess && (
                  <div className="success-message">
                    {providerSuccess}
                  </div>
                )}

                <div className="settings-options">

                  {(providers?.providers || []).map((option) => {
                    const isChecked = providerChoice === option.provider;

                    return (
                      <label
                        key={option.provider}
                        className={`settings-provider-option${isChecked ? " is-selected" : ""}`}
                      >
                        <input
                          id={`ai-provider-${option.provider}`}
                          type="radio"
                          name="ai-provider-choice"
                          value={option.provider}
                          checked={isChecked}
                          onChange={() => setProviderChoice(option.provider)}
                        />

                        <div className="settings-provider-content">
                          <div className="settings-provider-name">
                            {option.label}
                            {providers?.active_provider === option.provider && (
                              <span className="settings-provider-active">
                                &middot; SEDANG AKTIF
                              </span>
                            )}
                          </div>

                          <div className="settings-provider-model">
                            Model: <code>{option.model || "-"}</code>
                          </div>

                          {option.detail && (
                            <div className="settings-provider-detail">
                              {option.detail}
                            </div>
                          )}
                        </div>

                        <span className={`settings-provider-status${option.online ? " is-online" : " is-offline"}`}>
                          {option.online ? "Online" : "Offline"}
                        </span>
                      </label>
                    );
                  })}

                </div>

                <div className="settings-form-actions">
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
                  <div className="error-message">
                    {errMsg}
                  </div>
                )}

                {okMsg && (
                  <div className="success-message">
                    {okMsg}
                  </div>
                )}

                {!option.online && option.detail && (
                  <div className="settings-notice--warning">
                    {option.detail}
                  </div>
                )}

                {option.requires_api_key && (
                  <div className="form-group">
                    <label htmlFor={`ai-api-key-${option.provider}`}>API Key</label>

                    <input
                      id={`ai-api-key-${option.provider}`}
                      type="password"
                      value={draft.apiKey}
                      onChange={(e) => updateDraft(option.provider, "apiKey", e.target.value)}
                      placeholder={
                        option.masked_key
                          ? `Tersimpan: ${option.masked_key} (isi untuk mengganti)`
                          : "Tempel API key di sini"
                      }
                      autoComplete="off"
                      aria-describedby={`ai-api-key-help-${option.provider}`}
                    />

                    <small className="settings-help-text" id={`ai-api-key-help-${option.provider}`}>
                      {option.configured
                        ? "Sudah ada key tersimpan. Kosongkan kalau cuma mau ganti model, jangan ganti key."
                        : "Belum ada API key tersimpan."}
                    </small>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor={`ai-model-${option.provider}`}>Model</label>

                  <input
                    id={`ai-model-${option.provider}`}
                    type="text"
                    value={draft.model}
                    onChange={(e) => updateDraft(option.provider, "model", e.target.value)}
                    placeholder="mis. nama-model"
                    aria-describedby={`ai-model-help-${option.provider}`}
                  />

                  <small className="settings-help-text" id={`ai-model-help-${option.provider}`}>
                    Dipakai untuk generate soal, pembahasan, dan Impor Soal
                    dari Dokumen (teks).
                  </small>
                </div>

                {option.vision_model != null && (
                  <div className="form-group">
                    <label htmlFor={`ai-vision-model-${option.provider}`}>Model Vision</label>

                    <input
                      id={`ai-vision-model-${option.provider}`}
                      type="text"
                      value={draft.visionModel}
                      onChange={(e) =>
                        updateDraft(option.provider, "visionModel", e.target.value)
                      }
                      placeholder="mis. qwen3vl:8b"
                      aria-describedby={`ai-vision-model-help-${option.provider}`}
                    />

                    <small className="settings-help-text" id={`ai-vision-model-help-${option.provider}`}>
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
                  <div className="form-group">
                    <label htmlFor={`ai-base-url-${option.provider}`}>Alamat Server (Base URL)</label>

                    <input
                      id={`ai-base-url-${option.provider}`}
                      type="text"
                      value={draft.baseUrl}
                      onChange={(e) => updateDraft(option.provider, "baseUrl", e.target.value)}
                      placeholder={option.default_base_url || "http://localhost:11434"}
                      autoComplete="off"
                      aria-describedby={`ai-base-url-help-${option.provider}`}
                    />

                    <small className="settings-help-text" id={`ai-base-url-help-${option.provider}`}>
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

                <div className="settings-form-actions">
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
