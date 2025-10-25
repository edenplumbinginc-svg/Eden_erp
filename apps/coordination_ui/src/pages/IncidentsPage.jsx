import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Loading, Empty, ErrorBlock, Unauthorized } from '../components/ui/PageStates';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [status, setStatus] = useState('loading');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('firstSeen');

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setStatus('loading');
    try {
      const response = await fetch('/ops/incidents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('edenAuthToken')}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        setStatus('unauthorized');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : (data?.incidents ?? []);
      
      setIncidents(items);
      setStatus(items.length > 0 ? 'ok' : 'empty');
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setStatus('error');
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'all') return true;
    if (filter === 'open') return inc.status === 'open';
    if (filter === 'acknowledged') return inc.status === 'acknowledged';
    if (filter === 'critical') return inc.severity === 'critical';
    return true;
  });

  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    if (sortBy === 'firstSeen') {
      return new Date(b.first_seen || b.firstSeen) - new Date(a.first_seen || a.firstSeen);
    }
    if (sortBy === 'severity') {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    }
    if (sortBy === 'escalation') {
      return (b.escalation_level ?? 0) - (a.escalation_level ?? 0);
    }
    return 0;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#D32F2F';
      case 'high': return '#F57C00';
      case 'medium': return '#FBC02D';
      case 'low': return '#689F38';
      default: return '#757575';
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'open': '#D32F2F',
      'acknowledged': '#1976D2',
      'resolved': '#388E3C',
    };
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: colors[status] || '#757575',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {status}
      </span>
    );
  };

  if (status === 'loading') {
    return (
      <div className="page-container">
        <Loading label="Loading incidents…" />
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="page-container">
        <Unauthorized title="Access Denied" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page-container">
        <ErrorBlock title="Failed to Load Incidents" detail="Unable to retrieve incident data. Please try again.">
          <button className="btn-primary" onClick={loadIncidents}>
            Retry
          </button>
        </ErrorBlock>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="page-container">
        <Empty title="No Incidents" hint="All systems are operational. No incidents detected." />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 400, color: '#202124' }}>
            Incidents
          </h1>
          <p style={{ margin: 0, color: '#5f6368', fontSize: '14px' }}>
            {sortedIncidents.length} total incident{sortedIncidents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={loadIncidents}>
          Refresh
        </button>
      </div>

      <div className="material-card" style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: '#5f6368', fontWeight: 500 }}>Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Incidents</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="critical">Critical Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: '#5f6368', fontWeight: 500 }}>Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="firstSeen">Newest First</option>
              <option value="severity">By Severity</option>
              <option value="escalation">By Escalation Level</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedIncidents.map((incident) => (
          <Link
            key={incident.id}
            to={`/incidents/${incident.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div className="material-card" style={{
              padding: '16px 20px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              borderLeft: `4px solid ${getSeverityColor(incident.severity)}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 500, color: '#202124', fontSize: '15px' }}>
                      {incident.incident_key || incident.incidentKey || `Incident ${incident.id.slice(0, 8)}`}
                    </span>
                    {getStatusBadge(incident.status)}
                    {(incident.escalation_level ?? 0) > 0 && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#FFF3E0',
                        color: '#E65100',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        ⬆️ L{incident.escalation_level || incident.escalationLevel}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '8px' }}>
                    {incident.route} • {incident.kind}
                  </div>
                  <div style={{ fontSize: '12px', color: '#80868b' }}>
                    First seen: {new Date(incident.first_seen || incident.firstSeen).toLocaleString()}
                  </div>
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  backgroundColor: getSeverityColor(incident.severity),
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {incident.severity}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
