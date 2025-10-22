export const STATUS_LABELS = {
  'open': 'New',
  'todo': 'To Do',
  'in_progress': 'In Progress',
  'review': 'Review',
  'done': 'Done'
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}
