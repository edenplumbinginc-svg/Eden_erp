import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ballApi } from '../services/api';

function fmtAgo(iso) {
  try { 
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); 
  } catch { 
    return iso; 
  }
}

export default function BallHistoryPanel({ taskId }) {
  const { data, isLoading, error } = useQuery(
    ['ball-history', taskId],
    () => ballApi.getHistory(taskId),
    { refetchInterval: 15000 }
  );

  if (isLoading) return <div className="p-4 border rounded-2xl">Loading responsibility chain…</div>;
  if (error) return <div className="p-4 border rounded-2xl text-red-600">Failed to load responsibility chain.</div>;

  const events = data?.events ?? [];

  return (
    <div className="rounded-2xl border shadow">
      <div className="p-4 bg-[#e3f2fd] rounded-t-2xl font-medium">Responsibility Chain</div>
      <div className="p-4">
        {!events.length && (
          <div className="text-gray-500">No handoffs yet. When departments pass the ball, entries will appear here.</div>
        )}
        {!!events.length && (
          <ol className="relative border-l pl-6">
            {events.map((e) => (
              <li key={e.id} className="mb-6">
                <span className="absolute -left-2 mt-1 w-3 h-3 rounded-full bg-black" />
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm">
                    <strong>{e.from_role || '—'}</strong> → <strong>{e.to_role || '—'}</strong>
                  </span>
                  {e.triggered_by_policy && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border">
                      policy: {e.triggered_by_policy}
                    </span>
                  )}
                  {e.reason && <span className="text-xs text-gray-500">({e.reason})</span>}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {fmtAgo(e.created_at)} · {e.acknowledged ? `Acknowledged by ${e.acknowledged_by || 'recipient'}` : 'Unacknowledged'}
                </div>
                {(e.from_user_email || e.to_user_email) && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {e.from_user_email ? `from: ${e.from_user_email}` : ''} {e.to_user_email ? `→ to: ${e.to_user_email}` : ''}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
