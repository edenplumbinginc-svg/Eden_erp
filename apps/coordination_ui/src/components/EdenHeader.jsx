import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import NotificationsBell from "./NotificationsBell";
import RoleBadge from "./RoleBadge";
import { useHasPermission } from "../hooks/usePermissions";
import { useAuth } from "../hooks/AuthProvider";
import { ThemeToggle } from "./ThemeProvider";

export default function EdenHeader() {
  const isAdmin = useHasPermission('admin:manage');
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
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
            <img src="/eden-logo.png" alt="EDEN" style={{height: '32px', width: 'auto'}} />
          </div>
          
          <nav className="flex items-center gap-6" style={{
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
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
            <NavLink 
              to="/profile" 
              className={({ isActive }) => isActive ? 'text-body font-medium' : 'text-body text-link hover:underline'}
              style={({ isActive }) => ({
                color: isActive ? 'var(--md-primary)' : undefined,
                fontWeight: isActive ? 500 : undefined
              })}
            >
              Profile
            </NavLink>
            <button
              onClick={handleLogout}
              className="text-body text-link hover:underline"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 'inherit',
                color: 'var(--md-error)'
              }}
            >
              Logout
            </button>
            <div style={{ paddingLeft: '12px', borderLeft: '1px solid var(--md-divider)' }}>
              <ThemeToggle />
            </div>
            <RoleBadge />
            <NotificationsBell />
          </nav>
        </div>
      </div>
    </header>
  );
}
