import { useState, useEffect, useRef, useMemo } from "react";
import { getAdminScores, getScoreCreators, getSubjects, deleteAttempt } from "../services/api";
import { readPageCache, writePageCache } from "../services/pageCache";
import toast from "react-hot-toast";

const SCORE_OPTIONS_CACHE_KEY = "admin-scores-options";

function scoresCacheKey(subjectId, teacherId) {
  return `admin-scores:${subjectId}|${teacherId}`;
}

export function useAdminScores(user) {
  const cachedScores = readPageCache(user?.id, scoresCacheKey("", ""));
  const cachedOptions = readPageCache(user?.id, SCORE_OPTIONS_CACHE_KEY);

  const latestScoresKeyRef = useRef(null);

  const [scores, setScores] = useState(() => cachedScores ?? []);
  const [subjectOptions, setSubjectOptions] = useState(() => cachedOptions?.subjects ?? []);
  const [teacherOptions, setTeacherOptions] = useState(() => cachedOptions?.teachers ?? []);
  const [loading, setLoading] = useState(() => !cachedScores);

  const [search, setSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadScores();
     
  }, [selectedSubjectId, selectedTeacherId]);

  async function loadFilterOptions() {
    try {
      const [subjects, teachers] = await Promise.all([
        getSubjects(),
        getScoreCreators(),
      ]);

      setSubjectOptions(subjects);
      setTeacherOptions(teachers);

      writePageCache(user?.id, SCORE_OPTIONS_CACHE_KEY, {
        subjects,
        teachers,
      });
    } catch (err) {
      console.error("LOAD FILTER OPTIONS ERROR:", err);
    }
  }

  async function loadScores() {
    const cacheKey = scoresCacheKey(selectedSubjectId, selectedTeacherId);
    const cachedData = readPageCache(user?.id, cacheKey);

    latestScoresKeyRef.current = cacheKey;

    if (cachedData) {
      setScores(cachedData);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const data = await getAdminScores({
        subjectId: selectedSubjectId || undefined,
        teacherId: selectedTeacherId || undefined,
      });

      writePageCache(user?.id, cacheKey, data);

      if (latestScoresKeyRef.current === cacheKey) {
        setScores(data);
      }
    } catch (err) {
      console.error("LOAD ADMIN SCORES ERROR:", err);
      if (!cachedData && latestScoresKeyRef.current === cacheKey) {
        toast.error(err.message || "Gagal memuat rekap nilai", { id: "load-admin-scores" });
      }
    } finally {
      if (latestScoresKeyRef.current === cacheKey) {
        setLoading(false);
      }
    }
  }

  async function handleDeleteAttempt(item) {
    const attemptLabel =
      item.attempt_total > 1
        ? ` (percobaan ke-${item.attempt_number} dari ${item.attempt_total})`
        : "";

    const confirmed = window.confirm(
      `Hapus nilai "${item.student_name || "-"}" untuk tryout "${item.tryout_title || "-"}"${attemptLabel}? Tindakan ini tidak bisa dibatalkan.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAttempt(item.attempt_id);

      toast.success(
        `Nilai "${item.student_name || "-"}" untuk tryout "${item.tryout_title || "-"}"${attemptLabel} berhasil dihapus`,
        { id: "delete-attempt-success" }
      );

      await loadScores();
    } catch (err) {
      console.error("DELETE ATTEMPT ERROR:", err);
      toast.error(err.message || "Gagal menghapus nilai", { id: "delete-attempt-error" });
    }
  }

  const filteredScores = scores.filter((item) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      !keyword ||
      item.student_name?.toLowerCase().includes(keyword) ||
      item.student_code?.toLowerCase().includes(keyword) ||
      item.tryout_title?.toLowerCase().includes(keyword) ||
      item.teacher_name?.toLowerCase().includes(keyword);

    const matchesStatus =
      !selectedStatus ||
      (selectedStatus === "PASSED" && item.passed === true) ||
      (selectedStatus === "FAILED" && item.passed === false);

    return matchesSearch && matchesStatus;
  });

  const hasActiveFilter = Boolean(
    search.trim() || selectedSubjectId || selectedTeacherId || selectedStatus
  );

  function resetFilters() {
    setSearch("");
    setSelectedSubjectId("");
    setSelectedTeacherId("");
    setSelectedStatus("");
  }

  const isOwnTeacherFilter = Boolean(user) && String(selectedTeacherId) === String(user.id);

  function toggleOwnTeacherFilter() {
    setSelectedTeacherId((prev) =>
      String(prev) === String(user?.id) ? "" : String(user.id)
    );
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
    search,
    setSearch,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTeacherId,
    setSelectedTeacherId,
    selectedStatus,
    setSelectedStatus,
    subjectOptions,
    teacherOptions,
    filteredScores,
    hasActiveFilter,
    resetFilters,
    isOwnTeacherFilter,
    toggleOwnTeacherFilter,
    summary,
    handleDeleteAttempt,
  };
}
