import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { perfApi, adminApi } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

function secondsToHMS(sec) {
  const h = Math.floor(sec / 3600);
  const d = Math.floor(h / 24);
  const hr = h % 24;
  if (d > 0) return `${d}d ${hr}h`;
  return `${h}h`;
}

const Card = ({ title, value, sub }) => (
  <div className="rounded-2xl shadow p-4 border">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="text-2xl font-semibold">{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
  </div>
);

export default function CourtFlowPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['court-flow'], queryFn: perfApi.courtFlow, refetchInterval: 15000 });
  const { data: slaData } = useQuery({ queryKey: ['unack-sla'], queryFn: adminApi.getUnackSla });
  const [sla, setSla] = React.useState('');
  
  React.useEffect(() => { 
    if (slaData?.value_seconds != null) setSla(String(slaData.value_seconds)); 
  }, [slaData]);
  
  const save = useMutation({
    mutationFn: (v) => adminApi.setUnackSla(Number(v)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['unack-sla'] }); },
  });
  
  if (isLoading) return <div className="p-6">Loading court flow…</div>;
  if (error) return <div className="p-6 text-red-600">Failed to load court flow metrics.</div>;

  const items = Array.isArray(data?.items) ? data.items : [];
  const totalUnacked = items.reduce((s, d) => s + (Number(d.unacked) || 0), 0);
  const slowest = [...items].sort((a,b)=> (b.avg_hold_s||0)-(a.avg_hold_s||0))[0];
  const passesIn = items.reduce((s, d) => s + (Number(d.passes_in)||0), 0);
  const ackRate = (() => {
    const acks = items.reduce((s,d)=> s + (Number(d.acks)||0), 0);
    return passesIn ? Math.round((acks / passesIn) * 100) + '%' : '—';
  })();

  const chartData = [...items]
    .sort((a,b)=> (b.avg_hold_s||0)-(a.avg_hold_s||0))
    .map(d => ({ dept: d.dept || '—', avgHrs: Math.round((d.avg_hold_s||0)/3600), unacked: d.unacked||0 }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Court Flow · Department Bottlenecks (30d)</h1>

      <div className="rounded-2xl border shadow p-4">
        <div className="font-medium mb-2">SLA · Unacknowledged Handoff</div>
        <div className="text-sm text-gray-600 mb-3">
          Escalate when a handoff isn't acknowledged within this many <b>seconds</b>.
          Common values: 86400 (24h), 172800 (48h), 259200 (72h).
        </div>
        <div className="flex items-center gap-3">
          <input
            className="px-3 py-2 border rounded w-48"
            type="number"
            min="0"
            value={sla}
            onChange={e => setSla(e.target.value)}
          />
          <button
            className="px-3 py-2 rounded bg-black text-white hover:bg-gray-800"
            onClick={() => save.mutate(sla)}
            disabled={save.isLoading}
          >
            {save.isLoading ? 'Saving…' : 'Save SLA'}
          </button>
          {slaData?.value_seconds != null && (
            <div className="text-xs text-gray-500">
              Current: {slaData.value_seconds}s ({Math.round(slaData.value_seconds/3600)}h)
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Departments" value={items.length} />
        <Card title="Handoffs (30d)" value={passesIn} />
        <Card title="Ack Rate" value={ackRate} sub={`${totalUnacked} unacknowledged`} />
        <Card title="Slowest Dept" value={slowest?.dept || '—'} sub={slowest ? secondsToHMS(slowest.avg_hold_s) + ' avg hold' : ''} />
      </div>

      <div className="rounded-2xl border shadow p-4">
        <div className="font-medium mb-2">Avg Hold Time by Department (hours)</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <XAxis dataKey="dept" angle={-15} textAnchor="end" height={50} />
              <YAxis />
              <Tooltip formatter={(v, n) => n === 'avgHrs' ? [`${v}h`, 'Avg Hold'] : [v, 'Unacked']} />
              <Bar dataKey="avgHrs">
                <LabelList dataKey="avgHrs" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border shadow overflow-x-auto">
        <div className="p-4 bg-[#e3f2fd] rounded-t-2xl font-medium">Department KPIs (30d)</div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-4">Department</th>
              <th className="py-2 px-4">Handoffs In</th>
              <th className="py-2 px-4">Ack'd</th>
              <th className="py-2 px-4">Unack'd</th>
              <th className="py-2 px-4">Avg Hold</th>
              <th className="py-2 px-4">Median</th>
              <th className="py-2 px-4">Max</th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.dept} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4 font-medium">{d.dept || '—'}</td>
                <td className="py-2 px-4">{d.passes_in}</td>
                <td className="py-2 px-4">{d.acks}</td>
                <td className="py-2 px-4">{d.unacked}</td>
                <td className="py-2 px-4">{secondsToHMS(d.avg_hold_s || 0)}</td>
                <td className="py-2 px-4">{secondsToHMS(d.p50_hold_s || 0)}</td>
                <td className="py-2 px-4">{secondsToHMS(d.max_hold_s || 0)}</td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={7} className="py-4 px-4 text-gray-500">No court-flow data in the past 30 days.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
