import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { pageVariants, tPage } from './ui/motion';
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
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { ToasterProvider } from './components/Toaster';
import GuestView from './pages/GuestView';
import GuestDashboard from './pages/GuestDashboard';
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
import ProfilePage from './pages/ProfilePage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetail from './pages/IncidentDetail';
import ShowcasePage from './pages/ShowcasePage';
import AboutEden from './pages/AboutEden';
import StyleguidePage from './pages/StyleguidePage';
import RouteMap from './pages/RouteMap';
import RoutesDashboard from './pages/ops/RoutesDashboard';
import { ThemeProvider } from './components/ThemeProvider';
import ProtectedCheck from "./pages/ops/ProtectedCheck";
import DevAuthSwitcher from './components/DevAuthSwitcher';

const queryClient = new QueryClient();

function AppContent() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

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
      setProjects(response.data?.items || []);
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

  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    : false;

  // Use centralized motion tokens (premium page transitions with blur)
  const variants = prefersReduced
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0, transition: { duration: 0 } },
        exit: { opacity: 1, y: 0, transition: { duration: 0 } },
      }
    : pageVariants;

  const transition = prefersReduced ? { duration: 0 } : tPage;

  return (
    <div className="min-h-screen bg-background">
      <DevAuthSwitcher onUserChange={() => window.location.reload()} />
      <EdenHeader />
      
      <div className="container">
        {error && <div className="error">{error}</div>}

        {loading && <div className="loading">Loading...</div>}

        {!loading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              style={{ willChange: "transform, opacity, filter" }}
            >
              <Routes location={location}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/guest" element={<GuestDashboard />} />
                <Route path="/shared" element={<GuestView />} />
                
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
                <Route 
                  path="/profile" 
                  element={
                    <RequireAuth>
                      <ProfilePage />
                    </RequireAuth>
                  } 
                />
                <Route 
                  path="/incidents" 
                  element={
                    <RequireAuth requiredPermission="admin:manage">
                      <IncidentsPage />
                    </RequireAuth>
                  } 
                />
                <Route 
                  path="/incidents/:id" 
                  element={
                    <RequireAuth requiredPermission="admin:manage">
                      <IncidentDetail />
                    </RequireAuth>
                  } 
                />
                <Route 
                  path="/showcase" 
                  element={
                    <RequireAuth>
                      <ShowcasePage />
                    </RequireAuth>
                  } 
                />
                <Route 
                  path="/styleguide" 
                  element={
                    <RequireAuth>
                      <StyleguidePage />
                    </RequireAuth>
                  } 
                />
                <Route 
                  path="/about/eden" 
                  element={
                    <RequireAuth>
                      <AboutEden />
                    </RequireAuth>
                  } 
                />
                <Route 
                  path="/routes" 
                  element={
                    <RequireAuth>
                      <RouteMap />
                    </RequireAuth>
                  } 
                />
                <Route 
                  path="/ops/routes" 
                  element={
                    <RequireAuth>
                      <RoutesDashboard />
                    </RequireAuth>
                  } 
                />
              
          <Route
            path="/protected-check"
            element={
              <RequireAuth>
                <ProtectedCheck />
              </RequireAuth>
            }
          />

</Routes>
            </motion.div>
          </AnimatePresence>
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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <ToasterProvider>
              <AppContent />
            </ToasterProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;