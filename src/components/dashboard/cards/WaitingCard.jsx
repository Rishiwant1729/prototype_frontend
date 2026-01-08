import "../../../styles/dashboard.css";

export default function WaitingCard() {
  return (
    <div className="card waiting-card">
      <div className="waiting-content">
        <div className="waiting-icon">💳</div>
        <div className="waiting-text">Waiting for Card Scan</div>
        <div className="waiting-subtext">
          Place your ID card on the scanner to continue
        </div>
      </div>
    </div>
  );
}
