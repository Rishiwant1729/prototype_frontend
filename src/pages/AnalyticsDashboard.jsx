import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import useDashboardUpdates from "../hooks/useDashboardUpdates";
import KPICards from "../components/analytics/KPICards";
import TimeSeriesChart from "../components/analytics/TimeSeriesChart";
import HourlyDistributionChart from "../components/analytics/HourlyDistributionChart";
import HeatmapCalendar from "../components/analytics/HeatmapCalendar";
import RecentEventsTable from "../components/analytics/RecentEventsTable";
import AlertsPanel from "../components/analytics/AlertsPanel";
import FiltersBar from "../components/analytics/FiltersBar";
import ExportPanel from "../components/analytics/ExportPanel";
import {
  getDashboardOverview,
  getOccupancyTimeSeries,
  getHourlyDistribution,
  getHeatmapData,
  getRecentEvents,
  getAllAlerts,
  getDateRange
} from "../api/dashboard_api";
import {
  BarChart3,
  LineChart,
  ClipboardList,
  AlertTriangle,
  Building2,
  RefreshCw,
  LogOut,
  TrendingUp,
  Clock,
  CalendarDays,
  Bell,
  Activity,
  Loader2
} from "lucide-react";
import "../styles/analytics.css";

export default function AnalyticsDashboard() {
  const { logout, permissions, role, userName } = useAuth();
  
  // Filter state
  const [facility, setFacility] = useState("ALL");
  const [dateRange, setDateRange] = useState(getDateRange("week"));
  const [granularity, setGranularity] = useState("daily");
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  
  // Data state
  const [overview, setOverview] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [alerts, setAlerts] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Set default tab based on role
  const [activeTab, setActiveTab] = useState(() => {
    if (permissions?.isGuard) return "overview";
    if (permissions?.isOperator) return "events";
    return "overview";
  });
  const [liveIndicator, setLiveIndicator] = useState(false);

  // Handle real-time WebSocket updates
  const handleRealtimeUpdate = useCallback((data) => {
    console.log("📊 Real-time update:", data);
    setLiveIndicator(true);
    setTimeout(() => setLiveIndicator(false), 1000);

    // For scan events, add to recent events and refresh overview
    if (data.type === "SCAN_EVENT") {
      const payload = data.payload;
      
      // Add to recent events
      const newEvent = {
        type: payload.action || (payload.mode === "ISSUE" ? "EQUIPMENT_ISSUE" : payload.mode === "RETURN" ? "EQUIPMENT_RETURN" : payload.action),
        timestamp: new Date().toISOString(),
        facility_id: payload.facility,
        student_id: payload.student?.student_id,
        student_name: payload.student?.student_name || "Unknown",
        details: payload.items ? { items: payload.items } : null
      };

      setRecentEvents(prev => [newEvent, ...prev.slice(0, 99)]);
      
      // Refresh overview for updated occupancy
      getDashboardOverview().then(res => {
        setOverview(res.data);
        setLastUpdated(new Date());
      }).catch(console.error);
    }
  }, []);

  // Connect to WebSocket for real-time updates
  const { isConnected } = useDashboardUpdates(handleRealtimeUpdate);

  // Fetch all data (respecting role permissions)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = dateRange;

      // Build promises based on role permissions
      const promises = [getDashboardOverview()];

      // Only fetch charts data if user has permission
      if (permissions?.canViewCharts) {
        promises.push(
          getOccupancyTimeSeries(facility, startDate, endDate, granularity),
          getHourlyDistribution(facility, startDate, endDate),
          getHeatmapData(facility, startDate, endDate)
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
        promises.push(Promise.resolve({ data: null }));
        promises.push(Promise.resolve({ data: null }));
      }

      // Only fetch events if user has permission
      if (permissions?.canViewEvents) {
        promises.push(getRecentEvents(100, facility === "ALL" ? null : facility));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      // Only fetch alerts if user has permission
      if (permissions?.canViewAlerts) {
        promises.push(getAllAlerts());
      } else {
        promises.push(Promise.resolve({ data: { total_alerts: 0 } }));
      }

      const [
        overviewRes,
        timeSeriesRes,
        hourlyRes,
        heatmapRes,
        eventsRes,
        alertsRes
      ] = await Promise.all(promises);

      setOverview(overviewRes.data);
      setTimeSeriesData(timeSeriesRes.data);
      setHourlyData(hourlyRes.data);
      setHeatmapData(heatmapRes.data);
      setRecentEvents(eventsRes.data || []);
      setAlerts(alertsRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      // Don't show error for permission denied - just show limited data
      if (err.response?.status === 403) {
        console.log("Some data restricted by role");
      } else {
        setError("Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  }, [facility, dateRange, granularity, permissions]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  // Handle filter changes
  const handleFacilityChange = (newFacility) => {
    setFacility(newFacility);
  };

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  const handleGranularityChange = (newGranularity) => {
    setGranularity(newGranularity);
  };

  const handlePeriodSelect = (period) => {
    setDateRange(getDateRange(period));
  };

  // Derived event lists for sidebar
  const entryEvents = recentEvents.filter(e => e.type === 'ENTRY' || e.type === 'ENTRY' || e.action === 'ENTRY');
  const exitEvents = recentEvents.filter(e => e.type === 'EXIT' || e.type === 'EXIT' || e.action === 'EXIT');

  // Filtered lists based on selected facility
  const filteredEntries = facility === 'ALL' ? entryEvents : entryEvents.filter(e => e.facility_id === facility);
  const filteredExits = facility === 'ALL' ? exitEvents : exitEvents.filter(e => e.facility_id === facility);

  // Helper to display facility friendly name
  const getFacilityName = (id) => {
    switch (id) {
      case 'GYM': return 'Gymnasium';
      case 'BADMINTON': return 'Badminton Court';
      case 'SWIMMING': return 'Swimming Pool';
      case 'SPORTS_ROOM': return 'Sport Room';
      default: return id;
    }
  };

  // Facility selector options (exclude sport room)
  const facilityOptions = [
    { id: 'ALL', label: 'All Facilities' },
    { id: 'GYM', label: 'Gymnasium' },
    { id: 'BADMINTON', label: 'Badminton Court' },
    { id: 'SWIMMING', label: 'Swimming Pool' }
  ];

  return (
    <div className="analytics-wrapper">
      {/* Top Navbar */}
      <nav className="analytics-navbar">
        <div className="analytics-logo">
          <div className="logo-icon">
            <BarChart3 size={24} strokeWidth={2} />
          </div>
          <div>
            <div className="logo-text">Analytics Dashboard</div>
            <div className="logo-subtitle">
              {userName && <span className="user-name">{userName} • </span>}
              {role && <span className="user-role">{role}</span>}
            </div>
          </div>
        </div>

        <div className="nav-tabs">
          {/* Overview tab - visible to all */}
          <button
            className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <TrendingUp size={16} strokeWidth={2} />
            <span>Overview</span>
          </button>
          
          {/* Charts tab - only for MANAGEMENT */}
          {permissions?.canViewCharts && (
            <button
              className={`nav-tab ${activeTab === "charts" ? "active" : ""}`}
              onClick={() => setActiveTab("charts")}
            >
              <LineChart size={16} strokeWidth={2} />
              <span>Charts</span>
            </button>
          )}
          
          {/* Events tab - for all except GUARD */}
          {permissions?.canViewEvents && (
            <button
              className={`nav-tab ${activeTab === "events" ? "active" : ""}`}
              onClick={() => setActiveTab("events")}
            >
              <ClipboardList size={16} strokeWidth={2} />
              <span>Events</span>
            </button>
          )}
          
          {/* Alerts tab - for all except GUARD */}
          {permissions?.canViewAlerts && (
            <button
              className={`nav-tab ${activeTab === "alerts" ? "active" : ""}`}
              onClick={() => setActiveTab("alerts")}
            >
              <AlertTriangle size={16} strokeWidth={2} />
              <span>Alerts</span>
              {alerts?.total_alerts > 0 && (
                <span className="alert-badge">{alerts.total_alerts}</span>
              )}
            </button>
          )}
        </div>

        <div className="header-actions">
          {/* Live Indicator */}
          <div className={`live-indicator ${liveIndicator ? "pulse" : ""}`}>
            <span className="live-dot"></span>
            <span>LIVE</span>
          </div>

          <a href="/" className="header-btn secondary">
            <Building2 size={16} strokeWidth={2} />
            <span>Dashboard</span>
          </a>

          <a href="/sport-room" className="header-btn secondary">
            <Activity size={16} strokeWidth={2} />
            <span>Sport Room</span>
          </a>

          <button className="header-btn secondary" onClick={fetchData}>
            <RefreshCw size={16} strokeWidth={2} />
            <span>Refresh</span>
          </button>
          <button 
            className="header-btn primary"
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
          >
            <LogOut size={16} strokeWidth={2} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Filters Bar */}
      <FiltersBar
        facility={facility}
        dateRange={dateRange}
        granularity={granularity}
        onFacilityChange={handleFacilityChange}
        onDateRangeChange={handleDateRangeChange}
        onGranularityChange={handleGranularityChange}
        onPeriodSelect={handlePeriodSelect}
        lastUpdated={lastUpdated}
      />

      {/* Main Content */}
      <div className="analytics-content">
        {loading && !overview ? (
          <div className="loading-overlay">
            <Loader2 size={48} className="spinner large" />
            <p>Loading dashboard data...</p>
          </div>
        ) : error ? (
          <div className="error-overlay">
            <div className="error-icon">
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>
            <p>{error}</p>
            <button onClick={fetchData}>Retry</button>
          </div>
        ) : (
          <div className="analytics-two-column">
            {/* LEFT SIDEBAR - Facility selector and recent events (ENTRY/EXIT) */}
            <aside className="analysis-sidebar">
              <div className="sidebar-card">
                <h3 className="sidebar-card__title">Facility Selector</h3>
                <p className="sidebar-card__subtitle">Entry/Exit Facilities</p>
                <div className="facility-list">
                  {facilityOptions.map(opt => (
                    <button
                      key={opt.id}
                      className={`facility-option ${facility === opt.id ? 'active' : ''}`}
                      onClick={() => setFacility(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sidebar-card">
                <h3 className="sidebar-card__title">Recent ENTRY</h3>
                <p className="sidebar-card__subtitle">Showing ENTRY events</p>
                <div className="recent-list">
                  {filteredEntries.length === 0 ? (
                    <div className="empty-state"><p>No recent entries</p></div>
                  ) : (
                    filteredEntries.slice(0, 8).map((e, i) => (
                      <div key={i} className="recent-row">
                        <div className="recent-row__name">{e.student_name || e.student?.student_name || 'Unknown'}</div>
                        <div className="recent-row__facility">{getFacilityName(e.facility_id)}</div>
                        <div className="recent-row__time">{new Date(e.timestamp).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="sidebar-card">
                <h3 className="sidebar-card__title">Recent EXIT</h3>
                <p className="sidebar-card__subtitle">Showing EXIT events</p>
                <div className="recent-list">
                  {filteredExits.length === 0 ? (
                    <div className="empty-state"><p>No recent exits</p></div>
                  ) : (
                    filteredExits.slice(0, 8).map((e, i) => (
                      <div key={i} className="recent-row">
                        <div className="recent-row__name">{e.student_name || e.student?.student_name || 'Unknown'}</div>
                        <div className="recent-row__facility">{getFacilityName(e.facility_id)}</div>
                        <div className="recent-row__time">{new Date(e.timestamp).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>

            {/* RIGHT - Main analysis content (reuse existing tabs) */}
            <main className="analysis-main">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="tab-content overview-tab">
                  {/* KPI Cards */}
                  <KPICards overview={overview} dateRange={dateRange} />

                  {/* Quick Charts Row - only for MANAGEMENT */}
                  {permissions?.canViewCharts && (
                    <div className="charts-row">
                      <div className="chart-card half">
                        <h3>
                          <TrendingUp size={18} strokeWidth={2} />
                          <span>Entries & Exits Trend</span>
                        </h3>
                        <TimeSeriesChart data={timeSeriesData} compact />
                      </div>
                      <div className="chart-card half">
                        <h3>
                          <Clock size={18} strokeWidth={2} />
                          <span>Peak Hours</span>
                        </h3>
                        <HourlyDistributionChart data={hourlyData} compact />
                      </div>
                    </div>
                  )}

                  {/* Alerts Preview - for all except GUARD */}
                  {permissions?.canViewAlerts && alerts && alerts.total_alerts > 0 && (
                    <div className="alerts-preview">
                      <h3>
                        <Bell size={18} strokeWidth={2} />
                        <span>Active Alerts ({alerts.total_alerts})</span>
                      </h3>
                      <AlertsPanel alerts={alerts} compact />
                    </div>
                  )}

                  {/* Recent Events Preview - for all except GUARD */}
                  {permissions?.canViewEvents && (
                    <div className="events-preview">
                      <h3>
                        <Activity size={18} strokeWidth={2} />
                        <span>Recent Activity</span>
                      </h3>
                      <RecentEventsTable events={recentEvents
                  .filter(ev => ['ENTRY','EXIT'].includes(ev.type) && ev.facility_id !== 'SPORTS_ROOM')
                  .slice(0, 10)} compact />
                    </div>
                  )}
                </div>
              )}

              {/* Charts Tab - only for MANAGEMENT */}
              {activeTab === "charts" && permissions?.canViewCharts && (
                <div className="tab-content charts-tab">
                  <div className="chart-card full">
                    <h3>
                      <TrendingUp size={18} strokeWidth={2} />
                      <span>Entries & Exits Over Time</span>
                    </h3>
                    <TimeSeriesChart data={timeSeriesData} />
                  </div>

                  <div className="charts-row">
                    <div className="chart-card half">
                      <h3>
                        <Clock size={18} strokeWidth={2} />
                        <span>Hourly Distribution</span>
                      </h3>
                      <HourlyDistributionChart data={hourlyData} />
                    </div>
                    <div className="chart-card half">
                      <h3>
                        <CalendarDays size={18} strokeWidth={2} />
                        <span>Weekly Heatmap</span>
                      </h3>
                      <HeatmapCalendar data={heatmapData} />
                    </div>
                  </div>

                  {/* Export Panel - only for MANAGEMENT */}
                  {permissions?.canExport && (
                    <ExportPanel
                      facility={facility}
                      dateRange={dateRange}
                    />
                  )}
                </div>
              )}

              {/* Events Tab */}
              {activeTab === "events" && (
                <div className="tab-content events-tab">
                  <RecentEventsTable events={recentEvents
                    .filter(ev => ['ENTRY','EXIT'].includes(ev.type) && ev.facility_id !== 'SPORTS_ROOM')}
                  />
                </div>
              )}

              {/* Alerts Tab */}
              {activeTab === "alerts" && (
                <div className="tab-content alerts-tab">
                  <AlertsPanel alerts={alerts} />
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
