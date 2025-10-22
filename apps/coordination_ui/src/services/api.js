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
  getProject: (projectId) => api.get(`/projects/${projectId}`).then(res => res.data),
  listProjectTasks: (projectId) => api.get(`/projects/${projectId}/tasks`).then(res => Array.isArray(res.data) ? res.data : (res.data?.tasks || [])),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.patch(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),

  // Tasks
  getTask: (id) => api.get(`/tasks/${id}`).then(res => res.data),
  getTasksByProject: (projectId) => api.get(`/projects/${projectId}/tasks`),
  createTask: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  createTaskGlobal: (taskData) => api.post('/tasks', taskData).then(res => res.data),
  updateTask: (id, data) => api.patch(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),

  // Comments
  getComments: (taskId) => api.get(`/tasks/${taskId}/comments`),
  getTaskComments: (taskId) => api.get(`/tasks/${taskId}/comments`).then(res => res.data),
  createComment: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
  createTaskComment: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data).then(res => res.data),

  // Attachments
  getTaskAttachments: (taskId) => api.get(`/tasks/${taskId}/attachments`).then(res => res.data),
  initAttachmentUpload: (taskId, data) => api.post(`/tasks/${taskId}/attachments/init`, data).then(res => res.data),
  completeAttachmentUpload: (taskId, data) => api.post(`/tasks/${taskId}/attachments/complete`, data).then(res => res.data),

  // Ball Handoff
  handoffBall: (taskId, data) => api.post(`/tasks/${taskId}/ball`, data),
  getBallHistory: (taskId) => api.get(`/tasks/${taskId}/ball`),
  handoffTask: (taskId, toDepartment, note) => api.post(`/tasks/${taskId}/handoff`, { to_department: toDepartment, note }).then(res => res.data),

  // Reports
  getTasksByStatus: () => api.get('/reports/tasks/status'),
  getTasksByOwner: () => api.get('/reports/tasks/ball'),
  getTasksByPriority: () => api.get('/reports/tasks/priority'),
  getOverdueTasks: () => api.get('/reports/tasks/overdue'),
  getRecentActivity: () => api.get('/reports/activity/recent'),

  // Users
  getUsers: () => api.get('/users'),

  // Guest Links
  createGuestLink: ({ scope, id, expiresIn = "7d" }) => api.post('/guest-links', { scope, id, expiresIn }).then(res => res.data),

  // Notifications
  listRecentNotifications: () => api.get('/notifications/recent').then(res => Array.isArray(res.data) ? res.data : []),
  markNotificationRead: (id) => api.patch(`/notifications/${id}/read`).then(res => res.data),
  markAllNotificationsRead: () => api.patch('/notifications/mark-all-read').then(res => res.data),

  // Subtasks
  listSubtasks: (taskId) => api.get(`/tasks/${taskId}/subtasks`).then(res => res.data),
  createSubtask: (taskId, payload) => api.post(`/tasks/${taskId}/subtasks`, payload).then(res => res.data),
  updateSubtask: (subtaskId, payload) => api.patch(`/tasks/subtasks/${subtaskId}`, payload).then(res => res.data),
  deleteSubtask: (subtaskId) => api.delete(`/tasks/subtasks/${subtaskId}`).then(res => res.data)
};

// Export the raw axios instance for direct use
export { api };

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