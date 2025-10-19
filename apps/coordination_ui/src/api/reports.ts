export type PriorityRow = { priority: string; count: number };

export async function fetchTasksByPriority(): Promise<PriorityRow[]> {
  const r = await fetch('/api/reports/tasks/priority');
  if (!r.ok) throw new Error(`status ${r.status}`);
  return r.json();
}
