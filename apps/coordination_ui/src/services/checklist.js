import { api } from './api';

export async function listChecklist(taskId) {
  const response = await api.get(`/tasks/${taskId}/checklist`);
  return response.data;
}

export async function addChecklistItem(taskId, label, position = 0) {
  const response = await api.post(`/tasks/${taskId}/checklist`, { label, position });
  return response.data;
}

export async function toggleChecklistItem(taskId, itemId) {
  const response = await api.post(`/tasks/${taskId}/checklist/${itemId}/toggle`);
  return response.data;
}

export async function reorderChecklist(taskId, orderIds) {
  await api.post(`/tasks/${taskId}/checklist/reorder`, { order: orderIds });
}

export async function deleteChecklistItem(taskId, itemId) {
  await api.delete(`/tasks/${taskId}/checklist/${itemId}`);
}
