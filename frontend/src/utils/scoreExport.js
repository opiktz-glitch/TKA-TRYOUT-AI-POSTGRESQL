/**
 * Utility untuk Ekspor Rekap Nilai Siswa ke CSV dan Microsoft Excel (.xls)
 * Mendukung format UTF-8 with BOM agar karakter Indonesia & simbol terbaca sempurna di Excel.
 */

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportScoresToCsv(scores, filename = "Rekap_Nilai.csv") {
  const headers = [
    "No",
    "NISN / Kode Siswa",
    "Nama Siswa",
    "Paket Tryout",
    "Mata Pelajaran",
    "Guru Pembuat",
    "Skor",
    "Skor Maksimal",
    "Persentase (%)",
    "Status",
    "Benar (B)",
    "Salah (S)",
    "Kosong (K)",
    "Integritas Anti-Cheat",
    "Waktu Selesai",
  ];

  const rows = scores.map((item, idx) => {
    const finished = item.finished_at ? new Date(item.finished_at).toLocaleString("id-ID") : "-";
    const integrity = typeof item.tab_switches_count === "number" && item.tab_switches_count > 0
      ? `${item.tab_switches_count}x Pindah Tab`
      : "Aman (0x)";

    return [
      idx + 1,
      `"${item.student_code || "-"}"`,
      `"${(item.student_name || "-").replace(/"/g, '""')}"`,
      `"${(item.tryout_title || "-").replace(/"/g, '""')}"`,
      `"${item.subject_name || "-"}"`,
      `"${item.teacher_name || "-"}"`,
      item.score ?? 0,
      item.max_score ?? 100,
      item.percentage ?? 0,
      item.passed ? "Lulus" : "Tidak Lulus",
      item.correct_count ?? 0,
      item.wrong_count ?? 0,
      item.unanswered_count ?? 0,
      `"${integrity}"`,
      `"${finished}"`,
    ];
  });

  const csvContent = "\ufeff" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportScoresToExcel(scores, filename = "Rekap_Nilai.xls", meta = {}) {
  const title = meta.title || "Rekapitulasi Nilai Siswa";
  const subject = meta.subject || "-";
  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let tableHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
    <style>
      table { border-collapse: collapse; font-family: Calibri, sans-serif; }
      th { background-color: #1B2A3D; color: #FFFFFF; font-weight: bold; border: 1px solid #000; text-align: center; padding: 6px 10px; }
      td { border: 1px solid #D1D5DB; padding: 5px 8px; font-size: 11pt; }
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      .badge-pass { background-color: #D1FAE5; color: #065F46; font-weight: bold; text-align: center; }
      .badge-fail { background-color: #FEE2E2; color: #991B1B; font-weight: bold; text-align: center; }
      .badge-cheat { background-color: #FEF3C7; color: #92400E; font-weight: bold; text-align: center; }
      .badge-safe { color: #059669; text-align: center; }
    </style>
  </head>
  <body>
    <h2>LEMBAR REKAPITULASI HASIL TRYOUT AKADEMIK</h2>
    <p><b>Paket Tryout:</b> ${title} | <b>Mata Pelajaran:</b> ${subject} | <b>Tanggal Unduh:</b> ${dateStr}</p>
    <table border="1">
      <thead>
        <tr>
          <th>No</th>
          <th>NISN / Kode Siswa</th>
          <th>Nama Siswa</th>
          <th>Paket Tryout</th>
          <th>Mata Pelajaran</th>
          <th>Guru Pembuat</th>
          <th>Skor</th>
          <th>Skor Max</th>
          <th>Persentase (%)</th>
          <th>Status</th>
          <th>Benar (B)</th>
          <th>Salah (S)</th>
          <th>Kosong (K)</th>
          <th>Integritas Ujian</th>
          <th>Waktu Selesai</th>
        </tr>
      </thead>
      <tbody>
  `;

  scores.forEach((item, idx) => {
    const finished = item.finished_at ? new Date(item.finished_at).toLocaleString("id-ID") : "-";
    const statusClass = item.passed ? "badge-pass" : "badge-fail";
    const statusText = item.passed ? "Lulus" : "Tidak Lulus";
    const isCheated = typeof item.tab_switches_count === "number" && item.tab_switches_count > 0;
    const cheatClass = isCheated ? "badge-cheat" : "badge-safe";
    const cheatText = isCheated ? `${item.tab_switches_count}x Pindah Tab` : "Aman (0x)";

    tableHtml += `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center" style="mso-number-format:'\\@';">${item.student_code || "-"}</td>
        <td class="text-left">${item.student_name || "-"}</td>
        <td class="text-left">${item.tryout_title || "-"}</td>
        <td class="text-left">${item.subject_name || "-"}</td>
        <td class="text-left">${item.teacher_name || "-"}</td>
        <td class="text-right"><b>${item.score ?? 0}</b></td>
        <td class="text-right">${item.max_score ?? 100}</td>
        <td class="text-right">${item.percentage ?? 0}%</td>
        <td class="${statusClass}">${statusText}</td>
        <td class="text-center">${item.correct_count ?? 0}</td>
        <td class="text-center">${item.wrong_count ?? 0}</td>
        <td class="text-center">${item.unanswered_count ?? 0}</td>
        <td class="${cheatClass}">${cheatText}</td>
        <td class="text-center">${finished}</td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  </body>
  </html>
  `;

  const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}
