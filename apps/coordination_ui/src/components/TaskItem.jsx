import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TaskItem({ t }) {
  const navigate = useNavigate();

  const originIcon = {
    'voice': '🎤',
    'email': '📧',
    'UI': '💻'
  }[t.origin] || '💻';

  const statusColors = {
    'open': 'bg-gray-100 text-gray-700',
    'todo': 'bg-blue-100 text-blue-700',
    'in_progress': 'bg-yellow-100 text-yellow-700',
    'review': 'bg-purple-100 text-purple-700',
    'done': 'bg-green-100 text-green-700'
  };

  return (
    <div 
      className="border rounded p-3 hover:shadow-md transition-shadow cursor-pointer bg-white"
      onClick={() => navigate(`/task/${t.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{t.title}</h4>
            {t.origin && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                {originIcon} {t.origin}
              </span>
            )}
          </div>
          {t.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{t.description}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded ${statusColors[t.status] || 'bg-gray-100'}`}>
          {t.status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
        {t.department && <span>📋 {t.department}</span>}
        {t.priority && <span className={t.priority === 'urgent' ? 'text-red-600 font-medium' : ''}>
          {t.priority === 'urgent' ? '🔴' : ''} {t.priority}
        </span>}
        {t.is_overdue && <span className="text-red-600 font-medium">⏰ Overdue</span>}
        {t.needs_idle_reminder && <span className="text-amber-600 font-medium">😴 Idle</span>}
      </div>

      {t.ball_in_court_note && (
        <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
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
