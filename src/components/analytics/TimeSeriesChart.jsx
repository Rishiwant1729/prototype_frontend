import { useMemo } from "react";
import { TrendingUp, TrendingDown, LineChart, ArrowRightLeft, LogIn, LogOut } from "lucide-react";

export default function TimeSeriesChart({ data, compact = false }) {
  const chartData = useMemo(() => {
    if (!data || !data.data) return { points: [], maxValue: 0 };

    const points = data.data;
    const maxValue = Math.max(
      ...points.map(p => Math.max(p.entries, p.exits)),
      1
    );

    return { points, maxValue };
  }, [data]);

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="timeseries__empty">
        <div className="timeseries__empty-icon">
          <LineChart size={40} strokeWidth={1.5} />
        </div>
        <p className="timeseries__empty-text">No data available for the selected period</p>
      </div>
    );
  }

  const { points, maxValue } = chartData;
  const chartHeight = compact ? 150 : 250;

  // Calculate SVG path for entries
  const entriesPath = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 100 - (p.entries / maxValue) * 100;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  // Calculate SVG path for exits
  const exitsPath = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 100 - (p.exits / maxValue) * 100;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  // Create area fill path for entries
  const entriesAreaPath = `${entriesPath} L 100 100 L 0 100 Z`;

  // Calculate totals and net change
  const totalEntries = points.reduce((sum, p) => sum + p.entries, 0);
  const totalExits = points.reduce((sum, p) => sum + p.exits, 0);
  const netChange = points.reduce((sum, p) => sum + p.net, 0);

  return (
    <div className={`timeseries ${compact ? "timeseries--compact" : ""}`}>
      {/* Chart container */}
      <div className="timeseries__chart-container">
        {/* Y-axis labels */}
        <div className="timeseries__y-axis">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue * 0.5)}</span>
          <span>0</span>
        </div>

        {/* Main chart */}
        <div className="timeseries__chart">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="timeseries__svg"
            style={{ height: `${chartHeight}px` }}
          >
            {/* Grid lines */}
            <line x1="0" y1="25" x2="100" y2="25" className="timeseries__grid-line" />
            <line x1="0" y1="50" x2="100" y2="50" className="timeseries__grid-line" />
            <line x1="0" y1="75" x2="100" y2="75" className="timeseries__grid-line" />

            {/* Area fill for entries */}
            <path d={entriesAreaPath} className="timeseries__area timeseries__area--entries" />

            {/* Lines */}
            <path d={entriesPath} className="timeseries__line timeseries__line--entries" fill="none" />
            <path d={exitsPath} className="timeseries__line timeseries__line--exits" fill="none" />

            {/* Data points for entries */}
            {!compact && points.map((p, i) => (
              <circle
                key={`entry-${i}`}
                cx={(i / (points.length - 1)) * 100}
                cy={100 - (p.entries / maxValue) * 100}
                r="1.2"
                className="timeseries__point timeseries__point--entries"
              />
            ))}

            {/* Data points for exits */}
            {!compact && points.map((p, i) => (
              <circle
                key={`exit-${i}`}
                cx={(i / (points.length - 1)) * 100}
                cy={100 - (p.exits / maxValue) * 100}
                r="1.2"
                className="timeseries__point timeseries__point--exits"
              />
            ))}
          </svg>

          {/* X-axis labels */}
          {!compact && points.length > 0 && (
            <div className="timeseries__x-axis">
              <span>{points[0]?.period?.split(" ")[0] || ""}</span>
              <span>{points[Math.floor(points.length / 2)]?.period?.split(" ")[0] || ""}</span>
              <span>{points[points.length - 1]?.period?.split(" ")[0] || ""}</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="timeseries__legend">
        <div className="timeseries__legend-item">
          <span className="timeseries__legend-color timeseries__legend-color--entries"></span>
          <LogIn size={12} />
          <span>Entries</span>
        </div>
        <div className="timeseries__legend-item">
          <span className="timeseries__legend-color timeseries__legend-color--exits"></span>
          <LogOut size={12} />
          <span>Exits</span>
        </div>
      </div>

      {/* Stats summary */}
      <div className="timeseries__stats">
        <div className="timeseries__stat">
          <div className="timeseries__stat-icon timeseries__stat-icon--entries">
            <LogIn size={14} strokeWidth={2} />
          </div>
          <div className="timeseries__stat-content">
            <span className="timeseries__stat-label">Total Entries</span>
            <span className="timeseries__stat-value timeseries__stat-value--entries">
              {totalEntries.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="timeseries__stat">
          <div className="timeseries__stat-icon timeseries__stat-icon--exits">
            <LogOut size={14} strokeWidth={2} />
          </div>
          <div className="timeseries__stat-content">
            <span className="timeseries__stat-label">Total Exits</span>
            <span className="timeseries__stat-value timeseries__stat-value--exits">
              {totalExits.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="timeseries__stat">
          <div className={`timeseries__stat-icon ${netChange >= 0 ? "timeseries__stat-icon--positive" : "timeseries__stat-icon--negative"}`}>
            {netChange >= 0 ? <TrendingUp size={14} strokeWidth={2} /> : <TrendingDown size={14} strokeWidth={2} />}
          </div>
          <div className="timeseries__stat-content">
            <span className="timeseries__stat-label">Net Change</span>
            <span className={`timeseries__stat-value ${netChange >= 0 ? "timeseries__stat-value--positive" : "timeseries__stat-value--negative"}`}>
              {netChange >= 0 ? "+" : ""}{netChange.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
