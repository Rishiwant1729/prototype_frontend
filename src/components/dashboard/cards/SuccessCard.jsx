import "../../../styles/dashboard.css";

export default function SuccessCard({ payload = {} }) {
  const message = payload.message || "Operation completed successfully";
  const subtext = payload.subtext || "";

  return (
    <div className="card success-card">
      <div className="success-content">
        <div className="success-icon">✓</div>
        <div className="success-text">{message}</div>
        {subtext && (
          <div className="card-subtitle" style={{ marginTop: "8px" }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
