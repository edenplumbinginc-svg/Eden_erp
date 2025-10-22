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
