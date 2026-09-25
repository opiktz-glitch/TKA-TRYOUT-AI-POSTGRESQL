



import { useAdminSettings } from "../hooks/useAdminSettings";

import ProfileTab from "../components/settings/ProfileTab";
import NetworkTab from "../components/settings/NetworkTab";
import AiModelTab from "../components/settings/AiModelTab";
import SecurityTab from "../components/settings/SecurityTab";
import BackupTab from "../components/settings/BackupTab";

import "../components/settings/settings.css";








function AdminSettings() {
  const settingsData = useAdminSettings();
    const {
    activeTab, visibleTabs, setActiveTab,
    restoreConfirmTarget, cancelRestoreConfirm, restoringUpload, restoringFilename, confirmRestore,
    networkInfo, networkLoading, networkError
  } = settingsData;



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

      <div className="settings-tabs-sticky">
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

      {activeTab === "ai-model" && <AiModelTab data={settingsData} />}


      {/* ============================================= */}
      {/* TAB: KEAMANAN — SECRET_KEY (JWT)               */}
      {/* ============================================= */}

      {activeTab === "security" && <SecurityTab data={settingsData} />}


      {/* ============================================= */}
      {/* TAB: BACKUP — BACKUP DATABASE SQLITE           */}
      {/* ============================================= */}

      {activeTab === "backup" && <BackupTab data={settingsData} />}


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
