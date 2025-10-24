import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export default function DepartmentRankings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['performance', 'dept-month'],
    queryFn: apiService.getDepartmentPerformanceMonth,
    refetchInterval: 120000
  });

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="card-title">🏆 Department Rankings (Last 30 Days)</h3>
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="card-title">🏆 Department Rankings (Last 30 Days)</h3>
        <div style={{ padding: '24px', color: '#d32f2f' }}>
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  const departments = data?.items || [];

  return (
    <div className="card">
      <h3 className="card-title">🏆 Department Rankings (Last 30 Days)</h3>
      <p style={{ color: '#666', fontSize: '14px', marginTop: '-8px', marginBottom: '16px' }}>
        Departments ranked by total completions and average speed
      </p>

      {departments.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          No department activity in the last 30 days.
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
                  Department
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Completions
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Avg Time
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Velocity
                </th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, index) => {
                const avgMinutes = Math.round(dept.avg_duration_minutes || 0);
                const hours = Math.floor(avgMinutes / 60);
                const minutes = avgMinutes % 60;
                const avgTimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                const isTopDept = index === 0;

                return (
                  <tr 
                    key={dept.department || index}
                    style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: isTopDept ? '#e8f5e9' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: isTopDept ? '600' : '400' }}>
                      {index === 0 && '🏆'}
                      {index > 0 && `${index + 1}`}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: isTopDept ? '600' : '400' }}>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: '#e3f2fd',
                        color: '#1565c0',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        {dept.department || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '18px', textAlign: 'right', fontWeight: '700', color: '#1976d2' }}>
                      {dept.total_completions || 0}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', color: '#666' }}>
                      {avgTimeStr}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: avgMinutes < 120 ? '#c8e6c9' : '#fff9c4',
                        color: avgMinutes < 120 ? '#2e7d32' : '#f57f17',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        {avgMinutes < 60 ? '⚡ Fast' : avgMinutes < 120 ? '✅ Good' : '📊 Steady'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {departments.length > 0 && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
          💡 <strong>Tip:</strong> Velocity is based on average completion time. Faster = better!
        </div>
      )}
    </div>
  );
}
