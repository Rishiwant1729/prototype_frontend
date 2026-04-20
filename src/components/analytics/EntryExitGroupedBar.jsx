import { useMemo } from "react";
import { SkeletonBlock } from "../common/Skeleton";

const MAX_BARS = 18;

/**
 * Grouped bar comparison: entries vs exits per time bucket (from time series API).
 */
export default function EntryExitGroupedBar({ data, loading = false }) {
  if (loading) {
    return (
      <div className="entryexit-bar" aria-busy="true">
        <div className="entryexit-bar__legend" aria-hidden="true">
          <span>
            <i className="entryexit-bar__swatch entryexit-bar__swatch--in" /> Entries
          </span>
          <span>
            <i className="entryexit-bar__swatch entryexit-bar__swatch--out" /> Exits
          </span>
        </div>
        <SkeletonBlock width="100%" height={210} radius={12} aria-label="Loading entry/exit bars" />
      </div>
    );
  }

  const { points, maxVal } = useMemo(() => {
    if (!data?.data?.length) return { points: [], maxVal: 1 };
    let pts = [...data.data];
    if (pts.length > MAX_BARS) {
      pts = pts.slice(-MAX_BARS);
    }
    const maxVal = Math.max(...pts.flatMap((p) => [p.entries || 0, p.exits || 0]), 1);
    return { points: pts, maxVal };
  }, [data]);

  if (!points.length) {
    return (
      <div className="entryexit-bar__empty" role="status">
        <p>No entry/exit buckets for this range.</p>
      </div>
    );
  }

  const labelShort = (period) => {
    if (!period) return "";
    const s = String(period);
    if (s.includes(" ")) return s.split(" ")[1] || s.slice(5, 10);
    return s.length > 10 ? s.slice(5) : s;
  };

  return (
    <div className="entryexit-bar" role="img" aria-label="Grouped bars comparing entries and exits per time slot.">
      <div className="entryexit-bar__legend">
        <span>
          <i className="entryexit-bar__swatch entryexit-bar__swatch--in" /> Entries
        </span>
        <span>
          <i className="entryexit-bar__swatch entryexit-bar__swatch--out" /> Exits
        </span>
      </div>
      <div className="entryexit-bar__plot" aria-hidden>
        {points.map((p, i) => {
          const hIn = ((p.entries || 0) / maxVal) * 100;
          const hOut = ((p.exits || 0) / maxVal) * 100;
          return (
            <div key={i} className="entryexit-bar__group">
              <div className="entryexit-bar__pair">
                <div
                  className="entryexit-bar__rect entryexit-bar__rect--in"
                  style={{ height: `${hIn}%` }}
                  title={`Entries: ${p.entries}`}
                />
                <div
                  className="entryexit-bar__rect entryexit-bar__rect--out"
                  style={{ height: `${hOut}%` }}
                  title={`Exits: ${p.exits}`}
                />
              </div>
              <span className="entryexit-bar__tick">{labelShort(p.period)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
