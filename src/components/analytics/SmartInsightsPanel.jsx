import { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { SkeletonBlock } from "../common/Skeleton";

function pct(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}%`;
}

export default function SmartInsightsPanel({ summary, hourlyData, overview, loading = false }) {
  const insights = useMemo(() => {
    if (!summary?.kpis) return [];
    const k = summary.kpis;
    const arr = [];

    if (k.peak_hour_label) {
      arr.push({
        title: "Peak time window",
        text: `${k.peak_hour_label} recorded the highest entry volume (${k.peak_hour_count ?? 0} entries).`
      });
    }

    if (k.entries_growth_pct != null) {
      arr.push({
        title: "Trend vs prior period",
        text: `Entries changed by ${pct(k.entries_growth_pct)} compared to the previous same-length period.`
      });
    }

    if ((k.missing_exits_over_4h ?? 0) > 0) {
      arr.push({
        title: "Potential scan anomaly",
        text: `${k.missing_exits_over_4h} entries have no matching exit after 4+ hours (within range). Investigate gate scans or auto-timeouts.`
      });
    }

    const occ = Number(overview?.occupancy?.total ?? 0);
    if (occ >= 0) {
      arr.push({
        title: "Live occupancy",
        text: `Right now there are ${occ.toLocaleString()} students inside across entry/exit facilities.`
      });
    }

    if (Number(k.repeat_visitors ?? 0) + Number(k.new_visitors ?? 0) > 0) {
      const total = Number(k.repeat_visitors ?? 0) + Number(k.new_visitors ?? 0);
      const repeatPct = Math.round((Number(k.repeat_visitors ?? 0) / total) * 100);
      arr.push({
        title: "Visitor behavior",
        text: `${repeatPct}% of visitors were repeat users (2+ entries in range).`
      });
    }

    return arr.slice(0, 5);
  }, [summary, hourlyData, overview]);

  if (loading) {
    return <SkeletonBlock width="100%" height={170} radius={12} aria-label="Loading smart insights" />;
  }

  if (!insights.length) {
    return <p className="insight-panel__empty">No insights available for this range.</p>;
  }

  return (
    <div className="smart-insights" aria-label="Smart insights">
      <div className="smart-insights__head">
        <Lightbulb size={18} strokeWidth={2} />
        <span>Smart insights</span>
      </div>
      <ul className="smart-insights__list">
        {insights.map((i) => (
          <li key={i.title} className="smart-insights__item">
            <div className="smart-insights__title">{i.title}</div>
            <div className="smart-insights__text">{i.text}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

