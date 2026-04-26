import { useMemo } from "react";
import { SkeletonBlock } from "../common/Skeleton";

/**
 * Repeat vs new visitors (period scoped).
 */
export default function RepeatNewSplit({ kpis, loading = false }) {
  const { repeat, fresh, total } = useMemo(() => {
    const repeat = Number(kpis?.repeat_visitors ?? 0);
    const fresh = Number(kpis?.new_visitors ?? Math.max(0, Number(kpis?.unique_visitors ?? 0) - repeat));
    const total = Math.max(0, repeat + fresh);
    return { repeat, fresh, total };
  }, [kpis]);

  if (loading) {
    return (
      <div className="repeat-split" aria-busy="true">
        <SkeletonBlock width={140} height={140} radius={999} aria-label="Loading visitor split" />
        <div className="repeat-split__legend">
          <SkeletonBlock width="80%" height={10} radius="pill" />
          <SkeletonBlock width="70%" height={10} radius="pill" style={{ marginTop: 10 }} />
          <SkeletonBlock width="60%" height={10} radius="pill" style={{ marginTop: 10 }} />
        </div>
      </div>
    );
  }

  if (!total) {
    return <p className="insight-panel__empty">No visitor split available for this range.</p>;
  }

  const repeatPct = Math.round((repeat / total) * 100);
  const freshPct = 100 - repeatPct;
  const gradient = `#2563eb 0% ${freshPct}%, #16a34a ${freshPct}% 100%`;

  return (
    <div className="repeat-split" role="img" aria-label="Repeat vs new visitors">
      <div className="repeat-split__ring" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="repeat-split__hole">
          <div className="repeat-split__total">{total.toLocaleString()}</div>
          <div className="repeat-split__hint">visitors</div>
        </div>
      </div>
      <div className="repeat-split__legend">
        <div className="repeat-split__row">
          <span className="repeat-split__dot repeat-split__dot--new" />
          <span className="repeat-split__name">New</span>
          <span className="repeat-split__val">{fresh.toLocaleString()} ({freshPct}%)</span>
        </div>
        <div className="repeat-split__row">
          <span className="repeat-split__dot repeat-split__dot--repeat" />
          <span className="repeat-split__name">Repeat</span>
          <span className="repeat-split__val">{repeat.toLocaleString()} ({repeatPct}%)</span>
        </div>
        <div className="repeat-split__note">Repeat visitors = students with 2+ entries in the selected range.</div>
      </div>
    </div>
  );
}

