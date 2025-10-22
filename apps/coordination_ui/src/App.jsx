import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiService } from './services/api';
import ProjectList from './components/ProjectList';
import TaskList from './components/TaskList';
import Reports from './components/Reports';
import DevAuthSwitcher from './components/DevAuthSwitcher';
import EdenHeader from './components/EdenHeader';
import TaskDetail from './pages/TaskDetail';
import ProjectDetail from './pages/ProjectDetail';
import CreateTaskPage from './pages/CreateTaskPage';
import DashboardPage from './pages/DashboardPage';
import { ToasterProvider } from './components/Toaster';
import GuestView from './pages/GuestView';
import AllTasksView from './components/AllTasksView';

const queryClient = new QueryClient();

function AppContent() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading projects...');
      const response = await apiService.getProjects();
      console.log('Projects loaded:', response.data.length);
      setProjects(response.data);
    } catch (err) {
      console.error('Error loading projects:', err);
      console.error('Error response:', err.response);
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      setError('Failed to load projects: ' + errorMsg);
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
    navigate(`/tasks/${project.id}`, { state: { project } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <EdenHeader />
      
      <div className="container">
        <DevAuthSwitcher onUserChange={() => {
          loadProjects();
          loadUsers();
        }} />

      <div className="tabs">
        <NavLink
          to="/"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          Projects
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/alltasks"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          All Tasks
        </NavLink>
        <NavLink
          to="/reports"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          Reports
        </NavLink>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && <div className="loading">Loading...</div>}

      {!loading && (
        <Routes>
          <Route
            path="/"
            element={
              <ProjectList
                projects={projects}
                onRefresh={loadProjects}
                onSelectProject={handleProjectSelect}
              />
            }
          />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/tasks/:projectId"
            element={
              <TasksRoute
                projects={projects}
                users={users}
                onBack={() => navigate('/')}
              />
            }
          />
          <Route path="/alltasks" element={<AllTasksView />} />
          <Route path="/tasks/new" element={<CreateTaskPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route 
            path="/project/:projectId" 
            element={<ProjectDetail />} 
          />
          <Route 
            path="/task/:taskId" 
            element={<TaskDetail />} 
          />
          <Route 
            path="/guest" 
            element={<GuestView />} 
          />
        </Routes>
      )}
      </div>
    </div>
  );
}

function TasksRoute({ projects, users, onBack }) {
  const { projectId } = useParams();
  const location = window.location;
  
  const project = location.state?.project || projects.find(p => p.id === projectId);

  if (!project) {
    return (
      <div className="card">
        <h2>Project Not Found</h2>
        <button className="btn btn-primary" onClick={onBack}>
          Back to Projects
        </button>
      </div>
    );
  }

  return <TaskList project={project} users={users} onBack={onBack} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ToasterProvider>
          <AppContent />
        </ToasterProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;