import os

css_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\settings\settings.css'

with open(css_path, 'r', encoding='utf-8') as f:
    original = f.read()

# Let's replace the tab and card styles.

new_css = """/* =====================================================
   PENGATURAN — layout selebar halaman, kartu berdampingan
   Di-import oleh pages/AdminSettings.jsx dan
   components/settings/ProfileTab.jsx & NetworkTab.jsx
   ===================================================== */

/* ---------- Tab ---------- */
.settings-tabs-sticky {
  background: var(--paper);
  padding-bottom: 10px;
}

.settings-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: none;
  overflow-x: auto;
  background: #f3f4f6;
  padding: 6px;
  border-radius: 999px;
  width: max-content;
  max-width: 100%;
}

.settings-tab {
  padding: 8px 20px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.settings-tab:hover {
  color: #374151;
  background: #e5e7eb;
}

.settings-tab.is-active {
  background: #ffffff;
  color: var(--accent);
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}


/* ---------- Grid kartu: otomatis 1-3 kolom sesuai lebar layar ---------- */

.settings-grid {
  display: grid;
  gap: 20px;
  align-items: start;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr));
}

.settings-grid.is-profile {
  grid-template-columns: minmax(260px, 340px) 1fr;
}

.settings-span-all {
  grid-column: 1 / -1;
}

.settings-cols {
  display: grid;
  gap: 20px;
  align-items: start;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
}

.settings-cols.is-wide-left {
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
}

.settings-block {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
  transition: all 0.3s ease;
}

.settings-block:hover {
  background: #ffffff;
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

@media (max-width: 900px) {
  .settings-grid.is-profile,
  .settings-cols.is-wide-left {
    grid-template-columns: 1fr;
  }
}


/* ---------- Isi kartu (modern, shadow halus, rounded corners) ---------- */

.settings-card {
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  line-height: 1.45;
  background: #ffffff;
}

.settings-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04);
}

.settings-card small {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #6b7280;
}

.settings-card code {
  font-size: 13px;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  color: #ef4444;
}

.settings-card h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 18px;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: #111827;
}

.settings-card .settings-desc {
  margin: 0 0 18px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.settings-card .form-group {
  margin-bottom: 16px;
}

.settings-card .form-group label {
  margin-bottom: 6px;
  line-height: 1.3;
  font-weight: 500;
  color: #374151;
}

.settings-card .form-group input:not([type="checkbox"]):not([type="radio"]),
.settings-card .form-group select {
  padding: 10px 14px;
  font-size: 14px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  transition: all 0.2s ease;
  width: 100%;
}

.settings-card .form-group input:focus:not([type="checkbox"]):not([type="radio"]),
.settings-card .form-group select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.settings-card .primary-button,
.settings-card .secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.settings-card .primary-button:active,
.settings-card .secondary-button:active {
  transform: scale(0.97);
}

.settings-card .error-message {
  padding: 12px 16px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  text-align: left;
  border-left: 4px solid #ef4444;
}

.settings-full {
  width: 100%;
}

/* Kartu akun (tab Profil) */
.settings-account {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.settings-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent) 0%, #2563eb 100%);
  color: white;
  font-size: 20px;
  font-weight: bold;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}

/* Pilihan provider AI: berdampingan kalau muat */
.settings-fields {
  display: grid;
  column-gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.settings-options {
  display: grid;
  gap: 12px;
  margin-bottom: 18px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
}

/* Animasi saat tab diganti */
.settings-pane {
  animation: fadeSlideUp 0.4s ease-out;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
"""

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(new_css)

print("Updated settings.css with modern styles!")
