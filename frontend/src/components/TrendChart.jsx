import { formatDate } from "../utils/date";

export default function TrendChart({ attemptsTrend, maxTrendCount, trendTotal, trendDays, busiestDay }) {
  if (trendTotal === 0) {
    return (
      <div className="trend-summary">
        Belum ada attempt dalam {trendDays} hari terakhir.
      </div>
    );
  }

  return (
    <>
      <div className="trend-summary">
        Total {trendTotal} attempt dalam {trendDays} hari terakhir
        {busiestDay && ` · tersibuk ${formatDate(busiestDay.date)} (${busiestDay.count})`}
      </div>
      
      <div className="trend-chart">
        {attemptsTrend.map((day, index) => {
          const showDate =
            index === attemptsTrend.length - 1 ||
            (attemptsTrend.length - 1 - index) % 7 === 0;

          return (
            <div className="trend-bar-col" key={day.date}>
              {day.count > 0 && (
                <div className="trend-bar-value">{day.count}</div>
              )}
              
              <div
                className="trend-bar"
                style={{
                  height: `${(day.count / maxTrendCount) * 80}%`,
                }}
              />
              
              <div className="trend-tooltip">
                <strong>{formatDate(day.date)}</strong>
                <br />
                {day.count} attempt
              </div>
              
              <div
                className="trend-bar-date"
                style={showDate ? undefined : { visibility: "hidden" }}
              >
                {formatDate(day.date)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
