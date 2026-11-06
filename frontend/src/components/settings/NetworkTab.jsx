import { useState } from "react";
import "./settings.css";

import { IconWifi, IconCheck } from "../Icons";

// ======================================================
// TAB "JARINGAN" (Pengaturan) -- akses dari laptop lain (WiFi)
//
// Hanya menampilkan data (read-only). networkInfo/networkLoading/
// networkError SENGAJA tetap dimiliki AdminSettings.jsx dan dikirim
// lewat props, karena induknya juga butuh networkInfo untuk
// menyembunyikan tab ini di mode "production" dan memuatnya di awal.
// State "Tersalin" (copiedUrl) cuma dipakai di sini, jadi lokal.
// ======================================================

function NetworkTab({ networkInfo, networkLoading, networkError }) {
  const [copiedUrl, setCopiedUrl] = useState("");

  async function handleCopyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(""), 1800);
    } catch (err) {
      console.error("COPY URL ERROR:", err);
    }
  }

  // Alamat untuk dibagikan + langkah-langkah hanya relevan di mode
  // bukan "development".
  const showShare = Boolean(networkInfo) && networkInfo.mode !== "development";

  return (
    <div className="dashboard-card settings-card">
      {(!networkInfo || networkInfo.mode !== "development") && (
        <>
          <h2>
            <IconWifi size={18} />
            Akses dari Laptop Lain
          </h2>

          <p className="settings-desc">
            Bagikan alamat di bawah ini ke laptop/HP lain yang
            terhubung ke <strong>WiFi yang sama</strong> dengan
            laptop ini, supaya mereka bisa membuka aplikasi tanpa
            install apa pun.
          </p>
        </>
      )}

      {networkError && (
        <div className="error-message">
          {networkError}
        </div>
      )}

      {networkLoading ? (
        <p className="settings-loading">Mendeteksi alamat jaringan...</p>
      ) : (
        <div className="settings-cols">

          {/* KOLOM KIRI: status server + alamat untuk dibagikan */}

          <div>
            {/* STATUS SERVER */}

            <div className={`settings-network-status${networkInfo ? " is-online" : " is-offline"}`}>
              <strong className="settings-network-status-title">
                {networkInfo
                  ? networkInfo.mode === "development"
                    ? "Server lokal / development"
                    : "Server sedang berjalan"
                  : "Server tidak terdeteksi"}
              </strong>

              <div className="settings-network-status-detail">
                <span className="settings-network-status-indicator" aria-hidden="true" />
                <span className="settings-muted">
                  {networkInfo
                    ? `Laptop ini: ${networkInfo.hostname} · Backend port ${networkInfo.backend_port} · Frontend port ${networkInfo.frontend_port}`
                    : "Muat ulang halaman ini setelah backend & frontend dijalankan."}
                </span>
              </div>

              {networkInfo && networkInfo.addresses.length > 0 && (
                <div className="settings-network-addresses">
                  {networkInfo.addresses
                    .map((addr) => `${addr.interface} — ${addr.ip}`)
                    .join(" · ")}
                </div>
              )}
            </div>

            {/* DAFTAR ALAMAT IP */}

            {showShare &&
              (networkInfo.addresses.length > 0 ? (
                <div>
                  <h3 className="settings-section-title">
                    Alamat untuk Dibagikan
                  </h3>

                  {networkInfo.addresses.map((addr) => (
                    <div key={addr.ip} className="settings-network-address-card">
                      <div className="settings-network-address-content">
                        <code className="settings-network-url">
                          {addr.frontend_url}
                        </code>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleCopyUrl(addr.frontend_url)}
                        >
                          {copiedUrl === addr.frontend_url ? (
                            <>
                              <IconCheck size={14} /> Tersalin
                            </>
                          ) : (
                            "Salin Link"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="error-message">
                  Tidak ada IP jaringan lokal yang terdeteksi. Pastikan
                  laptop ini sudah terhubung ke WiFi (bukan cuma
                  Ethernet/hotspot pribadi), lalu muat ulang tab ini.
                </div>
              ))}
          </div>

          {/* KOLOM KANAN: langkah-langkah */}

          {showShare && (
            <div>
              <h3 className="settings-section-title">
                Cara Mengakses dari Laptop Lain
              </h3>

              <ol className="settings-network-instructions">
                <li>Pastikan laptop lain terhubung ke <strong>WiFi yang sama</strong> dengan laptop ini.</li>
                <li>Jalankan project ini dengan <code>python run_server.py</code> (BUKAN <code>run.py</code> biasa) — cuma <code>run_server.py</code> yang membuka akses ke WiFi.</li>
                <li>Pastikan backend & frontend masih berjalan di laptop ini (jangan ditutup terminalnya).</li>
                <li>Buka browser di laptop lain, lalu ketik/tempel salah satu alamat dari daftar "Alamat untuk Dibagikan".</li>
                <li>Login seperti biasa — data (soal, tryout, nilai) sama persis karena mengakses server yang sama.</li>
              </ol>

              <div className="settings-notice--warning" role="note">
                ⚠️ Kalau laptop lain tetap tidak bisa connect, kemungkinan
                besar <strong>Windows Firewall</strong> di laptop ini
                memblokir port {networkInfo?.backend_port ?? 8000} &{" "}
                {networkInfo?.frontend_port ?? 5173}. Izinkan akses saat
                muncul pop-up "Windows Defender Firewall" ketika server
                pertama kali dijalankan, atau tambahkan izin manual lewat
                Control Panel &gt; Windows Defender Firewall &gt; Allow an
                app.
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default NetworkTab;
