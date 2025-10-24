import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export default function ExecutionHistory() {
  const [limit, setLimit] = useState(50);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['decision-executions', limit],
    queryFn: () => apiService.listDecisionExecutions(limit),
    refetchInterval: 10000
  });

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="card-title">Execution History</h3>
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          Loading execution history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="card-title">Execution History</h3>
        <div style={{ padding: '24px', color: '#d32f2f' }}>
          Error: {error.message}
        </div>
      </div>
    );
  }

  const executions = data?.items || [];

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>Execution History</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', color: '#666' }}>
            Show:
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
          <button
            onClick={() => refetch()}
            style={{
              padding: '6px 12px',
              backgroundColor: '#fff',
              color: '#1976d2',
              border: '1px solid #1976d2',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {executions.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          No executions recorded yet. Policies will log executions here when they run.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Timestamp
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Policy
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Matched
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Effect
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Target
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Mode
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Result
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Error
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Payload
                </th>
              </tr>
            </thead>
            <tbody>
              {executions.map(exec => {
                const timestamp = new Date(exec.created_at);
                const timeAgo = getTimeAgo(timestamp);
                
                return (
                  <tr 
                    key={exec.id}
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666', whiteSpace: 'nowrap' }}>
                      <div>{timeAgo}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {timestamp.toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500' }}>
                      {exec.policy_slug}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {exec.matched ? (
                        <span style={{ color: '#2e7d32', fontWeight: '600' }}>✓ Yes</span>
                      ) : (
                        <span style={{ color: '#999' }}>— No</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: getEffectColor(exec.effect).bg,
                        color: getEffectColor(exec.effect).text,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {exec.effect}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: '#666' }}>
                      {exec.target_type && exec.target_id ? (
                        <>
                          {exec.target_type}:<br/>
                          <span style={{ fontSize: '11px', color: '#999' }}>
                            {exec.target_id.substring(0, 8)}...
                          </span>
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: exec.dry_run ? '#fff3e0' : '#ffebee',
                        color: exec.dry_run ? '#f57c00' : '#d32f2f',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {exec.dry_run ? 'DRY_RUN' : 'LIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: exec.success ? '#e8f5e9' : '#ffebee',
                        color: exec.success ? '#2e7d32' : '#d32f2f',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {exec.success ? '✓ Success' : '✗ Failed'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', maxWidth: '250px', color: '#666' }}>
                      {exec.error_text ? (
                        <span title={exec.error_text} style={{ 
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: '#d32f2f'
                        }}>
                          {exec.error_text}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', color: '#1976d2' }}>View</summary>
                        <pre style={{ 
                          marginTop: '8px', 
                          padding: '8px', 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          maxWidth: '400px'
                        }}>
                          {JSON.stringify(exec.payload, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
        💡 <strong>Tip:</strong> Executions auto-refresh every 10 seconds. Use the "Run Cycle Now" button above to trigger immediate execution.
      </div>
    </div>
  );
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getEffectColor(effect) {
  switch (effect) {
    case 'create_task':
      return { bg: '#e3f2fd', text: '#1565c0' };
    case 'notify':
      return { bg: '#fff3e0', text: '#f57c00' };
    case 'label':
      return { bg: '#e8f5e9', text: '#2e7d32' };
    default:
      return { bg: '#f5f5f5', text: '#666' };
  }
}
