import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import IssueCard from '../components/dashboard/cards/IssueCard';
import ReturnCard from '../components/dashboard/cards/ReturnCard';
import SuccessCard from '../components/dashboard/cards/SuccessCard';
import ErrorCard from '../components/dashboard/cards/ErrorCard';
import WaitingCard from '../components/dashboard/cards/WaitingCard';
import UnregisteredCard from '../components/dashboard/cards/UnregisteredCard';
import '../styles/dashboard.css';
import '../styles/analytics.css';
import useScanListener from '../hooks/useScanListener';
import EquipmentBarChart from '../components/analytics/EquipmentBarChart';
import KPICards from '../components/analytics/KPICards';
import TimeSeriesChart from '../components/analytics/TimeSeriesChart';
import RecentEventsTable from '../components/analytics/RecentEventsTable';
import { getDashboardOverview, getOccupancyTimeSeries, getDateRange } from '../api/dashboard_api';
import api from '../api/axios';
import AppShell from '../components/layout/AppShell';
import { ChartCardSkeleton, ListSkeleton, SkeletonBlock, StatCardSkeleton, TableSkeleton } from '../components/common/Skeleton';
import EquipmentLogsTable from '../components/sportroom/EquipmentLogsTable';
import { ClipboardList, Package, RotateCcw, Users, Calendar } from "lucide-react";

export default function SportRoom() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return tab === "logs" ? "logs" : "inventory";
  }); // inventory | logs
  const [overview, setOverview] = useState(null);
  const [tsData, setTsData] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [activeCard, setActiveCard] = useState(null);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Form for starting an issue
  const [studentIdInput, setStudentIdInput] = useState('');

  const [selectedEquipment, setSelectedEquipment] = useState("ALL");

  const [periodPreset, setPeriodPreset] = useState("today"); // today | yesterday | weekly | monthly | custom
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [customDate, setCustomDate] = useState(getDateRange("today").startDate);
  const [dateRange, setDateRange] = useState(getDateRange("today"));
  const customDateRef = useRef(null);

  const normalizeKey = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const selectedEquipmentKey = useMemo(() => normalizeKey(selectedEquipment), [selectedEquipment]);

  const effectiveGranularity = useMemo(() => {
    if (periodPreset === "today" || periodPreset === "yesterday") return "hourly";
    if (periodPreset === "weekly") return "daily";
    if (periodPreset === "monthly") return "weekly";
    // custom is a single date (start=end)
    return "hourly";
  }, [periodPreset, dateRange]);

  const HIDDEN_EQUIPMENT_KEYS = useMemo(() => new Set(["towel"]), []);

  const filteredEquipment = useMemo(() => {
    const rows = equipment || [];
    const visible = rows.filter((e) => {
      const name = String(e.equipment_name || e.name || e.type || "").trim();
      return !HIDDEN_EQUIPMENT_KEYS.has(normalizeKey(name));
    });
    if (selectedEquipment === "ALL") return visible;
    return visible.filter((e) => {
      const name = String(e.equipment_name || e.name || e.type || "");
      const type = String(e.category || e.equipment_type || "");
      return normalizeKey(`${name} ${type}`).includes(selectedEquipmentKey);
    });
  }, [equipment, selectedEquipment, selectedEquipmentKey, HIDDEN_EQUIPMENT_KEYS, normalizeKey]);

  const pendingByEquipmentKey = useMemo(() => {
    const issues = Array.isArray(overview?.active_equipment?.issues)
      ? overview.active_equipment.issues
      : [];

    const map = {};
    issues.forEach((issue) => {
      const items = Array.isArray(issue?.items) ? issue.items : [];
      items.forEach((it) => {
        const label = String(it?.equipment_name || it?.equipment_type || it?.name || it?.type || "").trim();
        if (!label) return;
        const key = normalizeKey(label);
        const pending = Number(
          it?.pending_qty ?? (Number(it?.issued_qty ?? 0) - Number(it?.returned_qty ?? 0)) ?? 0
        );
        if (pending > 0) map[key] = (map[key] || 0) + pending;
      });
    });
    return map;
  }, [overview, normalizeKey]);

  const equipmentFilters = useMemo(() => {
    const rows = Array.isArray(equipment) ? equipment : [];
    const names = rows
      .map((e) => String(e?.equipment_name || e?.name || e?.equipment_type || e?.type || "").trim())
      .filter(Boolean);
    const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    return [{ value: "ALL", label: "All equipment" }].concat(
      unique.map((n) => ({ value: n, label: n }))
    );
  }, [equipment]);

  const inventoryList = useMemo(() => {
    const rows = Array.isArray(filteredEquipment) ? filteredEquipment : [];
    return rows
      .map((eq) => {
        const id = eq.equipment_id ?? eq.id ?? eq.equipmentId ?? eq._id ?? `${eq.equipment_name || eq.name || eq.equipment_type || eq.type}-${Math.random()}`;
        const name = String(eq.equipment_name || eq.name || eq.type || eq.equipment_type || "Unknown").trim();
        const total = Number(eq.total_quantity ?? eq.total ?? 0) || 0;
        const rawAvail = Number(eq.available_quantity ?? eq.available ?? 0);
        const pending = pendingByEquipmentKey[normalizeKey(name)] || 0;
        // Prefer issue-derived pending when present; this keeps Inventory consistent with "Pending returns" list.
        const derivedAvail = Math.max(0, total - pending);
        const available =
          pending > 0 ? Math.min(Number.isFinite(rawAvail) ? rawAvail : derivedAvail, derivedAvail) : rawAvail;
        return { id, name, available, total };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredEquipment, pendingByEquipmentKey, normalizeKey]);

  const sportTabs = (
    <div className="analytics-app-shell-tabs">
      <div className="nav-tabs">
        <button
          type="button"
          className={`nav-tab ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("inventory");
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", "inventory");
              return p;
            }, { replace: true });
          }}
        >
          <Package size={16} strokeWidth={2} />
          <span>Inventory</span>
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("logs");
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", "logs");
              return p;
            }, { replace: true });
          }}
        >
          <ClipboardList size={16} strokeWidth={2} />
          <span>Logs</span>
        </button>
      </div>
    </div>
  );

  // If user refreshes while on logs, keep them on logs.
  useEffect(() => {
    const tab = searchParams.get("tab");
    const next = tab === "logs" ? "logs" : "inventory";
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // New refs and derived state for KPIs / live feed
  const feedRef = useRef(null);

  const recentScoped = useMemo(() => {
    if (selectedEquipment === "ALL") return recent || [];
    const matches = (itOrName) => {
      const name =
        typeof itOrName === "string"
          ? itOrName
          : String(itOrName?.equipment_name || itOrName?.equipment_type || itOrName?.name || itOrName?.type || "");
      return normalizeKey(name).includes(selectedEquipmentKey);
    };
    return (recent || []).filter((ev) => {
      const items = Array.isArray(ev.items) ? ev.items : (ev.items ? [ev.items] : []);
      return items.some((it) => matches(it));
    });
  }, [recent, selectedEquipment, selectedEquipmentKey]);

  // Map recent events to the shape expected by RecentEventsTable
  const eventsForTable = useMemo(() => {
    return (recentScoped || []).map(ev => {
      const action = (ev.action || ev.mode || ev.type || '').toString().toUpperCase();
      let type = 'EVENT';
      if (action.includes('ENTER')) type = 'ENTRY';
      else if (action.includes('EXIT')) type = 'EXIT';
      else if (action.includes('ISSUED')) type = 'EQUIPMENT_ISSUE';
      else if (action.includes('RETURN')) type = 'EQUIPMENT_RETURN';

      const items = Array.isArray(ev.items) ? ev.items : (ev.items ? [ev.items] : []);
      const itemsSummary = items
        .slice(0, 3)
        .map((it) => it.equipment_name || it.equipment_type || it.name || it.type || "Equipment")
        .filter(Boolean)
        .join(", ");

      return {
        type,
        timestamp: ev.issued_at || ev.timestamp || new Date().toISOString(),
        student_name: ev.student?.student_name || ev.student_name || 'Unknown',
        student_id: ev.student?.student_id || ev.student_id || '-',
        // Keep table shape the same, but show equipment details in the last column for Sport Room.
        facility_id: (ev.facility || ev.facility_id || 'SPORTS_ROOM') === "SPORTS_ROOM" ? (itemsSummary || "—") : (ev.facility || ev.facility_id || 'SPORTS_ROOM'),
        details: {
          items,
          duration_minutes: ev.duration_minutes || ev.details?.duration_minutes
        }
      };
    }).slice(0, 200);
  }, [recentScoped]);

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
    const matchesSelectedEquipment = (itOrName) => {
      if (selectedEquipment === "ALL") return true;
      const name =
        typeof itOrName === "string"
          ? itOrName
          : String(itOrName?.equipment_name || itOrName?.equipment_type || itOrName?.name || itOrName?.type || "");
      return normalizeKey(name).includes(selectedEquipmentKey);
    };

    const matchesSelectedEquipmentLabel = (label) => {
      if (selectedEquipment === "ALL") return true;
      return normalizeKey(label).includes(selectedEquipmentKey);
    };

    // Period-scoped totals
    const uniqueStudentsIssuedSet = new Set();
    let totalEquipmentIssued = 0;
    (recent || []).forEach((ev) => {
      const action = (ev.action || ev.mode || ev.type || '').toString().toUpperCase();
      const isIssued = action.includes('ISSUED') || action === 'ISSUED' || action === 'EQUIPMENT_ISSUED';
      if (!isIssued) return;
      const sid = ev.student?.student_id || ev.student_id;
      const items = Array.isArray(ev.items) ? ev.items : (ev.items ? [ev.items] : []);
      const matchedQty = items.reduce((s, it) => (matchesSelectedEquipment(it) ? s + getItemQty(it) : s), 0);
      if (matchedQty > 0) {
        totalEquipmentIssued += matchedQty;
        if (sid) uniqueStudentsIssuedSet.add(sid);
      }
    });
    const totalStudents = uniqueStudentsIssuedSet.size;

    // issued today and usage aggregation
    const usageMap = {};
    let issuedTodayCount = 0;

    // Pending returns (qty) should match the pending-issue list (single source of truth).
    // Inventory display is adjusted from the same data (see `pendingByEquipmentKey`).
    let pendingReturnsQty = 0;
    Object.entries(pendingByEquipmentKey || {}).forEach(([key, qty]) => {
      if (selectedEquipment !== "ALL" && !key.includes(selectedEquipmentKey)) return;
      pendingReturnsQty += Number(qty || 0) || 0;
    });

    (recent || []).forEach(ev => {
      const action = (ev.action || ev.mode || ev.type || '').toString().toUpperCase();
      const isIssued = action.includes('ISSUED') || action === 'ISSUED';
      const isReturn = action.includes('RETURN') || action === 'RETURNED' || action === 'PARTIAL_RETURN';

      // aggregate usage for today (issued / returned adjustments)
      if (isToday(ev.issued_at || ev.timestamp || ev.created_at)) {
        const items = Array.isArray(ev.items) ? ev.items : (ev.items ? [ev.items] : []);
        items.forEach(it => {
          const name = it.equipment_name || it.equipment_type || it.name || it.type || 'Unknown';
          if (!matchesSelectedEquipment(name)) return;
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

    // average session time (optional)
    const avgSessionMs = overview?.duration?.average_ms ?? overview?.average_session_ms ?? null;
    const avgSession = avgSessionMs ? `${Math.round(avgSessionMs/60000)} min` : (overview?.duration?.average || null);

    return {
      totalEquipmentIssued,
      totalStudents,
      pendingReturnsQty,
      issuedTodayCount,
      avgSession,
      usageList
    };
  }, [overview, recent, equipment, dateRange, selectedEquipment, selectedEquipmentKey, pendingByEquipmentKey]);

  // Auto-scroll live feed when recent updates
  useEffect(() => {
    if (!feedRef.current) return;
    // small timeout so new elements render before scrolling
    const t = setTimeout(() => {
      try { feedRef.current.scrollTop = feedRef.current.scrollHeight; } catch(e){}
    }, 50);
    return () => clearTimeout(t);
  }, [recent]);

  const fetchCoreData = async () => {
    setLoading(true);
    try {
      const eqRes = await api.get('/sports-room/equipment').catch((e) => e?.response || null);
      if (eqRes && eqRes.status === 401) console.warn('Not authorized to fetch equipment');
      const eqJson = eqRes?.data;
      const eqList = Array.isArray(eqJson) ? eqJson : (eqJson?.equipment || []);
      setEquipment(eqList || []);

      // Fetch dashboard overview for KPIs (safe to call - axios adds token)
      try {
        const ov = await getDashboardOverview();
        setOverview(ov.data || null);
      } catch (e) {
        console.warn('Could not fetch dashboard overview', e.message || e);
        setOverview(null);
      }

      const recentRes = await api
        .get('/sports-room/recent', {
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            limit: 800,
          },
        })
        .catch((e) => e?.response || null);

      if (recentRes?.status === 200) {
        const recentJson = recentRes.data;
        const recentList = Array.isArray(recentJson)
          ? recentJson
          : (recentJson?.issues || recentJson?.events || []);
        setRecent(recentList || []);
      } else {
        // Try dashboard recent events as a fallback (protected route)
        const dashRes = await api
          .get('/dashboard/events/recent', { params: { limit: 30, facility: 'SPORTS_ROOM' } })
          .catch((e) => e?.response || null);
        if (dashRes?.status === 200) {
          const dashJson = dashRes.data;
          const list = Array.isArray(dashJson) ? dashJson : (dashJson?.events || dashJson?.data || []);
          const normalized = (list || []).map((ev) => ({
            student: ev.student || { student_id: ev.student_id, student_name: ev.student_name },
            student_name: ev.student?.student_name || ev.student_name,
            student_id: ev.student?.student_id || ev.student_id,
            action: ev.action || ev.mode || ev.type,
            items: ev.items || [],
            issue_id: ev.issue_id,
            issued_at: ev.issued_at || ev.timestamp,
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
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchCoreData();
  }, [token, dateRange]);

  const fetchTimeSeries = async () => {
    try {
      const tsRes = await getOccupancyTimeSeries(
        'SPORTS_ROOM',
        dateRange.startDate,
        dateRange.endDate,
        effectiveGranularity
      ).catch(() => null);
      setTsData(tsRes?.data || null);
    } catch (e) {
      setTsData(null);
    }
  };

  useEffect(() => {
    fetchTimeSeries();
  }, [token, dateRange, effectiveGranularity]);

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

      // Immediately surface an active card for issue/return scans to remove UI lag
      const mode = (scan.mode || scan.action || scan.status || '').toString().toUpperCase();

      if (mode === 'ISSUE' || mode === 'EQUIPMENT_ISSUED' || mode === 'ISSUED') {
        setActiveCard({
          type: 'ISSUE',
          payload: {
            student: scan.student || { student_id: scan.student_id, student_name: scan.student_name },
            available_equipment: scan.available_equipment || equipment
          }
        });
      } else if (mode === 'RETURN' || mode === 'EQUIPMENT_RETURNED' || mode === 'RETURNED' || mode === 'PARTIAL_RETURN') {
        setActiveCard({
          type: 'RETURN',
          payload: {
            student: scan.student || { student_id: scan.student_id, student_name: scan.student_name },
            issue_id: scan.issue_id || scan.issueId,
            items: scan.items || [],
            issued_at: scan.issued_at || scan.timestamp
          }
        });
      } else if (mode === 'BLOCKED') {
        setActiveCard({ type: 'ERROR', payload: { message: scan.reason || 'Blocked' } });
      } else if (mode === 'REJECTED') {
        setActiveCard({ type: 'UNREGISTERED', payload: { uid: scan.uid } });
      }

      // Handle explicit issue/return emitted after server operations (update equipment quantities)
      if (scan.action === 'EQUIPMENT_ISSUED' || scan.action === 'ISSUED') {
        const deltas = (scan.items || []).map(it => ({ equipment_id: it.equipment_id || it.id || null, qty_delta: -Math.abs(it.qty ?? it.issued_qty ?? 0) }));
        applyEquipmentDelta(deltas);
      }

      if (scan.action === 'EQUIPMENT_RETURNED' || scan.action === 'EQUIPMENT_PARTIAL_RETURN' || scan.action === 'RETURNED' || scan.action === 'PARTIAL_RETURN') {
        const deltas = (scan.items || []).map(it => ({ equipment_type: it.equipment_type || it.type || null, qty_delta: Math.abs(it.returned_qty ?? it.return_qty ?? it.qty ?? 0) }));
        applyEquipmentDelta(deltas);
      }

      // Also append normalized recent log for UI (keep newest first)
      try {
        const normalized = {
          student: scan.student || { student_id: scan.student_id || scan.student?.student_id, student_name: scan.student_name || scan.student?.student_name },
          student_name: scan.student?.student_name || scan.student_name || (scan.student && scan.student.student_name),
          student_id: scan.student?.student_id || scan.student_id,
          action: scan.action || scan.mode || scan.status,
          items: Array.isArray(scan.items) ? scan.items : (scan.items ? [scan.items] : []),
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
      const studentRes = await api
        .get('/students/search', { params: { q: studentIdInput } })
        .catch((e) => e?.response || null);

      if (studentRes?.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }

      const students = studentRes?.data;

      // No student found → Unregistered
      if (!Array.isArray(students) || students.length === 0) {
        setActiveCard({ type: 'UNREGISTERED', payload: { uid: studentIdInput } });
        return;
      }

      // Pick exact match by ID or first result
      const student = students.find(s => s.student_id === studentIdInput) || students[0];

      // 2) Check active equipment issues for this student
      const activeRes = await api
        .get('/dashboard/equipment/active')
        .catch((e) => e?.response || null);

      if (activeRes?.status === 401) {
        // If not authorized to fetch active issues, fall back to ISSUE flow
        setActiveCard({ type: 'ISSUE', payload: { student: { student_id: student.student_id, student_name: student.student_name }, available_equipment: equipment } });
        return;
      }

      const activeJson = activeRes?.data;
      const issues = Array.isArray(activeJson?.issues) ? activeJson.issues : (Array.isArray(activeJson) ? activeJson : []);

      const matchesSelectedEquipment = (itOrName) => {
        if (selectedEquipment === "ALL") return true;
        const name =
          typeof itOrName === "string"
            ? itOrName
            : String(itOrName?.equipment_type || itOrName?.equipment_name || itOrName?.name || itOrName?.type || "");
        return normalizeKey(name).includes(selectedEquipmentKey);
      };

      const pending = issues.find(i => {
        if (i.student_id !== student.student_id) return false;
        const items = Array.isArray(i.items) ? i.items : [];
        if (selectedEquipment === "ALL") return true;
        return items.some(it => {
          const pendingQty = Number(it?.pending_qty ?? (Number(it?.issued_qty ?? 0) - Number(it?.returned_qty ?? 0)) ?? 0);
          return pendingQty > 0 && matchesSelectedEquipment(it);
        });
      });

      if (pending) {
        // Show return card with the pending issue
        const items = selectedEquipment === "ALL"
          ? (pending.items || [])
          : (pending.items || []).filter((it) => matchesSelectedEquipment(it));
        setActiveCard({ type: 'RETURN', payload: { student: { student_id: pending.student_id, student_name: pending.student_name }, items, issue_id: pending.issue_id, issued_at: pending.issued_at } });
        return;
      }

      // No pending issues → show issue card
      const available = selectedEquipment === "ALL"
        ? equipment
        : (equipment || []).filter((eq) => {
            const name = String(eq.equipment_name || eq.name || "");
            const type = String(eq.equipment_type || eq.category || "");
            return normalizeKey(`${name} ${type}`).includes(selectedEquipmentKey);
          });
      setActiveCard({ type: 'ISSUE', payload: { student: { student_id: student.student_id, student_name: student.student_name }, available_equipment: available } });
    } catch (err) {
      console.error('beginIssueForStudent error', err);
      setActiveCard({ type: 'ERROR', payload: { message: 'Network Error' } });
    }
  };

  const handleIssueConfirm = async (student_id, items) => {
    setActiveCard({ type: 'PROCESSING' });

    try {
      const res = await api.post('/sports-room/issue', { student_id, items });
      const result = res?.data;

      if (res?.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }

      if (result?.mode === 'SUCCESS' || res?.status === 200) {
        // Prepend to recent logs
        setRecent(prev => [result, ...prev].slice(0, 50));
        // Update equipment quantities locally (decrement issued items)
        const deltas = (result.items || items || []).map((it) => ({
          equipment_id: it.equipment_id || it.equipmentId || null,
          qty_delta: -Math.abs(it.qty ?? it.issued_qty ?? 0),
        }));
        applyEquipmentDelta(deltas);
        setActiveCard({ type: 'SUCCESS', payload: { message: 'Equipment Issued', subtext: `${items.length} item(s) issued` } });
      } else {
        setActiveCard({ type: 'ERROR', payload: { message: result.reason || 'Issue failed' } });
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }
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
      const res = await api.post('/sports-room/return', { issue_id, returns });
      const result = res?.data;

      if (res?.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }

      if (result?.mode === 'SUCCESS' || res?.status === 200) {
        // Update recent logs or refetch
        setRecent(prev => prev.map(r => r.issue_id === issue_id ? { ...r, returned: true } : r));
        // Update equipment quantities locally (increment returned items)
        const deltas = (result.items || returns || []).map((it) => ({
          equipment_type: it.equipment_type || it.equipmentType || null,
          qty_delta: Math.abs(it.returned_qty ?? it.return_qty ?? it.qty ?? 0),
        }));
        applyEquipmentDelta(deltas);
        setActiveCard({ type: 'SUCCESS', payload: { message: 'Return Recorded', subtext: `${returns.length} item(s) returned` } });
      } else {
        setActiveCard({ type: 'ERROR', payload: { message: result.reason || 'Return failed' } });
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }
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

  const mainStyles = {
    background: "#ffffff",
    padding: 16,
    borderRadius: 14,
    color: "#2d3436",
    border: "1px solid #e8e8e8",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
  };

  const cardStyle = {
    background: "#ffffff",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #e8e8e8",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
  };

  const kpiValueStyle = { fontSize: 28, fontWeight: 800, color: "#a32638" };
  const kpiLabelStyle = { fontSize: 12, color: "#757575" };

  // Pending students list for the right-hand card
  const pendingStudentsList = useMemo(() => {
    const matchesSelectedEquipment = (itOrName) => {
      if (selectedEquipment === "ALL") return true;
      const name =
        typeof itOrName === "string"
          ? itOrName
          : String(itOrName?.equipment_name || itOrName?.equipment_type || itOrName?.name || itOrName?.type || "");
      return normalizeKey(name).includes(selectedEquipmentKey);
    };

    // Prefer overview data if present
    if (overview?.active_equipment?.issues && Array.isArray(overview.active_equipment.issues)) {
      return overview.active_equipment.issues.map(i => ({
        student_id: i.student_id || i.student?.student_id,
        student_name: i.student_name || i.student?.student_name || (i.student && i.student.student_name),
        outstanding: (i.items || []).reduce((s, it) => {
          if (!matchesSelectedEquipment(it)) return s;
          const pending = Number(it?.pending_qty ?? (Number(it?.issued_qty ?? 0) - Number(it?.returned_qty ?? 0)) ?? 0);
          return s + Math.max(0, pending);
        }, 0),
        items: (i.items || [])
          .map((it) => {
            const pending = Number(it?.pending_qty ?? (Number(it?.issued_qty ?? 0) - Number(it?.returned_qty ?? 0)) ?? 0);
            return { ...it, pending_qty: Math.max(0, pending) };
          })
          .filter((it) => matchesSelectedEquipment(it) && Number(it.pending_qty || 0) > 0),
        lastActivity: i.issued_at || i.timestamp || null
      })).filter(p => p.outstanding > 0).sort((a,b) => b.outstanding - a.outstanding);
    }

    // Fallback: compute from recent events
    const map = {};
    (recent || []).forEach(ev => {
      const sid = ev.student?.student_id || ev.student_id || '__unknown__';
      const sname = ev.student?.student_name || ev.student_name || 'Unknown';
      const action = (ev.action || ev.mode || ev.type || '').toString().toUpperCase();
      const isIssued = action.includes('ISSUED');
      const isReturn = action.includes('RETURN');
      const items = Array.isArray(ev.items) ? ev.items : (ev.items ? [ev.items] : []);
      if (!map[sid]) map[sid] = { student_id: sid, student_name: sname, issued: 0, returned: 0, lastActivity: ev.issued_at || ev.timestamp };
      items.forEach(it => {
        if (!matchesSelectedEquipment(it)) return;
        const qty = Number(it?.qty ?? it?.issued_qty ?? it?.quantity ?? it?.count ?? 1) || 0;
        if (isIssued) map[sid].issued += qty;
        if (isReturn) map[sid].returned += qty;
      });
      // update lastActivity
      const t = new Date(ev.issued_at || ev.timestamp || Date.now());
      if (!map[sid].lastActivity || new Date(map[sid].lastActivity) < t) map[sid].lastActivity = t.toISOString();
    });

    return Object.values(map).map(p => ({ student_id: p.student_id, student_name: p.student_name, outstanding: Math.max(0, p.issued - p.returned), items: [], lastActivity: p.lastActivity })).filter(x => x.outstanding > 0).sort((a,b) => b.outstanding - a.outstanding);
  }, [overview, recent, selectedEquipment, selectedEquipmentKey]);

  return (
    <AppShell
      pageEmphasis="Sport room"
      onRefresh={() => {
        fetchCoreData();
        fetchTimeSeries();
      }}
      headerLeft={sportTabs}
    >
      <div className="sportroom-wrapper" style={{ flex: 1, minHeight: 0, width: "100%" }}>
        <div className="dashboard-container" style={{ padding: 24 }}>
          <div style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="sidebar-card">
              <h3 className="sidebar-card__title">Search student</h3>
              <p className="sidebar-card__subtitle">Search by name or ID. Issue if none pending, else return.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="Student name or ID"
                  style={{ flex: 1, padding: 8, borderRadius: 8 }}
                />
                <button className="btn btn--primary" onClick={beginIssueForStudent}>Search</button>
              </div>
            </div>

            {activeTab === "inventory" ? (
              <div className="sidebar-card">
                <h3 className="sidebar-card__title">Inventory</h3>
                <p className="sidebar-card__subtitle">Filter equipment and see scoped stats</p>
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                  <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      className={`btn btn--sm ${selectedEquipment === "ALL" ? "btn--primary" : ""}`}
                      onClick={() => setSelectedEquipment("ALL")}
                      disabled={loading}
                      style={{ borderRadius: 999 }}
                    >
                      All
                    </button>
                    <div style={{ fontSize: 12, color: "#757575", fontWeight: 700 }}>
                      {selectedEquipment === "ALL" ? "Showing all equipment" : `Filtered: ${selectedEquipment}`}
                    </div>
                  </div>
                  <button
                    className="btn btn--sm"
                    onClick={() => {
                      fetchCoreData();
                      fetchTimeSeries();
                    }}
                  >
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div style={{ marginTop: 12 }} aria-busy="true">
                    <ListSkeleton rows={6} />
                  </div>
                ) : (
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {inventoryList.length === 0 ? (
                      <div style={{ color: "#757575", fontSize: 12 }}>No equipment found.</div>
                    ) : (
                      inventoryList.map((eq) => {
                        const isActive = selectedEquipment !== "ALL" && normalizeKey(selectedEquipment) === normalizeKey(eq.name);
                        return (
                          <button
                            key={eq.id}
                            type="button"
                            onClick={() => setSelectedEquipment(eq.name)}
                            className="btn"
                            style={{
                              width: "100%",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: `1px solid ${isActive ? "rgba(163,38,56,0.35)" : "rgba(45,52,54,0.08)"}`,
                              background: isActive ? "rgba(163,38,56,0.06)" : "#fff",
                              boxShadow: isActive ? "0 6px 18px rgba(163,38,56,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
                              cursor: "pointer",
                              textAlign: "left"
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, color: "#2d3436", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {eq.name}
                              </div>
                              <div style={{ fontSize: 12, color: "#757575" }}>
                                Available {Number.isFinite(eq.available) ? eq.available : 0}
                                {Number.isFinite(eq.total) ? ` / ${eq.total}` : ""}
                              </div>
                            </div>
                            <div
                              style={{
                                fontWeight: 900,
                                color: isActive ? "#a32638" : "#2d3436",
                                background: isActive ? "#fff0f3" : "#f6f7f8",
                                border: `1px solid ${isActive ? "rgba(163,38,56,0.18)" : "rgba(45,52,54,0.08)"}`,
                                padding: "6px 10px",
                                borderRadius: 999,
                                fontSize: 12
                              }}
                            >
                              {Number.isFinite(eq.available) ? eq.available : 0}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="sidebar-card">
                <h3 className="sidebar-card__title">Logs</h3>
                <p className="sidebar-card__subtitle">Filter by inventory type and student</p>
                {loading ? (
                  <div style={{ marginTop: 10 }} aria-busy="true">
                    <ListSkeleton rows={6} />
                  </div>
                ) : (
                  <div style={{ marginTop: 8, color: "#757575", fontSize: 12, lineHeight: 1.4 }}>
                    Use the table filters to find issues, partial returns, and completed returns.
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* If there is an activeCard show it */}
            {activeCard ? (
              renderActiveCard()
            ) : (
              <>
                {activeTab === "inventory" ? (
                  <>
                    <div className="filters-bar" style={{ marginBottom: 12 }}>
                      <div className="filters-bar__left">
                        <div className="filter-group">
                          <label className="filter-group__label">
                            <span>Period</span>
                          </label>
                          <div className="select-wrapper">
                            <select
                              value={periodPreset}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPeriodPreset(v);
                                if (v === "custom") {
                                  setShowCustomDates(true);
                                  // open native calendar immediately
                                  setTimeout(() => {
                                    const el = customDateRef.current;
                                    if (!el) return;
                                    try {
                                      if (typeof el.showPicker === "function") el.showPicker();
                                      else el.focus();
                                    } catch {
                                      el.focus();
                                    }
                                  }, 0);
                                  return;
                                }
                                setShowCustomDates(false);
                                const map = v === "weekly" ? "week" : v === "monthly" ? "month" : v;
                                setDateRange(getDateRange(map));
                              }}
                              className="filter-select"
                            >
                              <option value="today">Today</option>
                              <option value="yesterday">Yesterday</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="custom">Custom date</option>
                            </select>
                          </div>
                        </div>

                        {showCustomDates && (
                          <div className="filter-group filter-group--inline" style={{ marginLeft: 10 }}>
                            <div className="select-wrapper">
                              <input
                                ref={customDateRef}
                                type="date"
                                value={customDate}
                                onChange={(e) => {
                                  const d = e.target.value;
                                  setCustomDate(d);
                                  setDateRange({ startDate: d, endDate: d });
                                }}
                                className="date-input"
                              />
                              <button
                                type="button"
                                className="btn btn--sm"
                                aria-label="Open calendar"
                                onClick={() => {
                                  const el = customDateRef.current;
                                  if (!el) return;
                                  try {
                                    if (typeof el.showPicker === "function") el.showPicker();
                                    else el.focus();
                                  } catch {
                                    el.focus();
                                  }
                                }}
                                style={{ marginLeft: 8 }}
                              >
                                <Calendar size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="filters-bar__right">
                        <div className="last-updated">
                          <span className="last-updated__text">
                            {dateRange.startDate} → {dateRange.endDate} • {effectiveGranularity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* TOP: KPI Statistic Cards (4-6) */}
                    <div className="kpi-grid">
                      {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} style={{ minWidth: 170, flex: 1 }}>
                            <StatCardSkeleton />
                          </div>
                        ))
                      ) : (
                        [
                          {
                            id: 'issuedItems',
                            label: 'Total Equipment Issued',
                            value: computed.totalEquipmentIssued,
                            tone: computed.totalEquipmentIssued > 0 ? 'primary' : 'muted',
                            Icon: Package,
                            sub: `In period ${dateRange.startDate} → ${dateRange.endDate}`
                          },
                          {
                            id: 'uniqueStudentsIssued',
                            label: 'Total Students',
                            value: computed.totalStudents,
                            tone: computed.totalStudents > 0 ? 'success' : 'muted',
                            Icon: Users,
                            sub: `Unique students in period`
                          },
                          {
                            id: 'studentsPending',
                            label: 'Total Pending return',
                            value: computed.pendingReturnsQty,
                            tone: computed.pendingReturnsQty > 0 ? 'warning' : 'muted',
                            Icon: RotateCcw,
                            sub: 'Click to view pending returns'
                          },
                        ].map(kpi => {
                          const Icon = kpi.Icon;
                          const clickable = kpi.id === 'studentsPending';
                          return (
                            <article
                              key={kpi.id}
                              className={`kpi-card kpi-card--${kpi.tone}`}
                              role={clickable ? "button" : undefined}
                              tabIndex={clickable ? 0 : undefined}
                              onClick={() => {
                                if (clickable) setShowPendingModal(true);
                              }}
                              onKeyDown={(e) => {
                                if (!clickable) return;
                                if (e.key === "Enter" || e.key === " ") setShowPendingModal(true);
                              }}
                              style={clickable ? { cursor: "pointer" } : undefined}
                            >
                              <header className="kpi-card__header">
                                <span className={`kpi-card__icon kpi-card__icon--${kpi.tone}`} aria-hidden>
                                  <Icon size={16} strokeWidth={2} />
                                </span>
                                <span className="kpi-card__label">{kpi.label}</span>
                              </header>
                              <div className="kpi-card__body">
                                <div className="kpi-card__value-row">
                                  <span className="kpi-card__value">
                                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                                  </span>
                                </div>
                                <p className="kpi-card__subtext">{kpi.sub}</p>
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>

                    {/* MIDDLE: Recent activity */}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ ...cardStyle, background: "#ffffff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                            <div>
                              <h3 style={{ margin: 0, color: "#a32638" }}>Recent activity (Sport room)</h3>
                              <p style={{ marginTop: 6, marginBottom: 0, color: "#757575" }}>
                                Latest issues / returns. Updates live from scans.
                              </p>
                            </div>
                            {lastUpdated && (
                              <div style={{ fontSize: 12, color: "#757575", fontWeight: 600 }}>
                                Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <RecentEventsTable
                              events={eventsForTable}
                              facilityMode="equipment"
                              compact
                              loading={loading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ ...cardStyle, background: "#ffffff" }}>
                    <h3 style={{ margin: 0, color: "#a32638" }}>Inventory Issue / Return Logs</h3>
                    <p style={{ marginTop: 6, color: "#757575" }}>
                      Track which items were issued to which student, and whether they were returned.
                    </p>
                    <EquipmentLogsTable events={recentScoped} loading={loading} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showPendingModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pending returns"
          onClick={() => setShowPendingModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 80
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(920px, 96vw)",
              maxHeight: "min(78vh, 720px)",
              overflow: "auto",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid rgba(45,52,54,0.10)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.20)"
            }}
          >
            <div style={{ padding: 16, borderBottom: "1px solid rgba(45,52,54,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900, color: "#2d3436" }}>
                  Pending returns {selectedEquipment !== "ALL" ? `• ${equipmentFilters.find((f) => f.value === selectedEquipment)?.label || selectedEquipment}` : ""}
                </div>
                <div style={{ fontSize: 12, color: "#757575", marginTop: 4 }}>
                  Students who currently have pending items.
                </div>
              </div>
              <button className="btn btn--sm" onClick={() => setShowPendingModal(false)}>
                Close
              </button>
            </div>

            <div style={{ padding: 16 }}>
              {pendingStudentsList.length === 0 ? (
                <div style={{ color: "#757575" }}>No pending returns.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {pendingStudentsList.map((s, idx) => (
                    <div
                      key={s.student_id || idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid rgba(45,52,54,0.08)",
                        background: "#fafafa"
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 42, height: 42, borderRadius: 999, background: "#fff0f3", color: "#a32638", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                          {(s.student_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800 }}>{s.student_name}</div>
                          <div style={{ fontSize: 12, color: "#757575" }}>
                            ID: {s.student_id} • {s.outstanding} item(s) pending
                          </div>
                          {Array.isArray(s.items) && s.items.length > 0 && (
                            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {s.items.slice(0, 10).map((it, i) => (
                                <span
                                  key={it.item_id || `${s.student_id}-${i}`}
                                  style={{
                                    fontSize: 12,
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    border: "1px solid rgba(45,52,54,0.10)",
                                    background: "#fff"
                                  }}
                                >
                                  {it.equipment_type} • {Number(it.pending_qty ?? 0) || 0}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                        <div style={{ fontSize: 12, color: "#757575" }}>
                          {s.lastActivity ? new Date(s.lastActivity).toLocaleString() : ""}
                        </div>
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => {
                            setShowPendingModal(false);
                            setActiveCard({
                              type: "RETURN",
                              payload: {
                                student: { student_id: s.student_id, student_name: s.student_name },
                                items: s.items || [],
                                issue_id: null,
                                issued_at: s.lastActivity
                              }
                            });
                          }}
                        >
                          Start Return
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
