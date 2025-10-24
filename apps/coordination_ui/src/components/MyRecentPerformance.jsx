import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export default function MyRecentPerformance() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['performance', 'me-recent'],
    queryFn: apiService.getMyRecentPerformance,
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="card-title">📊 My Recent Performance</h3>
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="card-title">📊 My Recent Performance</h3>
        <div style={{ padding: '24px', color: '#d32f2f' }}>
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  const completions = data?.items || [];

  const calculateStats = () => {
    if (completions.length === 0) return null;

    const durations = completions.map(c => c.duration_minutes || 0);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const fastestDuration = Math.min(...durations);
    const lightningFastCount = durations.filter(d => d < 60).length;

    return {
      avgDuration: Math.round(avgDuration),
      fastestDuration: Math.round(fastestDuration),
      lightningFastCount,
      totalCompletions: completions.length
    };
  };

  const stats = calculateStats();

  return (
    <div className="card">
      <h3 className="card-title">📊 My Recent Performance</h3>
      <p style={{ color: '#666', fontSize: '14px', marginTop: '-8px', marginBottom: '16px' }}>
        Your last 30 checklist completions
      </p>

      {completions.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          No completions yet. Mark checklist items as done to track your performance!
        </div>
      ) : (
        <>
          {stats && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1976d2' }}>
                  {stats.totalCompletions}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Total Completions
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#2e7d32' }}>
                  {stats.fastestDuration}m
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Fastest Time
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#fff3e0', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f57c00' }}>
                  {stats.avgDuration}m
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Average Time
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#fff9e6', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f9a825' }}>
                  ⚡ {stats.lightningFastCount}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Lightning Fast
                </div>
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                    When
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                    Task
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                    Department
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                    Time
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                    Badge
                  </th>
                </tr>
              </thead>
              <tbody>
                {completions.map((completion, index) => {
                  const durationMinutes = Math.round(completion.duration_minutes || 0);
                  const hours = Math.floor(durationMinutes / 60);
                  const minutes = durationMinutes % 60;
                  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                  const createdAt = new Date(completion.created_at);
                  const timeAgo = getTimeAgo(createdAt);

                  return (
                    <tr 
                      key={completion.event_id || index}
                      style={{ borderBottom: '1px solid #f0f0f0' }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>
                        {timeAgo}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {completion.task_title || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {completion.department || 'N/A'}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: durationMinutes < 60 ? '#2e7d32' : '#666'
                      }}>
                        {timeStr}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '20px' }}>
                        {durationMinutes < 60 && '⚡'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
