import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import IssueCard from '../components/dashboard/cards/IssueCard';
import ReturnCard from '../components/dashboard/cards/ReturnCard';
import SuccessCard from '../components/dashboard/cards/SuccessCard';
import ErrorCard from '../components/dashboard/cards/ErrorCard';
import WaitingCard from '../components/dashboard/cards/WaitingCard';
import '../styles/dashboard.css';

export default function SportRoom() {
  const { token } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCard, setActiveCard] = useState(null);

  // Form for starting an issue
  const [studentIdInput, setStudentIdInput] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const eqRes = await fetch('http://localhost:3000/api/sports-room/equipment');
        const eqJson = await eqRes.json();
        setEquipment(eqJson || []);

        // Try to fetch recent issue/return logs if endpoint exists
        const recentRes = await fetch('http://localhost:3000/api/sports-room/recent').catch(() => null);
        const recentJson = recentRes ? await recentRes.json() : [];
        setRecent(recentJson || []);
      } catch (err) {
        console.error('SportRoom fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const beginIssueForStudent = async () => {
    if (!studentIdInput) return alert('Enter student ID');

    // Build payload: student object and available_equipment
    const payload = {
      student: { student_id: studentIdInput, student_name: '' },
      available_equipment: equipment
    };

    setActiveCard({ type: 'ISSUE', payload });
  };

  const handleIssueConfirm = async (student_id, items) => {
    setActiveCard({ type: 'PROCESSING' });

    try {
      const response = await fetch('http://localhost:3000/api/sports-room/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ student_id, items })
      });

      const result = await response.json();

      if (response.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }

      if (result.mode === 'SUCCESS' || response.ok) {
        // Prepend to recent logs
        setRecent(prev => [result, ...prev].slice(0, 50));
        setActiveCard({ type: 'SUCCESS', payload: { message: 'Equipment Issued', subtext: `${items.length} item(s) issued` } });
      } else {
        setActiveCard({ type: 'ERROR', payload: { message: result.reason || 'Issue failed' } });
      }
    } catch (err) {
      console.error(err);
      setActiveCard({ type: 'ERROR', payload: { message: 'Network Error' } });
    }
  };

  const startReturnForIssue = (issue) => {
    // issue should contain student and items and issue_id
    setActiveCard({ type: 'RETURN', payload: { student: issue.student, items: issue.items, issue_id: issue.issue_id, issued_at: issue.issued_at } });
  };

  const handleReturnConfirm = async (issue_id, returns) => {
    setActiveCard({ type: 'PROCESSING' });

    try {
      const response = await fetch('http://localhost:3000/api/sports-room/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ issue_id, returns })
      });

      const result = await response.json();

      if (response.status === 401) {
        setActiveCard({ type: 'ERROR', payload: { message: 'Unauthorized. Please login.' } });
        return;
      }

      if (result.mode === 'SUCCESS' || response.ok) {
        // Update recent logs or refetch
        setRecent(prev => prev.map(r => r.issue_id === issue_id ? { ...r, returned: true } : r));
        setActiveCard({ type: 'SUCCESS', payload: { message: 'Return Recorded', subtext: `${returns.length} item(s) returned` } });
      } else {
        setActiveCard({ type: 'ERROR', payload: { message: result.reason || 'Return failed' } });
      }
    } catch (err) {
      console.error(err);
      setActiveCard({ type: 'ERROR', payload: { message: 'Network Error' } });
    }
  };

  const handleCancel = () => setActiveCard(null);

  const renderActiveCard = () => {
    if (!activeCard) return <WaitingCard />;

    switch (activeCard.type) {
      case 'PROCESSING':
        return <WaitingCard />;
      case 'ISSUE':
        return <IssueCard payload={activeCard.payload} onConfirm={handleIssueConfirm} onCancel={handleCancel} />;
      case 'RETURN':
        return <ReturnCard payload={activeCard.payload} onConfirm={handleReturnConfirm} onCancel={handleCancel} />;
      case 'SUCCESS':
        return <SuccessCard payload={activeCard.payload} />;
      case 'ERROR':
        return <ErrorCard payload={activeCard.payload} />;
      default:
        return <WaitingCard />;
    }
  };

  return (
    <div className="sportroom-wrapper">
      <div className="dashboard-wrapper">
        <nav className="top-navbar">
          <div className="logo">
            <div className="logo-icon">🏸</div>
            <div>
              <div className="logo-text">Sport Room</div>
              <div className="logo-subtitle">Equipment Inventory & Logs</div>
            </div>
          </div>
        </nav>

        <div className="dashboard-container" style={{ padding: 24 }}>
          <div style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="sidebar-card">
              <h3 className="sidebar-card__title">Start Issue</h3>
              <p className="sidebar-card__subtitle">Enter student ID to begin issue flow</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={studentIdInput} onChange={(e) => setStudentIdInput(e.target.value)} placeholder="Student ID" style={{ flex: 1, padding: 8, borderRadius: 8 }} />
                <button className="btn btn--primary" onClick={beginIssueForStudent}>Begin</button>
              </div>
            </div>

            <div className="sidebar-card">
              <h3 className="sidebar-card__title">Available Equipment</h3>
              {loading ? <p>Loading...</p> : (
                <div className="equipment-list">
                  {equipment.map(eq => (
                    <div key={eq.equipment_id || eq.id} className="equipment-row">
                      <div className="equipment-icon">🏸</div>
                      <div className="equipment-details">
                        <div className="equipment-name">{eq.equipment_name || eq.name || eq.type}</div>
                        <div className="equipment-available">{eq.available_quantity || eq.available || 0} available</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sidebar-card">
              <h3 className="sidebar-card__title">Recent Logs</h3>
              {recent.length === 0 ? <p>No recent logs</p> : (
                <div className="recent-list">
                  {recent.map((r, i) => (
                    <div key={i} className="recent-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700 }}>{r.student_name || r.student?.student_name || 'Unknown'}</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>{new Date(r.issued_at || r.timestamp || Date.now()).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button className="btn btn--sm" onClick={() => startReturnForIssue(r)}>Return</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {renderActiveCard()}
          </div>
        </div>
      </div>
    </div>
  );
}
