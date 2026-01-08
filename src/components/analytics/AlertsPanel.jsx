import { 
  AlertTriangle, 
  CheckCircle2, 
  DoorOpen, 
  Clock, 
  User, 
  MapPin,
  Package,
  Bell,
  ChevronRight,
  AlertCircle
} from "lucide-react";

export default function AlertsPanel({ alerts, compact = false }) {
  if (!alerts) {
    return (
      <div className="alerts-panel__empty">
        <div className="alerts-panel__empty-icon">
          <Bell size={32} strokeWidth={1.5} />
        </div>
        <p className="alerts-panel__empty-text">Loading alerts...</p>
      </div>
    );
  }

  const { unmatched_entries = [], overdue_returns = [], total_alerts = 0 } = alerts;

  if (total_alerts === 0) {
    return (
      <div className="alerts-panel__empty alerts-panel__empty--success">
        <div className="alerts-panel__empty-icon alerts-panel__empty-icon--success">
          <CheckCircle2 size={40} strokeWidth={1.5} />
        </div>
        <p className="alerts-panel__empty-text">No active alerts</p>
        <span className="alerts-panel__empty-subtext">Everything looks good!</span>
      </div>
    );
  }

  const formatTimeAgo = (hoursAgo) => {
    if (hoursAgo < 1) return "Less than an hour";
    if (hoursAgo < 24) return `${hoursAgo} hours ago`;
    const days = Math.floor(hoursAgo / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className={`alerts-panel ${compact ? "alerts-panel--compact" : ""}`}>
      {/* Unmatched Entries */}
      {unmatched_entries.length > 0 && (
        <div className="alerts-panel__section">
          <div className="alerts-panel__section-header">
            <div className="alerts-panel__section-icon alerts-panel__section-icon--warning">
              <DoorOpen size={18} strokeWidth={2} />
            </div>
            <div className="alerts-panel__section-info">
              <h4 className="alerts-panel__section-title">
                Unmatched Entries
                <span className="alerts-panel__section-count">{unmatched_entries.length}</span>
              </h4>
              <span className="alerts-panel__section-subtitle">
                Students who entered but haven't exited (4+ hours)
              </span>
            </div>
          </div>
          
          <div className="alerts-panel__list">
            {unmatched_entries.slice(0, compact ? 3 : 20).map((entry, idx) => (
              <div key={idx} className="alerts-panel__item alerts-panel__item--unmatched">
                <div className="alerts-panel__item-icon">
                  <User size={16} strokeWidth={2} />
                </div>
                <div className="alerts-panel__item-content">
                  <div className="alerts-panel__item-title">{entry.student_name}</div>
                  <div className="alerts-panel__item-meta">
                    <span className="alerts-panel__meta-item">
                      <User size={12} /> {entry.student_id}
                    </span>
                    <span className="alerts-panel__meta-item">
                      <MapPin size={12} /> {entry.facility_id}
                    </span>
                    <span className="alerts-panel__meta-item alerts-panel__meta-item--time">
                      <Clock size={12} /> {formatTimeAgo(entry.hours_ago)}
                    </span>
                  </div>
                </div>
                <div className="alerts-panel__item-badge alerts-panel__item-badge--warning">
                  <Clock size={12} />
                  {entry.hours_ago}h
                </div>
              </div>
            ))}
            
            {compact && unmatched_entries.length > 3 && (
              <button className="alerts-panel__show-more">
                <span>+{unmatched_entries.length - 3} more</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overdue Equipment Returns */}
      {overdue_returns.length > 0 && (
        <div className="alerts-panel__section">
          <div className="alerts-panel__section-header">
            <div className="alerts-panel__section-icon alerts-panel__section-icon--danger">
              <Clock size={18} strokeWidth={2} />
            </div>
            <div className="alerts-panel__section-info">
              <h4 className="alerts-panel__section-title">
                Overdue Equipment
                <span className="alerts-panel__section-count alerts-panel__section-count--danger">{overdue_returns.length}</span>
              </h4>
              <span className="alerts-panel__section-subtitle">
                Equipment not returned within 24 hours
              </span>
            </div>
          </div>
          
          <div className="alerts-panel__list">
            {overdue_returns.slice(0, compact ? 3 : 20).map((item, idx) => (
              <div key={idx} className="alerts-panel__item alerts-panel__item--overdue">
                <div className="alerts-panel__item-icon alerts-panel__item-icon--danger">
                  <Package size={16} strokeWidth={2} />
                </div>
                <div className="alerts-panel__item-content">
                  <div className="alerts-panel__item-title">{item.student_name}</div>
                  <div className="alerts-panel__item-meta">
                    <span className="alerts-panel__meta-item">
                      <User size={12} /> {item.student_id}
                    </span>
                    <span className="alerts-panel__meta-item">
                      Issue #{item.issue_id}
                    </span>
                  </div>
                  <div className="alerts-panel__item-tags">
                    {item.items.map((eq, i) => (
                      <span key={i} className="alerts-panel__equipment-tag">
                        <Package size={10} />
                        {eq.equipment_type} ×{eq.pending_qty}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="alerts-panel__item-badge alerts-panel__item-badge--danger">
                  <AlertCircle size={12} />
                  {item.hours_ago}h
                </div>
              </div>
            ))}
            
            {compact && overdue_returns.length > 3 && (
              <button className="alerts-panel__show-more">
                <span>+{overdue_returns.length - 3} more</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {!compact && (
        <div className="alerts-panel__summary">
          <div className="alerts-panel__summary-card">
            <div className="alerts-panel__summary-icon alerts-panel__summary-icon--warning">
              <DoorOpen size={20} strokeWidth={2} />
            </div>
            <span className="alerts-panel__summary-value">{unmatched_entries.length}</span>
            <span className="alerts-panel__summary-label">Unmatched Entries</span>
          </div>
          <div className="alerts-panel__summary-card">
            <div className="alerts-panel__summary-icon alerts-panel__summary-icon--danger">
              <Clock size={20} strokeWidth={2} />
            </div>
            <span className="alerts-panel__summary-value">{overdue_returns.length}</span>
            <span className="alerts-panel__summary-label">Overdue Returns</span>
          </div>
          <div className="alerts-panel__summary-card alerts-panel__summary-card--total">
            <div className="alerts-panel__summary-icon alerts-panel__summary-icon--total">
              <AlertTriangle size={20} strokeWidth={2} />
            </div>
            <span className="alerts-panel__summary-value">{total_alerts}</span>
            <span className="alerts-panel__summary-label">Total Alerts</span>
          </div>
        </div>
      )}
    </div>
  );
}
