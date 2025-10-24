import React from 'react';
import TopPerformersWeek from '../components/TopPerformersWeek';
import DepartmentRankings from '../components/DepartmentRankings';
import MyRecentPerformance from '../components/MyRecentPerformance';

export default function PerformanceLeaderboardPage() {
  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '400', marginBottom: '8px' }}>
          Performance Leaderboard
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginTop: '0' }}>
          WHO FINISHES FAST? Track top performers, department rankings, and your personal metrics.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <TopPerformersWeek />
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <DepartmentRankings />
          <MyRecentPerformance />
        </div>
      </div>
    </div>
  );
}
