import "../../../styles/dashboard.css";

export default function BlockedCard({ payload = {}, onCancel }) {
  const student = payload.student || {};
  const reason = payload.reason || "Outstanding equipment not returned";
  const issueId = payload.issue_id;

  return (
    <div className="card blocked-card">
      <div className="card-header">
        <h3 className="card-title">⚠️ Access Blocked</h3>
        <p className="card-subtitle">Cannot issue new equipment</p>
      </div>

      <div className="error-content">
        <div className="blocked-icon">🚫</div>
        
        <div className="student-badge" style={{ marginBottom: "24px" }}>
          <div className="student-avatar">
            {(student.student_name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="student-info">
            <h4>{student.student_name || "Unknown Student"}</h4>
            <p>ID: {student.student_id || "—"}</p>
          </div>
        </div>

        <div className="error-text">{reason}</div>
        
        {issueId && (
          <div className="error-reason">
            Please return outstanding items before issuing new equipment.
          </div>
        )}
      </div>

      <div className="card-actions">
        <button className="action-btn cancel" onClick={onCancel}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
