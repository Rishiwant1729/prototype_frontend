import { useState } from "react";
import { 
  Building2, 
  Calendar, 
  Clock, 
  RefreshCw,
  ChevronDown
} from "lucide-react";
import { formatDateISO } from "../../api/dashboard_api";

/**
 * Filters Bar Component
 * Provides filtering controls for the analytics dashboard
 * Uses consistent button styles and spacing
 */
export default function FiltersBar({
  facility,
  dateRange,
  granularity,
  onFacilityChange,
  onDateRangeChange,
  onGranularityChange,
  onPeriodSelect,
  lastUpdated
}) {
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [customStart, setCustomStart] = useState(dateRange.startDate);
  const [customEnd, setCustomEnd] = useState(dateRange.endDate);

  const facilities = [
    { value: "ALL", label: "All Facilities", icon: Building2 },
    { value: "GYM", label: "Gymnasium" },
    { value: "SWIMMING", label: "Swimming Pool" },
    { value: "BADMINTON", label: "Badminton Court" },
    { value: "SPORTS_ROOM", label: "Sports Room" }
  ];

  const periods = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "week", label: "7 Days" },
    { value: "month", label: "30 Days" },
    { value: "quarter", label: "3 Months" }
  ];

  const granularities = [
    { value: "hourly", label: "Hourly" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" }
  ];

  const handleApplyCustomDates = () => {
    onDateRangeChange({
      startDate: customStart,
      endDate: customEnd
    });
    setShowCustomDates(false);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return "Never";
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastUpdated.toLocaleTimeString();
  };

  return (
    <div className="filters-bar">
      <div className="filters-bar__left">
        {/* Facility Selector */}
        <div className="filter-group">
          <label className="filter-group__label">
            <Building2 size={14} />
            <span>Facility</span>
          </label>
          <div className="select-wrapper">
            <select
              value={facility}
              onChange={(e) => onFacilityChange(e.target.value)}
              className="filter-select"
            >
              {facilities.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
        </div>

        {/* Period Selector */}
        <div className="filter-group">
          <label className="filter-group__label">
            <Calendar size={14} />
            <span>Period</span>
          </label>
          <div className="button-group">
            {periods.map(p => (
              <button
                key={p.value}
                type="button"
                className={`button-group__btn ${
                  !showCustomDates && 
                  dateRange.startDate === formatDateISO(getDateStart(p.value)) 
                    ? "button-group__btn--active" 
                    : ""
                }`}
                onClick={() => {
                  setShowCustomDates(false);
                  onPeriodSelect(p.value);
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className={`button-group__btn ${showCustomDates ? "button-group__btn--active" : ""}`}
              onClick={() => setShowCustomDates(!showCustomDates)}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom Date Range */}
        {showCustomDates && (
          <div className="filter-group filter-group--inline">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="date-input"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="date-input"
            />
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleApplyCustomDates}
            >
              Apply
            </button>
          </div>
        )}

        {/* Granularity Selector */}
        <div className="filter-group">
          <label className="filter-group__label">
            <Clock size={14} />
            <span>Granularity</span>
          </label>
          <div className="select-wrapper">
            <select
              value={granularity}
              onChange={(e) => onGranularityChange(e.target.value)}
              className="filter-select"
            >
              {granularities.map(g => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
        </div>
      </div>

      <div className="filters-bar__right">
        <div className="last-updated">
          <RefreshCw size={14} className="last-updated__icon" />
          <span className="last-updated__text">Updated {formatLastUpdated()}</span>
        </div>
      </div>
    </div>
  );
}

// Helper function to get date start for period
function getDateStart(period) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return today;
    case "yesterday":
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    case "week":
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    case "month":
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo;
    case "quarter":
      const quarterAgo = new Date(today);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      return quarterAgo;
    default:
      return today;
  }
}
