import React from 'react';
import SummaryCards from '../../components/admin/SummaryCards';
import PolicyTable from '../../components/admin/PolicyTable';
import ExecutionHistory from '../../components/admin/ExecutionHistory';

export default function DecisionsPage() {
  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '400', marginBottom: '8px' }}>
          Admin · Automation Decisions
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginTop: '0' }}>
          Manage decision policies, toggle DRY_RUN mode, and view execution history.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SummaryCards />
        <PolicyTable />
        <ExecutionHistory />
      </div>
    </div>
  );
}
