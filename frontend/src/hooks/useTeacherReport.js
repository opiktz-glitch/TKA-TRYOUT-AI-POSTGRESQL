import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { getTeacherReport, getTryouts } from "../services/api";
import { readPageCache, writePageCache } from "../services/pageCache";
import toast from "react-hot-toast";
import {
  WRONG_MEDIUM_PERCENT,
  PASS_THRESHOLD_PERCENT,
} from "../utils/report";

const TRYOUT_OPTIONS_CACHE_KEY = "teacher-report-options";

function reportCacheKey(tryoutId) {
  return `teacher-report:${tryoutId}`;
}

export function buildInsights(report) {
  if (!report || !report.total_attempts) {
    return [];
  }

  const insights = [];
  const total = report.total_attempts;

  if (report.pass_rate !== null && report.pass_rate !== undefined) {
    if (total < 100) {
      const passed = Math.round((total * report.pass_rate) / 100);
      const failed = total - passed;

      insights.push(
        failed === 0
          ? `Semua ${total} peserta lulus (batas lulus ${PASS_THRESHOLD_PERCENT}%).`
          : `${failed} dari ${total} peserta belum lulus (batas lulus ${PASS_THRESHOLD_PERCENT}%).`
      );
    } else {
      insights.push(
        `${100 - report.pass_rate}% peserta belum lulus (batas lulus ${PASS_THRESHOLD_PERCENT}%).`
      );
    }
  }

  const hardest = report.hardest_questions?.[0];

  if (hardest) {
    insights.push(
      hardest.wrong_percentage >= WRONG_MEDIUM_PERCENT
        ? `Soal no. ${hardest.question_number} paling sulit: ${hardest.wrong_percentage}% peserta salah atau tidak menjawab.`
        : `Tidak ada soal dengan tingkat salah di atas ${WRONG_MEDIUM_PERCENT}%.`
    );
  }

  return insights;
}

export function useTeacherReport() {
  const { user } = useAuth();

  const cachedOptions = readPageCache(user?.id, TRYOUT_OPTIONS_CACHE_KEY);

  const initialTryoutId =
    cachedOptions && cachedOptions.length > 0 ? String(cachedOptions[0].id) : "";

  const cachedReport = initialTryoutId
    ? readPageCache(user?.id, reportCacheKey(initialTryoutId))
    : undefined;

  const latestReportKeyRef = useRef(null);

  const [tryoutOptions, setTryoutOptions] = useState(() => cachedOptions ?? []);
  const [selectedTryoutId, setSelectedTryoutId] = useState(initialTryoutId);

  const [report, setReport] = useState(() => cachedReport ?? null);

  const [loadingOptions, setLoadingOptions] = useState(() => !cachedOptions);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    loadTryoutOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTryoutId) {
      loadReport(selectedTryoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTryoutId]);

  async function loadTryoutOptions() {
    const hasCachedOptions = Boolean(
      readPageCache(user?.id, TRYOUT_OPTIONS_CACHE_KEY)
    );

    try {
      if (!hasCachedOptions) {
        setLoadingOptions(true);
      }

      const data = await getTryouts();

      const mine = user
        ? data.filter((t) => t.created_by === user.id)
        : data;

      setTryoutOptions(mine);
      writePageCache(user?.id, TRYOUT_OPTIONS_CACHE_KEY, mine);

      setSelectedTryoutId((current) => {
        if (current && mine.some((t) => String(t.id) === current)) {
          return current;
        }
        return mine.length > 0 ? String(mine[0].id) : "";
      });

      if (mine.length === 0) {
        setReport(null);
      }
    } catch (err) {
      console.error("LOAD TRYOUT OPTIONS ERROR:", err);

      if (!hasCachedOptions) {
        toast.error(err.message || "Gagal memuat daftar tryout", { id: "load-teacher-report-options" });
      }
    } finally {
      setLoadingOptions(false);
    }
  }

  async function loadReport(tryoutId) {
    const cacheKey = reportCacheKey(tryoutId);
    const cachedData = readPageCache(user?.id, cacheKey);
    latestReportKeyRef.current = cacheKey;

    if (cachedData) {
      setReport(cachedData);
      setLoadingReport(false);
    } else {
      setLoadingReport(true);
    }

    try {
      const data = await getTeacherReport(tryoutId);
      writePageCache(user?.id, cacheKey, data);

      if (latestReportKeyRef.current === cacheKey) {
        setReport(data);
      }
    } catch (err) {
      console.error("LOAD REPORT ERROR:", err);

      if (!cachedData && latestReportKeyRef.current === cacheKey) {
        toast.error(err.message || "Gagal memuat laporan", { id: "load-teacher-report" });
        setReport(null);
      }
    } finally {
      if (latestReportKeyRef.current === cacheKey) {
        setLoadingReport(false);
      }
    }
  }

  const maxBucketCount = report
    ? Math.max(1, ...report.score_distribution.map((b) => b.count))
    : 1;

  const bucketTotal = report
    ? report.score_distribution.reduce((sum, b) => sum + b.count, 0)
    : 0;

  const scoreScale = report?.max_score > 0 ? report.max_score : null;

  const insights = buildInsights(report);

  const selectedTryout = tryoutOptions.find(
    (t) => String(t.id) === selectedTryoutId
  );

  const reportIsForSelected =
    report && String(report.tryout_id) === selectedTryoutId;

  const showFailedLink =
    reportIsForSelected &&
    report.pass_rate !== null &&
    report.pass_rate !== undefined &&
    report.pass_rate < 100;

  const tryoutInfo = selectedTryout
    ? [
        reportIsForSelected ? report.subject_name : null,
        selectedTryout.grade ? `Kelas ${selectedTryout.grade}` : null,
        selectedTryout.total_questions
          ? `${selectedTryout.total_questions} soal`
          : null,
        selectedTryout.duration_minutes
          ? `${selectedTryout.duration_minutes} menit`
          : null,
        selectedTryout.difficulty || null,
      ].filter(Boolean)
    : [];

  const averagePercent =
    scoreScale && report?.average_score !== null && report?.average_score !== undefined
      ? Math.round((report.average_score / scoreScale) * 100)
      : null;

  return {
    tryoutOptions,
    selectedTryoutId,
    setSelectedTryoutId,
    report,
    loadingOptions,
    loadingReport,
    maxBucketCount,
    bucketTotal,
    scoreScale,
    insights,
    selectedTryout,
    reportIsForSelected,
    showFailedLink,
    tryoutInfo,
    averagePercent
  };
}
