import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

function TeamOverview() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiService.getUsers();
      setUsers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentColor = (dept) => {
    const colors = {
      'Operations': '#1a73e8',
      'Procurement': '#0f9d58',
      'Accounting': '#f4b400',
      'Service': '#db4437',
      'Estimating': '#7e3af2',
      'Scheduling': '#f97316'
    };
    return colors[dept] || '#6b7280';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Team Overview</h1>
        <p className="text-muted">View and manage team members</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center" style={{ padding: 'var(--space-6)' }}>
            <p className="text-muted">Loading team members...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center" style={{ padding: 'var(--space-6)' }}>
            <p className="text-muted">No team members found</p>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {users.map((user) => (
              <div key={user.id} className="card">
                <div className="flex align-center gap-3 mb-3">
                  <div 
                    className="avatar"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: getDepartmentColor(user.department),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{user.name || user.email}</div>
                    <div className="text-caption text-muted">{user.email}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.department && (
                    <span 
                      className="badge"
                      style={{
                        backgroundColor: getDepartmentColor(user.department) + '20',
                        color: getDepartmentColor(user.department),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      {user.department}
                    </span>
                  )}
                  {user.role && (
                    <span className="badge text-caption">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamOverview;
