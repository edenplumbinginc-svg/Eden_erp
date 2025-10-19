import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
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