import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ballApi } from '../services/api';

function hhmmFromSeconds(s = 0) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function TaskSlaBanner({ taskId, canNudge = false }) {
  const { data, isLoading, error, refetch } = useQuery(
    ['ball-late', taskId],
    () => ballApi.getLate(taskId),
    { refetchInterval: 15000 }
  );

  const nudge = useMutation(
    () => ballApi.nudge(taskId),
    { onSuccess: () => refetch() }
  );

  if (isLoading || error) return null;
  const late = data?.late;
  if (!late) return null;

  const over = late.late === true;
  const age = hhmmFromSeconds(late.age_s || 0);
  const sla = hhmmFromSeconds(late.sla_s || 0);

  const bannerClass = over
    ? 'card-warning border-warning-heavy'
    : 'card-info border-info';

  return (
    <div className={`card ${bannerClass}`} style={{ 
      padding: 'var(--space-2)',
      borderRadius: 'var(--radius-2)',
      marginBottom: 'var(--space-3)'
    }}>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: 'var(--space-2)' 
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 500, 
            marginBottom: 'var(--space-1)',
            fontSize: '14px'
          }}>
            {over 
              ? '⚠️ Unacknowledged handoff — SLA Breached' 
              : '⏳ Unacknowledged handoff — Pending Acknowledgment'}
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: 'var(--text-secondary)' 
          }}>
            To: <strong>{late.to_role || '—'}</strong> · Age: <strong>{age}</strong> · SLA: <strong>{sla}</strong>
          </div>
        </div>
        {canNudge && (
          <button
            className="btn-primary"
            onClick={() => nudge.mutate()}
            disabled={nudge.isLoading}
            title="Send a one-time reminder to the receiving department"
            style={{ 
              padding: 'var(--space-1-5) var(--space-2)',
              fontSize: '13px',
              whiteSpace: 'nowrap'
            }}
          >
            {nudge.isLoading ? 'Nudging…' : 'Nudge recipient'}
          </button>
        )}
      </div>
    </div>
  );
}
