import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useToaster } from './Toaster';

const MAX_DURATION = 120; // 2 minutes in seconds
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function VoiceRecorder({ taskId, onSuccess }) {
  const { push } = useToaster();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, duration }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duration', duration.toString());
      return apiService.uploadVoiceNote(taskId, formData);
    },
    onSuccess: () => {
      push('success', 'Voice note uploaded successfully');
      reset();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const msg = error?.response?.data?.error?.message || error.message || 'Failed to upload voice note';
      push('error', msg);
    }
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
      
      if (elapsed >= MAX_DURATION) {
        stopRecording();
      }
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        
        stream.getTracks().forEach(track => track.stop());
        stopTimer();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      startTimer();
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Microphone access denied. Please enable microphone permissions in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No microphone found. Please connect a microphone and try again.');
      } else {
        setPermissionError('Failed to access microphone: ' + error.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const handleSave = async () => {
    if (!audioBlob) return;
    
    if (audioBlob.size > MAX_FILE_SIZE) {
      push('error', `File too large (${Math.round(audioBlob.size / 1024 / 1024)}MB). Maximum size is 5MB.`);
      return;
    }
    
    const extension = audioBlob.type.includes('webm') ? 'webm' : 'mp4';
    const file = new File([audioBlob], `voice-note-${Date.now()}.${extension}`, { type: audioBlob.type });
    
    uploadMutation.mutate({ file, duration });
  };

  const reset = () => {
    setAudioBlob(null);
    setDuration(0);
    setIsRecording(false);
    setIsPaused(false);
    setPermissionError(null);
    chunksRef.current = [];
    stopTimer();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeLeft = MAX_DURATION - duration;
  const isNearLimit = timeLeft <= 10 && isRecording;

  return (
    <div className="space-y-3">
      <div className="font-semibold">Record Voice Note</div>
      
      {permissionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-body text-red-800">{permissionError}</div>
        </div>
      )}
      
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isRecording && (
              <div 
                className="w-3 h-3 rounded-full bg-red-500"
                style={{
                  animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              />
            )}
            <div className={`text-body font-mono ${isNearLimit ? 'text-red-600 font-bold' : ''}`}>
              {formatTime(duration)} / {formatTime(MAX_DURATION)}
            </div>
          </div>
          
          {audioBlob && (
            <div className="text-caption text-muted">
              Size: {Math.round(audioBlob.size / 1024)}KB
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isRecording && !audioBlob && (
            <button
              className="btn btn-primary"
              onClick={startRecording}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🎤 Record
            </button>
          )}
          
          {isRecording && (
            <button
              className="btn btn-secondary"
              onClick={stopRecording}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--md-error)' }}
            >
              ⏹️ Stop
            </button>
          )}
          
          {audioBlob && !uploadMutation.isPending && (
            <>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                💾 Save
              </button>
              <button
                className="btn btn-secondary"
                onClick={reset}
              >
                🗑️ Discard
              </button>
            </>
          )}
          
          {uploadMutation.isPending && (
            <div className="flex items-center gap-2 text-body text-muted">
              <div className="animate-spin">⏳</div>
              Uploading...
            </div>
          )}
        </div>
        
        {audioBlob && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-caption text-muted mb-2">Preview:</div>
            <audio 
              controls 
              src={URL.createObjectURL(audioBlob)}
              className="w-full"
              style={{ maxWidth: '400px' }}
            />
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
