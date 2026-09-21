import { useState } from "react";
import Pagination from "./Pagination";
import "./ScoreTable.css";


// =====================================================
// TABEL NILAI (dipakai AdminScores & TeacherScores)
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
//   resetKey         string gabungan semua filter. Saat berubah,
//                    pagination kembali ke halaman 1. Sengaja bukan
//                    "rows" supaya refresh data di background tidak
//                    melempar user kembali ke halaman 1.
//   hasActiveFilter  true = tombol "Reset filter" ditampilkan
//   onReset          dipanggil saat "Reset filter" diklik
//   emptyMessage     pesan saat rows kosong
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
  resetKey = "",
  hasActiveFilter = false,
  onReset,
  emptyMessage = "Belum ada data nilai.",
}) {
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
          <span>{total} hasil</span>

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
              <col style={{ width: "22%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>

            <thead>
              <tr>
                <th className="is-left">Siswa</th>
                <th className="is-left">Tryout</th>
                <th>Skor</th>
                <th title="Benar / Salah / Kosong">B / S / K</th>
                <th>Status</th>
                <th className="is-left">Selesai</th>
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
