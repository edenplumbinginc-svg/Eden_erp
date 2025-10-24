import React from 'react';
import { Link } from 'react-router-dom';
import { useDeltaSync } from '../hooks/useDeltaSync';
import { useHasPermission } from '../hooks/usePermissions';

export default function SimpleProjectsPage() {
  const { items: projects, loading, forceRefresh } = useDeltaSync('/api/projects', {
    key: 'projects',
    intervalMs: 30000,
    initialLimit: 30
  });

  const canCreate = useHasPermission('project.create');

  if (loading && projects.length === 0) {
    return (
      <div className="loading-skeleton" style={{ padding: '24px' }}>
        <div className="skeleton-text" style={{ width: '200px', height: '28px', marginBottom: '16px' }}></div>
        <div className="skeleton-text" style={{ width: '100%', height: '60px', marginBottom: '8px' }}></div>
        <div className="skeleton-text" style={{ width: '100%', height: '60px', marginBottom: '8px' }}></div>
        <div className="skeleton-text" style={{ width: '100%', height: '60px' }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '500',
            margin: '0 0 8px 0',
            color: 'var(--md-text-primary)'
          }}>
            Projects (Delta Sync)
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--md-text-secondary)',
            margin: 0
          }}>
            Background refresh every 30s • {projects.length} projects loaded
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={forceRefresh}
            className="md-button-outlined"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          
          {canCreate && (
            <Link to="/projects/new" className="md-button-raised">
              + Create Project
            </Link>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          backgroundColor: 'var(--md-surface)',
          borderRadius: '8px',
          border: '1px solid var(--md-divider)'
        }}>
          <p style={{ 
            fontSize: '16px', 
            color: 'var(--md-text-secondary)',
            margin: '0 0 16px 0'
          }}>
            No projects found
          </p>
          {canCreate && (
            <Link to="/projects/new" className="md-button-raised">
              Create Your First Project
            </Link>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'grid',
          gap: '12px'
        }}>
          {projects.map(project => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              style={{
                display: 'block',
                padding: '16px 20px',
                backgroundColor: 'var(--md-surface)',
                borderRadius: '8px',
                border: '1px solid var(--md-divider)',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              className="project-card"
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ 
                    fontSize: '16px',
                    fontWeight: '500',
                    margin: '0 0 4px 0',
                    color: 'var(--md-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {project.name}
                  </h3>
                  {project.code && (
                    <p style={{ 
                      fontSize: '13px',
                      color: 'var(--md-text-secondary)',
                      margin: 0
                    }}>
                      Code: {project.code}
                    </p>
                  )}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '12px',
                  flexShrink: 0
                }}>
                  {project.status && (
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: project.status === 'active' 
                        ? 'var(--md-success-light)' 
                        : 'var(--md-divider)',
                      color: project.status === 'active'
                        ? 'var(--md-success-dark)'
                        : 'var(--md-text-secondary)'
                    }}>
                      {project.status}
                    </span>
                  )}
                  
                  {project.updated_at && (
                    <span style={{ 
                      fontSize: '12px',
                      color: 'var(--md-text-secondary)',
                      whiteSpace: 'nowrap'
                    }}>
                      Updated {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
