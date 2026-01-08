import { formatDistanceToNow } from "../../utils/timeUtils";
import { 
  Dumbbell,
  Waves,
  CircleDot,
  Package,
  Radio,
  LogIn,
  LogOut,
  RotateCcw,
  Users,
  Activity,
  Inbox
} from "lucide-react";

export default function Sidebar({ 
  facilityStats, 
  recentFacilityScans = [], 
  recentSportsRoomActivity = [] 
}) {
  
  const getFacilityIcon = (facility) => {
    switch (facility) {
      case "GYM": return <Dumbbell size={14} />;
      case "SWIMMING": return <Waves size={14} />;
      case "BADMINTON": return <CircleDot size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getFacilityName = (facility) => {
    switch (facility) {
      case "GYM": return "Gymnasium";
      case "SWIMMING": return "Swimming Pool";
      case "BADMINTON": return "Badminton Court";
      default: return facility;
    }
  };

  return (
    <div className="sidebar">
      {/* Section 1: Live Active Students (Entry/Exit Facilities Only) */}
      <div className="sidebar-card">
        <h3 className="sidebar-card__title">
          <span className="sidebar-card__icon">
            <Users size={16} />
          </span>
          Live Active Students
        </h3>
        <p className="sidebar-card__subtitle">Entry/Exit Facilities</p>
        
        <div className="live-stats">
          <div className="live-stat-item">
            <div className="live-stat-icon live-stat-icon--gym">
              <Dumbbell size={20} />
            </div>
            <div className="live-stat-info">
              <span className="live-stat-label">Gymnasium</span>
            </div>
            <div className="live-stat-count">{facilityStats.GYM || 0}</div>
          </div>

          <div className="live-stat-item">
            <div className="live-stat-icon live-stat-icon--badminton">
              <CircleDot size={20} />
            </div>
            <div className="live-stat-info">
              <span className="live-stat-label">Badminton Court</span>
            </div>
            <div className="live-stat-count">{facilityStats.BADMINTON || 0}</div>
          </div>

          <div className="live-stat-item">
            <div className="live-stat-icon live-stat-icon--swimming">
              <Waves size={20} />
            </div>
            <div className="live-stat-info">
              <span className="live-stat-label">Swimming Pool</span>
            </div>
            <div className="live-stat-count">{facilityStats.SWIMMING || 0}</div>
          </div>
        </div>
      </div>

      {/* Section 2: Recent Facility Scans (Entry/Exit Only) */}
      <div className="sidebar-card">
        <h3 className="sidebar-card__title">
          <span className="sidebar-card__icon">
            <Radio size={16} />
          </span>
          Recent Facility Scans
        </h3>
        <p className="sidebar-card__subtitle">Gym • Badminton • Swimming</p>
        
        <div className="activity-list">
          {recentFacilityScans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Inbox size={24} />
              </div>
              <p>No recent scans</p>
            </div>
          ) : (
            recentFacilityScans.slice(0, 8).map((scan) => (
              <div key={scan.id} className={`activity-item activity-item--${scan.action.toLowerCase()}`}>
                <div className="activity-item__icon">
                  {getFacilityIcon(scan.facility)}
                </div>
                <div className="activity-item__content">
                  <span className="activity-item__name">{scan.student}</span>
                  <span className="activity-item__facility">{getFacilityName(scan.facility)}</span>
                </div>
                <div className={`activity-item__badge activity-item__badge--${scan.action.toLowerCase()}`}>
                  {scan.action === "ENTRY" ? <LogIn size={10} /> : <LogOut size={10} />}
                  <span>{scan.action}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 3: Recent Sport Room Activity */}
      <div className="sidebar-card">
        <h3 className="sidebar-card__title">
          <span className="sidebar-card__icon">
            <Package size={16} />
          </span>
          Sport Room Activity
        </h3>
        <p className="sidebar-card__subtitle">Equipment Issue & Return</p>
        
        <div className="activity-list">
          {recentSportsRoomActivity.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Package size={24} />
              </div>
              <p>No recent activity</p>
            </div>
          ) : (
            recentSportsRoomActivity.slice(0, 8).map((activity) => (
              <div key={activity.id} className={`activity-item activity-item--${activity.action.toLowerCase()}`}>
                <div className="activity-item__icon">
                  {activity.action === "ISSUED" ? <Package size={14} /> : <RotateCcw size={14} />}
                </div>
                <div className="activity-item__content">
                  <span className="activity-item__name">{activity.student}</span>
                  <span className="activity-item__facility">
                    {activity.itemCount ? `${activity.itemCount} item(s)` : "Sport Room"}
                  </span>
                </div>
                <div className={`activity-item__badge activity-item__badge--${activity.action.toLowerCase()}`}>
                  {activity.action === "ISSUED" ? <Package size={10} /> : <RotateCcw size={10} />}
                  <span>{activity.action}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
