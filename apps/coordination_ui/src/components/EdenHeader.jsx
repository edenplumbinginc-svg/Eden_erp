import React from "react";
import { NavLink } from "react-router-dom";
import NotificationsBell from "./NotificationsBell";
import RoleBadge from "./RoleBadge";
import { useHasPermission } from "../hooks/usePermissions";

export default function EdenHeader() {
  const isAdmin = useHasPermission('admin:manage');
  
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
            <span className="text-caption" style={{ 
              color: 'var(--md-on-surface-variant)', 
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--md-divider)',
              backgroundColor: 'var(--md-surface-variant)',
              fontWeight: 500,
              letterSpacing: '0.5px'
            }}>COORDINATION · ALPHA</span>
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
              end
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
            <NavLink 
              to="/leaderboard" 
              className={({ isActive }) => isActive ? 'text-body font-medium' : 'text-body text-link hover:underline'}
              style={({ isActive }) => ({
                color: isActive ? 'var(--md-primary)' : undefined,
                fontWeight: isActive ? 500 : undefined
              })}
            >
              ⚡ Leaderboard
            </NavLink>
            <NavLink 
              to="/velocity" 
              className={({ isActive }) => isActive ? 'text-body font-medium' : 'text-body text-link hover:underline'}
              style={({ isActive }) => ({
                color: isActive ? 'var(--md-primary)' : undefined,
                fontWeight: isActive ? 500 : undefined
              })}
            >
              ⚡ Velocity
            </NavLink>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <NavLink 
                  to="/admin/decisions" 
                  className={({ isActive }) => isActive ? 'text-body font-medium' : 'text-body text-link hover:underline'}
                  style={({ isActive }) => ({
                    color: isActive ? 'var(--md-primary)' : undefined,
                    fontWeight: isActive ? 500 : undefined
                  })}
                >
                  Admin · Decisions
                </NavLink>
                <NavLink 
                  to="/admin/court-flow" 
                  className={({ isActive }) => isActive ? 'text-body font-medium' : 'text-body text-link hover:underline'}
                  style={({ isActive }) => ({
                    color: isActive ? 'var(--md-primary)' : undefined,
                    fontWeight: isActive ? 500 : undefined
                  })}
                >
                  Admin · Court Flow
                </NavLink>
              </div>
            )}
            <RoleBadge />
            <NotificationsBell />
          </nav>
        </div>
      </div>
    </header>
  );
}
