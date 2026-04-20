import { Dumbbell, Waves, CircleDot, MapPinned } from "lucide-react";

const FACILITIES = [
  { id: "GYM", label: "Gymnasium", Icon: Dumbbell },
  { id: "BADMINTON", label: "Badminton court", Icon: CircleDot },
  { id: "SWIMMING", label: "Swimming pool", Icon: Waves }
];

export default function FacilityMapPanel({ facilityStats = {} }) {
  return (
    <section className="kc-facility-map" aria-label="Facility occupancy map">
      <div className="kc-facility-map__head">
        <MapPinned size={18} strokeWidth={2} className="kc-facility-map__head-icon" aria-hidden />
        <div>
          <h2 className="kc-facility-map__title">Facility map</h2>
          <p className="kc-facility-map__sub">Live occupancy by gate</p>
        </div>
      </div>
      <div className="kc-facility-map__grid">
        {FACILITIES.map(({ id, label, Icon }) => {
          const count = facilityStats[id] ?? 0;
          return (
            <article key={id} className="kc-facility-map__tile">
              <div className="kc-facility-map__tile-icon">
                <Icon size={22} strokeWidth={2} />
              </div>
              <div className="kc-facility-map__tile-body">
                <h3>{label}</h3>
                <p>
                  <strong>{count}</strong> inside
                </p>
              </div>
              <span className={`kc-facility-map__dot${count > 0 ? " kc-facility-map__dot--on" : ""}`} title="Occupancy" />
            </article>
          );
        })}
      </div>
    </section>
  );
}
