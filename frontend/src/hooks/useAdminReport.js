import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { getAdminReportOverview } from "../services/api";
import { readPageCache, writePageCache } from "../services/pageCache";
import toast from "react-hot-toast";

const REPORT_CACHE_KEY = "admin-report";

export function useAdminReport() {
  const { user } = useAuth();

  const cachedReport = readPageCache(user?.id, REPORT_CACHE_KEY);

  const [report, setReport] = useState(() => cachedReport ?? null);
  const [loading, setLoading] = useState(() => !cachedReport);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    const hasCachedReport = Boolean(readPageCache(user?.id, REPORT_CACHE_KEY));

    try {
      if (!hasCachedReport) {
        setLoading(true);
      }

      const data = await getAdminReportOverview();

      setReport(data);
      writePageCache(user?.id, REPORT_CACHE_KEY, data);
    } catch (err) {
      console.error("LOAD ADMIN REPORT ERROR:", err);

      if (!hasCachedReport) {
        toast.error(err.message || "Gagal memuat laporan", { id: "load-admin-report" });
      }
    } finally {
      setLoading(false);
    }
  }

  // Rata-rata per mapel dalam PERSEN dari skor maksimal tiap tryout
  function subjectPercentage(subject) {
    return subject.average_percentage ?? subject.average_score;
  }

  const overallPercentage =
    report?.average_percentage_overall ?? report?.average_score_overall ?? null;

  function scoreBarWidth(percentage) {
    return Math.min(100, Math.max(0, percentage));
  }

  const maxTrendCount = report
    ? Math.max(1, ...report.attempts_trend.map((d) => d.count))
    : 1;

  const trendDays = report ? report.attempts_trend.length : 0;

  const trendTotal = report
    ? report.attempts_trend.reduce((sum, d) => sum + d.count, 0)
    : 0;

  const busiestDay = report
    ? report.attempts_trend.reduce(
        (best, d) => (d.count > (best?.count ?? 0) ? d : best),
        null
      )
    : null;

  return {
    report,
    loading,
    overallPercentage,
    subjectPercentage,
    scoreBarWidth,
    maxTrendCount,
    trendDays,
    trendTotal,
    busiestDay,
  };
}
