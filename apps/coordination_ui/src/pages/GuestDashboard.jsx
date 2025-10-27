import React from 'react';
import { Link } from 'react-router-dom';

export default function GuestDashboard() {
  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: 'var(--space-6)' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-4)' }}>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <img src="/logo-eden.svg" alt="EDEN" style={{ height: '48px', width: 'auto', margin: '0 auto var(--space-3)' }} />
            <h1 style={{ fontSize: '32px', lineHeight: '40px', fontWeight: 400, color: 'var(--md-on-surface)', marginBottom: 'var(--space-2)' }}>
              Welcome to Eden ERP
            </h1>
            <p style={{ fontSize: '18px', color: 'var(--md-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
              Guest View - Limited Access
            </p>
            <div style={{ 
              padding: 'var(--space-4)', 
              backgroundColor: 'var(--md-surface-variant)', 
              borderRadius: 'var(--md-radius-m)',
              marginBottom: 'var(--space-4)'
            }}>
              <p style={{ color: 'var(--md-on-surface-variant)', marginBottom: 'var(--space-2)' }}>
                You're viewing Eden ERP as a guest. Some features require authentication.
              </p>
              <p style={{ color: 'var(--md-on-surface-variant)' }}>
                <Link to="/login" className="text-link" style={{ fontWeight: 500 }}>Sign in</Link> or{' '}
                <Link to="/signup" className="text-link" style={{ fontWeight: 500 }}>create an account</Link> for full access.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          <div className="card">
            <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-3)', color: 'var(--md-on-surface)' }}>
              📊 About Eden ERP
            </h2>
            <p style={{ color: 'var(--md-on-surface-variant)', marginBottom: 'var(--space-2)' }}>
              A comprehensive ERP system for Eden Plumbing Inc., designed to streamline business operations with:
            </p>
            <ul style={{ color: 'var(--md-on-surface-variant)', paddingLeft: 'var(--space-4)' }}>
              <li>Project & Task Management</li>
              <li>Team Coordination</li>
              <li>Performance Analytics</li>
              <li>Real-time Updates</li>
            </ul>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-3)', color: 'var(--md-on-surface)' }}>
              🔐 Authentication Required
            </h2>
            <p style={{ color: 'var(--md-on-surface-variant)', marginBottom: 'var(--space-3)' }}>
              To access the full application features:
            </p>
            <Link 
              to="/login" 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'block', textAlign: 'center', marginBottom: 'var(--space-2)' }}
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="btn" 
              style={{ 
                width: '100%', 
                display: 'block', 
                textAlign: 'center',
                backgroundColor: 'var(--md-surface-variant)',
                color: 'var(--md-on-surface-variant)'
              }}
            >
              Create Account
            </Link>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-3)', color: 'var(--md-on-surface)' }}>
              🚀 Key Features
            </h2>
            <ul style={{ color: 'var(--md-on-surface-variant)', paddingLeft: 'var(--space-4)' }}>
              <li style={{ marginBottom: 'var(--space-1)' }}>Dashboard & Analytics</li>
              <li style={{ marginBottom: 'var(--space-1)' }}>Task Tracking</li>
              <li style={{ marginBottom: 'var(--space-1)' }}>Team Collaboration</li>
              <li style={{ marginBottom: 'var(--space-1)' }}>Audit Logs</li>
              <li style={{ marginBottom: 'var(--space-1)' }}>Performance Reports</li>
            </ul>
          </div>
        </div>

        <div className="card" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
          <p style={{ color: 'var(--md-on-surface-variant)' }}>
            <strong>Production-Ready System</strong><br />
            Built with React, Express.js, and PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
}
