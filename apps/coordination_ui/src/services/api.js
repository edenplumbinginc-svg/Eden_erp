import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Dev user configuration for testing RBAC
let currentDevUser = {
  email: 'test@edenplumbing.com',
  id: '855546bf-f53d-4538-b8d5-cd30f5c157a2'
};

// Add auth headers to all requests
api.interceptors.request.use((config) => {
  console.log('API Request interceptor - adding headers:', {
    email: currentDevUser.email,
    id: currentDevUser.id
  });
  config.headers['X-Dev-User-Email'] = currentDevUser.email;
  config.headers['X-Dev-User-Id'] = currentDevUser.id;
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

export const apiService = {
  // Projects
  getProjects: () => api.get('/projects'),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.patch(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),

  // Tasks
  getTasksByProject: (projectId) => api.get(`/projects/${projectId}/tasks`),
  createTask: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  updateTask: (id, data) => api.patch(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),

  // Comments
  getComments: (taskId) => api.get(`/tasks/${taskId}/comments`),
  createComment: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),

  // Ball Handoff
  handoffBall: (taskId, data) => api.post(`/tasks/${taskId}/ball`, data),
  getBallHistory: (taskId) => api.get(`/tasks/${taskId}/ball`),

  // Reports
  getTasksByStatus: () => api.get('/reports/tasks/status'),
  getTasksByOwner: () => api.get('/reports/tasks/ball'),
  getTasksByPriority: () => api.get('/reports/tasks/priority'),
  getOverdueTasks: () => api.get('/reports/tasks/overdue'),
  getRecentActivity: () => api.get('/reports/activity/recent'),

  // Users
  getUsers: () => api.get('/users')
};

// Dev Auth Control - allows switching users to test different permissions
export const devAuth = {
  getCurrentUser: () => ({ ...currentDevUser }),
  
  setUser: (email, id) => {
    currentDevUser = { email, id };
    return currentDevUser;
  },
  
  // Preset test users for different roles
  presets: {
    ops: {
      email: 'test@edenplumbing.com',
      id: '855546bf-f53d-4538-b8d5-cd30f5c157a2',
      role: 'ops (has tasks:read + tasks:write)'
    },
    viewer: {
      email: 'viewer@edenplumbing.com',
      id: '11111111-1111-1111-1111-111111111111',
      role: 'viewer (has tasks:read only)'
    },
    admin: {
      email: 'admin@edenplumbing.com',
      id: '22222222-2222-2222-2222-222222222222',
      role: 'admin (has all permissions)'
    }
  }
};