import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

function Reports() {
  const [reports, setReports] = useState({
    byStatus: [],
    byOwner: [],
    byPriority: [],
    overdue: [],
    activity: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [byStatus, byOwner, byPriority, overdue, activity] = await Promise.all([
        apiService.getTasksByStatus(),
        apiService.getTasksByOwner(),
        apiService.getTasksByPriority(),
        apiService.getOverdueTasks(),
        apiService.getRecentActivity()
      ]);

      setReports({
        byStatus: byStatus.data,
        byOwner: byOwner.data,
        byPriority: byPriority.data,
        overdue: overdue.data,
        activity: activity.data
      });
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading reports...</div>;
  }

  return (
    <div>
      <div className="card">
        <h2>Dashboard Reports</h2>
        <button className="btn btn-primary" onClick={loadReports} style={{ marginBottom: '20px' }}>
          Refresh Reports
        </button>
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <h3>Tasks by Status</h3>
          {reports.byStatus.length === 0 ? (
            <div className="empty-state">No data</div>
          ) : (
            <div>
              {reports.byStatus.map(item => (
                <div key={item.status} className="report-item">
                  <span className="report-label">{item.status}</span>
                  <span className="report-value">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="report-card">
          <h3>Tasks by Owner</h3>
          {reports.byOwner.length === 0 ? (
            <div className="empty-state">No data</div>
          ) : (
            <div>
              {reports.byOwner.map((item, idx) => (
                <div key={idx} className="report-item">
                  <span className="report-label">{item.owner}</span>
                  <span className="report-value">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="report-card">
          <h3>Tasks by Priority</h3>
          {reports.byPriority.length === 0 ? (
            <div className="empty-state">No data</div>
          ) : (
            <div>
              {reports.byPriority.map(item => (
                <div key={item.priority} className="report-item">
                  <span className="report-label">{item.priority}</span>
                  <span className="report-value">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="report-card">
          <h3>Recent Activity (7 days)</h3>
          {reports.activity.length === 0 ? (
            <div className="empty-state">No recent activity</div>
          ) : (
            <div>
              {reports.activity.map((item, idx) => (
                <div key={idx} className="report-item">
                  <span className="report-label">
                    {new Date(item.day).toLocaleDateString()}
                  </span>
                  <span className="report-value">{item.tasks_created} tasks</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {reports.overdue.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#dc3545', marginBottom: '15px' }}>⚠️ Overdue Tasks</h3>
          <div className="task-list">
            {reports.overdue.map(task => (
              <div key={task.id} className="task-item" style={{ borderLeft: '4px solid #dc3545' }}>
                <div className="task-header">
                  <div>
                    <div className="task-title">{task.title}</div>
                    <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                      Project: {task.project_name} | Due: {new Date(task.due_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`priority-badge priority-${task.priority}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="ball-status" style={{ marginTop: '10px' }}>
                  <span>Owner: {task.owner}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;