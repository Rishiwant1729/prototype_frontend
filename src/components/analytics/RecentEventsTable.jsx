import { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  LogIn,
  LogOut,
  Package,
  RotateCcw,
  Clock,
  User,
  Building2,
  CircleDot,
  Dumbbell,
  Waves,
  FileText,
  ChevronDown
} from "lucide-react";
import { TableSkeleton } from "../common/Skeleton";

const facilityLabel = (id) => {
  switch (id) {
    case "GYM":
      return "Gymnasium";
    case "BADMINTON":
      return "Badminton court";
    case "SWIMMING":
      return "Swimming pool";
    case "SPORTS_ROOM":
      return "Sport room";
    default:
      return id || "—";
  }
};

export default function RecentEventsTable({
  events,
  compact = false,
  layout = "default",
  loading = false,
  /** default: show facility. "equipment": label last column as equipment + render equipment icon */
  facilityMode = "facility"
}) {
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");

  const eventTypes = [
    { value: "ALL", label: "All Events", icon: Filter },
    { value: "ENTRY", label: "Entries", icon: LogIn },
    { value: "EXIT", label: "Exits", icon: LogOut },
    { value: "EQUIPMENT_ISSUE", label: "Equipment Issues", icon: Package },
    { value: "EQUIPMENT_RETURN", label: "Equipment Returns", icon: RotateCcw }
  ];

  const getEventIcon = (type) => {
    switch (type) {
      case "ENTRY": return <LogIn size={14} strokeWidth={2} />;
      case "EXIT": return <LogOut size={14} strokeWidth={2} />;
      case "EQUIPMENT_ISSUE": return <Package size={14} strokeWidth={2} />;
      case "EQUIPMENT_RETURN": return <RotateCcw size={14} strokeWidth={2} />;
      default: return <FileText size={14} strokeWidth={2} />;
    }
  };

  const getEventClass = (type) => {
    switch (type) {
      case "ENTRY": return "events-table__row--entry";
      case "EXIT": return "events-table__row--exit";
      case "EQUIPMENT_ISSUE": return "events-table__row--issue";
      case "EQUIPMENT_RETURN": return "events-table__row--return";
      default: return "";
    }
  };

  const getEventLabel = (type) => {
    switch (type) {
      case "ENTRY": return "Entry";
      case "EXIT": return "Exit";
      case "EQUIPMENT_ISSUE": return "Issue";
      case "EQUIPMENT_RETURN": return "Return";
      default: return type;
    }
  };

  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredEvents = useMemo(() => {
    let result = events || [];

    // Filter by type
    if (filter !== "ALL") {
      result = result.filter(e => e.type === filter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.student_name?.toLowerCase().includes(term) ||
        e.student_id?.toLowerCase().includes(term) ||
        e.facility_id?.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "timestamp") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortDir === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [events, filter, searchTerm, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="events-table__sort-icon--inactive" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  if (loading) {
    return <TableSkeleton rows={compact ? 6 : 10} cols={layout === "footfall" ? 5 : 4} />;
  }

  if (!events || events.length === 0) {
    return (
      <div className="events-table__empty">
        <div className="events-table__empty-icon">
          <FileText size={40} strokeWidth={1.5} />
        </div>
        <p className="events-table__empty-text">No events to display</p>
      </div>
    );
  }

  const footfall = layout === "footfall";
  const showEquipmentColumn = facilityMode === "equipment" && !footfall;

  const equipmentHeader = showEquipmentColumn ? (
    <>
      <Package size={12} />
      Equipment
    </>
  ) : (
    <>
      <Building2 size={12} />
      Facility
    </>
  );

  const renderFacilityCell = (event) => {
    if (!showEquipmentColumn) {
      return (
        <span className="events-table__facility">
          <Building2 size={12} />
          {event.facility_id}
        </span>
      );
    }

    const raw = String(event.facility_id || "").trim();
    const primary = raw.split(",")[0]?.trim().toLowerCase();

    const iconForEquipment = () => {
      // heuristic mapping based on keywords in equipment name
      if (!primary) return Package;
      if (primary.includes("badminton") || primary.includes("shuttle")) return CircleDot;
      if (primary.includes("swim") || primary.includes("goggle") || primary.includes("cap")) return Waves;
      if (primary.includes("cricket") || primary.includes("bat")) return Dumbbell;
      return event.type === "EQUIPMENT_RETURN" ? RotateCcw : Package;
    };

    const Icon = iconForEquipment();
    return (
      <span className="events-table__facility">
        <Icon size={12} />
        {raw || "—"}
      </span>
    );
  };

  return (
    <div
      className={`events-table ${compact ? "events-table--compact" : ""}${
        footfall ? " events-table--footfall" : ""
      }`}
    >
      {/* Filters */}
      {!compact && !footfall && (
        <div className="events-table__filters">
          <div className="events-table__filter-group">
            <div className="events-table__select-wrapper">
              <Filter size={14} className="events-table__select-icon" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="events-table__select"
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="events-table__select-arrow" />
            </div>
          </div>

          <div className="events-table__filter-group">
            <div className="events-table__search-wrapper">
              <Search size={14} className="events-table__search-icon" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="events-table__search"
              />
            </div>
          </div>

          <div className="events-table__count">
            <span className="events-table__count-value">{filteredEvents.length}</span>
            <span className="events-table__count-label">of {events.length} events</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="events-table__wrapper">
        <table className="events-table__table">
          <thead className="events-table__head">
            {footfall ? (
              <tr>
                <th className="events-table__th events-table__th--sortable" onClick={() => handleSort("timestamp")}>
                  <Clock size={12} />
                  Time
                  <SortIcon field="timestamp" />
                </th>
                <th className="events-table__th events-table__th--sortable" onClick={() => handleSort("student_name")}>
                  <User size={12} />
                  Student
                  <SortIcon field="student_name" />
                </th>
                <th className="events-table__th">
                  <Building2 size={12} />
                  Facility
                </th>
                <th className="events-table__th">Action</th>
                <th className="events-table__th">Duration</th>
              </tr>
            ) : (
              <tr>
                <th className="events-table__th">Type</th>
                <th
                  className="events-table__th events-table__th--sortable"
                  onClick={() => handleSort("timestamp")}
                >
                  <Clock size={12} />
                  Time
                  <SortIcon field="timestamp" />
                </th>
                <th
                  className="events-table__th events-table__th--sortable"
                  onClick={() => handleSort("student_name")}
                >
                  <User size={12} />
                  Student
                  <SortIcon field="student_name" />
                </th>
                {!compact && (
                  <th className="events-table__th">
                    <User size={12} />
                    ID
                  </th>
                )}
                <th className="events-table__th">
                  {equipmentHeader}
                </th>
                {!compact && (
                  <th className="events-table__th">
                    <FileText size={12} />
                    Details
                  </th>
                )}
              </tr>
            )}
          </thead>
          <tbody className="events-table__body">
            {filteredEvents.slice(0, compact ? 10 : 100).map((event, idx) =>
              footfall ? (
                <tr key={idx} className={`events-table__row ${getEventClass(event.type)}`}>
                  <td className="events-table__td events-table__td--time">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="events-table__td events-table__td--name">{event.student_name || "Unknown"}</td>
                  <td className="events-table__td">{facilityLabel(event.facility_id)}</td>
                  <td className="events-table__td">{getEventLabel(event.type)}</td>
                  <td className="events-table__td">
                    {event.type === "EXIT" && event.details?.duration_minutes != null
                      ? `${event.details.duration_minutes} min`
                      : "—"}
                  </td>
                </tr>
              ) : (
                <tr key={idx} className={`events-table__row ${getEventClass(event.type)}`}>
                  <td className="events-table__td">
                    <span
                      className={`events-table__badge events-table__badge--${event.type
                        .toLowerCase()
                        .replace("equipment_", "")}`}
                    >
                      {getEventIcon(event.type)}
                      <span>{getEventLabel(event.type)}</span>
                    </span>
                  </td>
                  <td className="events-table__td events-table__td--time">{formatTimestamp(event.timestamp)}</td>
                  <td className="events-table__td events-table__td--name">{event.student_name || "Unknown"}</td>
                  {!compact && (
                    <td className="events-table__td events-table__td--id">{event.student_id || "-"}</td>
                  )}
                  <td className="events-table__td">
                    {renderFacilityCell(event)}
                  </td>
                  {!compact && (
                    <td className="events-table__td events-table__td--details">
                      {event.details?.duration_minutes && (
                        <span className="events-table__detail">
                          <Clock size={10} />
                          {event.details.duration_minutes}m
                        </span>
                      )}
                      {event.details?.items && (
                        <span className="events-table__detail">
                          {event.details.items.map((i) => `${i.equipment_type}: ${i.qty || i.returned_qty}`).join(", ")}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with more info */}
      {filteredEvents.length > (compact ? 10 : 100) && (
        <div className="events-table__footer">
          <span>Showing {compact ? 10 : 100} of {filteredEvents.length} events</span>
        </div>
      )}
    </div>
  );
}
