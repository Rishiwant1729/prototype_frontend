import { useMemo } from "react";
import { BarChart3, TrendingUp, Clock } from "lucide-react";

export default function HourlyDistributionChart({ data, compact = false }) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return { hours: [], maxValue: 0 };

    const maxValue = Math.max(...data.map(h => h.count), 1);
    return { hours: data, maxValue };
  }, [data]);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="hourly-chart__empty">
        <div className="hourly-chart__empty-icon">
          <BarChart3 size={40} strokeWidth={1.5} />
        </div>
        <p className="hourly-chart__empty-text">No hourly data available</p>
      </div>
    );
  }

  const { hours, maxValue } = chartData;
  const chartHeight = compact ? 120 : 200;
  
  // Find peak hours
  const peakHours = hours
    .map((h, i) => ({ ...h, index: i }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Calculate total entries
  const totalEntries = hours.reduce((sum, h) => sum + h.count, 0);

  return (
    <div className={`hourly-chart ${compact ? "hourly-chart--compact" : ""}`}>
      <div className="hourly-chart__bars" style={{ height: `${chartHeight}px` }}>
        {/* Y-axis grid lines */}
        <div className="hourly-chart__grid">
          <div className="hourly-chart__grid-line" style={{ bottom: "100%" }}></div>
          <div className="hourly-chart__grid-line" style={{ bottom: "75%" }}></div>
          <div className="hourly-chart__grid-line" style={{ bottom: "50%" }}></div>
          <div className="hourly-chart__grid-line" style={{ bottom: "25%" }}></div>
          <div className="hourly-chart__grid-line" style={{ bottom: "0%" }}></div>
        </div>

        {hours.map((hour, i) => {
          const heightPercent = (hour.count / maxValue) * 100;
          const isPeak = peakHours.some(p => p.index === i);
          
          return (
            <div key={i} className="hourly-chart__bar-container">
              <div
                className={`hourly-chart__bar ${isPeak ? "hourly-chart__bar--peak" : ""}`}
                style={{ height: `${heightPercent}%` }}
                title={`${hour.label}: ${hour.count} entries`}
              >
                {!compact && hour.count > 0 && heightPercent > 20 && (
                  <span className="hourly-chart__bar-value">{hour.count}</span>
                )}
              </div>
              {!compact && (
                <span className="hourly-chart__bar-label">
                  {i % 3 === 0 ? hour.label : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Peak hours summary */}
      <div className="hourly-chart__summary">
        <div className="hourly-chart__summary-header">
          <TrendingUp size={14} strokeWidth={2} />
          <span>Peak Hours</span>
        </div>
        <div className="hourly-chart__peak-hours">
          {peakHours.map((peak, i) => (
            <span key={i} className="hourly-chart__peak-badge">
              <Clock size={12} />
              {peak.label}
              <span className="hourly-chart__peak-count">{peak.count}</span>
            </span>
          ))}
        </div>
        {!compact && (
          <div className="hourly-chart__total">
            <span className="hourly-chart__total-label">Total Entries</span>
            <span className="hourly-chart__total-value">{totalEntries.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
