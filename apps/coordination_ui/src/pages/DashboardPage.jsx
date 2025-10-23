import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import SummaryCard from '../components/SummaryCard';
import TasksByStatusChart from '../components/TasksByStatusChart';
import TasksByAssigneeChart from '../components/TasksByAssigneeChart';
import RecentActivityFeed from '../components/RecentActivityFeed';

export default function DashboardPage() {
  const { data: statusData = [], isLoading: statusLoading } = useQuery({
    queryKey: ['tasks_by_status'],
    queryFn: () => apiService.getTasksByStatus().then(res => res.data)
  });

  const { data: assigneeData = [], isLoading: assigneeLoading } = useQuery({
    queryKey: ['tasks_by_assignee'],
    queryFn: () => apiService.getTasksByOwner().then(res => res.data)
  });

  const { data: overdueData = [], isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue_tasks'],
    queryFn: () => apiService.getOverdueTasks().then(res => res.data)
  });

  const totalTasks = statusData.reduce((sum, s) => sum + s.count, 0);
  const overdueCount = overdueData.length;
  const inProgressCount = statusData.find(s => s.status === 'in_progress')?.count || 0;

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h1 className="font-bold">Dashboard</h1>
        <Link to="/tasks/new" className="btn btn-primary">
          + Create Task
        </Link>
      </div>

      {totalTasks === 0 && !statusLoading && (
        <div className="card" style={{
          backgroundColor: 'rgba(26, 115, 232, 0.05)',
          borderLeft: '4px solid var(--md-primary)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)'
        }}>
          <div className="font-semibold text-body mb-2">👋 Welcome to Eden Coordination</div>
          <p className="text-body text-muted mb-3">
            Get started by creating your first task. Use the "+ Create Task" button above or explore these features:
          </p>
          <ul className="text-body text-muted space-y-1" style={{ paddingLeft: 'var(--space-3)' }}>
            <li>✓ <strong>Create Tasks</strong> – Assign work, set due dates, and track status</li>
            <li>✓ <strong>Ball Handoff</strong> – Pass responsibility between departments with notes</li>
            <li>✓ <strong>Collaborate</strong> – Comment on tasks and get notified of updates</li>
            <li>✓ <strong>Track Progress</strong> – View tasks by status, assignee, and priority</li>
          </ul>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard 
          title="Total Tasks" 
          value={totalTasks} 
          loading={statusLoading}
        />
        <SummaryCard 
          title="Overdue" 
          value={overdueCount} 
          loading={overdueLoading}
        />
        <SummaryCard 
          title="In Progress" 
          value={inProgressCount} 
          loading={statusLoading}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <TasksByStatusChart data={statusData} loading={statusLoading} />
        <TasksByAssigneeChart data={assigneeData} loading={assigneeLoading} />
      </div>
      
      <RecentActivityFeed />
    </div>
  );
}
