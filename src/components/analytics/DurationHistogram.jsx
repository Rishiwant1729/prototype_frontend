import { useMemo } from "react";
import { SkeletonBlock } from "../common/Skeleton";

/**
 * Stay duration distribution (histogram) from summary.duration_distribution.
 */
export default function DurationHistogram({ bins, loading = false }) {
  const rows = useMemo(() => {
    if (!Array.isArray(bins)) return [];
    return bins.map((b) => ({
      label: b.label,
      count: Number(b.count ?? 0)
    }));
  }, [bins]);

  if (loading) {
    return <SkeletonBlock width="100%" height={180} radius={12} aria-label="Loading duration distribution" />;
  }

  if (!rows.length || rows.every((r) => r.count === 0)) {
    return <p className="insight-panel__empty">No completed session durations for this range.</p>;
  }

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="dur-hist" role="img" aria-label="Stay duration distribution histogram">
      <div className="dur-hist__plot" aria-hidden>
        {rows.map((r) => (
          <div key={r.label} className="dur-hist__bar">
            <div className="dur-hist__bar-track">
              <div className="dur-hist__bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <div className="dur-hist__bar-meta">
              <span className="dur-hist__label">{r.label}</span>
              <span className="dur-hist__value">{r.count.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="dur-hist__note">Counts are completed sessions with recorded exit time.</div>
    </div>
  );
}

