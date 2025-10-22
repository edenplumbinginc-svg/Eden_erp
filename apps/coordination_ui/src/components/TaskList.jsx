import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

function TaskList({ project, users, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
    assignee_id: '',
    ball_in_court: '',
    due_at: ''
  });

  useEffect(() => {
    loadTasks();
  }, [project.id]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await apiService.getTasksByProject(project.id);
      setTasks(response.data);
    } catch (err) {
      alert('Failed to load tasks: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        assignee_id: formData.assignee_id || null,
        ball_in_court: formData.ball_in_court || null,
        due_at: formData.due_at || null
      };
      await apiService.createTask(project.id, data);
      setFormData({
        title: '',
        description: '',
        priority: 'normal',
        assignee_id: '',
        ball_in_court: '',
        due_at: ''
      });
      setShowCreateForm(false);
      loadTasks();
    } catch (err) {
      alert('Failed to create task: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (task) => {
    const newStatus = prompt('Enter new status (open/in_progress/closed):', task.status);
    if (!newStatus) return;
    try {
      await apiService.updateTask(task.id, { status: newStatus });
      loadTasks();
    } catch (err) {
      alert('Failed to update task: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiService.deleteTask(id);
      loadTasks();
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
    }
  };

  const handleHandoff = async (task) => {
    setSelectedTask(task);
    setShowHandoffModal(true);
  };

  const submitHandoff = async (toUserId, note) => {
    try {
      await apiService.handoffBall(selectedTask.id, {
        from_user_id: selectedTask.ball_in_court || users[0]?.id,
        to_user_id: toUserId,
        note: note
      });
      await apiService.updateTask(selectedTask.id, { ball_in_court: toUserId });
      setShowHandoffModal(false);
      loadTasks();
    } catch (err) {
      alert('Failed to hand off task: ' + err.message);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn btn-secondary" onClick={onBack}>← Back</button>
          <h2>Tasks for {project.name}</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {showCreateForm && (
        <form className="form" onSubmit={handleCreate} style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Task Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Review project proposal"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task details..."
            />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label>Assignee</label>
            <select
              value={formData.assignee_id}
              onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
            >
              <option value="">None</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Ball in Court</label>
            <select
              value={formData.ball_in_court}
              onChange={(e) => setFormData({ ...formData, ball_in_court: e.target.value })}
            >
              <option value="">None</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="datetime-local"
              value={formData.due_at}
              onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <p>No tasks found. Create your first task to get started!</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <div key={task.id} className="task-item">
              <div className="task-header">
                <div>
                  <div className="task-title">{task.title}</div>
                  {task.description && (
                    <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                      {task.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className={`priority-badge priority-${task.priority}`}>
                    {task.priority}
                  </span>
                  <span className={`status-badge status-${task.status}`}>
                    {task.status}
                  </span>
                </div>
              </div>
              
              <div className="ball-handoff">
                <div className="ball-status">
                  <span className="ball-icon">⚽</span>
                  <span>
                    Ball in court: {
                      task.ball_in_court 
                        ? users.find(u => u.id === task.ball_in_court)?.email || 'Unknown'
                        : 'Unassigned'
                    }
                  </span>
                </div>
              </div>

              <div className="actions">
                <button className="btn btn-primary" onClick={() => handleHandoff(task)}>
                  Hand Off Ball
                </button>
                <button className="btn btn-secondary" onClick={() => handleUpdate(task)}>
                  Update Status
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(task.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showHandoffModal && (
        <HandoffModal
          task={selectedTask}
          users={users}
          onSubmit={submitHandoff}
          onClose={() => setShowHandoffModal(false)}
        />
      )}
    </div>
  );
}

function HandoffModal({ task, users, onSubmit, onClose }) {
  const [toUserId, setToUserId] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!toUserId) {
      alert('Please select a user to hand off to');
      return;
    }
    onSubmit(toUserId, note);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Hand Off Task</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <p style={{ marginBottom: '15px' }}>
            Handing off: <strong>{task.title}</strong>
          </p>
          <div className="form-group">
            <label>Hand off to:</label>
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              required
            >
              <option value="">Select a user...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Note (optional):</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any context for the handoff..."
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-success">Hand Off</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskList;