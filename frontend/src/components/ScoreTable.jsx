import { useState } from "react";
import Pagination from "./Pagination";
import { IconTrash, IconEye, IconTrophy } from "./Icons";
import "./ScoreTable.css";


// =====================================================
// TABEL NILAI (dipakai AdminScores, TeacherScores & StudentHistory)
//
// Tampilan: 6 kolom dengan sel dua baris
//   Siswa (nama / NIS) · Tryout (judul / mapel · guru) ·
//   Skor · B / S / K · Status · Selesai (tanggal / jam)
// ditambah bar jumlah hasil + "Reset filter" dan pagination.
//
// Komponen ini hanya menampilkan. Pemuatan data, cache halaman
// (services/pageCache.js), dan semua filter tetap ada di halaman
// pemakainya.
//
// Props:
//   rows             baris yang SUDAH difilter oleh halaman
//   showTeacher      true = baris kedua kolom Tryout ditambah nama
//                    guru pembuat (untuk admin)
//   hideStudentColumn true = kolom "Siswa" disembunyikan (dipakai
//                    StudentHistory -- siswa melihat riwayatnya
//                    sendiri, jadi nama/NIS-nya sendiri tidak perlu
//                    ditampilkan lagi)
//   resetKey         string gabungan semua filter. Saat berubah,
//                    pagination kembali ke halaman 1. Sengaja bukan
//                    "rows" supaya refresh data di background tidak
//                    melempar user kembali ke halaman 1.
//   hasActiveFilter  true = tombol "Reset filter" ditampilkan
//   onReset          dipanggil saat "Reset filter" diklik
//   toggle           opsional -- node tombol toggle (mis. "Guru
//                     Saya") ditaruh sejajar jumlah hasil, sama
//                     seperti toggle "Soal Saya" di Bank Soal
//   emptyMessage     pesan saat rows kosong
//   onDeleteAttempt  opsional -- dipanggil dengan satu baris (item)
//                     saat tombol Hapus di baris itu diklik (dipakai
//                     AdminScores)
//   onViewDetail     opsional -- dipanggil dengan satu baris (item)
//                     saat tombol Lihat Detail diklik (dipakai
//                     StudentHistory). onDeleteAttempt dan
//                     onViewDetail tidak pernah dikirim bersamaan
//                     oleh satu halaman; kalau keduanya TIDAK
//                     dikirim, kolom Aksi tidak dirender sama
//                     sekali (dipakai TeacherScores)
// =====================================================

const PAGE_SIZE = 10;


// Backend mengirim timestamp tanpa zona waktu (UTC) -> tambahkan "Z"
// supaya tampil sesuai jam lokal browser (lihat engineering notes).
function parseUtcDate(value) {
  if (!value) {
    return null;
  }

  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}


function formatNumber(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  // Format Indonesia: 82,5 (koma desimal), maksimal 2 angka di belakang koma
  return Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}


function StatusBadge({ passed }) {
  if (passed === true) {
    return <span className="score-badge is-pass">Lulus</span>;
  }

  if (passed === false) {
    return <span className="score-badge is-fail">Tidak lulus</span>;
  }

  return <span className="score-badge is-none">-</span>;
}


function ScoreTable({
  rows,
  showTeacher = false,
  hideStudentColumn = false,
  resetKey = "",
  hasActiveFilter = false,
  onReset,
  toggle = null,
  emptyMessage = "Belum ada data nilai.",
  onDeleteAttempt = null,
  onViewDetail = null,
  onViewLeaderboard = null,
}) {
  const showDeleteAction = typeof onDeleteAttempt === "function";
  const showViewAction = typeof onViewDetail === "function";
  const showLeaderboardAction = typeof onViewLeaderboard === "function";
  const showActions = showDeleteAction || showViewAction || showLeaderboardAction;

  const [page, setPage] = useState(1);
  const [lastResetKey, setLastResetKey] = useState(resetKey);

  // Filter/pencarian berubah -> kembali ke halaman 1.
  // (Disesuaikan saat render, bukan lewat useEffect, supaya tidak ada
  // satu render "halaman kosong" di antaranya.)
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setPage(1);
  }

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Kalau data menyusut (mis. hasil refresh lebih sedikit), jangan
  // biarkan halaman aktif melewati halaman terakhir.
  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const showMeta = total > 0 || hasActiveFilter;

  return (
    <>
      {showMeta && (
        <div className="score-meta">
          <div className="score-meta-left">
            <span>{total} hasil</span>
            {toggle}
          </div>

          {hasActiveFilter && (
            <button type="button" className="score-reset" onClick={onReset}>
              Reset filter
            </button>
          )}
        </div>
      )}

      {total === 0 ? (
        <div className="empty-message">{emptyMessage}</div>
      ) : (
        <div className="table-container">
          <table className="score-table">
            <colgroup>
              {!hideStudentColumn && (
                <col style={{ width: showActions ? "20%" : "22%" }} />
              )}
              <col style={{ width: hideStudentColumn ? (showActions ? "38%" : "42%") : (showActions ? "24%" : "26%") }} />
              <col style={{ width: hideStudentColumn ? (showActions ? "12%" : "13%") : (showActions ? "10%" : "11%") }} />
              <col style={{ width: hideStudentColumn ? (showActions ? "14%" : "15%") : (showActions ? "13%" : "14%") }} />
              <col style={{ width: hideStudentColumn ? (showActions ? "13%" : "14%") : (showActions ? "12%" : "13%") }} />
              <col style={{ width: hideStudentColumn ? (showActions ? "14%" : "16%") : (showActions ? "13%" : "14%") }} />
              {showActions && <col style={{ width: "9%" }} />}
            </colgroup>

            <thead>
              <tr>
                {!hideStudentColumn && <th className="is-left">Siswa</th>}
                <th className="is-left">Tryout</th>
                <th>Skor</th>
                <th title="Benar / Salah / Kosong">B / S / K</th>
                <th>Status</th>
                <th className="is-left">Selesai</th>
                {showActions && <th>Aksi</th>}
              </tr>
            </thead>

            <tbody>
              {pageRows.map((item) => {
                const finished = parseUtcDate(item.finished_at);

                const tryoutMeta = [
                  item.subject_name,
                  showTeacher ? item.teacher_name : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                const studentName = item.student_name || "-";

                return (
                  <tr key={item.attempt_id}>
                    {!hideStudentColumn && (
                      <td>
                        <div
                          className="score-primary is-strong score-ellipsis"
                          title={studentName}
                        >
                          {studentName}
                        </div>
                        <div className="score-secondary score-ellipsis">
                          {item.student_code || "-"}
                        </div>
                      </td>
                    )}

                    <td>
                      <div
                        className="score-primary score-ellipsis"
                        title={item.tryout_title}
                      >
                        {item.tryout_title}
                      </div>
                      <div
                        className="score-secondary score-ellipsis"
                        title={tryoutMeta || undefined}
                      >
                        {tryoutMeta || "-"}
                      </div>
                      {item.attempt_total > 1 && (
                        <span className="score-badge is-attempt">
                          Percobaan ke-{item.attempt_number} dari {item.attempt_total}
                        </span>
                      )}
                    </td>

                    <td className="is-center is-nowrap">
                      <span className="score-value">{formatNumber(item.score)}</span>
                      {item.max_score ? (
                        <span className="score-max"> / {formatNumber(item.max_score)}</span>
                      ) : null}
                    </td>

                    <td className="is-center is-nowrap">
                      <div className="score-counts">
                        <span className="score-count is-right" title="Benar">
                          {item.correct_count ?? 0}
                        </span>
                        <span className="score-count is-wrong" title="Salah">
                          {item.wrong_count ?? 0}
                        </span>
                        <span className="score-count is-blank" title="Kosong">
                          {item.unanswered_count ?? 0}
                        </span>
                      </div>
                    </td>

                    <td className="is-center">
                      <StatusBadge passed={item.passed} />
                    </td>

                    <td className="is-nowrap">
                      <div>
                        {finished
                          ? finished.toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </div>
                      <div className="score-secondary">
                        {finished
                          ? finished.toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </td>

                    {showActions && (
                      <td className="is-center is-nowrap">
                        <div className="action-buttons" style={{ justifyContent: "center" }}>
                          {showViewAction && (
                            <button
                              type="button"
                              className="review-button"
                              onClick={() => onViewDetail(item)}
                              title="Lihat Detail"
                            >
                              <IconEye size={16} />
                            </button>
                          )}
                          
                          {showLeaderboardAction && (
                            <button
                              type="button"
                              className="review-button"
                              onClick={() => onViewLeaderboard(item)}
                              title="Papan Peringkat"
                            >
                              <IconTrophy size={16} />
                            </button>
                          )}

                          {showDeleteAction && (
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => onDeleteAttempt(item)}
                              title="Hapus nilai ini"
                            >
                              <IconTrash size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        itemLabel="hasil"
        onPageChange={setPage}
      />
    </>
  );
}

export default ScoreTable;
