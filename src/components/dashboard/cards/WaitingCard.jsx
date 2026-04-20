import "../../../styles/dashboard.css";

/**
 * Idle scan state — dummy ID card illustration (RishiVerse maroon / light).
 */
export default function WaitingCard() {
  return (
    <div className="card waiting-card">
      <div className="waiting-content">
        <div className="waiting-card__visual" aria-hidden>
          <span className="waiting-card__ring waiting-card__ring--outer" />
          <span className="waiting-card__ring waiting-card__ring--inner" />
          <div className="waiting-dummy-id">
            <div className="waiting-dummy-id__header">
              <span className="waiting-dummy-id__logo-mark">RH</span>
              <span className="waiting-dummy-id__uni">Rishihood University</span>
            </div>
            <div className="waiting-dummy-id__body">
              <div className="waiting-dummy-id__photo" />
              <div className="waiting-dummy-id__lines">
                <div className="waiting-dummy-id__line waiting-dummy-id__line--name" />
                <div className="waiting-dummy-id__line waiting-dummy-id__line--sm" />
                <div className="waiting-dummy-id__line waiting-dummy-id__line--xs" />
                <div className="waiting-dummy-id__chip" title="Chip" />
              </div>
            </div>
            <div className="waiting-dummy-id__footer">
              <span className="waiting-dummy-id__idno">Student ID ••••••••</span>
              <span className="waiting-dummy-id__badge">Tap</span>
            </div>
          </div>
        </div>
        <h2 className="waiting-text">Waiting for card scan</h2>
        <p className="waiting-subtext">
          Place your ID card on the reader to continue.
        </p>
      </div>
    </div>
  );
}
