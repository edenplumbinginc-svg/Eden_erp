import React from 'react';
import { Link } from 'react-router-dom';

function ArchiveView() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Archive</h1>
        <p className="text-muted">Archived and deleted tasks</p>
      </div>

      <div className="card">
        <div className="text-center" style={{ padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>📦</div>
          <h3 className="font-semibold mb-2">Archive View</h3>
          <p className="text-muted mb-4">
            View and restore archived tasks and projects
          </p>
          <div className="text-caption text-muted">
            <p><strong>Features:</strong></p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 'var(--space-2)' }}>
              <li>🗄️ Soft-deleted tasks</li>
              <li>📁 Archived projects</li>
              <li>♻️ Restore functionality</li>
              <li>🗑️ Permanent deletion (admin only)</li>
            </ul>
          </div>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Link to="/alltasks" className="btn btn-primary">
              View Active Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchiveView;
