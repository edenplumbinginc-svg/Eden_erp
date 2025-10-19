import React, { useState, useEffect } from 'react';
import { apiService } from './services/api';
import ProjectList from './components/ProjectList';
import TaskList from './components/TaskList';
import Reports from './components/Reports';

function App() {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getProjects();
      setProjects(response.data);
    } catch (err) {
      setError('Failed to load projects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.getUsers();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setActiveTab('tasks');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Eden Coordination System</h1>
        <p>Project and Task Management with Ball Handoff Tracking</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
        <button
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
          disabled={!selectedProject}
        >
          Tasks {selectedProject && `(${selectedProject.name})`}
        </button>
        <button
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && <div className="loading">Loading...</div>}

      {!loading && (
        <>
          {activeTab === 'projects' && (
            <ProjectList
              projects={projects}
              onRefresh={loadProjects}
              onSelectProject={handleProjectSelect}
            />
          )}

          {activeTab === 'tasks' && selectedProject && (
            <TaskList
              project={selectedProject}
              users={users}
              onBack={() => setActiveTab('projects')}
            />
          )}

          {activeTab === 'reports' && <Reports />}
        </>
      )}
    </div>
  );
}

export default App;