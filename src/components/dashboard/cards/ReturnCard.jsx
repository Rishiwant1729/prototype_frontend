import { useState, useEffect, useMemo } from "react";
import "../../../styles/dashboard.css";

export default function ReturnCard({ payload = {}, onConfirm, onCancel }) {
  // 🛡️ Defensive defaults
  const student = payload.student || {};
  const issueId = payload.issue_id;
  const items = useMemo(() => Array.isArray(payload.items) ? payload.items : [], [payload.items]);
  const issuedAt = payload.issued_at;

  // Initialize return quantities - use item_id as key
  const [returnQuantities, setReturnQuantities] = useState({});
  const [initialized, setInitialized] = useState(false);

  // Initialize quantities when items change (only once)
  useEffect(() => {
    if (items.length > 0 && !initialized) {
      const initial = {};
      items.forEach((item) => {
        // Backend sends: issued_qty, returned_qty
        const issued = item.issued_qty || item.quantity || 0;
        const returned = item.returned_qty || item.returned_quantity || 0;
        const pending = issued - returned;
        // Use item_id as key (from backend)
        const itemKey = item.item_id || item.equipment_id;
        initial[itemKey] = pending; // Default to returning all pending items
      });
      setReturnQuantities(initial);
      setInitialized(true);
    }
  }, [items, initialized]);

  const handleQtyChange = (itemKey, delta) => {
    setReturnQuantities((prev) => {
      const current = prev[itemKey] || 0;
      const item = items.find((i) => (i.item_id || i.equipment_id) === itemKey);
      const issued = item?.issued_qty || item?.quantity || 0;
      const returned = item?.returned_qty || item?.returned_quantity || 0;
      const maxReturn = issued - returned;
      const newVal = Math.max(0, Math.min(maxReturn, current + delta));
      return { ...prev, [itemKey]: newVal };
    });
  };

  const handleConfirm = () => {
    const returns = items
      .map((item) => {
        const itemKey = item.item_id || item.equipment_id;
        return {
          item_id: item.item_id,
          equipment_type: item.equipment_type || item.name,
          return_qty: returnQuantities[itemKey] || 0
        };
      })
      .filter((r) => r.return_qty > 0);

    if (returns.length === 0) {
      alert("Select at least one item to return");
      return;
    }

    onConfirm(issueId, returns);
  };

  const totalReturning = Object.values(returnQuantities).reduce((a, b) => a + b, 0);

  // Format issue time
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="card return-card">
      <div className="card-header">
        <h3 className="card-title">Return Equipment</h3>
        <p className="card-subtitle">Select items to return</p>
      </div>

      {/* 👤 Student Badge */}
      <div className="student-badge">
        <div className="student-avatar">
          {(student.student_name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="student-info">
          <h4>{student.student_name || "Unknown Student"}</h4>
          <p>ID: {student.student_id || "—"}</p>
          {issuedAt && (
            <p style={{ fontSize: "11px", marginTop: "4px" }}>
              Issued: {formatTime(issuedAt)}
            </p>
          )}
        </div>
      </div>

      {/* 📦 Items to Return */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p>No items to return.</p>
        </div>
      ) : (
        <div className="equipment-section">
          <h5>Issued Items</h5>
          <div className="equipment-list">
            {items.map((item) => {
              // Use backend field names: issued_qty, returned_qty
              const issued = item.issued_qty || item.quantity || 0;
              const returned = item.returned_qty || item.returned_quantity || 0;
              const pending = issued - returned;
              const itemKey = item.item_id || item.equipment_id;

              if (pending <= 0) return null;

              return (
                <div className="return-item" key={itemKey}>
                  <div className="equipment-icon">🏸</div>
                  <div className="return-item-info">
                    <div className="return-item-name">
                      {item.equipment_type || item.name}
                    </div>
                    <div className="return-item-status">
                      <span>📤 Issued: {issued}</span>
                      <span>✅ Returned: {returned}</span>
                      <span>⏳ Pending: {pending}</span>
                    </div>
                  </div>
                  <div className="qty-selector">
                    <button
                      className="qty-btn"
                      onClick={() => handleQtyChange(itemKey, -1)}
                      disabled={(returnQuantities[itemKey] || 0) <= 0}
                    >
                      −
                    </button>
                    <span className="qty-value">
                      {returnQuantities[itemKey] || 0}
                    </span>
                    <button
                      className="qty-btn"
                      onClick={() => handleQtyChange(itemKey, 1)}
                      disabled={(returnQuantities[itemKey] || 0) >= pending}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ Actions */}
      <div className="card-actions">
        <button className="action-btn cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="action-btn confirm"
          disabled={totalReturning === 0}
          onClick={handleConfirm}
        >
          Return {totalReturning > 0 ? `(${totalReturning})` : ""} ✓
        </button>
      </div>
    </div>
  );
}
