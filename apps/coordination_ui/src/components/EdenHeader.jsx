import React from "react";
import { Link } from "react-router-dom";
import NotificationsBell from "./NotificationsBell";

export default function EdenHeader() {
  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-eden.svg" alt="EDEN" className="h-7 w-auto" />
          <span className="status-badge" style={{ backgroundColor: 'var(--md-on-surface)', color: 'white' }}>Coordination • Alpha</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm underline">Projects</Link>
          <Link to="/reports" className="text-sm underline">Reports</Link>
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
