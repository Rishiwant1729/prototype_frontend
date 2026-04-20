import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import useScanListener from "../../hooks/useScanListener";
import { useAuth } from "../../context/AuthContext";
import ProcessingCard from "./cards/ProcessingCard";
import IssueCard from "./cards/IssueCard";
import ReturnCard from "./cards/ReturnCard";
import SuccessCard from "./cards/SuccessCard";
import ErrorCard from "./cards/ErrorCard";
import BlockedCard from "./cards/BlockedCard";
import WaitingCard from "./cards/WaitingCard";
import UnregisteredCard from "./cards/UnregisteredCard";
import Sidebar from "./Sidebar";
import AppShell from "../layout/AppShell";
import FacilityMapPanel from "./FacilityMapPanel";
import { useRailScanFeed } from "../../context/RailScanFeedContext";
import { Bell, Download, Filter, Plus } from "lucide-react";
import "../../styles/dashboard.css";

function logActionLabel(facility, action) {
  const a = String(action || "").toUpperCase();
  if (facility === "SPORTS_ROOM") {
    if (a === "ISSUED" || a === "ISSUE") return "EQUIP_ISSUE";
    if (a === "RETURNED" || a === "RETURN") return "EQUIP_RETURN";
  }
  if (a === "ENTRY") return "ENTRY_ACCESS";
  if (a === "EXIT") return "EXIT_ACCESS";
  return a || "EVENT";
}

function aggregateIssueUsage(issues) {
  const map = {};
  issues.forEach((issue) => {
    (issue.items || []).forEach((it) => {
      const label = it.equipment_name || it.name || it.type || it.equipment_type || "Equipment";
      map[label] = (map[label] || 0) + (Number(it.qty ?? it.issued_qty ?? 1) || 1);
    });
  });
  return Object.entries(map).map(([name, issued]) => ({ name, issued }));
}

export default function DashboardLayout() {
  const { token, userName } = useAuth();
  const recentScans = useRailScanFeed();
  const [activeCard, setActiveCard] = useState(null);
  const [recentIssues, setRecentIssues] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  const [facilityStats, setFacilityStats] = useState({
    GYM: 0,
    SWIMMING: 0,
    BADMINTON: 0,
    SPORTS_ROOM: 0
  });

  const [opsView, setOpsView] = useState("live");
  const [studentQuery, setStudentQuery] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");

  const mergedRecentOps = useMemo(() => {
    return recentScans
      .filter((s) => {
        const gate =
          ["GYM", "SWIMMING", "BADMINTON"].includes(s.facility) &&
          ["ENTRY", "EXIT"].includes(String(s.action || ""));
        const sport =
          s.facility === "SPORTS_ROOM" &&
          ["ISSUED", "RETURNED", "ISSUE", "RETURN"].includes(String(s.action || "").toUpperCase());
        return gate || sport;
      })
      .map((s) => ({
        ...s,
        action:
          s.action === "ISSUE"
            ? "ISSUED"
            : s.action === "RETURN"
              ? "RETURNED"
              : s.action
      }))
      .slice(0, 10);
  }, [recentScans]);

  const filteredActivityLog = useMemo(() => {
    const g = globalSearch.trim().toLowerCase();
    return recentScans
      .filter((row) => {
        if (!g) return true;
        return [row.student, row.facility, row.action].some((f) =>
          String(f || "")
            .toLowerCase()
            .includes(g)
        );
      })
      .slice(0, 40);
  }, [recentScans, globalSearch]);

  const usageRows = useMemo(() => aggregateIssueUsage(recentIssues), [recentIssues]);

  const studentsInside =
    (facilityStats.GYM || 0) + (facilityStats.SWIMMING || 0) + (facilityStats.BADMINTON || 0);

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const issuedToday = useMemo(() => {
    return recentScans.filter((s) => {
      const t = s.time instanceof Date ? s.time : new Date(s.time);
      const act = String(s.action || "").toUpperCase();
      return s.facility === "SPORTS_ROOM" && (act === "ISSUED" || act === "ISSUE") && t >= startOfDay;
    }).length;
  }, [recentScans, startOfDay]);

  // Handle WebSocket scan events
  useScanListener((scan) => {
    console.log("📥 Dashboard received scan:", scan);

    // Route based on facility type
    if (scan.facility === "SPORTS_ROOM") {
      handleSportsRoomScan(scan);
    } else {
      handleFacilityScan(scan);
    }
  });

  // Handle facility scans (GYM, SWIMMING, BADMINTON)
  const handleFacilityScan = (scan) => {
    switch (scan.action) {
      case "ENTRY":
        updateFacilityCount(scan.facility, 1);
        setActiveCard({
          type: "SUCCESS",
          payload: {
            message: `${scan.student?.student_name || "Student"} entered ${scan.facility}`,
            subtext: `Student ID: ${scan.student?.student_id}`
          }
        });
        autoDismiss();
        break;

      case "EXIT":
        updateFacilityCount(scan.facility, -1);
        setActiveCard({
          type: "SUCCESS",
          payload: {
            message: `${scan.student?.student_name || "Student"} exited ${scan.facility}`,
            subtext: `Duration: ${scan.duration_minutes || 0} minutes`
          }
        });
        autoDismiss();
        break;

      case "REJECTED":
        setActiveCard({
          type: "UNREGISTERED",
          payload: { uid: scan.uid }
        });
        autoDismiss(3000);
        break;

      case "IGNORED":
        setActiveCard({
          type: "ERROR",
          payload: {
            message: "Scan Ignored",
            reason: scan.reason
          }
        });
        autoDismiss(2000);
        break;

      default:
        break;
    }
  };

  // Handle SPORTS_ROOM scans
  const handleSportsRoomScan = (scan) => {
    switch (scan.mode) {
      case "ISSUE":
        setActiveCard({
          type: "ISSUE",
          payload: {
            student: scan.student,
            available_equipment: scan.available_equipment || []
          }
        });
        break;

      case "RETURN":
        setActiveCard({
          type: "RETURN",
          payload: {
            student: scan.student,
            issue_id: scan.issue_id,
            items: scan.items || [],
            issued_at: scan.issued_at
          }
        });
        break;

      case "BLOCKED":
        setActiveCard({
          type: "BLOCKED",
          payload: {
            student: scan.student,
            reason: scan.reason,
            issue_id: scan.issue_id
          }
        });
        break;

      case "REJECTED":
        setActiveCard({
          type: "UNREGISTERED",
          payload: { uid: scan.uid }
        });
        autoDismiss(3000);
        break;

      default:
        break;
    }
  };

  // Update facility count
  const updateFacilityCount = (facility, delta) => {
    setFacilityStats((prev) => ({
      ...prev,
      [facility]: Math.max(0, (prev[facility] || 0) + delta)
    }));
  };

  // Auto dismiss card after timeout
  const autoDismiss = (timeout = 2000) => {
    setTimeout(() => {
      setActiveCard(null);
    }, timeout);
  };

  // Handle issue confirmation
  const handleIssueConfirm = async (student_id, items) => {
    setActiveCard({ type: "PROCESSING" });

    // Check if token exists
    if (!token) {
      setActiveCard({
        type: "ERROR",
        payload: {
          message: "Authentication Error",
          reason: "Please login again"
        }
      });
      autoDismiss(3000);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/sports-room/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ student_id, items })
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        setActiveCard({
          type: "ERROR",
          payload: {
            message: "Session Expired",
            reason: "Please login again"
          }
        });
        autoDismiss(3000);
        return;
      }

      const result = await response.json();

      if (result.mode === "SUCCESS") {
        setRecentIssues((prev) => [
          {
            id: Date.now(),
            student: result.student?.student_name,
            items: result.items,
            time: new Date()
          },
          ...prev.slice(0, 4)
        ]);

        setActiveCard({
          type: "SUCCESS",
          payload: {
            message: "Equipment Issued Successfully!",
            subtext: `${result.items?.length || 0} item(s) issued to ${result.student?.student_name}`
          }
        });
        autoDismiss();
      } else {
        setActiveCard({
          type: "ERROR",
          payload: {
            message: "Issue Failed",
            reason: result.reason
          }
        });
        autoDismiss(3000);
      }
    } catch (err) {
      setActiveCard({
        type: "ERROR",
        payload: {
          message: "Network Error",
          reason: "Could not connect to server"
        }
      });
      autoDismiss(3000);
    }
  };

  // Handle return confirmation
  const handleReturnConfirm = async (issue_id, returns) => {
    setActiveCard({ type: "PROCESSING" });

    if (!token) {
      setActiveCard({
        type: "ERROR",
        payload: {
          message: "Authentication Error",
          reason: "Please login again"
        }
      });
      autoDismiss(3000);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/sports-room/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ issue_id, returns })
      });

      if (response.status === 401) {
        setActiveCard({
          type: "ERROR",
          payload: {
            message: "Session Expired",
            reason: "Please login again"
          }
        });
        autoDismiss(3000);
        return;
      }

      const result = await response.json();

      if (result.mode === "SUCCESS") {
        setActiveCard({
          type: "SUCCESS",
          payload: {
            message: result.fully_returned 
              ? "All Equipment Returned!" 
              : "Partial Return Recorded",
            subtext: result.fully_returned 
              ? "All items have been returned" 
              : "Some items are still pending"
          }
        });
        autoDismiss();
      } else {
        setActiveCard({
          type: "ERROR",
          payload: {
            message: "Return Failed",
            reason: result.reason
          }
        });
        autoDismiss(3000);
      }
    } catch (err) {
      setActiveCard({
        type: "ERROR",
        payload: {
          message: "Network Error",
          reason: "Could not connect to server"
        }
      });
      autoDismiss(3000);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setActiveCard(null);
  };

  // Render active card
  const renderCard = () => {
    if (!activeCard) {
      return <WaitingCard />;
    }

    switch (activeCard.type) {
      case "PROCESSING":
        return <ProcessingCard />;

      case "ISSUE":
        return (
          <IssueCard
            payload={activeCard.payload}
            onConfirm={handleIssueConfirm}
            onCancel={handleCancel}
          />
        );

      case "RETURN":
        return (
          <ReturnCard
            payload={activeCard.payload}
            onConfirm={handleReturnConfirm}
            onCancel={handleCancel}
          />
        );

      case "SUCCESS":
        return <SuccessCard payload={activeCard.payload} />;

      case "ERROR":
        return <ErrorCard payload={activeCard.payload} />;

      case "BLOCKED":
        return <BlockedCard payload={activeCard.payload} onCancel={handleCancel} />;

      case "UNREGISTERED":
        return <UnregisteredCard payload={activeCard.payload} />;

      default:
        return <WaitingCard />;
    }
  };

  const headerLeft = (
    <div className="kc-view-tabs" role="tablist" aria-label="Dashboard view">
      <button
        type="button"
        role="tab"
        aria-selected={opsView === "live"}
        className={`kc-view-tab${opsView === "live" ? " kc-view-tab--active" : ""}`}
        onClick={() => setOpsView("live")}
      >
        Live view
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={opsView === "map"}
        className={`kc-view-tab${opsView === "map" ? " kc-view-tab--active" : ""}`}
        onClick={() => setOpsView("map")}
      >
        Facility map
      </button>
    </div>
  );

  const headerExtras = (
    <div className="kc-bar-extras">
      <div className="kc-global-search-wrap">
        <input
          type="search"
          className="kc-global-search"
          placeholder="Global search…"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          aria-label="Filter live activity log"
        />
      </div>
      <button type="button" className="kc-icon-btn kc-icon-btn--notify" aria-label="Notifications">
        <Bell size={18} strokeWidth={2} />
        <span className="kc-notify-dot" />
      </button>
    </div>
  );

  const maxIssued = Math.max(1, ...usageRows.map((r) => r.issued));

  return (
    <AppShell
      pageEmphasis="Facility operations"
      onRefresh={() => window.location.reload()}
      headerLeft={headerLeft}
      headerExtras={headerExtras}
    >
      <>
      <div className="dashboard-container kc-ops-dashboard">
        <Sidebar
          facilityStats={facilityStats}
          recentScans={recentScans}
          mergedRecentOps={mergedRecentOps}
          studentQuery={studentQuery}
          onStudentQueryChange={setStudentQuery}
        />

        <div className="main-area kc-ops-main-area">
          {opsView === "map" ? (
            <FacilityMapPanel facilityStats={facilityStats} />
          ) : (
            <>
              <div className="kc-kpi-row">
                <article className="kc-kpi-card">
                  <p className="kc-kpi-label">Students inside</p>
                  <p className="kc-kpi-value kc-kpi-value--accent">{studentsInside}</p>
                </article>
                <article className="kc-kpi-card">
                  <p className="kc-kpi-label">Active issues</p>
                  <p className="kc-kpi-value">{recentIssues.length}</p>
                </article>
                <article className="kc-kpi-card kc-kpi-card--warn">
                  <p className="kc-kpi-label">Pending returns</p>
                  <p className="kc-kpi-value kc-kpi-value--warn">{pendingReturns.length}</p>
                </article>
                <article className="kc-kpi-card">
                  <p className="kc-kpi-label">Issued today</p>
                  <p className="kc-kpi-value">{issuedToday}</p>
                </article>
                <article className="kc-kpi-card">
                  <p className="kc-kpi-label">Avg. session</p>
                  <p className="kc-kpi-value kc-kpi-value--muted">—</p>
                </article>
              </div>

              <div className="kc-ops-mid-grid">
                <section className="kc-panel">
                  <header className="kc-panel__head">
                    <h2 className="kc-panel__title">Equipment usage</h2>
                  </header>
                  <div className="kc-panel__body kc-usage-list">
                    {usageRows.length === 0 ? (
                      <p className="kc-panel__empty">
                        Issue equipment from the sport room to see usage here.
                      </p>
                    ) : (
                      usageRows.map((row) => (
                        <div key={row.name} className="kc-usage-row">
                          <div className="kc-usage-row__main">
                            <div className="kc-usage-row__labels">
                              <span>{row.name}</span>
                              <span className="kc-usage-row__meta">{row.issued} issued</span>
                            </div>
                            <div className="kc-usage-bar">
                              <div
                                className="kc-usage-bar__fill"
                                style={{ width: `${Math.min(100, Math.round((row.issued / maxIssued) * 100))}%` }}
                              />
                            </div>
                          </div>
                          <div className="kc-usage-row__badge">Live</div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="kc-panel">
                  <header className="kc-panel__head kc-panel__head--split">
                    <h2 className="kc-panel__title">Pending returns</h2>
                    <Link className="kc-panel__link" to="/sport-room">
                      View all
                    </Link>
                  </header>
                  <div className="kc-panel__body kc-pending-list">
                    {recentIssues.length === 0 ? (
                      <p className="kc-panel__empty">No active desk issues on this session.</p>
                    ) : (
                      recentIssues.map((issue) => {
                        const n = (issue.items || []).length || 1;
                        return (
                          <div key={issue.id} className="kc-pending-row">
                            <div className="kc-pending-row__avatar" aria-hidden>
                              <span>{String(issue.student || "?").charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="kc-pending-row__name">{issue.student}</p>
                              <p className="kc-pending-row__meta">{n} item(s) on record</p>
                            </div>
                            <div className="kc-pending-row__right">
                              <span className="kc-pending-pill">Active</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>

              <div className="main-area__scan-card kc-scan-stage">
                {renderCard()}
              </div>

              <section className="kc-live-log" aria-label="Live activity log">
                <header className="kc-live-log__head">
                  <div className="kc-live-log__title-wrap">
                    <span className="kc-live-dot" aria-hidden />
                    <h2 className="kc-live-log__title">Live activity log</h2>
                  </div>
                  <div className="kc-live-log__tools">
                    <button type="button" className="kc-icon-btn" aria-label="Filters">
                      <Filter size={18} strokeWidth={2} />
                    </button>
                    <button type="button" className="kc-icon-btn" aria-label="Export">
                      <Download size={18} strokeWidth={2} />
                    </button>
                  </div>
                </header>
                <div className="kc-live-log__scroll">
                  <table className="kc-live-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Entity</th>
                        <th>Action</th>
                        <th>Details</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivityLog.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="kc-live-table__empty">
                            No rows match this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredActivityLog.map((row, idx) => {
                          const t = row.time instanceof Date ? row.time : new Date(row.time);
                          return (
                            <tr
                              key={row.id}
                              className={idx % 2 === 1 ? "kc-live-table__row--alt" : undefined}
                            >
                              <td className="kc-live-table__mono">
                                {t.toLocaleTimeString([], { hour12: false })}
                              </td>
                              <td className="kc-live-table__strong">{row.student}</td>
                              <td>{logActionLabel(row.facility, row.action)}</td>
                              <td className="kc-live-table__muted">
                                {row.facility} / RFID scan
                              </td>
                              <td>
                                <span className="kc-live-status">Success</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <Link to="/sport-room" className="kc-fab" title="Open sport room" aria-label="Open sport room">
        <Plus size={24} strokeWidth={2} />
      </Link>
      </>
    </AppShell>
  );
}
