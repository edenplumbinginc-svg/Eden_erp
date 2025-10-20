import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectApi, taskApi } from '../lib/api';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';

export function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    priority: 'normal' as 'normal' | 'high' | 'urgent',
    tags: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (projectId) loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await projectApi.getTasks(projectId);
      setTasks(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) {
      setError('Title is required');
      return;
    }

    try {
      setCreating(true);
      const taskData: any = {
        title: newTask.title,
        priority: newTask.priority,
        status: 'todo'
      };
      
      if (newTask.tags) {
        taskData.tags = newTask.tags.split(',').map(t => t.trim()).filter(Boolean);
      }

      await projectApi.createTask(projectId!, taskData);
      setNewTask({ title: '', priority: 'normal', tags: '' });
      setShowNewTaskModal(false);
      await loadTasks();
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTaskUpdate = async () => {
    await loadTasks();
    const updated = tasks.find(t => t.id === selectedTask?.id);
    if (updated) setSelectedTask(updated);
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <a 
          href="/"
          style={{ color: '#007bff', textDecoration: 'none', fontSize: '14px' }}
        >
          ← Back to Projects
        </a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
          Project Tasks
        </h1>
        <button
          onClick={() => setShowNewTaskModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + New Task
        </button>
      </div>

      {error && (
        <div style={{ 
          backgroundColor: '#fee', 
          color: '#c00', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <p style={{ color: '#666' }}>No tasks yet. Create one to get started!</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              style={{
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
                    {task.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: 
                        task.status === 'done' ? '#d4edda' :
                        task.status === 'in_progress' ? '#fff3cd' :
                        task.status === 'review' ? '#cce5ff' :
                        '#f8f9fa',
                      color:
                        task.status === 'done' ? '#155724' :
                        task.status === 'in_progress' ? '#856404' :
                        task.status === 'review' ? '#004085' :
                        '#495057',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {task.status}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: 
                        task.priority === 'urgent' ? '#f8d7da' :
                        task.priority === 'high' ? '#fff3cd' :
                        '#e2e3e5',
                      color:
                        task.priority === 'urgent' ? '#721c24' :
                        task.priority === 'high' ? '#856404' :
                        '#383d41',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {task.priority}
                    </span>
                    {task.ball_owner_email && (
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#d1ecf1',
                        color: '#0c5460',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        Ball: {task.ball_owner_email}
                      </span>
                    )}
                  </div>
                  {task.tags && task.tags.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {task.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#e9ecef',
                            color: '#495057',
                            borderRadius: '3px',
                            fontSize: '11px'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  placeholder="Enter task title"
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Priority
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTask.tags}
                  onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  placeholder="e.g., backend, urgent, review"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTaskModal(false);
                    setNewTask({ title: '', priority: 'normal', tags: '' });
                  }}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: creating ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: creating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
}