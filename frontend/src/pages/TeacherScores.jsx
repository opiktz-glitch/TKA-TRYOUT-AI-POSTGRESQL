import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import StatCard from "../components/StatCard";
import ScoreTable from "../components/ScoreTable";
import {
  IconBarChart,
  IconCheck,
  IconSearch,
  IconTarget,
  IconUsers,
} from "../components/Icons";

import { getTeacherScores } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import { readPageCache, writePageCache } from "../services/pageCache";


// =====================================================
// CACHE — kunci (lihat services/pageCache.js)
// Rekap nilai di-cache satu kali per guru (tidak ada lagi filter
// tryout yang dikirim ke server).
// =====================================================

const SCORES_CACHE_KEY = "teacher-scores";


function TeacherScores() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Data dari kunjungan sebelumnya di sesi ini. Kalau ada, langsung
  // tampil (tanpa "Memuat rekap nilai...") lalu diperbarui diam-diam.
  const cachedScores = readPageCache(user?.id, SCORES_CACHE_KEY);

  const [scores, setScores] = useState(() => cachedScores ?? []);

  const [loading, setLoading] = useState(() => !cachedScores);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(searchParams.get("q") || "");

  // Filter status hanya di sisi browser (tidak dikirim ke server),
  // jadi tidak ikut kunci cache.
  const [selectedStatus, setSelectedStatus] = useState("");


  const loadScores = useCallback(async () => {
    const cachedData = readPageCache(user?.id, SCORES_CACHE_KEY);

    if (cachedData) {
      // Pernah dimuat: tampilkan langsung, lalu perbarui diam-diam
      // (tanpa loading; kalau gagal, data lama dibiarkan).
      setScores(cachedData);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getTeacherScores();

      writePageCache(user?.id, SCORES_CACHE_KEY, data);
      setScores(data);
    } catch (err) {
      console.error("LOAD SCORES ERROR:", err);

      if (!cachedData) {
        setError(err.message || "Gagal memuat rekap nilai");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);


  useEffect(() => {
    loadScores();
  }, [loadScores]);


  const filteredScores = scores.filter((item) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      !keyword ||
      item.student_name?.toLowerCase().includes(keyword) ||
      item.student_code?.toLowerCase().includes(keyword) ||
      item.tryout_title?.toLowerCase().includes(keyword);

    const matchesStatus =
      !selectedStatus ||
      (selectedStatus === "PASSED" && item.passed === true) ||
      (selectedStatus === "FAILED" && item.passed === false);

    return matchesSearch && matchesStatus;
  });


  const hasActiveFilter = Boolean(search.trim() || selectedStatus);

  function resetFilters() {
    setSearch("");
    setSelectedStatus("");
  }


  const summary = useMemo(() => {
    if (scores.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        totalTryouts: 0,
      };
    }

    const totalAttempts = scores.length;

    const validScores = scores.filter(
      (s) => s.score !== null && s.score !== undefined
    );

    const averageScore =
      validScores.length > 0
        ? validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length
        : 0;

    const passedCount = scores.filter((s) => s.passed === true).length;
    const passRate = (passedCount / totalAttempts) * 100;

    const totalTryouts = new Set(scores.map((s) => s.tryout_id)).size;

    return {
      totalAttempts,
      averageScore: Math.round(averageScore * 10) / 10,
      passRate: Math.round(passRate),
      totalTryouts,
    };
  }, [scores]);


  return (
    <>
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Nilai</h1>
          <p>Rekap skor siswa dari tryout yang kamu buat</p>
        </div>
      </div>

      {/* RINGKASAN */}

      <div className="stat-grid">
        <StatCard
          icon={<IconUsers />}
          title="Total Peserta"
          value={summary.totalAttempts}
          description="Attempt selesai"
        />

        <StatCard
          icon={<IconTarget />}
          title="Rata-rata Skor"
          value={summary.averageScore}
          description="Dari semua peserta"
        />

        <StatCard
          icon={<IconCheck />}
          title="Tingkat Lulus"
          value={`${summary.passRate}%`}
          description="Dari peserta yang selesai"
        />

        <StatCard
          icon={<IconBarChart />}
          title="Paket Tryout"
          value={summary.totalTryouts}
          description="Sudah ada peserta"
        />
      </div>

      {/* TABLE */}

      <div className="score-card">

        <div className="score-toolbar">
          <label className="score-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Cari siswa, NIS, tryout"
              aria-label="Cari nilai"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select
            className={`score-select${selectedStatus ? " is-active" : ""}`}
            aria-label="Filter status kelulusan"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="PASSED">Lulus</option>
            <option value="FAILED">Tidak lulus</option>
          </select>
        </div>

        {loading && (
          <div className="loading-message">Memuat rekap nilai...</div>
        )}

        {error && <div className="error-message">{error}</div>}

        {!loading && !error && (
          <ScoreTable
            rows={filteredScores}
            resetKey={[search.trim(), selectedStatus].join("|")}
            hasActiveFilter={hasActiveFilter}
            onReset={resetFilters}
            emptyMessage={
              hasActiveFilter
                ? "Tidak ada hasil yang cocok."
                : "Belum ada siswa yang menyelesaikan tryout kamu."
            }
          />
        )}
      </div>
    </>
  );
}

export default TeacherScores;
