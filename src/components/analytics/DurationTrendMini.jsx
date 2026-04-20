import { useMemo } from "react";

/**
 * Sparkline of average session length by day (from footfall summary).
 */
export default function DurationTrendMini({ dailyAvg = [] }) {
  const pts = useMemo(() => {
    if (!dailyAvg.length) return { path: "", max: 1, min: 0 };
    const vals = dailyAvg.map((d) => d.avg_minutes || 0);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const denom = Math.max(dailyAvg.length - 1, 1);
    const path = dailyAvg
      .map((d, i) => {
        const x = (i / denom) * 100;
        const y = 100 - ((d.avg_minutes - min) / (max - min || 1)) * 100;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
    return { path, max, min };
  }, [dailyAvg]);

  if (!dailyAvg.length) {
    return <p className="insight-panel__empty">Not enough completed sessions for a trend.</p>;
  }

  return (
    <div className="duration-mini" role="img" aria-label="Average session duration by day.">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="duration-mini__svg">
        <line x1="0" y1="10" x2="100" y2="10" className="duration-mini__grid" />
        <line x1="0" y1="20" x2="100" y2="20" className="duration-mini__grid" />
        <line x1="0" y1="30" x2="100" y2="30" className="duration-mini__grid" />
        <path d={pts.path} className="duration-mini__line" fill="none" />
      </svg>
      <div className="duration-mini__axis">
        <span>{dailyAvg[0]?.day?.slice(5) || ""}</span>
        <span>{dailyAvg[dailyAvg.length - 1]?.day?.slice(5) || ""}</span>
      </div>
    </div>
  );
}
