export default function SummaryCard({ title, value, loading = false }) {
  if (loading) {
    return (
      <div className="card">
        <div className="skeleton mb-3" style={{width: '50%', height: '16px'}}></div>
        <div className="skeleton" style={{width: '60px', height: '40px'}}></div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="text-caption mb-1">{title}</div>
      <div className="text-heading-lg font-bold">{value ?? 0}</div>
    </div>
  );
}
