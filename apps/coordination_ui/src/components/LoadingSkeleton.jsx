export function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="card">
          <div className="skeleton mb-2" style={{width: '75%', height: '20px'}}></div>
          <div className="skeleton" style={{width: '50%', height: '16px'}}></div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
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

export function SummaryCardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton mb-3" style={{width: '50%', height: '16px'}}></div>
      <div className="skeleton" style={{width: '60px', height: '40px'}}></div>
    </div>
  );
}
