import { useMemo } from "react";
import { SkeletonBlock, ListSkeleton } from "../common/Skeleton";

const COLORS = ["#a32638", "#16a34a", "#0d9488", "#6366f1", "#d97706"];

/**
 * Donut chart for share of entries by facility (period totals).
 */
export default function FacilityShareDonut({ facilityShare = [], loading = false }) {
  if (loading) {
    return (
      <div className="facility-donut" aria-busy="true">
        <SkeletonBlock width={140} height={140} radius={999} aria-label="Loading facility share" />
        <div style={{ flex: 1, minWidth: 160 }}>
          <ListSkeleton rows={5} />
        </div>
      </div>
    );
  }

  const { segments, total } = useMemo(() => {
    const rows = facilityShare.filter((r) => r.entries > 0);
    const total = rows.reduce((s, r) => s + r.entries, 0);
    if (!total) return { segments: [], total: 0 };
    let acc = 0;
    const segments = rows.map((r, i) => {
      const pct = (r.entries / total) * 100;
      const start = acc;
      acc += pct;
      return {
        ...r,
        start,
        pct,
        color: COLORS[i % COLORS.length]
      };
    });
    return { segments, total };
  }, [facilityShare]);

  if (!segments.length) {
    return <p className="insight-panel__empty">No entry distribution for this range.</p>;
  }

  const gradient = segments
    .map((s) => `${s.color} ${s.start}% ${s.start + s.pct}%`)
    .join(", ");

  return (
    <div className="facility-donut">
      <div
        className="facility-donut__ring"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label={`Facility entry share across ${total} entries.`}
      >
        <div className="facility-donut__hole">
          <span className="facility-donut__total">{total.toLocaleString()}</span>
          <span className="facility-donut__hint">entries</span>
        </div>
      </div>
      <ul className="facility-donut__legend">
        {segments.map((s) => (
          <li key={s.facility_id}>
            <span className="facility-donut__dot" style={{ background: s.color }} />
            <span className="facility-donut__name">{s.label}</span>
            <span className="facility-donut__pct">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
