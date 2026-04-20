import { NavLink } from "react-router-dom";
import { Building2, BarChart3, Activity, RefreshCw, LogOut, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRailScanFeed } from "../../context/RailScanFeedContext";
import BrandMark from "../common/BrandMark";
import NamasteGreeting from "../common/NamasteGreeting";
import RfidRailModule from "../dashboard/RfidRailModule";
import { initialsFromName } from "../../utils/userDisplay";
import "../../styles/app-shell.css";
import "../../styles/dashboard.css";

/**
 * Kinetic-style shell: fixed command rail + sticky app bar.
 * Palette stays with global theme (maroon / rose / light surfaces).
 * Rail RFID + emergency + support are identical on every page.
 */
export default function AppShell({
  children,
  pageEmphasis = "Operations",
  headerLeft = null,
  headerExtras = null,
  /** When set, replaces the default headerLeft + greeting cluster (e.g. command bar). */
  barLeading = null,
  onRefresh
}) {
  const { logout, userName } = useAuth();
  const railRecentScans = useRailScanFeed();

  const handleRefresh = () => {
    if (typeof onRefresh === "function") onRefresh();
    else window.location.reload();
  };

  const handleEmergency = () => {
    if (
      window.confirm(
        "Emergency override will alert facilities control. Continue?"
      )
    ) {
      window.alert("Facilities control notified (demo). Follow your venue runbook in production.");
    }
  };

  return (
    <div className="app-shell">
      <aside className="app-shell__rail" aria-label="Main navigation">
        <div className="app-shell__rail-brand">
          <BrandMark className="brand-mark--nav" alt="Rishihood University" />
          <div className="app-shell__rail-titles">
            <p className="app-shell__rail-kicker">Rishihood University</p>
            <h1 className="app-shell__rail-title">Operations hub</h1>
          </div>
        </div>

        <nav className="app-shell__nav">
          <NavLink
            end
            to="/"
            className={({ isActive }) =>
              `app-shell__nav-link${isActive ? " app-shell__nav-link--active" : ""}`
            }
          >
            <span className="app-shell__nav-icon">
              <Building2 size={18} strokeWidth={2} />
            </span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `app-shell__nav-link${isActive ? " app-shell__nav-link--active" : ""}`
            }
          >
            <span className="app-shell__nav-icon">
              <BarChart3 size={18} strokeWidth={2} />
            </span>
            <span>Analytics</span>
          </NavLink>
          <NavLink
            to="/sport-room"
            className={({ isActive }) =>
              `app-shell__nav-link${isActive ? " app-shell__nav-link--active" : ""}`
            }
          >
            <span className="app-shell__nav-icon">
              <Activity size={18} strokeWidth={2} />
            </span>
            <span>Sport room</span>
          </NavLink>
        </nav>

        <div className="app-shell__rail-slot">
          <RfidRailModule recentScans={railRecentScans} />
          <button type="button" className="kc-emergency-btn" onClick={handleEmergency}>
            <AlertTriangle size={16} strokeWidth={2} aria-hidden />
            Emergency override
          </button>
          <a className="kc-support-link" href="mailto:support@rishihood.edu.in">
            Support
          </a>
        </div>

        <div className="app-shell__rail-footer">
          <button type="button" className="app-shell__logout" onClick={() => { logout(); window.location.href = "/login"; }}>
            <LogOut size={16} strokeWidth={2} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__bar">
          <div className="app-shell__bar-left">
            <NamasteGreeting userName={userName} pageEmphasis={pageEmphasis} />
          </div>
          <div className="app-shell__bar-center">
            {barLeading || headerLeft}
          </div>
          <div className="app-shell__bar-right">
            {headerExtras}
            <button type="button" className="app-shell__icon-btn" onClick={handleRefresh} title="Refresh">
              <RefreshCw size={18} strokeWidth={2} />
            </button>
            <div className="app-shell__avatar" title={userName || "User"}>
              {initialsFromName(userName)}
            </div>
          </div>
        </header>

        <div className="app-shell__body kc-surface-0">{children}</div>
      </div>
    </div>
  );
}
