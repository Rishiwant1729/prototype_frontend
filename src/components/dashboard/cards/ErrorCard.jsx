import "../../../styles/dashboard.css";

export default function ErrorCard({ payload = {} }) {
  const message = payload.message || "An error occurred";
  const reason = payload.reason || "";

  return (
    <div className="card error-card">
      <div className="error-content">
        <div className="error-icon">❌</div>
        <div className="error-text">{message}</div>
        {reason && <div className="error-reason">{reason}</div>}
      </div>
    </div>
  );
}
