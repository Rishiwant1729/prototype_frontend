import { Radio, ScanLine } from "lucide-react";

/**
 * Stitch-style RFID strip for the command rail (light / maroon theme).
 */
export default function RfidRailModule({ recentScans = [] }) {
  const mini = recentScans.slice(0, 3);

  return (
    <div className="kc-rfid">
      <div className="kc-rfid__head">
        <div className="kc-rfid__head-left">
          <Radio className="kc-rfid__pulse-icon" size={14} strokeWidth={2} aria-hidden />
          <span className="kc-rfid__label">RFID scanner</span>
        </div>
        <span className="kc-rfid__live">Live</span>
      </div>
      <div className="kc-rfid__body">
        <div className="kc-rfid__radar" aria-hidden>
          <span className="kc-rfid__ring kc-rfid__ring--a" />
          <span className="kc-rfid__ring kc-rfid__ring--b" />
          <span className="kc-rfid__core">
            <ScanLine size={20} strokeWidth={2} />
          </span>
        </div>
        <p className="kc-rfid__hint">Place card near reader</p>
      </div>
      <div className="kc-rfid__log">
        <p className="kc-rfid__log-title">Recent scans</p>
        <div className="kc-rfid__log-list">
          {mini.length === 0 ? (
            <p className="kc-rfid__empty">Waiting for scans…</p>
          ) : (
            mini.map((row) => (
              <div key={row.id} className="kc-rfid__log-row">
                <div>
                  <p className="kc-rfid__log-name">{row.student}</p>
                  <p className="kc-rfid__log-meta">
                    {row.facility} • {String(row.action || "").toUpperCase()}
                  </p>
                </div>
                <time className="kc-rfid__log-time">
                  {row.time instanceof Date
                    ? row.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : ""}
                </time>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
