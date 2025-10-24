import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export default function SummaryCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['decision-policies'],
    queryFn: apiService.listDecisionPolicies,
    refetchInterval: 10000
  });

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ color: '#666' }}>Loading...</div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '20px', color: '#d32f2f' }}>
        Failed to load summary: {error.message}
      </div>
    );
  }

  const policies = data?.items || [];
  const total = policies.length;
  const enabled = policies.filter(p => p.enabled).length;
  const dryRunOn = policies.filter(p => p.dry_run).length;
  const liveOn = policies.filter(p => p.enabled && !p.dry_run).length;

  const CardStat = ({ label, value, color = '#1976d2', subtext }) => (
    <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
        {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '700', color }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
          {subtext}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      <CardStat 
        label="Total Policies" 
        value={total}
        color="#1976d2"
      />
      <CardStat 
        label="Enabled" 
        value={enabled}
        color="#2e7d32"
        subtext={`${total - enabled} disabled`}
      />
      <CardStat 
        label="DRY_RUN Mode" 
        value={dryRunOn}
        color="#f57c00"
        subtext="Simulation only"
      />
      <CardStat 
        label="LIVE Mode" 
        value={liveOn}
        color={liveOn > 0 ? '#d32f2f' : '#666'}
        subtext={liveOn > 0 ? 'Taking real actions!' : 'No live policies'}
      />
    </div>
  );
}
