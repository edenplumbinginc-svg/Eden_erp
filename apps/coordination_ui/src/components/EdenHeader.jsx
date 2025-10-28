import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import NotificationsBell from "./NotificationsBell";
import { useHasPermission } from "../hooks/usePermissions";
import { useAuth } from "../hooks/AuthProvider";
import { ThemeToggle } from "./ThemeProvider";

export default function EdenHeader() {
  const isAdmin = useHasPermission('admin:manage');
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <img src="/eden-logo.png" alt="EDEN" style={{height: '32px', width: 'auto'}} />
          </div>
          
          {/* Center: Main Navigation */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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
          </nav>

          {/* Right: Notifications, Settings */}
          <div className="flex items-center gap-3">
            <NotificationsBell />
            
            {/* Settings Dropdown */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                style={{
                  background: 'var(--md-surface)',
                  border: '1px solid var(--md-divider)',
                  borderRadius: 'var(--md-radius-s)',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--md-on-surface)',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
                aria-label="Settings menu"
                aria-expanded={isSettingsOpen}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6m5.5-11.5L14 11m-4 2l-3.5 3.5M1 12h6m6 0h6m-11.5 5.5L11 14m2-4l3.5-3.5"/>
                </svg>
                Settings
              </button>

              {isSettingsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    backgroundColor: 'var(--md-surface)',
                    border: '1px solid var(--md-divider)',
                    borderRadius: 'var(--md-radius-m)',
                    boxShadow: 'var(--elevation-2)',
                    minWidth: '220px',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}
                >
                  {/* Theme Toggle Section */}
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--md-divider)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '14px', color: 'var(--md-on-surface)' }}>Theme</span>
                    <ThemeToggle />
                  </div>

                  {/* Profile Link */}
                  <NavLink
                    to="/profile"
                    onClick={() => setIsSettingsOpen(false)}
                    style={{
                      display: 'block',
                      padding: '12px 16px',
                      color: 'var(--md-on-surface)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      borderBottom: '1px solid var(--md-divider)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--md-surface-variant)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    👤 Profile
                  </NavLink>

                  {/* Analytics Section */}
                  <div style={{ borderBottom: '1px solid var(--md-divider)' }}>
                    <NavLink
                      to="/leaderboard"
                      onClick={() => setIsSettingsOpen(false)}
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        color: 'var(--md-on-surface)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--md-surface-variant)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      ⚡ Leaderboard
                    </NavLink>
                    <NavLink
                      to="/velocity"
                      onClick={() => setIsSettingsOpen(false)}
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        color: 'var(--md-on-surface)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--md-surface-variant)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      ⚡ Velocity
                    </NavLink>
                  </div>

                  {/* Admin Section */}
                  {isAdmin && (
                    <div style={{ borderBottom: '1px solid var(--md-divider)' }}>
                      <div style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--md-on-surface-variant)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Admin
                      </div>
                      <NavLink
                        to="/admin/decisions"
                        onClick={() => setIsSettingsOpen(false)}
                        style={{
                          display: 'block',
                          padding: '12px 16px',
                          color: 'var(--md-on-surface)',
                          textDecoration: 'none',
                          fontSize: '14px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--md-surface-variant)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        🤖 Auto-Decisions
                      </NavLink>
                      <NavLink
                        to="/admin/court-flow"
                        onClick={() => setIsSettingsOpen(false)}
                        style={{
                          display: 'block',
                          padding: '12px 16px',
                          color: 'var(--md-on-surface)',
                          textDecoration: 'none',
                          fontSize: '14px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--md-surface-variant)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        ⚖️ Court Flow
                      </NavLink>
                    </div>
                  )}

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleLogout();
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      color: 'var(--md-error)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--md-surface-variant)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
