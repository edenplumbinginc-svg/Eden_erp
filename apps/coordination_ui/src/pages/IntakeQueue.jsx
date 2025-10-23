import React from 'react';
import { Link } from 'react-router-dom';

function IntakeQueue() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Intake Queue</h1>
        <p className="text-muted">Tasks pending review and assignment</p>
      </div>

      <div className="card">
        <div className="text-center" style={{ padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>📥</div>
          <h3 className="font-semibold mb-2">Intake Queue</h3>
          <p className="text-muted mb-4">
            This feature will manage unassigned tasks from voice, email, and other sources
          </p>
          <div className="text-caption text-muted">
            <p><strong>Coming Soon:</strong></p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 'var(--space-2)' }}>
              <li>📧 Email-to-task conversion</li>
              <li>🎤 Voice note intake</li>
              <li>🔄 Auto-assignment rules</li>
              <li>👥 Multi-department routing</li>
            </ul>
          </div>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Link to="/alltasks?status=open" className="btn btn-primary">
              View Open Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntakeQueue;
