import { useNavigate } from 'react-router-dom';

const ASSIGNEE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export default function TasksByAssigneeChart({ data = [], loading = false }) {
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

  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 10);
  const totalTasks = sortedData.reduce((sum, s) => sum + s.count, 0);

  if (totalTasks === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-3">Tasks by Assignee</h3>
        <div className="text-center py-8 text-muted">
          <div className="text-display mb-2">👥</div>
          <p className="text-body">No assigned tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-3">Tasks by Assignee</h3>
      <div className="space-y-2">
        {sortedData.map((assignee, idx) => {
          const percentage = Math.round((assignee.count / totalTasks) * 100);
          const barWidth = Math.max(5, percentage);
          const color = ASSIGNEE_COLORS[idx % ASSIGNEE_COLORS.length];
          const displayName = assignee.owner === 'unassigned' 
            ? 'Unassigned' 
            : assignee.owner.split('@')[0];
          
          return (
            <div key={assignee.owner} className="mb-3">
              <div className="flex justify-between text-body mb-1">
                <span className="font-medium truncate">{displayName}</span>
                <span className="text-muted font-semibold">{assignee.count}</span>
              </div>
              <div 
                className="w-full bg-surface-variant rounded-lg cursor-pointer hover:bg-surface-variant overflow-hidden transition-colors"
                style={{height: '32px'}}
                onClick={() => {
                  if (assignee.owner !== 'unassigned') {
                    navigate(`/alltasks?bic=${assignee.owner}`);
                  }
                }}
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
        Showing top {sortedData.length} assignee{sortedData.length !== 1 ? 's' : ''} • Click to filter
      </div>
    </div>
  );
}
