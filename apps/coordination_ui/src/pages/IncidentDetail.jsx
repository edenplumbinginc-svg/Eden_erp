import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loading, ErrorBlock, Unauthorized, NotFound } from '../components/ui/PageStates';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [status, setStatus] = useState('loading');
  const [ackState, setAckState] = useState('idle');

  useEffect(() => {
    loadIncident();
  }, [id]);

  const loadIncident = async () => {
    setStatus('loading');
    try {
      const response = await fetch(`/ops/incidents/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('edenAuthToken')}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        setStatus('unauthorized');
        return;
      }

      if (response.status === 404) {
        setStatus('not_found');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setIncident(data);
      setStatus('ok');
    } catch (err) {
      console.error('Failed to load incident:', err);
      setStatus('error');
    }
  };

  const handleAcknowledge = async () => {
    setAckState('saving');
    try {
      const response = await fetch(`/ops/incidents/${id}/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('edenAuthToken')}`
        },
        body: JSON.stringify({ acknowledged: true })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setAckState('saved');
      await loadIncident();
    } catch (err) {
      console.error('Failed to acknowledge incident:', err);
      setAckState('error');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#D32F2F';
      case 'high': return '#F57C00';
      case 'medium': return '#FBC02D';
      case 'low': return '#689F38';
      default: return '#757575';
    }
  };

  if (status === 'loading') {
    return (
      <div className="page-container">
        <Loading label="Loading incident…" />
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="page-container">
        <Unauthorized title="Access Denied">
          <button className="btn-primary" onClick={() => navigate('/incidents')}>
            Back to Incidents
          </button>
        </Unauthorized>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="page-container">
        <NotFound title="Incident Not Found">
          <button className="btn-primary" onClick={() => navigate('/incidents')}>
            Back to Incidents
          </button>
        </NotFound>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page-container">
        <ErrorBlock title="Failed to Load Incident" detail="Unable to retrieve incident data. Please try again.">
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={loadIncident}>
              Retry
            </button>
            <button className="btn-secondary" onClick={() => navigate('/incidents')}>
              Back to List
            </button>
          </div>
        </ErrorBlock>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/incidents')}
          style={{
            background: 'none',
            border: 'none',
            color: '#1a73e8',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 500
          }}
        >
          ← Back to Incidents
        </button>
      </div>

      <div className="material-card" style={{
        borderLeft: `4px solid ${getSeverityColor(incident.severity)}`,
        marginBottom: '24px'
      }}>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 400, color: '#202124' }}>
                {incident.incident_key || incident.incidentKey || `Incident ${incident.id.slice(0, 8)}`}
              </h1>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: incident.status === 'acknowledged' ? '#1976D2' : '#D32F2F',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {incident.status}
                </span>
                <span style={{
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
                </span>
                {(incident.escalation_level ?? 0) > 0 && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#FFF3E0',
                    color: '#E65100',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    ⬆️ Escalation Level {incident.escalation_level || incident.escalationLevel}
                  </span>
                )}
              </div>
            </div>
            {incident.status !== 'acknowledged' && (
              <button
                onClick={handleAcknowledge}
                disabled={ackState === 'saving'}
                className="btn-primary"
                style={{
                  opacity: ackState === 'saving' ? 0.6 : 1,
                  cursor: ackState === 'saving' ? 'not-allowed' : 'pointer'
                }}
              >
                {ackState === 'saving' ? 'Acknowledging...' : 'Acknowledge'}
              </button>
            )}
          </div>

          {ackState === 'saved' && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#E8F5E9',
              border: '1px solid #81C784',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#2E7D32'
            }}>
              ✓ Incident acknowledged successfully
            </div>
          )}

          {ackState === 'error' && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FFEBEE',
              border: '1px solid #E57373',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#C62828'
            }}>
              ✗ Failed to acknowledge incident. Please try again.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#5f6368', fontWeight: 500, marginBottom: '4px' }}>
                Route
              </div>
              <div style={{ fontSize: '14px', color: '#202124', fontFamily: 'monospace' }}>
                {incident.route}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#5f6368', fontWeight: 500, marginBottom: '4px' }}>
                Kind
              </div>
              <div style={{ fontSize: '14px', color: '#202124' }}>
                {incident.kind}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#5f6368', fontWeight: 500, marginBottom: '4px' }}>
                First Seen
              </div>
              <div style={{ fontSize: '14px', color: '#202124' }}>
                {new Date(incident.first_seen || incident.firstSeen).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#5f6368', fontWeight: 500, marginBottom: '4px' }}>
                Last Seen
              </div>
              <div style={{ fontSize: '14px', color: '#202124' }}>
                {new Date(incident.last_seen || incident.lastSeen).toLocaleString()}
              </div>
            </div>
          </div>

          {incident.acknowledged_at && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e8eaed' }}>
              <div style={{ fontSize: '12px', color: '#5f6368', fontWeight: 500, marginBottom: '4px' }}>
                Acknowledged
              </div>
              <div style={{ fontSize: '14px', color: '#202124' }}>
                {new Date(incident.acknowledged_at || incident.acknowledgedAt).toLocaleString()}
                {incident.acknowledged_by && ` by ${incident.acknowledged_by || incident.acknowledgedBy}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {incident.owner && (
        <div className="material-card" style={{ marginBottom: '16px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 500, color: '#202124' }}>
            Owner
          </h3>
          <pre style={{
            backgroundColor: '#f8f9fa',
            padding: '16px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '13px',
            fontFamily: 'monospace',
            margin: 0
          }}>
            {JSON.stringify(incident.owner, null, 2)}
          </pre>
        </div>
      )}

      {incident.metadata && Object.keys(incident.metadata).length > 0 && (
        <div className="material-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 500, color: '#202124' }}>
            Metadata
          </h3>
          <pre style={{
            backgroundColor: '#f8f9fa',
            padding: '16px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '13px',
            fontFamily: 'monospace',
            margin: 0
          }}>
            {JSON.stringify(incident.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
