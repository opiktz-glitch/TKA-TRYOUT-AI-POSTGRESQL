import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getTeacherScores } from "../services/api";
import { readPageCache, writePageCache } from "../services/pageCache";

const SCORES_CACHE_KEY = "teacher-scores";

export function useTeacherScores(user) {
  const [searchParams] = useSearchParams();
  const cachedScores = readPageCache(user?.id, SCORES_CACHE_KEY);

  const [scores, setScores] = useState(() => cachedScores ?? []);
  const [loading, setLoading] = useState(() => !cachedScores);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [tryoutFilterId, setTryoutFilterId] = useState(searchParams.get("tryout") || "");
  const [selectedStatus, setSelectedStatus] = useState(() => {
    const status = searchParams.get("status");
    return status === "PASSED" || status === "FAILED" ? status : "";
  });

  const loadScores = useCallback(async () => {
    const cachedData = readPageCache(user?.id, SCORES_CACHE_KEY);

    if (cachedData) {
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

    const matchesTryout =
      !tryoutFilterId || String(item.tryout_id) === tryoutFilterId;

    const matchesStatus =
      !selectedStatus ||
      (selectedStatus === "PASSED" && item.passed === true) ||
      (selectedStatus === "FAILED" && item.passed === false);

    return matchesSearch && matchesTryout && matchesStatus;
  });

  const hasActiveFilter = Boolean(search.trim() || selectedStatus || tryoutFilterId);

  const tryoutFilterTitle = tryoutFilterId
    ? scores.find((s) => String(s.tryout_id) === tryoutFilterId)?.tryout_title
    : null;

  function resetFilters() {
    setSearch("");
    setSelectedStatus("");
    setTryoutFilterId("");
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
    const validScores = scores.filter((s) => s.score !== null && s.score !== undefined);

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

  return {
    scores,
    loading,
    error,
    search,
    setSearch,
    tryoutFilterId,
    setTryoutFilterId,
    selectedStatus,
    setSelectedStatus,
    filteredScores,
    hasActiveFilter,
    tryoutFilterTitle,
    resetFilters,
    summary,
  };
}
