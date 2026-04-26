import { useMemo, useState } from "react";
import { Search, Filter, ChevronDown, Package, RotateCcw, User, Clock } from "lucide-react";
import { TableSkeleton } from "../common/Skeleton";

function normItems(items) {
  const arr = Array.isArray(items) ? items : items ? [items] : [];
  return arr
    .map((it) => ({
      name: it.equipment_name || it.equipment_type || it.name || it.type || "Equipment",
      issued: Number(it.issued_qty ?? it.qty ?? it.quantity ?? 1) || 0,
      returned: Number(it.returned_qty ?? it.return_qty ?? 0) || 0
    }))
    .filter((x) => x.name);
}

function summarizeItems(items) {
  const rows = normItems(items);
  if (!rows.length) return "—";
  return rows
    .map((r) => {
      const pending = Math.max(0, r.issued - r.returned);
      const suffix = pending > 0 ? ` (pending ${pending})` : "";
      return `${r.name} ×${r.issued}${suffix}`;
    })
    .join(", ");
}

function statusFor(ev) {
  const s = String(ev.status || ev.action || ev.mode || "").toUpperCase();
  if (s.includes("PARTIAL")) return "PARTIAL";
  if (s.includes("RETURN")) return "RETURNED";
  if (ev.returned === true || ev.returned_at) return "RETURNED";
  if (s.includes("ISSUE") || s.includes("ISSU")) return "ISSUED";
  return "ISSUED";
}

export default function EquipmentLogsTable({ events = [], loading = false }) {
  const [filter, setFilter] = useState("ALL"); // ALL | ISSUED | RETURNED | PARTIAL
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  const categories = useMemo(() => {
    const set = new Set();
    (events || []).forEach((ev) => {
      const items = normItems(ev.items);
      items.forEach((it) => {
        // treat item name prefix as category signal if present, else bucket as "General"
        const c = String(ev.category || ev.sport || ev.equipment_category || "General");
        set.add(c);
      });
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const rows = useMemo(() => {
    let r = [...(events || [])];
    if (filter !== "ALL") {
      r = r.filter((ev) => statusFor(ev) === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((ev) => {
        const name = String(ev.student?.student_name || ev.student_name || "").toLowerCase();
        const sid = String(ev.student?.student_id || ev.student_id || "").toLowerCase();
        const items = summarizeItems(ev.items).toLowerCase();
        return name.includes(q) || sid.includes(q) || items.includes(q);
      });
    }
    if (category !== "ALL") {
      r = r.filter((ev) => String(ev.category || ev.sport || ev.equipment_category || "General") === category);
    }
    r.sort((a, b) => new Date(b.issued_at || b.timestamp || 0) - new Date(a.issued_at || a.timestamp || 0));
    return r.slice(0, 250);
  }, [events, filter, search, category]);

  if (loading) {
    return <TableSkeleton rows={10} cols={5} />;
  }

  if (!rows.length) {
    return <p className="insight-panel__empty">No inventory logs found for the current filters.</p>;
  }

  const badgeClass = (st) =>
    st === "RETURNED" ? "equiplog__badge equiplog__badge--ok" : st === "PARTIAL" ? "equiplog__badge equiplog__badge--warn" : "equiplog__badge";

  return (
    <div className="equiplog">
      <div className="equiplog__filters">
        <div className="equiplog__select">
          <Filter size={14} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All</option>
            <option value="ISSUED">Issued (open)</option>
            <option value="PARTIAL">Partial return</option>
            <option value="RETURNED">Returned</option>
          </select>
          <ChevronDown size={14} />
        </div>

        <div className="equiplog__select">
          <Package size={14} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All categories" : c}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>

        <div className="equiplog__search">
          <Search size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or item…" />
        </div>
      </div>

      <div className="equiplog__tablewrap">
        <table className="equiplog__table">
          <thead>
            <tr>
              <th>
                <Clock size={12} /> Time
              </th>
              <th>
                <User size={12} /> Student
              </th>
              <th>
                <Package size={12} /> Items
              </th>
              <th>Status</th>
              <th>
                <RotateCcw size={12} /> Returned
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ev, idx) => {
              const st = statusFor(ev);
              const time = new Date(ev.issued_at || ev.timestamp || Date.now()).toLocaleString();
              const name = ev.student?.student_name || ev.student_name || "Unknown";
              const sid = ev.student?.student_id || ev.student_id || "—";
              const items = summarizeItems(ev.items);
              const returned = st === "RETURNED" ? "Yes" : st === "PARTIAL" ? "Partial" : "No";
              return (
                <tr key={ev.issue_id || `${time}-${idx}`}>
                  <td className="equiplog__td-time">{time}</td>
                  <td>
                    <div className="equiplog__student">
                      <div className="equiplog__student-name">{name}</div>
                      <div className="equiplog__student-sub">ID: {sid}</div>
                    </div>
                  </td>
                  <td className="equiplog__td-items">{items}</td>
                  <td>
                    <span className={badgeClass(st)}>{st}</span>
                  </td>
                  <td>{returned}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

