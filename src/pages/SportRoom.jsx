import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import IssueCard from '../components/dashboard/cards/IssueCard';
import ReturnCard from '../components/dashboard/cards/ReturnCard';
import SuccessCard from '../components/dashboard/cards/SuccessCard';
import ErrorCard from '../components/dashboard/cards/ErrorCard';
import WaitingCard from '../components/dashboard/cards/WaitingCard';
import UnregisteredCard from '../components/dashboard/cards/UnregisteredCard';
import '../styles/dashboard.css';
import useScanListener from '../hooks/useScanListener';
import EquipmentBarChart from '../components/analytics/EquipmentBarChart';
import KPICards from '../components/analytics/KPICards';
import TimeSeriesChart from '../components/analytics/TimeSeriesChart';
import RecentEventsTable from '../components/analytics/RecentEventsTable';
import { getDashboardOverview, getOccupancyTimeSeries } from '../api/dashboard_api';

export default function SportRoom() {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [tsData, setTsData] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCard, setActiveCard] = useState(null);

  // Form for starting an issue
  const [studentIdInput, setStudentIdInput] = useState('');

  // New refs and derived state for KPIs / live feed
  const feedRef = useRef(null);

  // Dummy usage data to display in Equipment Usage & Risk
  const dummyUsage = useMemo(() => [
    { name: 'Badminton Racket', issuedToday: 12, pending: 3 },
    { name: 'Shuttlecock Pack', issuedToday: 8, pending: 1 },
    { name: 'Table Tennis Bat', issuedToday: 6, pending: 0 },
    { name: 'Football', issuedToday: 5, pending: 2 },
    { name: 'Tennis Ball Set', issuedToday: 4, pending: 0 }
  ], []);

  // Map recent events to the shape expected by RecentEventsTable
  const eventsForTable = useMemo(() => {
    return (recent || []).map(ev => {
      const action = (ev.action || ev.mode || ev.type || '').toString().toUpperCase();
      let type = 'EVENT';
      if (action.includes('ENTER')) type = 'ENTRY';
      else if (action.includes('EXIT')) type = 'EXIT';
      else if (action.includes('ISSUED')) type = 'EQUIPMENT_ISSUE';
      else if (action.includes('RETURN')) type = 'EQUIPMENT_RETURN';

      return {
        type,
        timestamp: ev.issued_at || ev.timestamp || new Date().toISOString(),
        student_name: ev.student?.student_name || ev.student_name || 'Unknown',
        student_id: ev.student?.student_id || ev.student_id || '-',
        facility_id: ev.facility || ev.facility_id || 'SPORTS_ROOM',
        details: {
          items: Array.isArray(ev.items) ? ev.items : (ev.items ? [ev.items] : []),
          duration_minutes: ev.duration_minutes || ev.details?.duration_minutes
        }
      };
    }).slice(0, 200);
  }, [recent]);

  // Derived KPIs and equipment usage lists
  const computed = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];

    // helpers
    const isToday = (iso) => {
      if (!iso) return false;
      try { return (new Date(iso)).toISOString().split('T')[0] === todayKey; } catch(e) { return false; }
    };

    const getItemQty = (it) => Number(it?.qty ?? it?.issued_qty ?? it?.quantity ?? it?.count ?? 1);

    // KPIs
    const studentsInside = Number(overview?.occupancy?.total ?? 0);
    const activeEquipmentIssues = Number(overview?.active_equipment?.active_issues ?? overview?.active_equipment?.total_pending_items ?? 0);

    // issued today and usage aggregation
    const usageMap = {};
    let issuedTodayCount = 0;

    // pending returns by student (unique)
    const pendingStudents = new Set();

    (recent || []).forEach(ev => {
      const action = (ev.action || ev.mode || ev.type || '').toString().toUpperCase();
      const isIssued = action.includes('ISSUED') || action === 'ISSUED';
      const isReturn = action.includes('RETURN') || action === 'RETURNED' || action === 'PARTIAL_RETURN';

      // mark pending students when event looks like an open issue
      if (isIssued && !ev.returned) {
        if (ev.student?.student_id || ev.student_id) pendingStudents.add(ev.student?.student_id || ev.student_id);
      }

      // aggregate usage for today (issued / returned adjustments)
      if (isToday(ev.issued_at || ev.timestamp || ev.created_at)) {
        const items = Array.isArray(ev.items) ? ev.items : (ev.items ? [ev.items] : []);
        items.forEach(it => {
          const name = it.equipment_name || it.equipment_type || it.name || it.type || 'Unknown';
          const qty = getItemQty(it);
          if (!usageMap[name]) usageMap[name] = { issued: 0, returned: 0 };

          if (isIssued) {
            usageMap[name].issued += qty;
            issuedTodayCount += qty;
          }

          if (isReturn) {
            usageMap[name].returned += qty;
          }
        });
      }
    });

    // compute pending per equipment as issued-returned (today scope)
    const usageList = Object.keys(usageMap).map(name => ({
      name,
      issuedToday: usageMap[name].issued || 0,
      pending: Math.max(0, (usageMap[name].issued || 0) - (usageMap[name].returned || 0))
    })).sort((a,b) => b.issuedToday - a.issuedToday);

    // students with pending returns: prefer overview if present
    const studentsWithPending = Number(overview?.active_equipment?.unique_students ?? pendingStudents.size);

    // average session time (optional)
    const avgSessionMs = overview?.duration?.average_ms ?? overview?.average_session_ms ?? null;
    const avgSession = avgSessionMs ? `${Math.round(avgSessionMs/60000)} min` : (overview?.duration?.average || null);

    return {
      studentsInside,
      activeEquipmentIssues,
      studentsWithPending,
      issuedTodayCount,
      avgSession,
      usageList
    };
  }, [overview, recent, equipment]);

  // Auto-scroll live feed when recent updates
  useEffect(() => {
    if (!feedRef.current) return;
    // small timeout so new elements render before scrolling
    const t = setTimeout(() => {
      try { feedRef.current.scrollTop = feedRef.current.scrollHeight; } catch(e){}
    }, 50);
    return () => clearTimeout(t);
  }, [recent]);

  // Fetch equipment and recent lists (extracted for reuse)
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const eqRes = await fetch('http://localhost:3000/api/sports-room/equipment', { headers }).catch(() => null);

      if (eqRes && eqRes.ok) {
        const eqJson = await eqRes.json();
        const eqList = Array.isArray(eqJson) ? eqJson : (eqJson?.equipment || []);
        setEquipment(eqList || []);
      } else {
        if (eqRes && eqRes.status === 401) console.warn('Not authorized to fetch equipment');
        setEquipment([]);
      }

      // Fetch dashboard overview for KPIs (safe to call - axios adds token)
      try {
        const ov = await getDashboardOverview();
        setOverview(ov.data || null);
      } catch (e) {
        console.warn('Could not fetch dashboard overview', e.message || e);
        setOverview(null);
      }

      // Optionally fetch a small timeseries for the equipment area (using SPORTS_ROOM facility)
      try {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        const startDate = start.toISOString().split('T')[0];
        const endDate = now.toISOString().split('T')[0];
        const tsRes = await getOccupancyTimeSeries('SPORTS_ROOM', startDate, endDate, 'daily').catch(() => null);
        setTsData(tsRes?.data || null);
      } catch (e) {
        setTsData(null);
      }

      const recentRes = await fetch('http://localhost:3000/api/sports-room/recent', { headers }).catch(() => null);
      if (recentRes && recentRes.ok) {
        const recentJson = await recentRes.json();
        const recentList = Array.isArray(recentJson)
          ? recentJson
          : (recentJson?.issues || recentJson?.events || []);
        setRecent(recentList || []);
      } else {
        // Try dashboard recent events as a fallback (protected route)
        const dashRes = await fetch('http://localhost:3000/api/dashboard/events/recent?limit=30&facility=SPORTS_ROOM', { headers }).catch(() => null);
        if (dashRes && dashRes.ok) {
          const dashJson = await dashRes.json();
          const list = Array.isArray(dashJson) ? dashJson : (dashJson?.events || dashJson?.data || []);
          // Normalize to expected shape
          const normalized = (list || []).map(ev => ({
            student: ev.student || { student_id: ev.student_id, student_name: ev.student_name },
            student_name: ev.student?.student_name || ev.student_name,
            student_id: ev.student?.student_id || ev.student_id,
            action: ev.action || ev.mode || ev.type,
            items: ev.items || ev.items || [],
            issue_id: ev.issue_id,
            issued_at: ev.issued_at || ev.timestamp
          }));
          setRecent(normalized);
        } else {
          setRecent([]);
        }
      }
    } catch (err) {
      console.error('SportRoom fetch error', err);
      setEquipment([]);
      setRecent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Helper to adjust equipment quantities in state
  const applyEquipmentDelta = (deltas) => {
    // deltas: array of { equipment_id?, equipment_type?, qty_delta }
    setEquipment((prev) => {
      return prev.map((eq) => {
        // Normalize keys
        const eqId = eq.equipment_id != null ? String(eq.equipment_id) : (eq.id != null ? String(eq.id) : null);
        const eqType = eq.equipment_type || eq.equipment_name || eq.name || eq.type || '';

        // find matching delta by id or by type (case-insensitive)
        const match = deltas.find(d => {
          if (d.equipment_id && eqId && String(d.equipment_id) === eqId) return true;
          if (d.equipment_type && eqType && String(d.equipment_type).toLowerCase() === String(eqType).toLowerCase()) return true;
          return false;
        });

        if (!match) return eq;

        const currentAvail = Number(eq.available_quantity ?? eq.available ?? 0);
        const delta = Number(match.qty_delta ?? 0);
        const newAvail = Math.max(0, currentAvail + delta);

        // preserve total_quantity if present
        return { ...eq, available_quantity: newAvail };
      });
    });
  };

  // Listen for real-time scan events and update equipment quantities
  useScanListener((scan) => {
    try {
      if (!scan || scan.facility !== 'SPORTS_ROOM') return;

      // Handle explicit issue/return emitted after server operations
      if (scan.action === 'EQUIPMENT_ISSUED' || scan.action === 'ISSUED') {
        // items likely have equipment_id and qty
        const deltas = (scan.items || []).map(it => ({ equipment_id: it.equipment_id || it.equipment_id, qty_delta: -Math.abs(it.qty || it.qty || it.issued_qty || 0) }));
        applyEquipmentDelta(deltas);
      }

      if (scan.action === 'EQUIPMENT_RETURNED' || scan.action === 'EQUIPMENT_PARTIAL_RETURN' || scan.action === 'RETURNED' || scan.action === 'PARTIAL_RETURN') {
        // returned items may include equipment_type and returned_qty
        const deltas = (scan.items || []).map(it => ({ equipment_type: it.equipment_type || it.equipment_type, qty_delta: Math.abs(it.returned_qty || it.return_qty || it.qty || 0) }));
        applyEquipmentDelta(deltas);
      }

      // Also append normalized recent log for UI
      try {
        const normalized = {
          student: scan.student || { student_id: scan.student_id || scan.student?.student_id, student_name: scan.student_name || scan.student?.student_name },
          student_name: scan.student?.student_name || scan.student_name || (scan.student && scan.student.student_name),
          student_id: scan.student?.student_id || scan.student_id,
          action: scan.action || scan.mode || scan.status,
          items: scan.items || scan.items || [],
          issue_id: scan.issue_id || scan.issueId,
          issued_at: scan.issued_at || scan.timestamp || new Date().toISOString()
        };

        setRecent(prev => [normalized, ...prev].slice(0, 50));
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('WS sports-room update error', err);
    }
  });

  const beginIssueForStudent = async () => {
    if (!studentIdInput) return alert('Enter student ID');

    // 1) Check student exists
    try {
      const studentRes = await fetch(`http://localhost:3000/api/students/search?q=${encodeURIComponent(studentIdInput)}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });

      if (studentRes.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }

      const students = await studentRes.json();

      // No student found → Unregistered
      if (!Array.isArray(students) || students.length === 0) {
        setActiveCard({ type: 'UNREGISTERED', payload: { uid: studentIdInput } });
        return;
      }

      // Pick exact match by ID or first result
      const student = students.find(s => s.student_id === studentIdInput) || students[0];

      // 2) Check active equipment issues for this student
      const activeRes = await fetch('http://localhost:3000/api/dashboard/equipment/active', {
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });

      if (activeRes.status === 401) {
        // If not authorized to fetch active issues, fall back to ISSUE flow
        setActiveCard({ type: 'ISSUE', payload: { student: { student_id: student.student_id, student_name: student.student_name }, available_equipment: equipment } });
        return;
      }

      const activeJson = await activeRes.json();
      const issues = Array.isArray(activeJson?.issues) ? activeJson.issues : (Array.isArray(activeJson) ? activeJson : []);

      const pending = issues.find(i => i.student_id === student.student_id);

      if (pending) {
        // Show return card with the pending issue
        setActiveCard({ type: 'RETURN', payload: { student: { student_id: pending.student_id, student_name: pending.student_name }, items: pending.items || [], issue_id: pending.issue_id, issued_at: pending.issued_at } });
        return;
      }

      // No pending issues → show issue card
      setActiveCard({ type: 'ISSUE', payload: { student: { student_id: student.student_id, student_name: student.student_name }, available_equipment: equipment } });
    } catch (err) {
      console.error('beginIssueForStudent error', err);
      setActiveCard({ type: 'ERROR', payload: { message: 'Network Error' } });
    }
  };

  const handleIssueConfirm = async (student_id, items) => {
    setActiveCard({ type: 'PROCESSING' });

    try {
      const response = await fetch('http://localhost:3000/api/sports-room/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ student_id, items })
      });

      const result = await response.json();

      if (response.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }

      if (result.mode === 'SUCCESS' || response.ok) {
        // Prepend to recent logs
        setRecent(prev => [result, ...prev].slice(0, 50));
        // Update equipment quantities locally (decrement issued items)
        const deltas = (result.items || items || []).map(it => ({ equipment_id: it.equipment_id || it.equipmentId || null, qty_delta: -Math.abs(it.qty || it.qty || it.qty || 0) }));
        applyEquipmentDelta(deltas);
        setActiveCard({ type: 'SUCCESS', payload: { message: 'Equipment Issued', subtext: `${items.length} item(s) issued` } });
      } else {
        setActiveCard({ type: 'ERROR', payload: { message: result.reason || 'Issue failed' } });
      }
    } catch (err) {
      console.error(err);
      setActiveCard({ type: 'ERROR', payload: { message: 'Network Error' } });
    }
  };

  const startReturnForIssue = (issue) => {
    // issue should contain student and items and issue_id
    setActiveCard({ type: 'RETURN', payload: { student: issue.student, items: issue.items, issue_id: issue.issue_id, issued_at: issue.issued_at } });
  };

  const handleReturnConfirm = async (issue_id, returns) => {
    setActiveCard({ type: 'PROCESSING' });

    try {
      const response = await fetch('http://localhost:3000/api/sports-room/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ issue_id, returns })
      });

      const result = await response.json();

      if (response.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }

      if (result.mode === 'SUCCESS' || response.ok) {
        // Update recent logs or refetch
        setRecent(prev => prev.map(r => r.issue_id === issue_id ? { ...r, returned: true } : r));
        // Update equipment quantities locally (increment returned items)
        const deltas = (result.items || returns || []).map(it => ({ equipment_type: it.equipment_type || it.equipmentType || null, qty_delta: Math.abs(it.returned_qty || it.return_qty || it.qty || 0) }));
        applyEquipmentDelta(deltas);
        setActiveCard({ type: 'SUCCESS', payload: { message: 'Return Recorded', subtext: `${returns.length} item(s) returned` } });
      } else {
        setActiveCard({ type: 'ERROR', payload: { message: result.reason || 'Return failed' } });
      }
    } catch (err) {
      console.error(err);
      setActiveCard({ type: 'ERROR', payload: { message: 'Network Error' } });
    }
  };

  const handleCancel = () => setActiveCard(null);

  const renderActiveCard = () => {
    // Remove the default scan/waiting card: when no active card, render nothing
    if (!activeCard) return null;

    switch (activeCard.type) {
      case 'PROCESSING':
        return <WaitingCard />;
      case 'ISSUE':
        return <IssueCard payload={activeCard.payload} onConfirm={handleIssueConfirm} onCancel={handleCancel} />;
      case 'RETURN':
        return <ReturnCard payload={activeCard.payload} onConfirm={handleReturnConfirm} onCancel={handleCancel} />;
      case 'UNREGISTERED':
        return <UnregisteredCard payload={activeCard.payload} />;
      case 'SUCCESS':
        return <SuccessCard payload={activeCard.payload} />;
      case 'ERROR':
        return <ErrorCard payload={activeCard.payload} />;
      default:
        return null;
    }
  };

  return (
    <div className="sportroom-wrapper">
      <div className="dashboard-wrapper">
        <nav className="top-navbar">
          <div className="logo">
            <div className="logo-icon">🏸</div>
            <div>
              <div className="logo-text">Sport Room</div>
              <div className="logo-subtitle">Equipment Inventory & Logs</div>
            </div>
          </div>
        </nav>

        <div className="dashboard-container" style={{ padding: 24 }}>
          <div style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="sidebar-card">
              <h3 className="sidebar-card__title">Start Issue</h3>
              <p className="sidebar-card__subtitle">Enter student ID to begin issue flow</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={studentIdInput} onChange={(e) => setStudentIdInput(e.target.value)} placeholder="Student ID" style={{ flex: 1, padding: 8, borderRadius: 8 }} />
                <button className="btn btn--primary" onClick={beginIssueForStudent}>Begin</button>
              </div>
            </div>

            {/* Restored: Available Equipment sidebar card */}
            <div className="sidebar-card">
              <h3 className="sidebar-card__title">Available Equipment</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>Inventory</div>
                <div>
                  <button className="btn btn--sm" onClick={fetchData} style={{ marginRight: 8 }}>Refresh</button>
                </div>
              </div>

              {loading ? <p style={{ marginTop: 12 }}>Loading...</p> : (
                <div className="equipment-list">
                   {equipment.map(eq => {
                    const id = eq.equipment_id || eq.id || '—';
                    const name = eq.equipment_name || eq.name || eq.type || eq.equipment_type || 'Unknown';
                    const available = Number(eq.available_quantity ?? eq.available ?? 0);
                    const total = Number(eq.total_quantity ?? eq.total ?? available);
                    const pct = total > 0 ? Math.round((available / total) * 100) : 0;

                    return (
                      <div key={id} className="equipment-row" style={{ alignItems: 'center' }}>
                        <div className="equipment-icon">🏸</div>
                        <div className="equipment-details" style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <div>
                              <div className="equipment-name">{name}</div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>ID: {id} • Type: {eq.equipment_type || eq.category || ''}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700 }}>{available} / {total}</div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{pct}% available</div>
                            </div>
                          </div>

                          {/* simple availability bar */}
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 6, marginTop: 8 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#60a5fa,#06b6d4)', borderRadius: 6 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Empty state when inventory is available but list is empty */}
                  {equipment.length === 0 && !loading && (
                    <div style={{ padding: 12, color: 'rgba(255,255,255,0.6)' }}>
                      No equipment found. If you are logged in but see this, try Refresh. Ensure the backend allows this account to view inventory.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sidebar-card">
              <h3 className="sidebar-card__title">Recent Logs</h3>
              {recent.length === 0 ? (
                <p>No recent logs</p>
              ) : (
                <div className="recent-list">
                  {recent.map((r, i) => {
                    const studentObj = r.student || { student_name: r.student_name || 'Unknown', student_id: r.student_id || r.student?.student_id || '—' };
                    const action = r.action || r.mode || r.status || (r.returned ? 'RETURNED' : (r.items ? 'ISSUED' : 'UNKNOWN'));
                    const timeStr = new Date(r.issued_at || r.timestamp || Date.now()).toLocaleString();
                    const itemsCount = Array.isArray(r.items) ? r.items.length : (r.items ? (r.items.length || 0) : 0);

                    return (
                      <div key={i} className="recent-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                              {(studentObj.student_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{studentObj.student_name}</div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>ID: {studentObj.student_id} • {action} • {itemsCount} item(s)</div>
                            </div>
                          </div>

                          <div style={{ color: 'rgba(255,255,255,0.6)' }}>{timeStr}</div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          {/* Show Return action only when there are pending issued items */}
                          {(action === 'ISSUED' || action === 'EQUIPMENT_ISSUED' || r.status === 'ISSUED' || r.items?.length > 0) && (
                            <button className="btn btn--sm" onClick={() => startReturnForIssue(r)}>Return</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* If there is an activeCard show it */}
            {activeCard ? (
              renderActiveCard()
            ) : (
              <>
                {/* TOP: KPI Statistic Cards (4-6) */}
                <div className="kpi-grid">
                  {[
                    { id: 'studentsInside', label: 'Students Inside', value: computed.studentsInside, color: 'primary' },
                    { id: 'activeIssues', label: 'Active Equipment Issues', value: computed.activeEquipmentIssues, color: 'warning' },
                    { id: 'studentsPending', label: 'Students with Pending Returns', value: computed.studentsWithPending, color: computed.studentsWithPending > 0 ? 'warning' : 'muted' },
                    { id: 'issuedToday', label: 'Equipment Issued Today', value: computed.issuedTodayCount, color: 'success' },
                    { id: 'avgSession', label: 'Avg Session Time', value: computed.avgSession || '—', color: 'muted' }
                  ].map(kpi => (
                    <article key={kpi.id} className={`kpi-card kpi-card--${kpi.color}`} style={{ minWidth: 180 }}>
                      <header className="kpi-card__header">
                        <span className="kpi-card__label">{kpi.label}</span>
                      </header>
                      <div className="kpi-card__body">
                        <div className="kpi-card__value-row">
                          <span className="kpi-card__value">{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* MIDDLE: Equipment Usage & Risk Panel */}
                <div className="card" style={{ padding: 12 }}>
                  <h3 style={{ margin: 0 }}>Equipment Usage & Risk</h3>
                  <p style={{ marginTop: 6, marginBottom: 12, color: 'rgba(255,255,255,0.6)' }}>Ranked by issued quantity today. Pending indicates items not yet returned.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                    {(computed.usageList && computed.usageList.length > 0 ? computed.usageList : dummyUsage).map((u, idx) => (
                        <div key={u.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{idx+1}</div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{u.name}</div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{u.issuedToday} issued today • {u.pending} pending</div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700 }}>{u.issuedToday}</div>
                            <div style={{ fontSize: 12, color: u.pending > 0 ? '#f59e0b' : 'rgba(255,255,255,0.6)' }}>{u.pending} pending</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* BOTTOM: Live Activity Feed (use analytics RecentEventsTable) */}
                <div className="card" style={{ padding: 12 }}>
                  <h3 style={{ margin: 0 }}>Live Activity Feed</h3>
                  <p style={{ marginTop: 6, marginBottom: 6, color: 'rgba(255,255,255,0.6)' }}>Real-time events for entries, exits, issues and returns. Use filters and search as in Analytics.</p>

                  <div style={{ marginTop: 8 }}>
                    <RecentEventsTable events={eventsForTable} compact={false} />
                  </div>
                </div>

                {/* Keep existing charts below for context */}
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  {tsData && <div className="card" style={{ flex: 1 }}><TimeSeriesChart data={tsData} /></div>}
                  <div className="card" style={{ flex: 1 }}><EquipmentBarChart equipment={equipment} /></div>
                </div>
              </>
            )}
          </div>
         </div>
       </div>
     </div>
   );
 }
