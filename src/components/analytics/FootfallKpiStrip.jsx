import { useMemo } from "react";
import {
  LogIn,
  LogOut,
  Clock,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

/**
 * Compact footfall KPI row for analytics overview (period-scoped).
 */
export default function FootfallKpiStrip({ summary, dateRange }) {
  const cards = useMemo(() => {
    if (!summary?.kpis) return [];
    const k = summary.kpis;
    const growth = k.entries_growth_pct;
    const periodHint = dateRange?.startDate && dateRange?.endDate
      ? `${dateRange.startDate} → ${dateRange.endDate}`
      : "Selected period";

    return [
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
        id: "unique",
        label: "Unique visitors",
        value: k.unique_visitors ?? 0,
        sub: "Distinct students (entries)",
        Icon: UserCheck,
        accent: "unique",
        trend: null
      },
      {
        id: "growth",
        label: "Entry trend vs prior",
        value: growth === null || growth === undefined ? "—" : `${growth > 0 ? "+" : ""}${growth}%`,
        sub: "Same-length period before range",
        Icon: growth === null || growth === undefined || growth === 0 ? Minus : growth > 0 ? TrendingUp : TrendingDown,
        accent: "growth",
        trend: null
      }
    ];
  }, [summary, dateRange]);

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
