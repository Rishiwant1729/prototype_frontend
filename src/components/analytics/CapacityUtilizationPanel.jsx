import { useMemo } from "react";
import { SkeletonBlock } from "../common/Skeleton";

const CAPACITY = {
  GYM: 120,
  BADMINTON: 40,
  SWIMMING: 60
};

const labelFor = (id) => {
  switch (id) {
    case "GYM":
      return "Gymnasium";
    case "BADMINTON":
      return "Badminton court";
    case "SWIMMING":
      return "Swimming pool";
    default:
      return id;
  }
};

/**
 * Capacity utilization (live) using overview.occupancy.facilities and a configured capacity map.
 */
export default function CapacityUtilizationPanel({ overview, loading = false }) {
  const rows = useMemo(() => {
    const facilities = overview?.occupancy?.facilities;
    if (!Array.isArray(facilities)) return [];
    return facilities
      .filter((f) => ["GYM", "BADMINTON", "SWIMMING"].includes(f.facility_id))
      .map((f) => {
        const cap = CAPACITY[f.facility_id] || null;
        const current = Number(f.current_count ?? 0);
        const pct = cap ? Math.min(100, Math.round((current / cap) * 100)) : null;
        return { id: f.facility_id, name: labelFor(f.facility_id), cap, current, pct };
      });
  }, [overview]);

  if (loading) {
    return <SkeletonBlock width="100%" height={170} radius={12} aria-label="Loading capacity utilization" />;
  }

  if (!rows.length) {
    return <p className="insight-panel__empty">No live occupancy available.</p>;
  }

  return (
    <div className="capacity-util" role="img" aria-label="Capacity utilization by facility">
      {rows.map((r) => (
        <div key={r.id} className="capacity-util__row">
          <div className="capacity-util__top">
            <span className="capacity-util__name">{r.name}</span>
            <span className="capacity-util__val">
              {r.current.toLocaleString()}
              {r.cap ? ` / ${r.cap.toLocaleString()}` : ""}{" "}
              {r.pct != null ? <strong>({r.pct}%)</strong> : null}
            </span>
          </div>
          <div className="capacity-util__track" aria-hidden>
            <div className="capacity-util__fill" style={{ width: `${r.pct ?? 0}%` }} />
          </div>
        </div>
      ))}
      <div className="capacity-util__note">
        Capacity is a configured reference used for utilization (adjust in the code as needed).
      </div>
    </div>
  );
}

