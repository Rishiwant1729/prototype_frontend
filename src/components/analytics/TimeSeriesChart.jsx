import { useMemo } from "react";
import { TrendingUp, TrendingDown, LineChart, LogIn, LogOut } from "lucide-react";
import { SkeletonBlock } from "../common/Skeleton";

const FACILITY_LINE_CLASS = [
  "timeseries__line--facility-0",
  "timeseries__line--facility-1",
  "timeseries__line--facility-2",
  "timeseries__line--facility-3"
];

const FACILITY_POINT_CLASS = [
  "timeseries__point--facility-0",
  "timeseries__point--facility-1",
  "timeseries__point--facility-2",
  "timeseries__point--facility-3"
];

export default function TimeSeriesChart({
  data,
  loading = false,
  compact = false,
  showSummary,
  showPeakMarker
}) {
  const showKpis = showSummary !== undefined ? showSummary : !compact;
  const showPeak = showPeakMarker !== undefined ? showPeakMarker : !compact;

  if (loading) {
    const chartHeight = compact ? 150 : 250;
    return (
      <div className={`timeseries ${compact ? "timeseries--compact" : ""}`} aria-busy="true">
        <div className="timeseries__chart-container">
          <div className="timeseries__y-axis" aria-hidden="true">
            <span> </span>
            <span> </span>
            <span> </span>
          </div>
          <div className="timeseries__chart">
            <SkeletonBlock width="100%" height={chartHeight} radius={12} aria-label="Loading chart" />
          </div>
        </div>
        {showKpis ? (
          <div className="timeseries__stats" aria-hidden="true">
            <SkeletonBlock width={160} height={44} radius={12} />
            <SkeletonBlock width={160} height={44} radius={12} />
            <SkeletonBlock width={160} height={44} radius={12} />
          </div>
        ) : null}
      </div>
    );
  }

  const multiMode = useMemo(() => {
    const bf = data?.by_facility;
    if (!bf || bf.length <= 1) return null;
    const points = data.data || [];
    if (!points.length) return null;

    let maxVal = 1;
    bf.forEach((s) => {
      (s.data || []).forEach((p) => {
        maxVal = Math.max(maxVal, p.entries || 0);
      });
    });

    let peakEntryIdx = 0;
    points.forEach((p, i) => {
      if ((p.entries || 0) > (points[peakEntryIdx].entries || 0)) peakEntryIdx = i;
    });

    const paths = bf.map((series) => {
      const pts = series.data || [];
      return pts.map((p, i) => {
        const x = (i / Math.max(points.length - 1, 1)) * 100;
        const y = 100 - ((p.entries || 0) / maxVal) * 100;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      }).join(" ");
    });

    return { points, maxVal, peakEntryIdx, seriesList: bf, paths };
  }, [data]);

  const singleMode = useMemo(() => {
    if (!data || !data.data || data.data.length === 0) return null;
    if (data.by_facility && data.by_facility.length > 1) return null;

    const points = data.data;
    const maxValue = Math.max(
      ...points.map((p) => Math.max(p.entries, p.exits)),
      1
    );

    let peakEntryIdx = 0;
    points.forEach((p, i) => {
      if ((p.entries || 0) > (points[peakEntryIdx].entries || 0)) peakEntryIdx = i;
    });

    return { points, maxValue, peakEntryIdx };
  }, [data]);

  if (!multiMode && !singleMode) {
    return (
      <div className="timeseries__empty">
        <div className="timeseries__empty-icon">
          <LineChart size={40} strokeWidth={1.5} />
        </div>
        <p className="timeseries__empty-text">No data available for the selected period</p>
      </div>
    );
  }

  const chartHeight = compact ? 150 : 250;

  // —— Multi-facility: one line per gate (entries only) ——
  if (multiMode) {
    const { points, maxVal, peakEntryIdx, seriesList, paths } = multiMode;
    const denom = Math.max(points.length - 1, 1);
    const xAt = (i) => (i / denom) * 100;

    const periodLabel =
      points[0]?.period && points[points.length - 1]?.period
        ? `${points[0].period} → ${points[points.length - 1].period}`
        : "Footfall by facility";

    const totalEntries = points.reduce((sum, p) => sum + p.entries, 0);
    const totalExits = points.reduce((sum, p) => sum + p.exits, 0);
    const netChange = points.reduce((sum, p) => sum + p.net, 0);

    return (
      <div className={`timeseries timeseries--multi-facility ${compact ? "timeseries--compact" : ""}`}>
        <div className="timeseries__chart-container">
          <div className="timeseries__y-axis">
            <span>{maxVal}</span>
            <span>{Math.round(maxVal * 0.5)}</span>
            <span>0</span>
          </div>

          <div className="timeseries__chart">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="timeseries__svg"
              style={{ height: `${chartHeight}px` }}
              role="img"
              aria-label={`Entry footfall by facility. ${periodLabel}. One line per entry gate (sport room excluded). Peak aggregate entries at bucket ${peakEntryIdx >= 0 ? points[peakEntryIdx]?.period : "n/a"}.`}
            >
              <line x1="0" y1="25" x2="100" y2="25" className="timeseries__grid-line" />
              <line x1="0" y1="50" x2="100" y2="50" className="timeseries__grid-line" />
              <line x1="0" y1="75" x2="100" y2="75" className="timeseries__grid-line" />

              {paths.map((d, si) => (
                <path
                  key={seriesList[si].facility_id}
                  d={d}
                  className={`timeseries__line ${FACILITY_LINE_CLASS[si % FACILITY_LINE_CLASS.length]}`}
                  fill="none"
                />
              ))}

              {!compact &&
                seriesList.map((series, si) =>
                  (series.data || []).map((p, i) => (
                    <circle
                      key={`${series.facility_id}-${i}`}
                      cx={xAt(i)}
                      cy={100 - ((p.entries || 0) / maxVal) * 100}
                      r={showPeak && i === peakEntryIdx ? "2.1" : "1.1"}
                      className={`timeseries__point ${FACILITY_POINT_CLASS[si % FACILITY_POINT_CLASS.length]}`}
                    />
                  ))
                )}
            </svg>

            {!compact && points.length > 0 && (
              <div className="timeseries__x-axis">
                <span>{points[0]?.period?.split(" ")[0] || ""}</span>
                <span>{points[Math.floor(points.length / 2)]?.period?.split(" ")[0] || ""}</span>
                <span>{points[points.length - 1]?.period?.split(" ")[0] || ""}</span>
              </div>
            )}
          </div>
        </div>

        {showKpis ? (
          <>
            <div className="timeseries__legend timeseries__legend--facilities">
              {seriesList.map((s, si) => (
                <div key={s.facility_id} className="timeseries__legend-item">
                  <span
                    className={`timeseries__legend-color timeseries__legend-color--facility-${si % 4}`}
                  />
                  <span>{s.label}</span>
                  <span className="timeseries__legend-sublabel">entries</span>
                </div>
              ))}
            </div>

            <div className="timeseries__stats">
              <div className="timeseries__stat">
                <div className="timeseries__stat-icon timeseries__stat-icon--entries">
                  <LogIn size={14} strokeWidth={2} />
                </div>
                <div className="timeseries__stat-content">
                  <span className="timeseries__stat-label">Total entries (all gates)</span>
                  <span className="timeseries__stat-value timeseries__stat-value--entries">
                    {totalEntries.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="timeseries__stat">
                <div className="timeseries__stat-icon timeseries__stat-icon--exits">
                  <LogOut size={14} strokeWidth={2} />
                </div>
                <div className="timeseries__stat-content">
                  <span className="timeseries__stat-label">Total exits (all gates)</span>
                  <span className="timeseries__stat-value timeseries__stat-value--exits">
                    {totalExits.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="timeseries__stat">
                <div
                  className={`timeseries__stat-icon ${netChange >= 0 ? "timeseries__stat-icon--positive" : "timeseries__stat-icon--negative"}`}
                >
                  {netChange >= 0 ? (
                    <TrendingUp size={14} strokeWidth={2} />
                  ) : (
                    <TrendingDown size={14} strokeWidth={2} />
                  )}
                </div>
                <div className="timeseries__stat-content">
                  <span className="timeseries__stat-label">Net (entries − exits)</span>
                  <span
                    className={`timeseries__stat-value ${netChange >= 0 ? "timeseries__stat-value--positive" : "timeseries__stat-value--negative"}`}
                  >
                    {netChange >= 0 ? "+" : ""}
                    {netChange.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="timeseries__legend timeseries__legend--inline timeseries__legend--facilities">
            {seriesList.map((s, si) => (
              <span key={s.facility_id} className="timeseries__legend-item">
                <span className={`timeseries__legend-color timeseries__legend-color--facility-${si % 4}`} />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // —— Single facility: entries + exits ——
  const { points, maxValue, peakEntryIdx } = singleMode;
  const denom = Math.max(points.length - 1, 1);
  const xAt = (i) => (i / denom) * 100;

  const entriesPath = points
    .map((p, i) => {
      const x = xAt(i);
      const y = 100 - (p.entries / maxValue) * 100;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const exitsPath = points
    .map((p, i) => {
      const x = xAt(i);
      const y = 100 - (p.exits / maxValue) * 100;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const entriesAreaPath = `${entriesPath} L 100 100 L 0 100 Z`;

  const totalEntries = points.reduce((sum, p) => sum + p.entries, 0);
  const totalExits = points.reduce((sum, p) => sum + p.exits, 0);
  const netChange = points.reduce((sum, p) => sum + p.net, 0);

  const periodLabel =
    points[0]?.period && points[points.length - 1]?.period
      ? `${points[0].period} → ${points[points.length - 1].period}`
      : "Occupancy trend";

  return (
    <div className={`timeseries ${compact ? "timeseries--compact" : ""}`}>
      <div className="timeseries__chart-container">
        <div className="timeseries__y-axis">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue * 0.5)}</span>
          <span>0</span>
        </div>

        <div className="timeseries__chart">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="timeseries__svg"
            style={{ height: `${chartHeight}px` }}
            role="img"
            aria-label={`Entries and exits over time. ${periodLabel}. Peak entries at bucket ${peakEntryIdx >= 0 ? points[peakEntryIdx]?.period : "n/a"}.`}
          >
            <line x1="0" y1="25" x2="100" y2="25" className="timeseries__grid-line" />
            <line x1="0" y1="50" x2="100" y2="50" className="timeseries__grid-line" />
            <line x1="0" y1="75" x2="100" y2="75" className="timeseries__grid-line" />

            <path d={entriesAreaPath} className="timeseries__area timeseries__area--entries" />

            <path d={entriesPath} className="timeseries__line timeseries__line--entries" fill="none" />
            <path d={exitsPath} className="timeseries__line timeseries__line--exits" fill="none" />

            {!compact &&
              points.map((p, i) => (
                <circle
                  key={`entry-${i}`}
                  cx={xAt(i)}
                  cy={100 - (p.entries / maxValue) * 100}
                  r={showPeak && i === peakEntryIdx ? "2.2" : "1.2"}
                  className={`timeseries__point timeseries__point--entries${
                    showPeak && i === peakEntryIdx ? " timeseries__point--peak-entry" : ""
                  }`}
                />
              ))}

            {!compact &&
              points.map((p, i) => (
                <circle
                  key={`exit-${i}`}
                  cx={xAt(i)}
                  cy={100 - (p.exits / maxValue) * 100}
                  r="1.2"
                  className="timeseries__point timeseries__point--exits"
                />
              ))}
          </svg>

          {!compact && points.length > 0 && (
            <div className="timeseries__x-axis">
              <span>{points[0]?.period?.split(" ")[0] || ""}</span>
              <span>{points[Math.floor(points.length / 2)]?.period?.split(" ")[0] || ""}</span>
              <span>{points[points.length - 1]?.period?.split(" ")[0] || ""}</span>
            </div>
          )}
        </div>
      </div>

      {showKpis ? (
        <>
          <div className="timeseries__legend">
            <div className="timeseries__legend-item">
              <span className="timeseries__legend-color timeseries__legend-color--entries" />
              <LogIn size={12} />
              <span>Entries</span>
            </div>
            <div className="timeseries__legend-item">
              <span className="timeseries__legend-color timeseries__legend-color--exits" />
              <LogOut size={12} />
              <span>Exits</span>
            </div>
          </div>

          <div className="timeseries__stats">
            <div className="timeseries__stat">
              <div className="timeseries__stat-icon timeseries__stat-icon--entries">
                <LogIn size={14} strokeWidth={2} />
              </div>
              <div className="timeseries__stat-content">
                <span className="timeseries__stat-label">Total Entries</span>
                <span className="timeseries__stat-value timeseries__stat-value--entries">
                  {totalEntries.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="timeseries__stat">
              <div className="timeseries__stat-icon timeseries__stat-icon--exits">
                <LogOut size={14} strokeWidth={2} />
              </div>
              <div className="timeseries__stat-content">
                <span className="timeseries__stat-label">Total Exits</span>
                <span className="timeseries__stat-value timeseries__stat-value--exits">
                  {totalExits.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="timeseries__stat">
              <div
                className={`timeseries__stat-icon ${netChange >= 0 ? "timeseries__stat-icon--positive" : "timeseries__stat-icon--negative"}`}
              >
                {netChange >= 0 ? (
                  <TrendingUp size={14} strokeWidth={2} />
                ) : (
                  <TrendingDown size={14} strokeWidth={2} />
                )}
              </div>
              <div className="timeseries__stat-content">
                <span className="timeseries__stat-label">Net Change</span>
                <span
                  className={`timeseries__stat-value ${netChange >= 0 ? "timeseries__stat-value--positive" : "timeseries__stat-value--negative"}`}
                >
                  {netChange >= 0 ? "+" : ""}
                  {netChange.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="timeseries__legend timeseries__legend--inline" aria-hidden="false">
          <span className="timeseries__legend-item">
            <span className="timeseries__legend-color timeseries__legend-color--entries" />
            Entries
          </span>
          <span className="timeseries__legend-item">
            <span className="timeseries__legend-color timeseries__legend-color--exits" />
            Exits
          </span>
        </div>
      )}
    </div>
  );
}
