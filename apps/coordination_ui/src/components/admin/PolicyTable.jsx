import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export default function PolicyTable() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['decision-policies'],
    queryFn: apiService.listDecisionPolicies,
    refetchInterval: 10000
  });

  const toggleMutation = useMutation({
    mutationFn: ({ slug, enabled, dry_run }) => 
      apiService.toggleDecisionPolicy(slug, enabled, dry_run),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-policies'] });
      queryClient.invalidateQueries({ queryKey: ['decision-executions'] });
    }
  });

  const runNowMutation = useMutation({
    mutationFn: () => apiService.runDecisionCycleNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-executions'] });
    }
  });

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="card-title">Decision Policies</h3>
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          Loading policies...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="card-title">Decision Policies</h3>
        <div style={{ padding: '24px', color: '#d32f2f' }}>
          Error: {error.message}
        </div>
      </div>
    );
  }

  const policies = data?.items || [];

  const handleEnabledToggle = (policy) => {
    const newEnabled = !policy.enabled;
    if (!newEnabled) {
      const confirmed = window.confirm(
        `Disable "${policy.description}"?\n\nThis will stop the policy from evaluating conditions.`
      );
      if (!confirmed) return;
    }
    toggleMutation.mutate({ slug: policy.slug, enabled: newEnabled });
  };

  const handleDryRunToggle = (policy) => {
    const newDryRun = !policy.dry_run;
    if (!newDryRun && policy.enabled) {
      const confirmed = window.confirm(
        `⚠️ SWITCH TO LIVE MODE?\n\nPolicy: "${policy.description}"\n\nThis will start taking REAL ACTIONS:\n- Creating tasks\n- Sending notifications\n- Adding labels\n\nAre you sure you want to enable live mode?`
      );
      if (!confirmed) return;
    }
    toggleMutation.mutate({ slug: policy.slug, dry_run: newDryRun });
  };

  const handleRunNow = () => {
    if (runNowMutation.isLoading) return;
    const confirmed = window.confirm(
      'Run decision cycle now?\n\nThis will evaluate all enabled policies immediately.'
    );
    if (!confirmed) return;
    runNowMutation.mutate();
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>Decision Policies</h3>
        <button
          onClick={handleRunNow}
          disabled={runNowMutation.isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: runNowMutation.isLoading ? '#ccc' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: '500',
            cursor: runNowMutation.isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {runNowMutation.isLoading ? 'Running...' : '▶ Run Cycle Now'}
        </button>
      </div>

      {policies.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          No policies configured.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Policy
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Description
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Enabled
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Mode
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
                  Condition / Action
                </th>
              </tr>
            </thead>
            <tbody>
              {policies.map(policy => {
                const isLive = policy.enabled && !policy.dry_run;
                return (
                  <tr 
                    key={policy.id}
                    style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: isLive ? '#ffebee' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>
                      {policy.slug}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', maxWidth: '300px' }}>
                      {policy.description}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={policy.enabled}
                          onChange={() => handleEnabledToggle(policy)}
                          disabled={toggleMutation.isLoading}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: policy.enabled ? '#2e7d32' : '#666'
                        }}>
                          {policy.enabled ? 'ON' : 'OFF'}
                        </span>
                      </label>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={!policy.dry_run}
                          onChange={() => handleDryRunToggle(policy)}
                          disabled={toggleMutation.isLoading}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: policy.dry_run ? '#f57c00' : '#d32f2f'
                        }}>
                          {policy.dry_run ? 'DRY_RUN' : 'LIVE'}
                        </span>
                      </label>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: '500' }}>View JSON</summary>
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                          <div><strong>Condition:</strong></div>
                          <pre style={{ margin: '4px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(policy.condition, null, 2)}
                          </pre>
                          <div style={{ marginTop: '8px' }}><strong>Action:</strong></div>
                          <pre style={{ margin: '4px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(policy.action, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {runNowMutation.isSuccess && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '4px', color: '#2e7d32', fontSize: '14px' }}>
          ✅ Decision cycle executed successfully
        </div>
      )}

      {runNowMutation.isError && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#ffebee', borderRadius: '4px', color: '#d32f2f', fontSize: '14px' }}>
          ❌ Failed to run decision cycle: {runNowMutation.error?.message}
        </div>
      )}
    </div>
  );
}
