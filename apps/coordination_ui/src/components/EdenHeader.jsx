import React from "react";
import { NavLink } from "react-router-dom";
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
          
          <nav className="flex items-center gap-6">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => isActive ? 'text-body font-medium' : 'text-body text-link hover:underline'}
              style={({ isActive }) => ({
                color: isActive ? 'var(--md-primary)' : undefined,
                fontWeight: isActive ? 500 : undefined
              })}
            >
              Dashboard
            </NavLink>
            <NavLink 
              to="/alltasks" 
              className={({ isActive }) => isActive ? 'text-body font-medium' : 'text-body text-link hover:underline'}
              style={({ isActive }) => ({
                color: isActive ? 'var(--md-primary)' : undefined,
                fontWeight: isActive ? 500 : undefined
              })}
            >
              All Tasks
            </NavLink>
            <NavLink 
              to="/" 
              className={({ isActive }) => isActive ? 'text-body font-medium' : 'text-body text-link hover:underline'}
              style={({ isActive }) => ({
                color: isActive ? 'var(--md-primary)' : undefined,
                fontWeight: isActive ? 500 : undefined
              })}
            >
              Projects
            </NavLink>
            <NavLink 
              to="/reports" 
              className={({ isActive }) => isActive ? 'text-body font-medium' : 'text-body text-link hover:underline'}
              style={({ isActive }) => ({
                color: isActive ? 'var(--md-primary)' : undefined,
                fontWeight: isActive ? 500 : undefined
              })}
            >
              Reports
            </NavLink>
            <NotificationsBell />
          </nav>
        </div>
      </div>
    </header>
  );
}
