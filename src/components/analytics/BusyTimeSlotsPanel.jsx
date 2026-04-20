import { useMemo } from "react";
import { ListSkeleton } from "../common/Skeleton";

/**
 * Top busy clock hours from hourly distribution API.
 */
export default function BusyTimeSlotsPanel({ hourlyData, topN = 5, loading = false }) {
  if (loading) {
    return <ListSkeleton rows={topN} />;
  }

  const slots = useMemo(() => {
    if (!Array.isArray(hourlyData)) return [];
    return [...hourlyData]
      .map((h) => ({ ...h }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  }, [hourlyData, topN]);

  if (!slots.length) {
    return <p className="insight-panel__empty">No hourly data for this range.</p>;
  }

  const max = Math.max(...slots.map((s) => s.count), 1);

  return (
    <ol className="busy-slots" aria-label="Busiest time slots by entry count">
      {slots.map((s, i) => (
        <li key={s.hour} className="busy-slots__row">
          <span className="busy-slots__rank">{i + 1}</span>
          <div className="busy-slots__main">
            <div className="busy-slots__label-row">
              <span className="busy-slots__label">{s.label}</span>
              <span className="busy-slots__count">{s.count} entries</span>
            </div>
            <div className="busy-slots__bar-track">
              <div className="busy-slots__bar-fill" style={{ width: `${(s.count / max) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
