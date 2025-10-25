import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAuditLogs();
  }, [filter]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await apiService.getRecentActivity();
      setLogs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventCode) => {
    if (eventCode.includes('create')) return '➕';
    if (eventCode.includes('update') || eventCode.includes('edit')) return '✏️';
    if (eventCode.includes('delete')) return '🗑️';
    if (eventCode.includes('comment')) return '💬';
    if (eventCode.includes('handoff')) return '🏀';
    return '📝';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Audit Log</h1>
        <p className="text-muted">System activity and change history</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex justify-between align-center">
            <h3>Recent Activity</h3>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-select"
            >
              <option value="all">All Events</option>
              <option value="task">Task Events</option>
              <option value="project">Project Events</option>
              <option value="user">User Events</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center" style={{ padding: 'var(--space-6)' }}>
            <h2 className="text-muted">Loading audit logs...</h2>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center" style={{ padding: 'var(--space-6)' }}>
            <p className="text-muted">No audit logs found</p>
          </div>
        ) : (
          <div className="list">
            {logs.map((log, index) => (
              <div key={index} className="list-item">
                <div className="flex align-start gap-3">
                  <div style={{ fontSize: '24px' }}>{getEventIcon(log.event_code)}</div>
                  <div className="flex-1">
                    <div className="font-medium">{log.event_code.replace(/\./g, ' • ')}</div>
                    <div className="text-muted text-caption">
                      {formatTimestamp(log.created_at)} • {log.actor_email || 'System'}
                    </div>
                    {log.resource_type && (
                      <div className="text-caption">
                        Resource: {log.resource_type} • {log.resource_id}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogViewer;
