import { useNavigate } from 'react-router-dom';
import { getStatusLabel } from '../constants/statusLabels';

const STATUS_COLORS = {
  'done': '#10b981',
  'complete': '#10b981',
  'completed': '#10b981',
  'in_progress': '#3b82f6',
  'todo': '#6b7280',
  'review': '#f59e0b',
  'open': '#f97316',
};

export default function TasksByStatusChart({ data = [], loading = false }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton mb-4" style={{width: '25%', height: '20px'}}></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="mb-3">
            <div className="skeleton" style={{width: '100%', height: '32px'}}></div>
          </div>
        ))}
      </div>
    );
  }

  const totalTasks = data.reduce((sum, s) => sum + s.count, 0);

  if (totalTasks === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-3">Tasks by Status</h3>
        <div className="text-center py-8 text-muted">
          <div className="text-display mb-2">📊</div>
          <p className="text-body">No tasks to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-3">Tasks by Status</h3>
      <div className="space-y-2">
        {data.map(s => {
          const percentage = Math.round((s.count / totalTasks) * 100);
          const barWidth = Math.max(5, percentage);
          const color = STATUS_COLORS[s.status.toLowerCase()] || '#6b7280';
          
          return (
            <div key={s.status} className="mb-3">
              <div className="flex justify-between text-body mb-1">
                <span className="capitalize font-medium">{getStatusLabel(s.status)}</span>
                <span className="text-muted font-semibold">{s.count}</span>
              </div>
              <div 
                className="w-full bg-surface-variant rounded-lg cursor-pointer hover:bg-surface-variant overflow-hidden transition-colors"
                style={{height: '32px'}}
                onClick={() => navigate(`/alltasks?status=${s.status}`)}
              >
                <div 
                  className="rounded-lg transition-all hover:opacity-80 flex items-center justify-end pr-3" 
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                    height: '32px'
                  }}
                >
                  <span className="text-white text-body font-semibold">
                    {percentage}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-caption mt-3">
        Total: {totalTasks} task{totalTasks !== 1 ? 's' : ''} • Click a bar to filter
      </div>
    </div>
  );
}
