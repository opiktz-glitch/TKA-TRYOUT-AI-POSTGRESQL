import { useState, useEffect } from "react";
import { resetUserPassword } from "../services/api";
import { IconEye, IconEyeOff, IconCheck } from "./Icons";

export default function ResetPasswordModal({ isOpen, onClose, passwordUser }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setPasswordSuccess("");
      setPasswordLoading(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  if (!isOpen || !passwordUser) return null;

  async function handleResetPassword(event) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword.trim()) {
      setPasswordError("Password baru wajib diisi");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password minimal 6 karakter");
      return;
    }

    if (!confirmPassword.trim()) {
      setPasswordError("Konfirmasi password wajib diisi");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak sama");
      return;
    }

    try {
      setPasswordLoading(true);
      const result = await resetUserPassword(passwordUser.id, newPassword);

      setPasswordSuccess(result.message || "Password berhasil diubah");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      setPasswordError(err.message || "Gagal mengubah password");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>Reset Password</h2>
            <p>Ubah password pengguna</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={passwordLoading}
          >
            ×
          </button>
        </div>

        <div className="password-user-info">
          <strong>{passwordUser.full_name || passwordUser.username}</strong>
          <span>Username: {passwordUser.username}</span>
          <span>Role: {passwordUser.role}</span>
        </div>

        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label>Password Baru</label>
            <div className="password-input-wrapper">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                disabled={passwordLoading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={passwordLoading}
                tabIndex="-1"
              >
                {showNewPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Konfirmasi Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                disabled={passwordLoading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={passwordLoading}
                tabIndex="-1"
              >
                {showConfirmPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
              </button>
            </div>
          </div>

          <div className="password-rules">
            <div className={newPassword.length >= 6 ? "rule-valid" : "rule-invalid"}>
              {newPassword.length >= 6 ? <IconCheck size={13} style={{ verticalAlign: "-2px" }} /> : "○"} Minimal 6 karakter
            </div>
            <div className={confirmPassword && newPassword === confirmPassword ? "rule-valid" : "rule-invalid"}>
              {confirmPassword && newPassword === confirmPassword ? <IconCheck size={13} style={{ verticalAlign: "-2px" }} /> : "○"} Password cocok
            </div>
          </div>

          {passwordError && (
            <div className="form-error-message" style={{ marginBottom: "15px" }}>
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="success-message" style={{ marginBottom: "15px" }}>
              <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              {passwordSuccess}
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={passwordLoading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={passwordLoading}
            >
              {passwordLoading ? "Menyimpan..." : "Ubah Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
