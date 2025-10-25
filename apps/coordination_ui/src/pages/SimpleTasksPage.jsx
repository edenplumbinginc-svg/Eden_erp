import React from 'react';
import { useDeltaSync } from '../hooks/useDeltaSync';
import { Link } from 'react-router-dom';
import { useHasPermission } from '../hooks/usePermissions';
import { Loading } from '../components/ui/PageStates';

export default function SimpleTasksPage() {
  const { items, loading, forceRefresh } = useDeltaSync('/api/tasks', {
    key: 'tasks',
    intervalMs: 30000,
    initialLimit: 50
  });

  const canCreateTask = useHasPermission('task.create');

  // Try warm-boot data if available
  const warmTasks = (typeof window !== 'undefined' && window.__eden?.tasksWarm) || null;

  if (loading && items.length === 0 && !warmTasks) {
    return <Loading />;
  }

  const displayTasks = items.length > 0 ? items : (warmTasks || []);

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-semibold">Tasks (Delta Sync)</h1>
          <p className="text-body text-muted mt-1">
            Background refresh every 30s • {displayTasks.length} tasks loaded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="btn btn-secondary text-caption"
            onClick={() => forceRefresh()}
          >
            🔄 Refresh
          </button>
          {canCreateTask && (
            <Link to="/tasks/new" className="btn btn-primary">
              + Create Task
            </Link>
          )}
        </div>
      </div>

      <div className="card p-6">
        {displayTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted mb-4">Create your first task to get started.</p>
            {canCreateTask && (
              <Link to="/tasks/new" className="btn btn-primary">
                + Create Task
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {displayTasks.map(t => (
              <Link
                key={t.id}
                to={`/task/${t.id}`}
                className="block py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-body">{t.title}</div>
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-caption font-medium"
                        style={{
                          backgroundColor: getStatusColor(t.status),
                          color: 'white'
                        }}
                      >
                        {getStatusLabel(t.status)}
                      </span>
                    </div>
                    {t.description && (
                      <div className="text-caption text-muted mt-1 line-clamp-2">
                        {t.description}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-caption text-muted">
                      {t.priority && (
                        <span>Priority: {t.priority}</span>
                      )}
                      {t.department && (
                        <span>Dept: {t.department}</span>
                      )}
                      {t.updated_at && (
                        <span>Updated: {new Date(t.updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="text-caption text-muted text-center">
        💡 This page uses incremental delta sync. Only changed tasks are fetched on each refresh.
      </div>
    </div>
  );
}

// Helper functions
function getStatusColor(status) {
  const colors = {
    'todo': '#f59e0b',
    'open': '#f59e0b',
    'in_progress': '#3b82f6',
    'review': '#8b5cf6',
    'done': '#10b981'
  };
  return colors[status] || '#6b7280';
}

function getStatusLabel(status) {
  const labels = {
    'todo': 'To Do',
    'open': 'New',
    'in_progress': 'In Progress',
    'review': 'Review',
    'done': 'Done'
  };
  return labels[status] || status;
}
