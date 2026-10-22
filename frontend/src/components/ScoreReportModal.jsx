import { useMemo } from "react";
import "./ScoreReportModal.css";
import { IconPrinter } from "./Icons";
import { exportScoresToCsv, exportScoresToExcel } from "../utils/scoreExport";

function ScoreReportModal({
  isOpen,
  onClose,
  scores = [],
  tryoutTitle = "",
  subjectName = "",
  creatorName = "",
}) {
  // -----------------------------------------------------
  // PERHITUNGAN STATISTIK RINGKAS
  // -----------------------------------------------------
  const stats = useMemo(() => {
    if (!scores.length) {
      return {
        total: 0,
        avg: 0,
        max: 0,
        min: 0,
        passed: 0,
        failed: 0,
        passRate: 0,
        cheated: 0,
      };
    }

    const total = scores.length;
    const scoresNum = scores.map((s) => Number(s.score) || 0);
    const sum = scoresNum.reduce((a, b) => a + b, 0);
    const avg = (sum / total).toFixed(1);
    const max = Math.max(...scoresNum);
    const min = Math.min(...scoresNum);
    const passed = scores.filter((s) => s.passed).length;
    const failed = total - passed;
    const passRate = ((passed / total) * 100).toFixed(0);
    const cheated = scores.filter((s) => (s.tab_switches_count || 0) > 0).length;

    return { total, avg, max, min, passed, failed, passRate, cheated };
  }, [scores]);

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (!isOpen) return null;

  const baseFileName = tryoutTitle
    ? `Rekap_Nilai_${tryoutTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}`
    : "Rekap_Nilai_Tryout";

  function handlePrint() {
    window.print();
  }

  function handleExportCsv() {
    exportScoresToCsv(scores, `${baseFileName}.csv`);
  }

  function handleExportExcel() {
    exportScoresToExcel(scores, `${baseFileName}.xls`, {
      title: tryoutTitle || "Semua Tryout",
      subject: subjectName || "-",
    });
  }

  return (
    <div className="score-report-overlay" onClick={onClose}>
      <div className="score-report-modal" onClick={(e) => e.stopPropagation()}>
        {/* HEADER MODAL — AKSI CETAK & EKSPOR */}
        <div className="score-report-header no-print">
          <h3>Pratinjau Dokumen Rekap Nilai (PDF / Print)</h3>
          <div className="score-report-actions">
            <button
              type="button"
              className="report-btn report-btn-print"
              onClick={handlePrint}
              title="Cetak langsung atau simpan sebagai file PDF"
            >
              <IconPrinter size={16} /> Cetak / Simpan PDF
            </button>

            <button
              type="button"
              className="report-btn report-btn-excel"
              onClick={handleExportExcel}
              title="Unduh data dalam format Microsoft Excel (.xls)"
            >
              📊 Ekspor Excel
            </button>

            <button
              type="button"
              className="report-btn report-btn-csv"
              onClick={handleExportCsv}
              title="Unduh data dalam format teks CSV"
            >
              📄 Ekspor CSV
            </button>

            <button
              type="button"
              className="report-btn report-btn-close"
              onClick={onClose}
              title="Tutup pratinjau"
            >
              ✕ Tutup
            </button>
          </div>
        </div>

        {/* LEMBAR KERTAS REKAPITULASI RESMI (A4 PRINT VIEW) */}
        <div className="score-paper-sheet">
          {/* KOP RESMI */}
          <div className="paper-letterhead">
            <h1>LEMBAR REKAPITULASI HASIL TRYOUT AKADEMIK</h1>
            <p className="paper-subtitle">
              Sistem Evaluasi Berbasis Komputer & Analisis Kemampuan Siswa (TKA TryOut AI)
            </p>
          </div>

          {/* INFORMASI DOKUMEN */}
          <div className="paper-meta-grid">
            <div className="paper-meta-item">
              <span className="paper-meta-label">Paket Tryout:</span>
              <span className="paper-meta-val">{tryoutTitle || "Seluruh Paket Ujian"}</span>
            </div>
            <div className="paper-meta-item">
              <span className="paper-meta-label">Tanggal Rekap:</span>
              <span className="paper-meta-val">{currentDate}</span>
            </div>
            <div className="paper-meta-item">
              <span className="paper-meta-label">Mata Pelajaran:</span>
              <span className="paper-meta-val">{subjectName || "Semua Mata Pelajaran"}</span>
            </div>
            <div className="paper-meta-item">
              <span className="paper-meta-label">Pengajar / Pembuat:</span>
              <span className="paper-meta-val">{creatorName || "-"}</span>
            </div>
          </div>

          {/* KPI STATISTIK HASIL EVALUASI */}
          <div className="paper-stats-grid">
            <div className="paper-stat-box">
              <div className="paper-stat-title">Jumlah Peserta</div>
              <div className="paper-stat-number">{stats.total}</div>
              <div className="paper-stat-sub">Siswa Mengerjakan</div>
            </div>

            <div className="paper-stat-box">
              <div className="paper-stat-title">Rata-Rata Kelas</div>
              <div className="paper-stat-number" style={{ color: "#2563EB" }}>
                {stats.avg}
              </div>
              <div className="paper-stat-sub">Skala 100</div>
            </div>

            <div className="paper-stat-box">
              <div className="paper-stat-title">Tertinggi / Terendah</div>
              <div className="paper-stat-number" style={{ fontSize: "16px", marginTop: "4px" }}>
                <span style={{ color: "#16A34A" }}>{stats.max}</span> /{" "}
                <span style={{ color: "#DC2626" }}>{stats.min}</span>
              </div>
              <div className="paper-stat-sub">Nilai Ekstrem</div>
            </div>

            <div className="paper-stat-box">
              <div className="paper-stat-title">Tingkat Kelulusan</div>
              <div className="paper-stat-number" style={{ color: "#16A34A" }}>
                {stats.passRate}%
              </div>
              <div className="paper-stat-sub">
                {stats.passed} Lulus · {stats.failed} Tidak
              </div>
            </div>
          </div>

          {/* TABEL NILAI SISWA */}
          <table className="paper-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}>No</th>
                <th style={{ width: "90px" }}>NISN / Kode</th>
                <th>Nama Peserta Didik</th>
                <th>Paket Tryout</th>
                <th style={{ width: "60px" }}>Skor</th>
                <th style={{ width: "65px" }}>Persen</th>
                <th style={{ width: "80px" }}>Status</th>
                <th style={{ width: "80px" }}>B / S / K</th>
                <th style={{ width: "105px" }}>Integritas Ujian</th>
                <th style={{ width: "115px" }}>Waktu Selesai</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((item, idx) => {
                const finished = item.finished_at
                  ? new Date(item.finished_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-";

                const isCheated =
                  typeof item.tab_switches_count === "number" && item.tab_switches_count > 0;

                return (
                  <tr key={item.attempt_id || idx}>
                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ textAlign: "center", color: "#64748B" }}>
                      {item.student_code || "-"}
                    </td>
                    <td>
                      <b>{item.student_name || "-"}</b>
                    </td>
                    <td>{item.tryout_title || "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      <b>{item.score ?? 0}</b>
                    </td>
                    <td style={{ textAlign: "right" }}>{item.percentage ?? 0}%</td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className={`paper-badge ${
                          item.passed ? "paper-badge-pass" : "paper-badge-fail"
                        }`}
                      >
                        {item.passed ? "LULUS" : "TIDAK"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontSize: "11px" }}>
                      <span style={{ color: "#16A34A", fontWeight: "bold" }}>
                        {item.correct_count ?? 0}
                      </span>
                      {" / "}
                      <span style={{ color: "#DC2626", fontWeight: "bold" }}>
                        {item.wrong_count ?? 0}
                      </span>
                      {" / "}
                      <span style={{ color: "#64748B" }}>{item.unanswered_count ?? 0}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {isCheated ? (
                        <span className="paper-badge paper-badge-cheat">
                          ⚠️ {item.tab_switches_count}x Pindah
                        </span>
                      ) : (
                        <span className="paper-badge-clean">✓ Aman</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", fontSize: "11px", color: "#475569" }}>
                      {finished}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* LEMBAR PENGESAHAN */}
          <div className="paper-signature-grid">
            <div className="paper-sig-box">
              <p>Mengetahui,<br />Kepala Sekolah / Pengawas</p>
              <div className="paper-sig-line">NIP. ............................</div>
            </div>

            <div className="paper-sig-box">
              <p>{currentDate}<br />Guru Pengampu Mata Pelajaran</p>
              <div className="paper-sig-line">{creatorName || "( ............................ )"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScoreReportModal;
