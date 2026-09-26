import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getTryoutLeaderboard } from "../services/api";
import Pagination from "./Pagination";

function formatDate(value) {
  if (!value) return "-";
  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function LeaderboardModal({ tryoutId, title, onClose, currentUserId, currentUserRole }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const res = await getTryoutLeaderboard(tryoutId);
        setData(res.leaderboard || []);
      } catch (err) {
        toast.error(err.message || "Gagal memuat papan peringkat");
      } finally {
        setLoading(false);
      }
    }
    if (tryoutId) fetchLeaderboard();
  }, [tryoutId]);

  const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = data.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <div>
            <h2>Papan Peringkat</h2>
            {title && <p>{title}</p>}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="loading-message">Memuat papan peringkat...</div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: 400, overflowY: "auto", margin: "16px 0" }}>
            <table className="score-table" style={{ minWidth: "100%", tableLayout: "auto" }}>
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: "center" }}>Rank</th>
                  <th className="is-left">Nama Peserta</th>
                  <th className="is-left">Selesai Pada</th>
                  <th style={{ textAlign: "right" }}>Waktu (detik)</th>
                  <th style={{ textAlign: "right" }}>Skor</th>
                  <th className="is-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => {
                  const isCurrentUser = row.user_id === currentUserId && currentUserRole === "SISWA";
                  return (
                    <tr key={row.student_id} style={isCurrentUser ? { background: "var(--accent-soft)" } : {}}>
                      <td style={{ textAlign: "center", fontWeight: "bold" }}>
                        {row.rank === 1 ? "🥇 1" : row.rank === 2 ? "🥈 2" : row.rank === 3 ? "🥉 3" : row.rank}
                      </td>
                      <td className="is-left is-nowrap">
                        {row.student_name}
                      </td>
                      <td className="is-left is-nowrap">{formatDate(row.finished_at)}</td>
                    <td style={{ textAlign: "right" }}>{row.duration_seconds}s</td>
                    <td style={{ textAlign: "right", fontWeight: "bold", fontSize: 16 }}>{row.score}</td>
                    <td className="is-left">
                      {row.attempt_total > 1 ? (
                        <span className="score-badge is-attempt">
                          Percobaan ke-{row.attempt_number} dari {row.attempt_total}
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                  );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-message">Belum ada data peringkat</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div style={{ marginTop: 12, paddingBottom: 16 }}>
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={data.length}
              pageSize={ITEMS_PER_PAGE}
              itemLabel="peserta"
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
