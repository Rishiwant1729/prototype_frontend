import { useMemo } from "react";
import { 
  Users, 
  UserCheck, 
  Package, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

/**
 * KPI Cards Component
 * Displays key performance indicators in a grid layout
 * Follows card-based design with consistent spacing and typography
 */
export default function KPICards({ overview, dateRange }) {
  const kpis = useMemo(() => {
    if (!overview) return [];

    const occupancy = overview.occupancy;
    const visitors = overview.visitors;
    const equipment = overview.active_equipment;
    const alerts = overview.alerts;

    return [
      {
        id: "occupancy",
        label: "Current Occupancy",
        value: occupancy?.total || 0,
        Icon: Users,
        color: "primary",
        subtext: `Across ${occupancy?.facilities?.length || 0} facilities`,
        trend: null,
        details: occupancy?.facilities?.map(f => ({
          label: f.facility_name || f.facility_id,
          value: f.current_count
        })) || []
      },
      {
        id: "visitors",
        label: "Today's Visitors",
        value: visitors?.total_unique || 0,
        Icon: UserCheck,
        color: "success",
        subtext: "Unique students today",
        trend: null,
        details: visitors?.facilities?.map(f => ({
          label: f.facility_id,
          value: f.unique_visitors
        })) || []
      },
      {
        id: "equipment",
        label: "Active Equipment",
        value: equipment?.total_pending_items || 0,
        Icon: Package,
        color: "warning",
        subtext: `${equipment?.active_issues || 0} open issues`,
        trend: null,
        details: []
      },
      {
        id: "alerts",
        label: "Active Alerts",
        value: alerts?.total || 0,
        Icon: AlertTriangle,
        color: alerts?.total > 0 ? "danger" : "muted",
        subtext: alerts?.total > 0 
          ? `${alerts.unmatched_entries} unmatched, ${alerts.overdue_returns} overdue` 
          : "No active alerts",
        trend: null,
        details: []
      }
    ];
  }, [overview]);

  const getTrendIcon = (trend) => {
    if (!trend) return null;
    if (trend > 0) return <TrendingUp className="trend-icon up" size={14} />;
    if (trend < 0) return <TrendingDown className="trend-icon down" size={14} />;
    return <Minus className="trend-icon neutral" size={14} />;
  };

  return (
    <div className="kpi-grid">
      {kpis.map((kpi) => {
        const IconComponent = kpi.Icon;
        return (
          <article key={kpi.id} className={`kpi-card kpi-card--${kpi.color}`}>
            <header className="kpi-card__header">
              <div className={`kpi-card__icon kpi-card__icon--${kpi.color}`}>
                <IconComponent size={24} strokeWidth={2} />
              </div>
              <span className="kpi-card__label">{kpi.label}</span>
            </header>
            
            <div className="kpi-card__body">
              <div className="kpi-card__value-row">
                <span className="kpi-card__value">{kpi.value.toLocaleString()}</span>
                {kpi.trend !== null && (
                  <span className={`kpi-card__trend kpi-card__trend--${kpi.trend > 0 ? 'up' : kpi.trend < 0 ? 'down' : 'neutral'}`}>
                    {getTrendIcon(kpi.trend)}
                    <span>{Math.abs(kpi.trend)}%</span>
                  </span>
                )}
              </div>
              <p className="kpi-card__subtext">{kpi.subtext}</p>
            </div>
            
            {kpi.details.length > 0 && (
              <footer className="kpi-card__footer">
                {kpi.details.slice(0, 4).map((detail, idx) => (
                  <div key={idx} className="kpi-card__detail">
                    <span className="kpi-card__detail-label">{detail.label}</span>
                    <span className="kpi-card__detail-value">{detail.value}</span>
                  </div>
                ))}
              </footer>
            )}
          </article>
        );
      })}
    </div>
  );
}
