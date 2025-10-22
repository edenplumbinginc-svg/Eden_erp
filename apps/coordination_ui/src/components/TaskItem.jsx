import React from 'react';
import { useNavigate } from 'react-router-dom';

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
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{t.description}</p>
          )}
        </div>
        <span className={`status-badge status-${t.status}`}>
          {t.status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
        {t.department && <span>📋 {t.department}</span>}
        {t.priority && (
          <span className={`priority-badge priority-${t.priority}`}>
            {t.priority === 'urgent' ? '🔴' : ''} {t.priority}
          </span>
        )}
        {t.is_overdue && <span className="text-red-600 font-medium">⏰ Overdue</span>}
        {t.needs_idle_reminder && <span className="text-amber-600 font-medium">😴 Idle</span>}
      </div>

      {t.ball_in_court_note && (
        <div className="ball-handoff">
          🏀 {t.ball_in_court_note}
        </div>
      )}

      {t.voice_transcript && (
        <div className="mt-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2 italic">
          🎤 {t.voice_transcript.substring(0, 100)}{t.voice_transcript.length > 100 ? '...' : ''}
        </div>
      )}
    </div>
  );
}
