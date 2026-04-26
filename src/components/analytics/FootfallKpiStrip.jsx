import { useMemo } from "react";
import {
  Users,
  LogIn,
  LogOut,
  Clock,
  Timer,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

/**
 * Compact KPI row for analytics overview.
 * Mixes real-time occupancy (from overview) + period-scoped footfall (from summary).
 */
export default function FootfallKpiStrip({ summary, dateRange, overview, alerts }) {
  const cards = useMemo(() => {
    if (!summary?.kpis && !overview) return [];
    const k = summary.kpis;
    const periodHint = dateRange?.startDate && dateRange?.endDate
      ? `${dateRange.startDate} → ${dateRange.endDate}`
      : "Selected period";

    const currentOccupancy = Number(overview?.occupancy?.total ?? 0);
    const avgStay = k.avg_session_minutes != null ? `${k.avg_session_minutes} min` : "—";
    const missingExits = Number(k.missing_exits_over_4h ?? 0);

    return [
      {
        id: "occupancy",
        label: "Current occupancy",
        value: currentOccupancy,
        sub: "Live right now",
        Icon: Users,
        accent: "occupancy",
        trend: null
      },
      {
        id: "entries",
        label: "Total entries",
        value: k.total_entries ?? 0,
        sub: periodHint,
        Icon: LogIn,
        accent: "entry",
        trend: null
      },
      {
        id: "exits",
        label: "Total exits",
        value: k.total_exits ?? 0,
        sub: periodHint,
        Icon: LogOut,
        accent: "exit",
        trend: null
      },
      {
        id: "peak",
        label: "Peak hour",
        value: k.peak_hour_label || "—",
        sub: `${k.peak_hour_count ?? 0} entries in window`,
        Icon: Clock,
        accent: "peak",
        trend: null
      },
      {
        id: "avgStay",
        label: "Avg. stay",
        value: avgStay,
        sub: "Completed sessions",
        Icon: Timer,
        accent: "avgstay",
        trend: null
      },
      {
        id: "unique",
        label: "Unique visitors",
        value: k.unique_visitors ?? 0,
        sub: "Distinct students (entries)",
        Icon: UserCheck,
        accent: "unique",
        trend: null
      },
      {
        id: "anomalies",
        label: "Missing exits",
        value: missingExits,
        sub: "Open entries > 4h (in range)",
        Icon: AlertTriangle,
        accent: "anomaly",
        trend: null
      }
    ].filter(Boolean);
  }, [summary, dateRange, overview]);

  if (!cards.length) return null;

  return (
    <section className="footfall-kpi-strip" aria-label="Footfall summary">
      {cards.map((c) => {
        const Icon = c.Icon;
        return (
          <article key={c.id} className={`footfall-kpi footfall-kpi--${c.accent}`}>
            <header className="footfall-kpi__head">
              <span className="footfall-kpi__icon" aria-hidden>
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="footfall-kpi__label">{c.label}</span>
            </header>
            <div className="footfall-kpi__value-row">
              <span className="footfall-kpi__value">{typeof c.value === "number" ? c.value.toLocaleString() : c.value}</span>
              {c.trend !== null && c.trend !== undefined && (
                <span className={`footfall-kpi__trend ${c.trend > 0 ? "up" : c.trend < 0 ? "down" : "flat"}`}>
                  {c.trend > 0 ? <TrendingUp size={14} /> : c.trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                </span>
              )}
            </div>
            <p className="footfall-kpi__sub">{c.sub}</p>
          </article>
        );
      })}
    </section>
  );
}
