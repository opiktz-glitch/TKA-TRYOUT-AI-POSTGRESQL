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
        {busiestDay && ` · tersibuk ${new Date(busiestDay.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} (${busiestDay.count})`}
      </div>
      
      <div className="trend-chart">
        {attemptsTrend.map((day, index) => {
          const showDate = (attemptsTrend.length - 1 - index) % 2 === 0;

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
                title={`${new Date(day.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}: ${day.count} attempt`}
              />
              
              <div
                className="trend-bar-date"
                style={showDate ? undefined : { visibility: "hidden" }}
              >
                {new Date(day.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
