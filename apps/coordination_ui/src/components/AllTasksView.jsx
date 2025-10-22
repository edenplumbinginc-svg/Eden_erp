import React, { useState } from 'react';
import { useQueryState } from '../hooks/useQueryState';
import { useTasksQuery } from '../hooks/useTasksQuery';
import TasksFilters from './TasksFilters';
import TaskItem from './TaskItem';
import CreateTaskModal from './CreateTaskModal';

export default function AllTasksView() {
  const { getAll, set } = useQueryState();
  const qp = getAll();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <TasksFilters />
        </div>
        <button
          className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 ml-4 whitespace-nowrap"
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
          <div className="text-sm text-gray-500">
            {data ? `${data.total} task${data.total !== 1 ? 's' : ''} found` : 'All Tasks'}
          </div>
          {data && data.totalPages > 1 && (
            <div className="text-sm text-gray-500">
              Page {data.page} of {data.totalPages}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-sm text-gray-500">Loading tasks...</div>
        )}

        {error && (
          <div className="text-sm text-red-600">Error: {error}</div>
        )}

        {!loading && !error && data && (
          <div className="grid gap-3">
            {data.items.length === 0 ? (
              <div className="text-sm text-gray-500">No tasks found. Try adjusting your filters.</div>
            ) : (
              data.items.map(t => <TaskItem key={t.id} t={t} />)
            )}
          </div>
        )}

        {!loading && !error && data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              className="btn text-sm px-3 py-1"
              disabled={data.page === 1}
              onClick={() => set({ page: String(data.page - 1) })}
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              className="btn text-sm px-3 py-1"
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
