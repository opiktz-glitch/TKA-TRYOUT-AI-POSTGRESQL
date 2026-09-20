import { useState } from "react";

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

  return (
    <div
      className="dashboard-card"
      style={{ maxWidth: "700px", margin: "0 auto", padding: "24px" }}
    >
      {(!networkInfo || networkInfo.mode !== "development") && (
        <>
          <h2 style={{ marginTop: 0, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <IconWifi size={18} />
            Akses dari Laptop Lain
          </h2>

          <p style={{ marginTop: 0, marginBottom: 22, color: "#6b7280", fontSize: 13 }}>
            Bagikan alamat di bawah ini ke laptop/HP lain yang
            terhubung ke <strong>WiFi yang sama</strong> dengan
            laptop ini, supaya mereka bisa membuka aplikasi tanpa
            install apa pun.
          </p>
        </>
      )}

      {networkError && (
        <div className="error-message" style={{ marginBottom: 18 }}>
          {networkError}
        </div>
      )}

      {networkLoading ? (
        <p style={{ color: "#6b7280", fontSize: 13 }}>Mendeteksi alamat jaringan...</p>
      ) : (
        <>
          {/* STATUS SERVER */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 22,
            }}
          >
            <strong style={{ fontSize: 13, marginBottom: 4 }}>
              {networkInfo
                ? networkInfo.mode === "development"
                  ? "Server lokal / development"
                  : "Server sedang berjalan"
                : "Server tidak terdeteksi"}
            </strong>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: networkInfo ? "#16a34a" : "#dc2626",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                {networkInfo
                  ? `Laptop ini: ${networkInfo.hostname} · Backend port ${networkInfo.backend_port} · Frontend port ${networkInfo.frontend_port}`
                  : "Muat ulang halaman ini setelah backend & frontend dijalankan."}
              </span>
            </div>

            {networkInfo && networkInfo.addresses.length > 0 && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {networkInfo.addresses
                  .map((addr) => `${addr.interface} — ${addr.ip}`)
                  .join(" · ")}
              </div>
            )}
          </div>

          {networkInfo && networkInfo.mode !== "development" && (
            <>
              {/* DAFTAR ALAMAT IP */}

              {networkInfo.addresses.length > 0 ? (
                <div style={{ marginBottom: 26 }}>
                  <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 10 }}>
                    Alamat untuk Dibagikan
                  </label>

                  {networkInfo.addresses.map((addr) => (
                    <div
                      key={addr.ip}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "14px 16px",
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <code
                          style={{
                            flex: 1,
                            minWidth: 220,
                            fontSize: 15,
                            fontWeight: 600,
                            padding: "8px 10px",
                            background: "#f3f4f6",
                            borderRadius: 6,
                          }}
                        >
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
                <div className="error-message" style={{ marginBottom: 22 }}>
                  Tidak ada IP jaringan lokal yang terdeteksi. Pastikan
                  laptop ini sudah terhubung ke WiFi (bukan cuma
                  Ethernet/hotspot pribadi), lalu muat ulang tab ini.
                </div>
              )}

              {/* LANGKAH-LANGKAH */}

              <div>
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 10 }}>
                  Cara Mengakses dari Laptop Lain
                </label>

                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#374151", lineHeight: 1.9, textAlign: "left" }}>
                  <li>Pastikan laptop lain terhubung ke <strong>WiFi yang sama</strong> dengan laptop ini.</li>
                  <li>Jalankan project ini dengan <code>python run_server.py</code> (BUKAN <code>run.py</code> biasa) — cuma <code>run_server.py</code> yang membuka akses ke WiFi.</li>
                  <li>Pastikan backend & frontend masih berjalan di laptop ini (jangan ditutup terminalnya).</li>
                  <li>Buka browser di laptop lain, lalu ketik/tempel salah satu alamat di atas.</li>
                  <li>Login seperti biasa — data (soal, tryout, nilai) sama persis karena mengakses server yang sama.</li>
                </ol>

                <div
                  style={{
                    backgroundColor: "#fff3cd",
                    color: "#856404",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    marginTop: "18px",
                  }}
                >
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
            </>
          )}
        </>
      )}
    </div>
  );
}

export default NetworkTab;
