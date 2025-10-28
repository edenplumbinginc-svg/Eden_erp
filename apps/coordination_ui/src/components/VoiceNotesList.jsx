import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { DateTime } from 'luxon';

export default function VoiceNotesList({ taskId }) {
  const [playingId, setPlayingId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['voiceNotes', taskId],
    queryFn: () => apiService.getVoiceNotes(taskId),
    enabled: !!taskId
  });

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const dt = DateTime.fromISO(timestamp);
    return dt.toRelative() || dt.toLocaleString(DateTime.DATETIME_MED);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="font-semibold">Voice Notes</div>
        <div className="text-body text-muted">Loading voice notes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="font-semibold">Voice Notes</div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-body text-red-800">
            Failed to load voice notes: {error?.response?.data?.error?.message || error.message}
          </div>
        </div>
      </div>
    );
  }

  const voiceNotes = data?.items || [];

  return (
    <div className="space-y-3">
      <div className="font-semibold">Voice Notes</div>
      
      {voiceNotes.length === 0 ? (
        <div className="text-body text-muted">No voice notes yet.</div>
      ) : (
        <div className="space-y-2">
          {voiceNotes.map((note) => {
            const isPlaying = playingId === note.id;
            
            return (
              <div 
                key={note.id} 
                className="card"
                style={{
                  backgroundColor: isPlaying ? 'var(--md-surface-variant)' : 'var(--md-surface)',
                  transition: 'background-color 0.2s'
                }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setPlayingId(isPlaying ? null : note.id)}
                    className="btn-icon"
                    style={{
                      fontSize: '24px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? '⏸️' : '▶️'}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-body font-medium">
                        {formatTimestamp(note.createdAt || note.created_at)}
                      </div>
                      <div className="text-caption text-muted">
                        {formatDuration(note.durationSeconds || note.duration_seconds)}
                      </div>
                    </div>
                    
                    {isPlaying && note.url && (
                      <div className="mt-2">
                        <audio
                          controls
                          autoPlay
                          onEnded={() => setPlayingId(null)}
                          onPause={() => setPlayingId(null)}
                          className="w-full"
                          style={{ maxWidth: '500px' }}
                        >
                          <source src={note.url} type="audio/webm" />
                          <source src={note.url} type="audio/mp4" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
