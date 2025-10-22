import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

function ProjectList({ projects, onRefresh, onSelectProject }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { data: taskStats = [] } = useQuery({
    queryKey: ['tasks_by_status'],
    queryFn: () => apiService.getTasksByStatus().then(res => res.data)
  });

  const totalTasks = taskStats.reduce((sum, s) => sum + s.count, 0);

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
    <div className="space-y-4">
      {taskStats.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">Tasks by Status</h3>
          <div className="space-y-2">
            {taskStats.map(s => (
              <div key={s.status} className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="capitalize font-medium">{s.status.replace('_', ' ')}</span>
                  <span className="text-gray-600 font-semibold">{s.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-lg h-6 cursor-pointer hover:bg-gray-300 overflow-hidden"
                     onClick={() => navigate(`/alltasks?status=${s.status}`)}>
                  <div 
                    className="bg-blue-500 h-6 rounded-lg transition-all hover:bg-blue-600 flex items-center justify-end pr-2" 
                    style={{width: totalTasks > 0 ? `${Math.max(5, (s.count / totalTasks) * 100)}%` : '5%'}}
                  >
                    <span className="text-white text-xs font-semibold">
                      {Math.round((s.count / totalTasks) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalTasks > 0 && (
            <div className="text-xs text-gray-500 mt-3">
              Total: {totalTasks} task{totalTasks !== 1 ? 's' : ''} • Click a bar to filter
            </div>
          )}
        </div>
      )}
      
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
    </div>
  );
}

export default ProjectList;