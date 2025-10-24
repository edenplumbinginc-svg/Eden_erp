import React, { useState, useEffect } from 'react';
import {
  lookupUserByEmail,
  getAllRoles,
  getUserRoles,
  assignRole,
  removeRole,
  getRoleTemplates,
  applyTemplate
} from '../services/adminRbac';

export default function AdminRbacPage() {
  const [emailInput, setEmailInput] = useState('');
  const [uuidInput, setUuidInput] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [userRolesList, setUserRolesList] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadRolesAndTemplates();
  }, []);

  const loadRolesAndTemplates = async () => {
    try {
      const [rolesData, templatesData] = await Promise.all([
        getAllRoles(),
        getRoleTemplates()
      ]);
      setAllRoles(rolesData.roles || []);
      setTemplates(templatesData.templates || []);
    } catch (err) {
      setError('Failed to load roles and templates');
      console.error(err);
    }
  };

  const handleLookupByEmail = async () => {
    if (!emailInput.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const userData = await lookupUserByEmail(emailInput.trim());
      setUserInfo(userData);
      setUuidInput(userData.id);
      await loadUserRoles(userData.id);
      setSuccess(`User found: ${userData.email}`);
    } catch (err) {
      setError('User not found or lookup failed');
      setUserInfo(null);
      setUserRolesList([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLookupByUuid = async () => {
    if (!uuidInput.trim()) {
      setError('Please enter a user UUID');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await loadUserRoles(uuidInput.trim());
      setUserInfo({ id: uuidInput.trim(), email: 'Unknown (lookup by UUID)' });
      setSuccess('User roles loaded');
    } catch (err) {
      setError('Failed to load user roles');
      setUserInfo(null);
      setUserRolesList([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoles = async (userId) => {
    try {
      const data = await getUserRoles(userId);
      setUserRolesList(data.roles || []);
    } catch (err) {
      console.error('Failed to load user roles:', err);
      throw err;
    }
  };

  const handleRoleToggle = async (roleSlug) => {
    if (!userInfo?.id) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const hasRole = userRolesList.some(r => r.slug === roleSlug);
      
      if (hasRole) {
        await removeRole(userInfo.id, roleSlug);
        setSuccess(`Role "${roleSlug}" removed`);
      } else {
        await assignRole(userInfo.id, roleSlug);
        setSuccess(`Role "${roleSlug}" assigned`);
      }

      await loadUserRoles(userInfo.id);
    } catch (err) {
      setError('Failed to update role');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async (template) => {
    if (!userInfo?.id) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await applyTemplate(userInfo.id, template);
      await loadUserRoles(userInfo.id);
      setSuccess(`Template "${template}" applied successfully`);
    } catch (err) {
      setError('Failed to apply template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const userRoleSlugs = new Set(userRolesList.map(r => r.slug));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{
        background: 'var(--md-surface)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--md-shadow-2)',
        marginBottom: 'var(--space-4)'
      }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>Admin RBAC Management</h1>
        <p style={{ color: 'var(--md-on-surface-variant)', marginBottom: 0 }}>
          Manage user roles and permissions
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fce8e6',
          color: 'var(--md-error)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-3)',
          borderLeft: '4px solid var(--md-error)'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#e6f4ea',
          color: 'var(--md-success)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-3)',
          borderLeft: '4px solid var(--md-success)'
        }}>
          {success}
        </div>
      )}

      <div style={{
        background: 'var(--md-surface)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--md-shadow-1)',
        marginBottom: 'var(--space-4)'
      }}>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>User Lookup</h2>

        <div style={{ marginBottom: 'var(--space-3)' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--md-on-surface)',
            marginBottom: 'var(--space-1)'
          }}>
            Email Address
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookupByEmail()}
              placeholder="user@example.com"
              disabled={loading}
              style={{
                flex: 1,
                padding: 'var(--space-2)',
                fontSize: '14px',
                border: '1px solid var(--md-border)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--md-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--md-border)'}
            />
            <button
              onClick={handleLookupByEmail}
              disabled={loading || !emailInput.trim()}
              style={{
                padding: '0 var(--space-3)',
                background: 'var(--md-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'wait' : 'pointer',
                opacity: (loading || !emailInput.trim()) ? 0.5 : 1,
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!loading && emailInput.trim()) {
                  e.target.style.background = 'var(--md-primary-dark)';
                  e.target.style.boxShadow = 'var(--md-shadow-2)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--md-primary)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {loading ? 'Looking up...' : 'Lookup'}
            </button>
          </div>
        </div>

        <div style={{
          padding: 'var(--space-2) 0',
          textAlign: 'center',
          color: 'var(--md-on-surface-variant)',
          fontSize: '13px'
        }}>
          or
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--md-on-surface)',
            marginBottom: 'var(--space-1)'
          }}>
            User UUID (Optional)
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="text"
              value={uuidInput}
              onChange={(e) => setUuidInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookupByUuid()}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={loading}
              style={{
                flex: 1,
                padding: 'var(--space-2)',
                fontSize: '14px',
                border: '1px solid var(--md-border)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                fontFamily: 'monospace',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--md-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--md-border)'}
            />
            <button
              onClick={handleLookupByUuid}
              disabled={loading || !uuidInput.trim()}
              style={{
                padding: '0 var(--space-3)',
                background: 'var(--md-surface)',
                color: 'var(--md-primary)',
                border: '1px solid var(--md-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'wait' : 'pointer',
                opacity: (loading || !uuidInput.trim()) ? 0.5 : 1,
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!loading && uuidInput.trim()) {
                  e.target.style.background = 'rgba(26, 115, 232, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--md-surface)';
              }}
            >
              Load by UUID
            </button>
          </div>
        </div>
      </div>

      {userInfo && (
        <>
          <div style={{
            background: 'var(--md-surface)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--md-shadow-1)',
            marginBottom: 'var(--space-4)'
          }}>
            <h2 style={{ marginBottom: 'var(--space-3)' }}>User Information</h2>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <div>
                <span style={{ fontWeight: '500', color: 'var(--md-on-surface-variant)' }}>Email: </span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{userInfo.email}</span>
              </div>
              <div>
                <span style={{ fontWeight: '500', color: 'var(--md-on-surface-variant)' }}>User ID: </span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{userInfo.id}</span>
              </div>
              {userInfo.created_at && (
                <div>
                  <span style={{ fontWeight: '500', color: 'var(--md-on-surface-variant)' }}>Created: </span>
                  <span style={{ fontSize: '13px' }}>{new Date(userInfo.created_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {templates.length > 0 && (
            <div style={{
              background: 'var(--md-surface)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--md-shadow-1)',
              marginBottom: 'var(--space-4)'
            }}>
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Quick Apply Templates</h2>
              <p style={{
                fontSize: '13px',
                color: 'var(--md-on-surface-variant)',
                marginBottom: 'var(--space-3)'
              }}>
                Apply pre-configured role bundles with one click
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 'var(--space-2)'
              }}>
                {templates.map(template => (
                  <button
                    key={template}
                    onClick={() => handleApplyTemplate(template)}
                    disabled={loading}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--md-surface)',
                      color: 'var(--md-primary)',
                      border: '1px solid var(--md-primary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: loading ? 'wait' : 'pointer',
                      transition: 'all var(--transition-fast)',
                      textTransform: 'capitalize'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.background = 'var(--md-primary)';
                        e.target.style.color = 'white';
                        e.target.style.boxShadow = 'var(--md-shadow-2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'var(--md-surface)';
                      e.target.style.color = 'var(--md-primary)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    {template.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{
            background: 'var(--md-surface)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--md-shadow-1)'
          }}>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Role Management</h2>
            <p style={{
              fontSize: '13px',
              color: 'var(--md-on-surface-variant)',
              marginBottom: 'var(--space-3)'
            }}>
              Toggle individual roles for this user ({userRolesList.length} assigned)
            </p>

            {allRoles.length === 0 ? (
              <div style={{
                padding: 'var(--space-4)',
                textAlign: 'center',
                color: 'var(--md-on-surface-variant)'
              }}>
                No roles available
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 'var(--space-2)'
              }}>
                {allRoles.map(role => {
                  const isAssigned = userRoleSlugs.has(role.slug);
                  return (
                    <label
                      key={role.slug}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 'var(--space-2)',
                        background: isAssigned ? 'rgba(26, 115, 232, 0.08)' : 'var(--md-surface-variant)',
                        border: `1px solid ${isAssigned ? 'var(--md-primary)' : 'var(--md-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: loading ? 'wait' : 'pointer',
                        transition: 'all var(--transition-fast)',
                        userSelect: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.boxShadow = 'var(--md-shadow-1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleRoleToggle(role.slug)}
                        disabled={loading}
                        style={{
                          width: '18px',
                          height: '18px',
                          marginRight: 'var(--space-2)',
                          cursor: loading ? 'wait' : 'pointer',
                          accentColor: 'var(--md-primary)'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: 'var(--md-on-surface)'
                        }}>
                          {role.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--md-on-surface-variant)',
                          fontFamily: 'monospace'
                        }}>
                          {role.slug}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
