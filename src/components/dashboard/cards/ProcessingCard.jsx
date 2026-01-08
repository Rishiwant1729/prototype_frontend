import "../../../styles/dashboard.css";

export default function ProcessingCard() {
  return (
    <div className="card processing-card">
      <div className="processing-content">
        <div className="processing-spinner"></div>
        <div className="processing-text">Processing...</div>
      </div>
    </div>
  );
}
