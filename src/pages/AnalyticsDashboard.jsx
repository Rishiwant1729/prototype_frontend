import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import useDashboardUpdates from "../hooks/useDashboardUpdates";
import KPICards from "../components/analytics/KPICards";
import FootfallKpiStrip from "../components/analytics/FootfallKpiStrip";
import TimeSeriesChart from "../components/analytics/TimeSeriesChart";
import HighchartsTimeSeries from "../components/analytics/HighchartsTimeSeries";
import EntryExitGroupedBar from "../components/analytics/EntryExitGroupedBar";
import FacilityShareDonut from "../components/analytics/FacilityShareDonut";
import BusyTimeSlotsPanel from "../components/analytics/BusyTimeSlotsPanel";
import RepeatNewSplit from "../components/analytics/RepeatNewSplit";
import DurationHistogram from "../components/analytics/DurationHistogram";
import CapacityUtilizationPanel from "../components/analytics/CapacityUtilizationPanel";
import SmartInsightsPanel from "../components/analytics/SmartInsightsPanel";
import RecentEventsTable from "../components/analytics/RecentEventsTable";
import AlertsPanel from "../components/analytics/AlertsPanel";
import FiltersBar from "../components/analytics/FiltersBar";
import ExportPanel from "../components/analytics/ExportPanel";
import FacilityOccupancyPanels from "../components/analytics/FacilityOccupancyPanels";
import {
  getDashboardOverview,
  getOccupancyTimeSeries,
  getHourlyDistribution,
  getRecentEvents,
  getAllAlerts,
  getFootfallAnalyticsSummary,
  getDateRange
} from "../api/dashboard_api";
import {
  LineChart,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Clock,
  Bell,
  Activity,
  Loader2
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import "../styles/dashboard.css";
import "../styles/analytics.css";
import {
  StatCardSkeleton,
  ChartCardSkeleton,
  TableSkeleton,
  ListSkeleton,
  SkeletonBlock
} from "../components/common/Skeleton";

const ENTRY_EXIT_FACILITY_IDS = ["GYM", "BADMINTON", "SWIMMING"];

function AnalyticsDashboardSkeleton() {
  return (
    <div className="analytics-two-column" aria-busy="true">
      <aside className="analysis-sidebar">
        <div className="sidebar-card">
          <h3 className="sidebar-card__title">Facility Selector</h3>
          <p className="sidebar-card__subtitle">Entry/Exit Facilities</p>
          <div className="facility-list" aria-hidden="true">
            <SkeletonBlock width="100%" height={36} radius="pill" />
            <SkeletonBlock width="100%" height={36} radius="pill" style={{ marginTop: 10 }} />
            <SkeletonBlock width="100%" height={36} radius="pill" style={{ marginTop: 10 }} />
            <SkeletonBlock width="100%" height={36} radius="pill" style={{ marginTop: 10 }} />
          </div>
        </div>

        <div className="sidebar-card">
          <h3 className="sidebar-card__title">Recent ENTRY</h3>
          <p className="sidebar-card__subtitle">Showing ENTRY events</p>
          <ListSkeleton rows={6} />
        </div>

        <div className="sidebar-card">
          <h3 className="sidebar-card__title">Recent EXIT</h3>
          <p className="sidebar-card__subtitle">Showing EXIT events</p>
          <ListSkeleton rows={6} />
        </div>
      </aside>

      <main className="analysis-main">
        <section className="footfall-kpi-strip" aria-label="Footfall summary loading" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </section>

        <ChartCardSkeleton height={260} />
        <ChartCardSkeleton height={220} style={{ marginTop: 16 }} />

        <div className="analytics-overview-grid analytics-overview-grid--insights" style={{ marginTop: 16 }}>
          <ChartCardSkeleton height={160} />
          <ChartCardSkeleton height={160} />
        </div>

        <div className="chart-card chart-card--full-block" style={{ marginTop: 16 }} aria-hidden="true">
          <h3>
            <span>Recent entry / exit log</span>
          </h3>
          <TableSkeleton rows={8} cols={5} />
        </div>
      </main>
    </div>
  );
}

/** User-facing message when the overview request fails (not 403). */
function describeDashboardFetchError(err) {
  if (!err?.response) {
    const isNetwork =
      err?.code === "ERR_NETWORK" ||
      err?.code === "ECONNREFUSED" ||
      String(err?.message || "").toLowerCase().includes("network");
    if (isNetwork) {
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
      return `Cannot reach the API server. The analytics app calls ${base} — start the backend from the \`backend\` folder (for example \`npm run dev\`) and ensure it matches your VITE_API_BASE_URL, then use Retry.`;
    }
    return err?.message
      ? `Cannot load dashboard data: ${err.message}`
      : "Cannot load dashboard data. Check that the backend is running and reachable.";
  }
  const status = err.response.status;
  if (status === 401) return "Session expired. Please sign in again.";
  if (status >= 500) {
    return "Server error while loading the dashboard. Check the backend terminal for the stack trace.";
  }
  if (status === 404) {
    return "Dashboard API returned 404. Restart the backend after pulling the latest code so routes such as /api/dashboard are registered.";
  }
  return `Failed to load dashboard data (HTTP ${status}).`;
}

export default function AnalyticsDashboard() {
  const { permissions, role } = useAuth();
  
  // Filter state
  const [facility, setFacility] = useState("ALL");
  const [dateRange, setDateRange] = useState(getDateRange("week"));
  const [granularity, setGranularity] = useState("daily");
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  
  // Data state
  const [overview, setOverview] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [footfallSummary, setFootfallSummary] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** Non-fatal: overview loaded but one or more secondary requests failed */
  const [dataLoadWarning, setDataLoadWarning] = useState(null);
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

    const overviewParams = (f) => (f === "ALL" ? { scope: "entry_exit" } : {});

    // For scan events, add to recent events and refresh overview
    if (data.type === "SCAN_EVENT") {
      const payload = data.payload;
      const fid = payload.facility;
      const act = String(payload.action || "").toUpperCase();
      const isSportRoomOrEquipment =
        fid === "SPORTS_ROOM" ||
        ["ISSUED", "ISSUE", "RETURNED", "RETURN"].includes(act);

      // Analytics dashboard omits sport room / equipment from streams and KPIs when scoped to ALL gates
      if (isSportRoomOrEquipment) {
        getDashboardOverview(overviewParams(facility)).then((res) => {
          setOverview(res.data);
          setLastUpdated(new Date());
        }).catch(console.error);
        return;
      }

      const newEvent = {
        type: payload.action || (payload.mode === "ISSUE" ? "EQUIPMENT_ISSUE" : payload.mode === "RETURN" ? "EQUIPMENT_RETURN" : payload.action),
        timestamp: new Date().toISOString(),
        facility_id: payload.facility,
        student_id: payload.student?.student_id,
        student_name: payload.student?.student_name || "Unknown",
        details: payload.items ? { items: payload.items } : null
      };

      setRecentEvents((prev) => [newEvent, ...prev.slice(0, 99)]);

      getDashboardOverview(overviewParams(facility)).then((res) => {
        setOverview(res.data);
        setLastUpdated(new Date());
      }).catch(console.error);
    }
  }, [facility]);

  // Connect to WebSocket for real-time updates
  useDashboardUpdates(handleRealtimeUpdate);

  // Fetch all data (respecting role permissions)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDataLoadWarning(null);

      const { startDate, endDate } = dateRange;

      const overviewParams = facility === "ALL" ? { scope: "entry_exit" } : {};

      // Build promises based on role permissions
      const promises = [getDashboardOverview(overviewParams)];

      // Only fetch charts data if user has permission
      if (permissions?.canViewCharts) {
        promises.push(
          getOccupancyTimeSeries(facility, startDate, endDate, granularity),
          getHourlyDistribution(facility, startDate, endDate),
          getFootfallAnalyticsSummary(facility, startDate, endDate)
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
        promises.push(Promise.resolve({ data: null }));
        promises.push(Promise.resolve({ data: null }));
      }

      // Only fetch events if user has permission
      if (permissions?.canViewEvents) {
        promises.push(getRecentEvents(100, facility === "ALL" ? "ALL" : facility));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      // Only fetch alerts if user has permission
      if (permissions?.canViewAlerts) {
        promises.push(getAllAlerts(facility === "ALL" ? { scope: "entry_exit" } : {}));
      } else {
        promises.push(Promise.resolve({ data: { total_alerts: 0 } }));
      }

      const settled = await Promise.allSettled(promises);

      const overviewOutcome = settled[0];
      if (overviewOutcome.status === "rejected") {
        const err = overviewOutcome.reason;
        if (err?.response?.status === 403) {
          console.log("Overview restricted by role");
          setOverview(null);
        } else {
          console.error("Dashboard overview fetch error:", err);
          setError(describeDashboardFetchError(err));
        }
        return;
      }

      setOverview(overviewOutcome.value.data);

      const takeChartData = (idx, setter, label) => {
        const out = settled[idx];
        if (out.status === "fulfilled") {
          setter(out.value?.data ?? null);
          return false;
        }
        const err = out.reason;
        if (err?.response?.status === 403) {
          console.log(`${label} restricted by role`);
          setter(null);
          return false;
        }
        console.error(`${label} fetch error:`, err);
        setter(null);
        return true;
      };

      let anySecondaryFailed = false;
      anySecondaryFailed =
        anySecondaryFailed || takeChartData(1, setTimeSeriesData, "Time series");
      anySecondaryFailed =
        anySecondaryFailed || takeChartData(2, setHourlyData, "Hourly distribution");
      anySecondaryFailed =
        anySecondaryFailed || takeChartData(3, setFootfallSummary, "Footfall summary");
      anySecondaryFailed =
        anySecondaryFailed ||
        takeChartData(4, (d) => setRecentEvents(d || []), "Recent events");
      anySecondaryFailed =
        anySecondaryFailed ||
        takeChartData(5, (d) => setAlerts(d || { total_alerts: 0 }), "Alerts");

      if (anySecondaryFailed) {
        setDataLoadWarning(
          "Some dashboard sections failed to load. Charts or tables may be empty until the server responds; use Retry or check backend logs."
        );
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (err.response?.status === 403) {
        console.log("Some data restricted by role");
      } else {
        setError(describeDashboardFetchError(err));
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
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  const handleGranularityChange = (newGranularity) => {
    setGranularity(newGranularity);
  };

  const handlePeriodSelect = (period) => {
    setDateRange(getDateRange(period));
  };

  // Derived event lists for sidebar (entry/exit gates only; never sport room)
  const entryEvents = recentEvents.filter(
    (e) =>
      (e.type === "ENTRY" || e.action === "ENTRY") &&
      ENTRY_EXIT_FACILITY_IDS.includes(e.facility_id)
  );
  const exitEvents = recentEvents.filter(
    (e) =>
      (e.type === "EXIT" || e.action === "EXIT") &&
      ENTRY_EXIT_FACILITY_IDS.includes(e.facility_id)
  );

  const filteredEntries =
    facility === "ALL" ? entryEvents : entryEvents.filter((e) => e.facility_id === facility);
  const filteredExits =
    facility === "ALL" ? exitEvents : exitEvents.filter((e) => e.facility_id === facility);

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

  const analyticsTabs = (
    <div className="analytics-app-shell-tabs">
      <div className="nav-tabs">
        <button
          type="button"
          className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <TrendingUp size={16} strokeWidth={2} />
          <span>Overview</span>
        </button>

        {permissions?.canViewCharts && (
          <button
            type="button"
            className={`nav-tab ${activeTab === "charts" ? "active" : ""}`}
            onClick={() => setActiveTab("charts")}
          >
            <LineChart size={16} strokeWidth={2} />
            <span>Charts</span>
          </button>
        )}

        {permissions?.canViewEvents && (
          <button
            type="button"
            className={`nav-tab ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <ClipboardList size={16} strokeWidth={2} />
            <span>Events</span>
          </button>
        )}

        {permissions?.canViewAlerts && (
          <button
            type="button"
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
    </div>
  );

  return (
    <AppShell
      pageEmphasis="Analytics"
      headerLeft={analyticsTabs}
      headerExtras={
        <div className={`live-indicator ${liveIndicator ? "pulse" : ""}`}>
          <span className="live-dot" />
          <span>LIVE</span>
        </div>
      }
      onRefresh={fetchData}
    >
      <div className="analytics-wrapper analytics-wrapper--shell">
      {/* Filters Bar */}
      <FiltersBar
        dateRange={dateRange}
        granularity={granularity}
        onDateRangeChange={handleDateRangeChange}
        onGranularityChange={handleGranularityChange}
        onPeriodSelect={handlePeriodSelect}
        lastUpdated={lastUpdated}
      />

      {dataLoadWarning && (
        <div className="analytics-fetch-warning" role="status">
          {dataLoadWarning}
        </div>
      )}

      {/* Main Content */}
      <div className="analytics-content">
        {error ? (
          <div className="error-overlay">
            <div className="error-icon">
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>
            <p>{error}</p>
            <button onClick={fetchData}>Retry</button>
          </div>
        ) : loading && !overview ? (
          <AnalyticsDashboardSkeleton />
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
                  {permissions?.canViewCharts ? (
                    <>
                      {loading && overview && !footfallSummary ? (
                        <section className="footfall-kpi-strip" aria-label="Footfall summary loading" aria-busy="true">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <StatCardSkeleton key={i} />
                          ))}
                        </section>
                      ) : (
                        <FootfallKpiStrip summary={footfallSummary} dateRange={dateRange} overview={overview} alerts={alerts} />
                      )}

                      <div className="chart-card chart-card--full-block">
                        <h3>
                          <TrendingUp size={18} strokeWidth={2} />
                          <span>Footfall trend</span>
                        </h3>
                        <p className="chart-card__scope-note">
                          {facility === "ALL"
                            ? "Separate lines for each entry/exit gate (Gym, Badminton, Pool). Sport room is not included. Points are slightly larger at the peak aggregate entry period."
                            : `Entries (green) and exits (coral) for ${getFacilityName(facility)} only — other gates are hidden.`}
                        </p>
                        <HighchartsTimeSeries data={timeSeriesData} loading={loading && overview && !timeSeriesData} height={290} />
                      </div>

                      <div className="chart-card chart-card--full-block">
                        <h3>
                          <TrendingUp size={18} strokeWidth={2} />
                          <span>Entry vs exit by period</span>
                        </h3>
                        <p className="chart-card__scope-note">Grouped comparison per time bucket.</p>
                        <EntryExitGroupedBar data={timeSeriesData} loading={loading && overview && !timeSeriesData} />
                      </div>

                      <div className="analytics-overview-grid analytics-overview-grid--insights">
                        <div className="chart-card">
                          <h3>
                            <Activity size={18} strokeWidth={2} />
                            <span>Facility usage (entries)</span>
                          </h3>
                          <FacilityShareDonut
                            facilityShare={footfallSummary?.facility_share || []}
                            loading={loading && overview && !footfallSummary}
                          />
                        </div>
                        <div className="chart-card">
                          <h3>
                            <Clock size={18} strokeWidth={2} />
                            <span>Top busy time slots</span>
                          </h3>
                          <BusyTimeSlotsPanel hourlyData={hourlyData} loading={loading && overview && !hourlyData} />
                        </div>
                      </div>

                      <div className="analytics-overview-grid analytics-overview-grid--insights">
                        <div className="chart-card">
                          <h3>
                            <Activity size={18} strokeWidth={2} />
                            <span>Repeat vs new visitors</span>
                          </h3>
                          <p className="chart-card__scope-note">Behavioral split across the selected range.</p>
                          <RepeatNewSplit kpis={footfallSummary?.kpis} loading={loading && overview && !footfallSummary} />
                        </div>
                        <div className="chart-card">
                          <h3>
                            <Activity size={18} strokeWidth={2} />
                            <span>Stay duration distribution</span>
                          </h3>
                          <p className="chart-card__scope-note">How long students stay (completed sessions).</p>
                          <DurationHistogram bins={footfallSummary?.duration_distribution} loading={loading && overview && !footfallSummary} />
                        </div>
                      </div>

                      <div className="analytics-overview-grid analytics-overview-grid--insights">
                        <div className="chart-card">
                          <h3>
                            <Activity size={18} strokeWidth={2} />
                            <span>Capacity utilization (live)</span>
                          </h3>
                          <p className="chart-card__scope-note">Current occupancy vs configured capacity reference.</p>
                          <CapacityUtilizationPanel overview={overview} loading={loading && !overview} />
                        </div>
                        <div className="chart-card">
                          <SmartInsightsPanel
                            summary={footfallSummary}
                            hourlyData={hourlyData}
                            overview={overview}
                            loading={loading && overview && !footfallSummary}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <KPICards overview={overview} dateRange={dateRange} omitEquipmentKpi />
                  )}

                  {permissions?.canViewAlerts && alerts && alerts.total_alerts > 0 && (
                    <div className="alerts-preview">
                      <h3>
                        <Bell size={18} strokeWidth={2} />
                        <span>Active Alerts ({alerts.total_alerts})</span>
                      </h3>
                      <AlertsPanel alerts={alerts} compact />
                    </div>
                  )}

                  {permissions?.canViewEvents && (
                    <div className="events-preview">
                      <h3>
                        <Activity size={18} strokeWidth={2} />
                        <span>Recent entry / exit log</span>
                      </h3>
                      <RecentEventsTable
                        events={recentEvents
                          .filter(
                            (ev) =>
                              ["ENTRY", "EXIT"].includes(ev.type) && ev.facility_id !== "SPORTS_ROOM"
                          )
                          .slice(0, 12)}
                        compact
                        layout="footfall"
                        loading={loading && overview && recentEvents.length === 0}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Charts Tab - only for MANAGEMENT */}
              {activeTab === "charts" && permissions?.canViewCharts && (
                <div className="tab-content charts-tab">
                  <FacilityOccupancyPanels dateRange={dateRange} granularity={granularity} />

                  <div className="chart-card full chart-card--scope">
                    <h3>
                      <TrendingUp size={18} strokeWidth={2} />
                      <span>
                        Combined view — {facility === "ALL" ? "all entry / exit facilities" : getFacilityName(facility)}
                      </span>
                    </h3>
                    <p className="chart-card__scope-note">
                      Scoped to the facility selector in the left sidebar. Export uses this scope.
                    </p>
                    <TimeSeriesChart data={timeSeriesData} />
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
                  <AlertsPanel alerts={alerts} loading={loading && overview && !alerts} />
                </div>
              )}
            </main>
          </div>
        )}
      </div>
      </div>
    </AppShell>
  );
}
