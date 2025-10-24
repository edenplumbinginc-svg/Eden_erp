import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export default function TopPerformersWeek() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['performance', 'fastest-week'],
    queryFn: apiService.getFastestPerformersWeek,
    refetchInterval: 60000
  });

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="card-title">⚡ Fastest Performers This Week</h3>
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="card-title">⚡ Fastest Performers This Week</h3>
        <div style={{ padding: '24px', color: '#d32f2f' }}>
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  const performers = data?.items || [];

  return (
    <div className="card">
      <h3 className="card-title">⚡ Fastest Performers This Week</h3>
      <p style={{ color: '#666', fontSize: '14px', marginTop: '-8px', marginBottom: '16px' }}>
        Top 20 fastest checklist completions in the last 7 days
      </p>

      {performers.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          No completions this week yet. Complete checklist items to appear here!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Rank
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Who
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
              {performers.map((perf, index) => {
                const durationMinutes = Math.round(perf.duration_minutes || 0);
                const hours = Math.floor(durationMinutes / 60);
                const minutes = durationMinutes % 60;
                const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                const isTopThree = index < 3;

                return (
                  <tr 
                    key={perf.event_id || index}
                    style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: isTopThree ? '#fff9e6' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: isTopThree ? '600' : '400' }}>
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `${index + 1}`}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: isTopThree ? '600' : '400' }}>
                      {perf.actor_email || 'Unknown'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {perf.task_title || 'N/A'}
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
                        {perf.department || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', fontWeight: '600', color: '#2e7d32' }}>
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
      )}
    </div>
  );
}
