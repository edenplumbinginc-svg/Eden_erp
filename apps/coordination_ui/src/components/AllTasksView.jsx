import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryState } from '../hooks/useQueryState';
import { useTasksQuery } from '../hooks/useTasksQuery';
import TasksFilters from './TasksFilters';
import TaskItem from './TaskItem';
import CreateTaskModal from './CreateTaskModal';
import { apiService, devAuth } from '../services/api';
import { TaskListSkeleton } from './LoadingSkeleton';

export default function AllTasksView() {
  const { getAll, set } = useQueryState();
  const qp = getAll();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const currentUser = devAuth.getCurrentUser();

  const { data: allTasksCount } = useQuery({
    queryKey: ['tasks_count', 'all'],
    queryFn: () => apiService.getTasks({ limit: 1 }).then(res => res.total || 0)
  });

  const { data: myTasksCount } = useQuery({
    queryKey: ['tasks_count', 'assignee', currentUser.id],
    queryFn: () => apiService.getTasks({ assignee: currentUser.id, limit: 1 }).then(res => res.total || 0)
  });

  const { data: bicCount } = useQuery({
    queryKey: ['tasks_count', 'bic', currentUser.id],
    queryFn: () => apiService.getTasks({ bic: currentUser.id, limit: 1 }).then(res => res.total || 0)
  });
  
  const { data, loading, error } = useTasksQuery({
    status: qp.status,
    priority: qp.priority,
    assignee: qp.assignee,
    project: qp.project,
    department: qp.department,
    bic: qp.bic,
    q: qp.q,
    overdue: qp.overdue,
    idle: qp.idle,
    page: qp.page || '1',
    limit: qp.limit || '20',
    sort: qp.sort || 'updated_at:desc'
  });

  const handleTabClick = (filters) => {
    set({ ...filters, page: '1' }, { replace: true });
  };

  const isAllTasksActive = !qp.assignee && !qp.bic;
  const isMyTasksActive = qp.assignee === currentUser.id;
  const isBallInCourtActive = qp.bic === currentUser.id;

  return (
    <div className="space-y-4">
      <div className="bg-white border-b">
        <div className="flex gap-1 px-4">
          <button
            className={`px-4 py-3 text-body font-medium border-b-2 transition-colors ${
              isAllTasksActive 
                ? 'border-primary' 
                : 'border-transparent text-muted hover:border-gray-300'
            }`}
            style={isAllTasksActive ? { color: 'var(--md-primary)' } : {}}
            onClick={() => handleTabClick({ assignee: null, bic: null })}
          >
            All Tasks
            {allTasksCount > 0 && (
              <span className="ml-2 inline-block px-2 py-0.5 bg-primary text-white rounded-full text-caption font-semibold">
                {allTasksCount}
              </span>
            )}
          </button>
          <button
            className={`px-4 py-3 text-body font-medium border-b-2 transition-colors ${
              isMyTasksActive 
                ? 'border-primary' 
                : 'border-transparent text-muted hover:border-gray-300'
            }`}
            style={isMyTasksActive ? { color: 'var(--md-primary)' } : {}}
            onClick={() => handleTabClick({ assignee: currentUser.id, bic: null })}
          >
            My Tasks
            {myTasksCount > 0 && (
              <span className="ml-2 inline-block px-2 py-0.5 bg-primary text-white rounded-full text-caption font-semibold">
                {myTasksCount}
              </span>
            )}
          </button>
          <button
            className={`px-4 py-3 text-body font-medium border-b-2 transition-colors ${
              isBallInCourtActive 
                ? 'border-primary' 
                : 'border-transparent text-muted hover:border-gray-300'
            }`}
            style={isBallInCourtActive ? { color: 'var(--md-primary)' } : {}}
            onClick={() => handleTabClick({ bic: currentUser.id, assignee: null })}
          >
            🏀 Ball in My Court
            {bicCount > 0 && (
              <span className="ml-2 inline-block px-2 py-0.5 bg-primary text-white rounded-full text-caption font-semibold">
                {bicCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <TasksFilters />
        </div>
        <button
          className="btn btn-primary ml-4 whitespace-nowrap"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Create Task
        </button>
      </div>

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-body text-muted">
            {data ? `${data.total} task${data.total !== 1 ? 's' : ''} found` : 'All Tasks'}
          </div>
          {data && data.totalPages > 1 && (
            <div className="text-body text-muted">
              Page {data.page} of {data.totalPages}
            </div>
          )}
        </div>

        {loading && <TaskListSkeleton />}

        {error && (
          <div className="text-body text-red-600">Error: {error}</div>
        )}

        {!loading && !error && data && (
          <div className="grid gap-3">
            {data.items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                <p className="text-muted mb-4">
                  {qp.q || qp.status || qp.priority ? 
                    'Try adjusting your filters to see more tasks.' :
                    'Create your first task to get started.'
                  }
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  + Create Task
                </button>
              </div>
            ) : (
              data.items.map(t => <TaskItem key={t.id} t={t} />)
            )}
          </div>
        )}

        {!loading && !error && data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              className="btn btn-secondary"
              disabled={data.page === 1}
              onClick={() => set({ page: String(data.page - 1) })}
            >
              Previous
            </button>
            <span className="text-body text-muted">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={data.page === data.totalPages}
              onClick={() => set({ page: String(data.page + 1) })}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
