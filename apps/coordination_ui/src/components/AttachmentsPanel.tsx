import React, { useState, useEffect } from 'react';
import { attachmentApi, uploadFile } from '../lib/api';

interface AttachmentsPanelProps {
  taskId: string;
}

export function AttachmentsPanel({ taskId }: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAttachments();
  }, [taskId]);

  const loadAttachments = async () => {
    try {
      const data = await attachmentApi.list(taskId);
      setAttachments(data);
    } catch (err: any) {
      console.error('Failed to load attachments:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      await uploadFile(taskId, file);
      await loadAttachments();
      // Reset the input
      e.target.value = '';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      await attachmentApi.delete(attachmentId);
      await loadAttachments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div>
      {error && (
        <div style={{ 
          backgroundColor: '#fee', 
          color: '#c00', 
          padding: '8px', 
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: uploading ? '#ccc' : '#17a2b8',
            color: 'white',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {uploading ? 'Uploading...' : '+ Add File'}
          <input
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {attachments.length === 0 ? (
        <p style={{ color: '#666', fontSize: '14px' }}>No attachments yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              style={{
                backgroundColor: '#f8f9fa',
                padding: '10px',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>
                  {attachment.filename}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  {formatFileSize(attachment.size_bytes)} • {attachment.mime_type}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {new Date(attachment.created_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleDelete(attachment.id)}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}