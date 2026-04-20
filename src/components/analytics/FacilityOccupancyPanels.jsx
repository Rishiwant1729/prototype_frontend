import { useState, useEffect } from "react";
import { Dumbbell, CircleDot, Waves } from "lucide-react";
import TimeSeriesChart from "./TimeSeriesChart";
import HourlyDistributionChart from "./HourlyDistributionChart";
import { getOccupancyTimeSeries, getHourlyDistribution } from "../../api/dashboard_api";

const FACILITIES = [
  {
    id: "GYM",
    label: "Gymnasium",
    blurb: "Entries vs exits over the selected period, plus intraday entry distribution.",
    Icon: Dumbbell
  },
  {
    id: "BADMINTON",
    label: "Badminton court",
    blurb: "Same metrics scoped to badminton court traffic only.",
    Icon: CircleDot
  },
  {
    id: "SWIMMING",
    label: "Swimming pool",
    blurb: "Pool facility occupancy and peak entry hours.",
    Icon: Waves
  }
];

/**
 * Per-facility occupancy analysis for the Analytics → Charts view.
 * Fetches each gate independently (industry-style small multiples).
 */
export default function FacilityOccupancyPanels({ dateRange, granularity }) {
  const [series, setSeries] = useState(() => ({
    GYM: null,
    BADMINTON: null,
    SWIMMING: null
  }));
  const [hourly, setHourly] = useState(() => ({
    GYM: null,
    BADMINTON: null,
    SWIMMING: null
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = dateRange;
      try {
        const pairs = await Promise.all(
          FACILITIES.flatMap((f) => [
            getOccupancyTimeSeries(f.id, startDate, endDate, granularity),
            getHourlyDistribution(f.id, startDate, endDate)
          ])
        );
        if (cancelled) return;
        const nextTs = {};
        const nextHr = {};
        FACILITIES.forEach((f, i) => {
          nextTs[f.id] = pairs[i * 2]?.data ?? null;
          nextHr[f.id] = pairs[i * 2 + 1]?.data ?? null;
        });
        setSeries(nextTs);
        setHourly(nextHr);
      } catch (e) {
        console.error("Facility occupancy fetch:", e);
        if (!cancelled) setError("Could not load facility charts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [dateRange, granularity]);

  return (
    <section className="facility-viz" aria-labelledby="facility-viz-heading">
      <header className="facility-viz__intro">
        <h2 id="facility-viz-heading">Facility occupancy analysis</h2>
        <p className="facility-viz__lede">
          Each facility loads its own time series and hourly distribution for the filters above
          (period and granularity). Use this view to compare gates side by side.
        </p>
      </header>

      {error ? (
        <p className="facility-viz__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="facility-viz__grid">
        {FACILITIES.map((f) => {
          const Icon = f.Icon;
          return (
            <article
              key={f.id}
              className={`facility-viz-card facility-viz-card--${f.id.toLowerCase()}`}
              aria-labelledby={`facility-viz-${f.id}-title`}
            >
              <header className="facility-viz-card__head">
                <span className="facility-viz-card__icon" aria-hidden>
                  <Icon size={20} strokeWidth={2} />
                </span>
                <div>
                  <h3 id={`facility-viz-${f.id}-title`}>{f.label}</h3>
                  <p className="facility-viz-card__blurb">{f.blurb}</p>
                </div>
              </header>

              {loading ? (
                <div className="facility-viz-skeleton" aria-busy="true" aria-label="Loading charts" />
              ) : (
                <>
                  <div className="facility-viz-card__block">
                    <h4 className="facility-viz-card__h4">Occupancy over time</h4>
                    <p className="facility-viz-card__hint">
                      Entries (filled) and exits (line) by {granularity} bucket.
                    </p>
                    <TimeSeriesChart data={series[f.id]} compact showSummary={false} />
                  </div>
                  <div className="facility-viz-card__block">
                    <h4 className="facility-viz-card__h4">Intraday entry distribution</h4>
                    <p className="facility-viz-card__hint">
                      Count of entries by hour of day (0–23) across the selected date range.
                    </p>
                    <HourlyDistributionChart data={hourly[f.id]} compact showPeakSummary={false} />
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
