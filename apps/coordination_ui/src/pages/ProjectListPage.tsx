import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectApi, reportApi } from '../lib/api';

export function ProjectListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [statusReport, setStatusReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newProject, setNewProject] = useState({ name: '', code: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, reportData] = await Promise.all([
        projectApi.list(),
        reportApi.taskStatus()
      ]);
      setProjects(projectsData);
      setStatusReport(reportData);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.code) {
      setError('Name and code are required');
      return;
    }

    try {
      setCreating(true);
      await projectApi.create(newProject);
      setNewProject({ name: '', code: '' });
      await loadData();
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Eden Coordination - Projects
      </h1>

      {error && (
        <div style={{ 
          backgroundColor: '#fee', 
          color: '#c00', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {/* Create Project Form */}
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '30px' 
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>New Project</h2>
        <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              flex: '1'
            }}
          />
          <input
            type="text"
            placeholder="Project Code"
            value={newProject.code}
            onChange={(e) => setNewProject({ ...newProject, code: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              width: '150px'
            }}
          />
          <button
            type="submit"
            disabled={creating}
            style={{
              padding: '8px 20px',
              backgroundColor: creating ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: creating ? 'not-allowed' : 'pointer'
            }}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>

      {/* Projects List */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Projects</h2>
        {projects.length === 0 ? (
          <p style={{ color: '#666' }}>No projects yet. Create one above!</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '5px' }}>
                      {project.name}
                    </h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                      Code: {project.code}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#999', fontSize: '12px' }}>
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </p>
                    <p style={{ 
                      marginTop: '5px',
                      padding: '2px 8px',
                      backgroundColor: project.status === 'active' ? '#e7f5e7' : '#f5f5f5',
                      color: project.status === 'active' ? '#28a745' : '#666',
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'inline-block'
                    }}>
                      {project.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Report */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px' 
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Task Status Report</h2>
        {statusReport.length === 0 ? (
          <p style={{ color: '#666' }}>No tasks yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Count</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {statusReport.map((row) => (
                <tr key={row.status} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: 
                        row.status === 'done' ? '#d4edda' :
                        row.status === 'in_progress' ? '#fff3cd' :
                        row.status === 'review' ? '#cce5ff' :
                        '#f8f9fa',
                      color:
                        row.status === 'done' ? '#155724' :
                        row.status === 'in_progress' ? '#856404' :
                        row.status === 'review' ? '#004085' :
                        '#495057',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {row.count}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {row.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}