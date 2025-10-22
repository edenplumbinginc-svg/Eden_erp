import React from "react";
import { Link } from "react-router-dom";
import NotificationsBell from "./NotificationsBell";

export default function EdenHeader() {
  return (
    <header className="w-full" style={{
      borderBottom: '1px solid var(--md-divider)',
      backgroundColor: 'var(--md-surface)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--space-3) var(--space-2)',
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-eden.svg" alt="EDEN" style={{height: '28px', width: 'auto'}} />
            <span className="status-badge" style={{ backgroundColor: 'var(--md-on-surface)', color: 'white' }}>Coordination • Alpha</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-body text-link hover:underline">Projects</Link>
            <Link to="/reports" className="text-body text-link hover:underline">Reports</Link>
            <NotificationsBell />
          </div>
        </div>
      </div>
    </header>
  );
}
