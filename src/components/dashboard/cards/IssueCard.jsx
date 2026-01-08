import { useState } from "react";
import "../../../styles/dashboard.css";

export default function IssueCard({ payload = {}, onConfirm, onCancel }) {
  // 🛡️ Defensive defaults
  const student = payload.student || {};
  const equipmentList = Array.isArray(payload.available_equipment)
    ? payload.available_equipment
    : Array.isArray(payload.equipmentList)
    ? payload.equipmentList
    : [];

  const [quantities, setQuantities] = useState({});

  const handleQtyChange = (equipment_id, delta) => {
    setQuantities((prev) => {
      const current = prev[equipment_id] || 0;
      const eq = equipmentList.find((e) => e.equipment_id === equipment_id);
      const max = eq?.available_quantity || 0;
      const newVal = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [equipment_id]: newVal };
    });
  };

  const handleConfirm = () => {
    const items = equipmentList
      .map((eq) => ({
        equipment_id: eq.equipment_id,
        equipment_type: eq.equipment_name || eq.equipment_type || eq.name,
        qty: quantities[eq.equipment_id] || 0
      }))
      .filter((item) => item.qty > 0);

    if (items.length === 0) {
      alert("Select at least one item to issue");
      return;
    }

    onConfirm(student.student_id, items);
  };

  const totalSelected = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <div className="card issue-card">
      <div className="card-header">
        <h3 className="card-title">Issue Equipment</h3>
        <p className="card-subtitle">Select items to issue to this student</p>
      </div>

      {/* 👤 Student Badge */}
      <div className="student-badge">
        <div className="student-avatar">
          {(student.student_name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="student-info">
          <h4>{student.student_name || "Unknown Student"}</h4>
          <p>ID: {student.student_id || "—"}</p>
        </div>
      </div>

      {/* 📦 Equipment List */}
      {equipmentList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p>No equipment available for this facility.</p>
        </div>
      ) : (
        <div className="equipment-section">
          <h5>Available Equipment</h5>
          <div className="equipment-list">
            {equipmentList.map((eq) => (
              <div className="equipment-row" key={eq.equipment_id}>
                <div className="equipment-icon">🏸</div>
                <div className="equipment-details">
                  <div className="equipment-name">{eq.equipment_name || eq.name || eq.equipment_type}</div>
                  <div className="equipment-available">
                    {eq.available_quantity} available
                  </div>
                </div>
                <div className="qty-selector">
                  <button
                    className="qty-btn"
                    onClick={() => handleQtyChange(eq.equipment_id, -1)}
                    disabled={(quantities[eq.equipment_id] || 0) <= 0}
                  >
                    −
                  </button>
                  <span className="qty-value">
                    {quantities[eq.equipment_id] || 0}
                  </span>
                  <button
                    className="qty-btn"
                    onClick={() => handleQtyChange(eq.equipment_id, 1)}
                    disabled={
                      (quantities[eq.equipment_id] || 0) >= eq.available_quantity
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
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
          disabled={totalSelected === 0}
          onClick={handleConfirm}
        >
          Issue {totalSelected > 0 ? `(${totalSelected})` : ""} ✓
        </button>
      </div>
    </div>
  );
}
