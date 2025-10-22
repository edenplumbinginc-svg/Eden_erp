import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

function ProjectList({ projects, onRefresh, onSelectProject }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.createProject(formData);
      setFormData({ name: '', code: '' });
      setShowCreateForm(false);
      onRefresh();
    } catch (err) {
      alert('Failed to create project: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await apiService.deleteProject(id);
      onRefresh();
    } catch (err) {
      alert('Failed to delete project: ' + err.message);
    }
  };

  const handleUpdate = async (id, newName) => {
    const name = prompt('Enter new project name:', newName);
    if (!name || name === newName) return;
    try {
      await apiService.updateProject(id, { name });
      onRefresh();
    } catch (err) {
      alert('Failed to update project: ' + err.message);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Projects</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {showCreateForm && (
        <form className="form" onSubmit={handleCreate} style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Q1 Marketing Campaign"
            />
          </div>
          <div className="form-group">
            <label>Project Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder="e.g., MKT-2025-Q1"
            />
          </div>
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects found. Create your first project to get started!</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-item">
              <div className="project-header">
                <div>
                  <div className="project-title">{project.name}</div>
                  <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                    Code: {project.code}
                  </div>
                </div>
                <span className={`status-badge status-${project.status}`}>
                  {project.status}
                </span>
              </div>
              <div className="actions">
                <Link className="btn btn-primary" to={`/project/${project.id}`}>
                  View Tasks
                </Link>
                <button className="btn btn-secondary" onClick={() => handleUpdate(project.id, project.name)}>
                  Edit
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(project.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectList;