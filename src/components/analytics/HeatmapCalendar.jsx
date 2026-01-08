import { useMemo } from "react";
import { CalendarDays, Info } from "lucide-react";

export default function HeatmapCalendar({ data }) {
  const heatmapData = useMemo(() => {
    if (!data || !data.flat) return { cells: [], maxValue: 0, days: [] };

    const maxValue = Math.max(...data.flat.map(c => c.count), 1);
    return {
      cells: data.flat,
      matrix: data.matrix,
      maxValue,
      days: data.days || ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    };
  }, [data]);

  if (!data || !data.flat || data.flat.length === 0) {
    return (
      <div className="heatmap__empty">
        <div className="heatmap__empty-icon">
          <CalendarDays size={40} strokeWidth={1.5} />
        </div>
        <p className="heatmap__empty-text">No heatmap data available</p>
      </div>
    );
  }

  const { cells, maxValue, days } = heatmapData;

  // Get intensity class based on count
  const getIntensityClass = (count) => {
    if (count === 0) return "heatmap__cell--intensity-0";
    const percent = count / maxValue;
    if (percent < 0.2) return "heatmap__cell--intensity-1";
    if (percent < 0.4) return "heatmap__cell--intensity-2";
    if (percent < 0.6) return "heatmap__cell--intensity-3";
    if (percent < 0.8) return "heatmap__cell--intensity-4";
    return "heatmap__cell--intensity-5";
  };

  // Generate hours for header
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Format hour for display
  const formatHour = (h) => {
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };

  return (
    <div className="heatmap">
      {/* Info tooltip */}
      <div className="heatmap__info">
        <Info size={14} strokeWidth={2} />
        <span>Hover over cells to see entry counts</span>
      </div>

      {/* Hours header */}
      <div className="heatmap__header">
        <div className="heatmap__day-label heatmap__day-label--header"></div>
        {hours.map(h => (
          <div key={h} className="heatmap__hour-label">
            {h % 6 === 0 ? formatHour(h) : ""}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="heatmap__grid">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="heatmap__row">
            <div className="heatmap__day-label">{day}</div>
            {hours.map(hour => {
              const cell = cells.find(c => c.day === dayIndex && c.hour === hour);
              const count = cell?.count || 0;
              return (
                <div
                  key={hour}
                  className={`heatmap__cell ${getIntensityClass(count)}`}
                  title={`${day} ${formatHour(hour)} — ${count} entries`}
                  data-count={count}
                >
                  {count > 0 && count >= maxValue * 0.6 && (
                    <span className="heatmap__cell-value">{count}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="heatmap__legend">
        <span className="heatmap__legend-label">Less</span>
        <div className="heatmap__legend-cells">
          <div className="heatmap__legend-cell heatmap__cell--intensity-0"></div>
          <div className="heatmap__legend-cell heatmap__cell--intensity-1"></div>
          <div className="heatmap__legend-cell heatmap__cell--intensity-2"></div>
          <div className="heatmap__legend-cell heatmap__cell--intensity-3"></div>
          <div className="heatmap__legend-cell heatmap__cell--intensity-4"></div>
          <div className="heatmap__legend-cell heatmap__cell--intensity-5"></div>
        </div>
        <span className="heatmap__legend-label">More</span>
        <span className="heatmap__legend-max">(max: {maxValue})</span>
      </div>
    </div>
  );
}
