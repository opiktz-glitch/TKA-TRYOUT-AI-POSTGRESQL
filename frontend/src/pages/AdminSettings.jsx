



import { useAdminSettings } from "../hooks/useAdminSettings";

import ProfileTab from "../components/settings/ProfileTab";
import NetworkTab from "../components/settings/NetworkTab";
import AiModelTab from "../components/settings/AiModelTab";
import SecurityTab from "../components/settings/SecurityTab";
import PostgresBackupTab from "../components/settings/PostgresBackupTab";

import "../components/settings/settings.css";








function AdminSettings() {
  const settingsData = useAdminSettings();
    const {
    activeTab, visibleTabs, setActiveTab,
    networkInfo, networkLoading, networkError, backupEnabled, backupStatusError
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

      {backupStatusError && (
        <div className="error-message" style={{ marginBottom: 16 }}>
          {backupStatusError}
        </div>
      )}

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

      {activeTab === "backup" && backupEnabled && <PostgresBackupTab />}


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
