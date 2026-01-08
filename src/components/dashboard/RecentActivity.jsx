// import '../../styles/global.css';
import '../../styles/global.css';
export default function RecentActivity({ items = [] }) {
  return (
    <div className="recent-activity">
      <h4>Recent Activity</h4>
      <ul>
        {items.map((i, idx) => (
          <li key={idx}>
            {i.text} — {i.time.toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  );
}