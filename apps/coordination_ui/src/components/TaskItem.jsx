import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getStatusLabel } from '../constants/statusLabels';

export default function TaskItem({ t }) {
  const navigate = useNavigate();

  const originIcon = {
    'voice': '🎤',
    'email': '📧',
    'UI': '💻'
  }[t.origin] || '💻';

  return (
    <div 
      className="task-item cursor-pointer"
      onClick={() => navigate(`/task/${t.id}`)}
    >
      <div className="task-header">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="task-title">{t.title}</h4>
            {t.origin && (
              <span className="status-badge status-info">
                {originIcon} {t.origin}
              </span>
            )}
          </div>
          {t.description && (
            <p className="text-body text-muted mt-1" style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>{t.description}</p>
          )}
        </div>
        <span className={`status-badge status-${t.status}`}>
          {getStatusLabel(t.status)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-caption mt-2">
        {t.department && <span>📋 {t.department}</span>}
        {t.priority && (
          <span className={`priority-badge priority-${t.priority}`}>
            {t.priority === 'urgent' ? '🔴' : ''} {t.priority}
          </span>
        )}
        {t.is_overdue && <span style={{color: 'var(--md-error)', fontWeight: 500}}>⏰ Overdue</span>}
        {t.needs_idle_reminder && <span style={{color: 'var(--md-warning)', fontWeight: 500}}>😴 Idle</span>}
      </div>

      {t.ball_in_court_note && (
        <div className="ball-handoff">
          🏀 {t.ball_in_court_note}
        </div>
      )}

      {t.voice_transcript && (
        <div className="mt-2 text-caption" style={{
          backgroundColor: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-1)',
          fontStyle: 'italic'
        }}>
          🎤 {t.voice_transcript.substring(0, 100)}{t.voice_transcript.length > 100 ? '...' : ''}
        </div>
      )}
    </div>
  );
}
