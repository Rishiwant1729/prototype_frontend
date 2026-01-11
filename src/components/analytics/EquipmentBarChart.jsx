import React from 'react';
import '../../styles/dashboard.css';

export default function EquipmentBarChart({ equipment = [] }) {
  if (!Array.isArray(equipment) || equipment.length === 0) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ margin: 0 }}>Equipment Overview</h3>
        <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.6)' }}>No equipment data available</p>
      </div>
    );
  }

  // Compute max total for relative bar sizes
  const maxTotal = Math.max(...equipment.map(e => Number(e.total_quantity ?? e.total ?? (e.available_quantity ?? e.available ?? 0))), 1);

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ margin: 0 }}>Equipment Inventory</h3>
      <p style={{ marginTop: 6, color: 'rgba(255,255,255,0.6)' }}>Live equipment availability</p>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {equipment.map((eq) => {
          const id = eq.equipment_id || eq.id || '—';
          const name = eq.equipment_name || eq.name || eq.type || eq.equipment_type || 'Unknown';
          const available = Number(eq.available_quantity ?? eq.available ?? 0);
          const total = Number(eq.total_quantity ?? eq.total ?? available);
          const pct = total > 0 ? Math.round((available / total) * 100) : 0;
          const barWidth = Math.max(6, (available / maxTotal) * 100);

          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 220 }}>
                <div style={{ fontWeight: 700 }}>{name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>ID: {id} • Type: {eq.equipment_type || eq.category || ''}</div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13 }}>{available} / {total}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{pct}%</div>
                </div>

                <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginTop: 6 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#60a5fa,#06b6d4)', borderRadius: 6 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
