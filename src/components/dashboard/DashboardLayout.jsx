import { useState, useEffect } from "react";
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
import FacilityAnalyticsCard from "./cards/FacilityAnalyticsCard";
import { Building2, BarChart3, RefreshCw, LogOut, Activity } from "lucide-react";
import { getOccupancyTimeSeries } from "../../api/dashboard_api";
import "../../styles/dashboard.css";

export default function DashboardLayout() {
  const { token, logout } = useAuth();
  const [activeCard, setActiveCard] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  const [facilityStats, setFacilityStats] = useState({
    GYM: 0,
    SWIMMING: 0,
    BADMINTON: 0,
    SPORTS_ROOM: 0
  });

  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState({
    GYM: null,
    BADMINTON: null,
    SWIMMING: null
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Fetch analytics data on mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const today = new Date();
        
        const startDate = yesterday.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const [gymData, badmintonData, swimmingData] = await Promise.all([
          getOccupancyTimeSeries('GYM', startDate, endDate, 'hourly').catch(() => null),
          getOccupancyTimeSeries('BADMINTON', startDate, endDate, 'hourly').catch(() => null),
          getOccupancyTimeSeries('SWIMMING', startDate, endDate, 'hourly').catch(() => null)
        ]);

        setAnalyticsData({
          GYM: gymData?.data || null,
          BADMINTON: badmintonData?.data || null,
          SWIMMING: swimmingData?.data || null
        });
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Derive filtered lists for sidebar
  const recentFacilityScans = recentScans
    .filter(scan => 
      ['GYM', 'SWIMMING', 'BADMINTON'].includes(scan.facility) && 
      ['ENTRY', 'EXIT'].includes(scan.action)
    )
    .slice(0, 8);

  const recentSportsRoomActivity = recentScans
    .filter(scan => 
      scan.facility === 'SPORTS_ROOM' && 
      ['ISSUED', 'RETURNED', 'ISSUE', 'RETURN'].includes(scan.action)
    )
    .map(scan => ({
      ...scan,
      action: scan.action === 'ISSUE' ? 'ISSUED' : scan.action === 'RETURN' ? 'RETURNED' : scan.action
    }))
    .slice(0, 8);

  // Handle WebSocket scan events
  useScanListener((scan) => {
    console.log("📥 Dashboard received scan:", scan);

    // Add to recent scans
    addRecentScan(scan);

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

  // Add recent scan to sidebar
  const addRecentScan = (scan) => {
    const entry = {
      id: Date.now(),
      student: scan.student?.student_name || "Unknown",
      facility: scan.facility,
      action: scan.action || scan.mode,
      time: new Date()
    };

    setRecentScans((prev) => [entry, ...prev.slice(0, 9)]);
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

  return (
    <div className="dashboard-wrapper">
      {/* Top Navbar */}
      <nav className="top-navbar">
        <div className="logo">
          <div className="logo-icon">
            <Building2 size={24} strokeWidth={2} />
          </div>
          <div>
            <div className="logo-text">Sports Tracker</div>
            <div className="logo-subtitle">Facility Management System</div>
          </div>
        </div>

        <div className="header-actions">
          <a href="/" className="header-btn secondary">
            <Building2 size={16} strokeWidth={2} />
            <span>Dashboard</span>
          </a>

          <a href="/analytics" className="header-btn secondary">
            <BarChart3 size={16} strokeWidth={2} />
            <span>Analysis</span>
          </a>

          <a href="/sport-room" className="header-btn secondary">
            <Activity size={16} strokeWidth={2} />
            <span>Sport Room</span>
          </a>

          <button className="header-btn secondary" onClick={() => window.location.reload()}>
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

      {/* Main Content Area */}
      <div className="dashboard-container">
        <Sidebar
          facilityStats={facilityStats}
          recentFacilityScans={recentFacilityScans}
          recentSportsRoomActivity={recentSportsRoomActivity}
        />

        <div className="main-area">
          <div className="main-area__scan-card">
            {renderCard()}
          </div>

          {/* Analytics Cards Section */}
          <div className="main-area__analytics">
            <h3 className="analytics-section-title">Past Day Usage Trends</h3>
            <div className="analytics-cards-grid">
              <FacilityAnalyticsCard
                facility="GYM"
                data={analyticsData.GYM}
                loading={analyticsLoading}
                currentCount={facilityStats.GYM}
              />
              <FacilityAnalyticsCard
                facility="BADMINTON"
                data={analyticsData.BADMINTON}
                loading={analyticsLoading}
                currentCount={facilityStats.BADMINTON}
              />
              <FacilityAnalyticsCard
                facility="SWIMMING"
                data={analyticsData.SWIMMING}
                loading={analyticsLoading}
                currentCount={facilityStats.SWIMMING}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
