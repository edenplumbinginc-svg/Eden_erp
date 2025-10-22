import { useNavigate } from 'react-router-dom';

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
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="mb-3">
            <div className="h-6 bg-gray-200 rounded"></div>
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
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">No tasks to display</p>
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
              <div className="flex justify-between text-sm mb-1.5">
                <span className="capitalize font-medium">{s.status.replace('_', ' ')}</span>
                <span className="text-gray-600 font-semibold">{s.count}</span>
              </div>
              <div 
                className="w-full bg-gray-200 rounded-lg h-8 cursor-pointer hover:bg-gray-300 overflow-hidden transition-colors"
                onClick={() => navigate(`/alltasks?status=${s.status}`)}
              >
                <div 
                  className="h-8 rounded-lg transition-all hover:opacity-80 flex items-center justify-end pr-3" 
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color
                  }}
                >
                  <span className="text-white text-sm font-semibold">
                    {percentage}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 mt-3">
        Total: {totalTasks} task{totalTasks !== 1 ? 's' : ''} • Click a bar to filter
      </div>
    </div>
  );
}
