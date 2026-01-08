import "../../../styles/dashboard.css";

export default function UnregisteredCard({ payload = {} }) {
  const uid = payload.uid || "Unknown";

  return (
    <div className="card unregistered-card error-card">
      <div className="error-content">
        <div className="error-icon">🚫</div>
        <div className="error-text">Unregistered Card</div>
        <div className="error-reason">
          This card is not linked to any student.
        </div>
        {uid && uid !== "Unknown" && (
          <div className="error-reason" style={{ marginTop: "8px", fontFamily: "monospace" }}>
            Card UID: {uid}
          </div>
        )}
      </div>
    </div>
  );
}
