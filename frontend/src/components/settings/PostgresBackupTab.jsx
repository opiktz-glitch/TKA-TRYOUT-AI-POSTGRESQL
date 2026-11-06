import { useEffect, useRef, useState } from "react";
import {
  createPostgresBackup,
  downloadExistingPostgresBackup,
  getPostgresBackups,
  getPostgresBackupSettings,
  restorePostgresBackup,
  updatePostgresBackupSettings,
} from "../../services/api";
import "../ScoreTable.css";
import "./postgresBackup.css";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PostgresBackupTab() {
  const fileInput = useRef(null);
  const [backups, setBackups] = useState([]);
  const [retentionCount, setRetentionCount] = useState(14);
  const [backupSubdirectory, setBackupSubdirectory] = useState("");
  const [baseDirectory, setBaseDirectory] = useState("");
  const [backupDirectory, setBackupDirectory] = useState("");
  const [folderReady, setFolderReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [downloading, setDownloading] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function fetchBackupData() {
    return Promise.all([
      getPostgresBackups(),
      getPostgresBackupSettings(),
    ]);
  }

  function applyBackupData(data, settings) {
    setBackups(data.backups || []);
    setRetentionCount(settings.retention_count);
    setBackupSubdirectory(settings.subdirectory);
    setBaseDirectory(settings.base_directory);
    setBackupDirectory(settings.backup_directory);
    setFolderReady(settings.verified);
  }

  async function loadBackups() {
    try {
      const [data, settings] = await fetchBackupData();
      applyBackupData(data, settings);
    } catch (err) {
      console.error("GET POSTGRES BACKUPS ERROR:", err);
      setError(err.message || "Gagal memuat daftar backup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialBackups() {
      try {
        const [data, settings] = await fetchBackupData();
        if (!cancelled) applyBackupData(data, settings);
      } catch (err) {
        console.error("GET POSTGRES BACKUPS ERROR:", err);
        if (!cancelled) {
          setError(err.message || "Gagal memuat daftar backup.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialBackups();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateBackup() {
    setError("");
    setMessage("");
    setCreating(true);
    try {
      await createPostgresBackup();
      setMessage("Backup penuh berhasil dibuat dan diunduh.");
      await loadBackups();
    } catch (err) {
      console.error("CREATE POSTGRES BACKUP ERROR:", err);
      setError(err.message || "Gagal membuat backup PostgreSQL.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveSettings() {
    setError("");
    setMessage("");
    setSavingSettings(true);
    try {
      const settings = await updatePostgresBackupSettings({
        subdirectory: backupSubdirectory,
        retention_count: Number(retentionCount),
      });
      setBackupSubdirectory(settings.subdirectory);
      setRetentionCount(settings.retention_count);
      setBackupDirectory(settings.backup_directory);
      setFolderReady(settings.verified);
      setMessage("Pengaturan tersimpan. Folder backup berhasil diverifikasi.");
      await loadBackups();
    } catch (err) {
      console.error("SAVE POSTGRES BACKUP SETTINGS ERROR:", err);
      setFolderReady(false);
      setError(err.message || "Gagal memverifikasi pengaturan folder backup.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDownload(filename) {
    setError("");
    setDownloading(filename);
    try {
      await downloadExistingPostgresBackup(filename);
    } catch (err) {
      console.error("DOWNLOAD POSTGRES BACKUP ERROR:", err);
      setError(err.message || "Gagal mengunduh file backup.");
    } finally {
      setDownloading("");
    }
  }

  async function handleRestore() {
    if (!selectedFile) return;
    setError("");
    setMessage("");
    setRestoring(true);
    try {
      const result = await restorePostgresBackup(selectedFile);
      setMessage(
        `${result.message} Nama backup pengaman: ${result.safety_backup_filename}`
      );
      setSelectedFile(null);
      setConfirmRestore(false);
      if (fileInput.current) fileInput.current.value = "";
      await loadBackups();
    } catch (err) {
      console.error("RESTORE POSTGRES BACKUP ERROR:", err);
      setError(err.message || "Gagal memulihkan backup PostgreSQL.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <div className="settings-grid postgres-backup-grid">
        <section className="dashboard-card settings-card settings-span-all postgres-backup-header">
          <div>
            <h2>Backup penuh PostgreSQL</h2>
            <p className="settings-desc">
              Simpan salinan seluruh data aplikasi, termasuk akun, soal,
              gambar, tryout, jawaban, dan hasil.
            </p>
          </div>
          <div className="postgres-backup-notice" role="note">
            File backup berisi data sensitif. Simpan di tempat terlindungi.
            Restore mengganti data yang tercakup dalam file dan dapat meminta
            semua pengguna login ulang.
          </div>
          {(error || message) && (
            <div
              className={error ? "error-message" : "success-message"}
              role={error ? "alert" : "status"}
            >
              {error || message}
            </div>
          )}
        </section>

        <section className="dashboard-card settings-card postgres-backup-settings">
          <h2>Lokasi & retensi</h2>
          <p className="settings-desc">
            Pilih subfolder dalam folder dasar server dan jumlah salinan yang
            akan dipertahankan.
          </p>

          <div className="form-group">
            <label htmlFor="postgres-backup-subdirectory">
              Subfolder <span className="postgres-backup-optional">(opsional)</span>
            </label>
            <input
              id="postgres-backup-subdirectory"
              type="text"
              value={backupSubdirectory}
              maxLength={200}
              disabled={savingSettings || creating || restoring}
              placeholder="Contoh: arsip-mingguan"
              onChange={(event) => {
                setBackupSubdirectory(event.target.value);
                setFolderReady(false);
              }}
            />
            <small>Path absolut dan path keluar dari folder dasar tidak diizinkan.</small>
          </div>

          <div className="form-group">
            <label htmlFor="postgres-backup-retention">Jumlah backup disimpan</label>
            <input
              id="postgres-backup-retention"
              type="number"
              min="1"
              max="1000"
              step="1"
              value={retentionCount}
              disabled={savingSettings || creating || restoring}
              onChange={(event) => {
                setRetentionCount(event.target.value);
                setFolderReady(false);
              }}
            />
            <small>Backup yang lebih lama dari batas ini akan dihapus otomatis.</small>
          </div>

          <div className="postgres-backup-paths">
            <div>
              <span>Folder dasar server</span>
              <code>{baseDirectory || "Memuat..."}</code>
            </div>
            <div>
              <span>Lokasi aktif</span>
              <code>{backupDirectory || "Belum diverifikasi"}</code>
            </div>
          </div>

          <div className="postgres-backup-settings-footer">
            <span
              className={`postgres-backup-status${folderReady ? " is-ready" : ""}`}
              role="status"
            >
              <span aria-hidden="true">{folderReady ? "✓" : "!"}</span>
              {folderReady ? "Folder siap digunakan" : "Folder perlu diverifikasi"}
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={
                savingSettings ||
                creating ||
                restoring ||
                !Number.isInteger(Number(retentionCount)) ||
                Number(retentionCount) < 1 ||
                Number(retentionCount) > 1000
              }
              onClick={handleSaveSettings}
            >
              {savingSettings ? "Memeriksa..." : "Simpan & Verifikasi"}
            </button>
          </div>
        </section>

        <section className="dashboard-card settings-card postgres-backup-create">
          <h2>Buat backup baru</h2>
          <p className="settings-desc">
            Buat dump database di server, lalu unduh salinannya ke perangkat ini.
          </p>
          <div className="postgres-backup-create-info">
            <span>Lokasi penyimpanan</span>
            <code>{backupDirectory || "Atur dan verifikasi folder terlebih dahulu"}</code>
            <span>Maksimal tersimpan</span>
            <strong>{retentionCount} file terbaru</strong>
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={creating || restoring || savingSettings || !folderReady}
            onClick={handleCreateBackup}
          >
            {creating ? "Membuat backup..." : "Buat & Unduh Backup"}
          </button>
          {!folderReady && (
            <small className="postgres-backup-hint">
              Verifikasi pengaturan lokasi sebelum membuat backup.
            </small>
          )}
        </section>

        <section className="dashboard-card settings-card settings-span-all postgres-backup-list">
          <div className="postgres-backup-section-heading">
            <div>
              <h2>Backup tersimpan di server</h2>
              <p className="settings-desc">
                Unduh kembali file yang pernah dibuat di lokasi aktif.
              </p>
            </div>
            <span className="postgres-backup-count">{backups.length} file</span>
          </div>
          {loading ? (
            <div className="postgres-backup-empty">Memuat daftar backup...</div>
          ) : backups.length === 0 ? (
            <div className="postgres-backup-empty">
              Belum ada backup di lokasi ini. Buat backup baru untuk memulai.
            </div>
          ) : (
            <div className="postgres-backup-table-wrap">
              <table className="score-table">
                <thead>
                  <tr>
                    <th className="is-left">Nama file</th>
                    <th>Waktu (UTC)</th>
                    <th>Ukuran</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.filename}>
                      <td className="postgres-backup-filename">{backup.filename}</td>
                      <td>
                        {new Date(backup.created_at).toLocaleString("id-ID", {
                          timeZone: "UTC",
                        })}
                      </td>
                      <td>{formatBytes(backup.size_bytes)}</td>
                      <td>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={creating || restoring || !!downloading}
                          onClick={() => handleDownload(backup.filename)}
                        >
                          {downloading === backup.filename ? "Mengunduh..." : "Unduh"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashboard-card settings-card settings-span-all postgres-backup-restore">
          <h2>Pulihkan database</h2>
          <p className="settings-desc">
            Pilih file dump PostgreSQL format custom. Sebelum restore,
            aplikasi membuat backup pengaman dari kondisi saat ini.
          </p>
          <div className="postgres-backup-restore-controls">
            <label htmlFor="postgres-backup-restore-file">File backup PostgreSQL</label>
            <input
              id="postgres-backup-restore-file"
              ref={fileInput}
              type="file"
              accept=".dump,application/octet-stream"
              disabled={creating || restoring}
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null);
                setError("");
                setMessage("");
              }}
            />
            <button
              type="button"
              className="secondary-button"
              disabled={!selectedFile || creating || restoring}
              onClick={() => setConfirmRestore(true)}
            >
              Pulihkan Database
            </button>
          </div>
        </section>
      </div>

      {confirmRestore && selectedFile && (
        <div className="modal-overlay" onClick={() => !restoring && setConfirmRestore(false)}>
          <div
            className="modal postgres-backup-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="postgres-restore-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="postgres-restore-title">Konfirmasi Restore PostgreSQL</h2>
              <button
                type="button"
                className="modal-close"
                disabled={restoring}
                onClick={() => setConfirmRestore(false)}
              >
                ×
              </button>
            </div>
            <div className="postgres-backup-confirm-body">
              <p>
                File yang dipilih: <strong>{selectedFile.name}</strong>
              </p>
              <p className="postgres-backup-confirm-warning">
                Restore menimpa objek dan data yang tercakup dalam file.
                Objek yang dibuat setelah backup tetapi tidak ada di arsip
                dapat tetap ada. Aplikasi membuat backup pengaman sebelum
                proses dimulai. Lanjutkan hanya jika file benar dan backup
                pengaman tersedia.
              </p>
              <div className="settings-form-actions postgres-backup-confirm-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={restoring}
                  onClick={() => setConfirmRestore(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="primary-button postgres-backup-confirm-button"
                  disabled={restoring}
                  onClick={handleRestore}
                >
                  {restoring ? "Memulihkan..." : "Ya, Pulihkan Database"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
