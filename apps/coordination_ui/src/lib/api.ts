// API Client for Eden Coordination Module
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Dev auth headers for testing
const getDevHeaders = () => ({
  'X-Dev-User-Id': 'test-user-123',
  'X-Dev-User-Role': 'Manager',
  'X-Dev-User-Email': 'test@example.com',
  'Content-Type': 'application/json'
});

// Generic fetch wrapper with error handling
async function apiCall<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const isModifying = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method || 'GET');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(isModifying ? getDevHeaders() : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

// Project APIs
export const projectApi = {
  list: () => apiCall('/api/projects'),
  
  create: (data: { name: string; code: string }) => 
    apiCall('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    
  getTasks: (projectId: string) => 
    apiCall(`/api/projects/${projectId}/tasks`),
    
  createTask: (projectId: string, data: any) =>
    apiCall(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

// Task APIs
export const taskApi = {
  update: (taskId: string, data: any) =>
    apiCall(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    
  getComments: (taskId: string) =>
    apiCall(`/api/tasks/${taskId}/comments`),
    
  addComment: (taskId: string, body: string) =>
    apiCall(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    }),
    
  handoffBall: (taskId: string, targetUserId: string) =>
    apiCall(`/api/tasks/${taskId}/ball`, {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId })
    })
};

// Attachment APIs
export const attachmentApi = {
  init: (taskId: string) =>
    apiCall(`/api/tasks/${taskId}/attachments/init`, {
      method: 'POST',
      body: JSON.stringify({})
    }),
    
  complete: (taskId: string, data: {
    storage_key: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
  }) =>
    apiCall(`/api/tasks/${taskId}/attachments/complete`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    
  list: (taskId: string) =>
    apiCall(`/api/tasks/${taskId}/attachments`),
    
  delete: (attachmentId: string) =>
    apiCall(`/api/attachments/${attachmentId}`, {
      method: 'DELETE'
    })
};

// Report APIs
export const reportApi = {
  taskStatus: () => apiCall('/api/reports/tasks/status')
};

// Helper to upload a file (init + complete)
export async function uploadFile(taskId: string, file: File) {
  // Initialize upload
  const { storage_key } = await attachmentApi.init(taskId);
  
  // Complete with file metadata
  return attachmentApi.complete(taskId, {
    storage_key,
    filename: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size
  });
}