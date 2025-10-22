export default function SummaryCard({ title, value, loading = false }) {
  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-3xl font-bold text-gray-900">{value ?? 0}</div>
    </div>
  );
}
