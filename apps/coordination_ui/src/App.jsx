import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiService } from './services/api';
import { AuthProvider } from './hooks/AuthProvider';
import { useWarmBoot } from './hooks/useWarmBoot';
import RequireAuth from './components/RequireAuth';
import ProjectList from './components/ProjectList';
import TaskList from './components/TaskList';
import Reports from './components/Reports';
import EdenHeader from './components/EdenHeader';
import TaskDetail from './pages/TaskDetail';
import ProjectDetail from './pages/ProjectDetail';
import CreateTaskPage from './pages/CreateTaskPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { ToasterProvider } from './components/Toaster';
import GuestView from './pages/GuestView';
import AllTasksView from './components/AllTasksView';
import SimpleTasksPage from './pages/SimpleTasksPage';
import SimpleProjectsPage from './pages/SimpleProjectsPage';
import ProjectRequestForm from './pages/ProjectRequestForm';
import AuditLogViewer from './pages/AuditLogViewer';
import IntakeQueue from './pages/IntakeQueue';
import TeamOverview from './pages/TeamOverview';
import ArchiveView from './pages/ArchiveView';
import AdminRbacPage from './pages/AdminRbacPage';
import DecisionsPage from './pages/admin/DecisionsPage';
import CourtFlowPage from './pages/admin/CourtFlowPage';
import PerformanceLeaderboardPage from './pages/PerformanceLeaderboardPage';
import Velocity from './pages/Velocity';

const queryClient = new QueryClient();

function AppContent() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Warm-boot preloader: fetch lightweight lists after auth resolves
  useWarmBoot();

  useEffect(() => {
    // Only load data if we have an auth token
    const token = localStorage.getItem('edenAuthToken');
    if (!token) return;

    // Try warm data first for instant UI
    const warmProjects = window.__eden?.projectsWarm;
    if (warmProjects && projects.length === 0) {
      setProjects(warmProjects);
    } else {
      loadProjects();
    }
    
    loadUsers();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getProjects();
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
    <div className="min-h-screen bg-background">
      <EdenHeader />
      
      <div className="container">
        {/* DevAuthSwitcher hidden - using real Supabase authentication */}
        {/* <DevAuthSwitcher onUserChange={() => {
          loadProjects();
          loadUsers();
        }} /> */}

      {error && <div className="error">{error}</div>}

      {loading && <div className="loading">Loading...</div>}

      {!loading && (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/guest" element={<GuestView />} />
          
          <Route
            path="/"
            element={
              <RequireAuth>
                <ProjectList
                  projects={projects}
                  onRefresh={loadProjects}
                  onSelectProject={handleProjectSelect}
                />
              </RequireAuth>
            }
          />
          <Route 
            path="/dashboard" 
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            } 
          />
          <Route
            path="/tasks/:projectId"
            element={
              <RequireAuth>
                <TasksRoute
                  projects={projects}
                  users={users}
                  onBack={() => navigate('/')}
                />
              </RequireAuth>
            }
          />
          <Route 
            path="/alltasks" 
            element={
              <RequireAuth>
                <AllTasksView />
              </RequireAuth>
            } 
          />
          <Route 
            path="/tasks-delta" 
            element={
              <RequireAuth>
                <SimpleTasksPage />
              </RequireAuth>
            } 
          />
          <Route 
            path="/projects-delta" 
            element={
              <RequireAuth>
                <SimpleProjectsPage />
              </RequireAuth>
            } 
          />
          <Route 
            path="/tasks/new" 
            element={
              <RequireAuth>
                <CreateTaskPage />
              </RequireAuth>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <RequireAuth>
                <Reports />
              </RequireAuth>
            } 
          />
          <Route 
            path="/project/:projectId" 
            element={
              <RequireAuth>
                <ProjectDetail />
              </RequireAuth>
            } 
          />
          <Route 
            path="/task/:taskId" 
            element={
              <RequireAuth>
                <TaskDetail />
              </RequireAuth>
            } 
          />
          <Route 
            path="/request-project" 
            element={
              <RequireAuth>
                <ProjectRequestForm />
              </RequireAuth>
            } 
          />
          <Route 
            path="/audit-log" 
            element={
              <RequireAuth>
                <AuditLogViewer />
              </RequireAuth>
            } 
          />
          <Route 
            path="/intake" 
            element={
              <RequireAuth>
                <IntakeQueue />
              </RequireAuth>
            } 
          />
          <Route 
            path="/team" 
            element={
              <RequireAuth>
                <TeamOverview />
              </RequireAuth>
            } 
          />
          <Route 
            path="/archive" 
            element={
              <RequireAuth>
                <ArchiveView />
              </RequireAuth>
            } 
          />
          <Route 
            path="/admin/rbac" 
            element={
              <RequireAuth>
                <AdminRbacPage />
              </RequireAuth>
            } 
          />
          <Route 
            path="/admin/decisions" 
            element={
              <RequireAuth requiredPermission="admin:manage">
                <DecisionsPage />
              </RequireAuth>
            } 
          />
          <Route 
            path="/admin/court-flow" 
            element={
              <RequireAuth requiredPermission="admin:manage">
                <CourtFlowPage />
              </RequireAuth>
            } 
          />
          <Route 
            path="/leaderboard" 
            element={
              <RequireAuth>
                <PerformanceLeaderboardPage />
              </RequireAuth>
            } 
          />
          <Route 
            path="/velocity" 
            element={
              <RequireAuth>
                <Velocity />
              </RequireAuth>
            } 
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
        <AuthProvider>
          <ToasterProvider>
            <AppContent />
          </ToasterProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;