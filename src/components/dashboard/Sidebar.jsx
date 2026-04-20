import { formatDistanceToNow } from "../../utils/timeUtils";
import {
  Dumbbell,
  Waves,
  CircleDot,
  Radio,
  Users,
  UserRoundSearch
} from "lucide-react";

export default function Sidebar({
  facilityStats,
  recentScans = [],
  mergedRecentOps = [],
  studentQuery = "",
  onStudentQueryChange
}) {
  const getFacilityIcon = (facility) => {
    switch (facility) {
      case "GYM":
        return <Dumbbell size={14} />;
      case "SWIMMING":
        return <Waves size={14} />;
      case "BADMINTON":
        return <CircleDot size={14} />;
      default:
        return <Radio size={14} />;
    }
  };

  const getFacilityName = (facility) => {
    switch (facility) {
      case "GYM":
        return "Gymnasium";
      case "SWIMMING":
        return "Swimming pool";
      case "BADMINTON":
        return "Badminton court";
      case "SPORTS_ROOM":
        return "Sport room";
      default:
        return facility;
    }
  };

  const q = studentQuery.trim().toLowerCase();
  const searchHit = q
    ? recentScans.find((s) => String(s.student || "").toLowerCase().includes(q))
    : null;

  const timelineDotClass = (action) => {
    const a = String(action || "").toUpperCase();
    if (a === "ENTRY") return "kc-ops-timeline__dot--entry";
    if (a === "EXIT") return "kc-ops-timeline__dot--exit";
    if (a === "ISSUED" || a === "ISSUE") return "kc-ops-timeline__dot--issue";
    if (a === "RETURNED" || a === "RETURN") return "kc-ops-timeline__dot--return";
    return "kc-ops-timeline__dot--neutral";
  };

  const timelineVerb = (action) => {
    const a = String(action || "").toUpperCase();
    if (a === "ENTRY") return "Entry";
    if (a === "EXIT") return "Exit";
    if (a === "ISSUED" || a === "ISSUE") return "Issue";
    if (a === "RETURNED" || a === "RETURN") return "Return";
    return a || "Event";
  };

  return (
    <div className="sidebar kc-ops-sidebar">
      <section className="sidebar-card kc-ops-search-card">
        <h3 className="sidebar-card__title">
          <span className="sidebar-card__icon">
            <UserRoundSearch size={18} strokeWidth={2.25} />
          </span>
          Search student
        </h3>
        <div className="kc-ops-search-wrap">
          <UserRoundSearch className="kc-ops-search-icon" size={18} strokeWidth={2} aria-hidden />
          <input
            type="search"
            className="kc-ops-search-input"
            placeholder="ID or name…"
            value={studentQuery}
            onChange={(e) => onStudentQueryChange?.(e.target.value)}
            autoComplete="off"
          />
        </div>
        {searchHit ? (
          <div className="kc-ops-search-result">
            <div className="kc-ops-search-result__row">
              <div>
                <p className="kc-ops-search-result__name">{searchHit.student}</p>
                <p className="kc-ops-search-result__id">
                  {getFacilityName(searchHit.facility)} · {String(searchHit.action || "").toUpperCase()}
                </p>
              </div>
              <span className="kc-ops-pill kc-ops-pill--accent">Recent</span>
            </div>
            <p className="kc-ops-search-result__hint">Latest tap in the activity log</p>
          </div>
        ) : q ? (
          <p className="kc-ops-search-empty">No recent tap matches this search.</p>
        ) : null}
      </section>

      <section className="sidebar-card">
        <h3 className="sidebar-card__title">
          <span className="sidebar-card__icon">
            <Users size={18} strokeWidth={2.25} />
          </span>
          Live active students
        </h3>
        <p className="sidebar-card__subtitle">Entry / exit facilities</p>

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
              <span className="live-stat-label">Badminton court</span>
            </div>
            <div className="live-stat-count">{facilityStats.BADMINTON || 0}</div>
          </div>

          <div className="live-stat-item">
            <div className="live-stat-icon live-stat-icon--swimming">
              <Waves size={20} />
            </div>
            <div className="live-stat-info">
              <span className="live-stat-label">Swimming pool</span>
            </div>
            <div className="live-stat-count">{facilityStats.SWIMMING || 0}</div>
          </div>
        </div>
      </section>

      <section className="sidebar-card">
        <h3 className="sidebar-card__title">
          <span className="sidebar-card__icon">
            <Radio size={18} strokeWidth={2.25} />
          </span>
          Recent operations
        </h3>
        <p className="sidebar-card__subtitle">Gates & sport room</p>

        <div className="kc-ops-timeline">
          {mergedRecentOps.length === 0 ? (
            <p className="kc-ops-timeline__empty">No operations yet</p>
          ) : (
            mergedRecentOps.map((row) => (
              <div key={row.id} className="kc-ops-timeline__item">
                <span className={`kc-ops-timeline__dot ${timelineDotClass(row.action)}`} />
                <div className="kc-ops-timeline__body">
                  <p className="kc-ops-timeline__title">
                    <span className="kc-ops-timeline__verb">{timelineVerb(row.action)}:</span>{" "}
                    {row.student}
                  </p>
                  <p className="kc-ops-timeline__meta">
                    {formatDistanceToNow(row.time)} · {getFacilityName(row.facility)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
