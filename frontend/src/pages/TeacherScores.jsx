import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { getTeacherScores, getTryouts } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import { readPageCache, writePageCache } from "../services/pageCache";


// =====================================================
// CACHE — kunci (lihat services/pageCache.js)
// Rekap nilai di-cache per FILTER TRYOUT yang dikirim ke server.
// =====================================================

const TRYOUT_OPTIONS_CACHE_KEY = "teacher-scores-options";

function scoresCacheKey(tryoutId) {
  return `teacher-scores:${tryoutId}`;
}


function TeacherScores() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Data dari kunjungan sebelumnya di sesi ini. Filter tryout selalu
  // mulai dari "semua" saat halaman dibuka, jadi yang dipakai di awal
  // adalah cache untuk filter kosong. Kalau ada, langsung tampil (tanpa
  // "Memuat rekap nilai...") lalu diperbarui diam-diam.
  const cachedScores = readPageCache(user?.id, scoresCacheKey(""));
  const cachedTryoutOptions = readPageCache(user?.id, TRYOUT_OPTIONS_CACHE_KEY);

  // Kunci filter yang hasilnya sedang ditunggu. Dipakai untuk mengabaikan
  // respons yang sudah usang (filter keburu diganti).
  const latestScoresKeyRef = useRef(null);

  const [scores, setScores] = useState(() => cachedScores ?? []);
  const [tryoutOptions, setTryoutOptions] = useState(
    () => cachedTryoutOptions ?? []
  );

  const [loading, setLoading] = useState(() => !cachedScores);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedTryoutId, setSelectedTryoutId] = useState("");

  // Filter status hanya di sisi browser (tidak dikirim ke server),
  // jadi tidak ikut kunci cache.
  const [selectedStatus, setSelectedStatus] = useState("");


  const loadTryoutOptions = useCallback(async () => {
    try {
      const data = await getTryouts();

      // Hanya tryout yang dibuat oleh guru yang sedang login
      // yang muncul di dropdown filter.
      const mine = user
        ? data.filter((t) => t.created_by === user.id)
        : data;

      setTryoutOptions(mine);
      writePageCache(user?.id, TRYOUT_OPTIONS_CACHE_KEY, mine);
    } catch (err) {
      console.error("LOAD TRYOUT OPTIONS ERROR:", err);
    }
  }, [user]);


  const loadScores = useCallback(async () => {
    const cacheKey = scoresCacheKey(selectedTryoutId);

    const cachedData = readPageCache(user?.id, cacheKey);

    latestScoresKeyRef.current = cacheKey;

    if (cachedData) {
      // Filter ini pernah dimuat: tampilkan langsung, lalu perbarui
      // diam-diam (tanpa loading; kalau gagal, data lama dibiarkan).
      setScores(cachedData);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getTeacherScores(selectedTryoutId || undefined);

      writePageCache(user?.id, cacheKey, data);

      // Abaikan hasil kalau filter sudah berganti selama menunggu.
      if (latestScoresKeyRef.current === cacheKey) {
        setScores(data);
      }
    } catch (err) {
      console.error("LOAD SCORES ERROR:", err);

      if (!cachedData && latestScoresKeyRef.current === cacheKey) {
        setError(err.message || "Gagal memuat rekap nilai");
      }
    } finally {
      if (latestScoresKeyRef.current === cacheKey) {
        setLoading(false);
      }
    }
  }, [selectedTryoutId, user?.id]);


  useEffect(() => {
    loadTryoutOptions();
  }, [loadTryoutOptions]);

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


  const hasActiveFilter = Boolean(
    search.trim() || selectedTryoutId || selectedStatus
  );

  function resetFilters() {
    setSearch("");
    setSelectedTryoutId("");
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
            className={`score-select is-wide${selectedTryoutId ? " is-active" : ""}`}
            aria-label="Filter tryout"
            value={selectedTryoutId}
            onChange={(e) => setSelectedTryoutId(e.target.value)}
          >
            <option value="">Semua Tryout</option>

            {tryoutOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

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
            resetKey={[
              search.trim(),
              selectedTryoutId,
              selectedStatus,
            ].join("|")}
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
