import React, { useState } from 'react';
import { useChecklist } from '../hooks/useChecklist';
import PermissionGate from './PermissionGate';
import { useAuth } from '../hooks/AuthProvider';
import { useToaster } from './Toaster';

export default function Checklist({ taskId }) {
  const { items, isLoading, error, addItem, toggleItem, deleteItem, reorderItems } = useChecklist(taskId);
  const { permissions = [] } = useAuth();
  const { push } = useToaster();
  const [newItemLabel, setNewItemLabel] = useState('');
  const [draggedItemId, setDraggedItemId] = useState(null);

  const canWrite = permissions.includes('tasks:checklist:write');
  const canDelete = permissions.includes('tasks:checklist:delete');
  const canRead = permissions.includes('tasks:checklist:read');

  const handleAddItem = async () => {
    if (!newItemLabel.trim()) return;
    
    try {
      await addItem(newItemLabel.trim());
      setNewItemLabel('');
      push('success', 'Checklist item added');
    } catch (err) {
      push('error', err?.response?.data?.error?.message || 'Failed to add item');
    }
  };

  const handleToggle = async (itemId) => {
    try {
      await toggleItem(itemId);
    } catch (err) {
      push('error', err?.response?.data?.error?.message || 'Failed to update item');
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await deleteItem(itemId);
      push('success', 'Checklist item deleted');
    } catch (err) {
      push('error', err?.response?.data?.error?.message || 'Failed to delete item');
    }
  };

  const handleDragStart = (e, itemId) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetItemId) => {
    e.preventDefault();
    
    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      return;
    }

    const draggedIndex = items.findIndex(item => item.id === draggedItemId);
    const targetIndex = items.findIndex(item => item.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItemId(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);

    const newOrder = newItems.map(item => item.id);

    try {
      await reorderItems(newOrder);
    } catch (err) {
      push('error', err?.response?.data?.error?.message || 'Failed to reorder items');
    } finally {
      setDraggedItemId(null);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!canRead) {
    return (
      <div className="space-y-3">
        <div className="font-semibold">Task Checklist</div>
        <div className="text-body text-muted">You don't have permission to view the checklist.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="font-semibold">Task Checklist</div>

      {!canWrite && items.length > 0 && (
        <div className="text-xs text-muted italic">
          📋 View-only: You can view checklist items but cannot modify them
        </div>
      )}

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-body text-red-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-body text-muted">Loading checklist...</div>
      ) : items.length === 0 ? (
        <div className="text-body text-muted">
          {canWrite ? 'No checklist items yet. Add one below!' : 'No checklist items.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              draggable={canWrite}
              onDragStart={(e) => canWrite && handleDragStart(e, item.id)}
              onDragOver={(e) => canWrite && handleDragOver(e)}
              onDrop={(e) => canWrite && handleDrop(e, item.id)}
              className={`
                flex items-start gap-3 p-3 border rounded
                ${canWrite ? 'hover:bg-gray-50 cursor-move' : 'bg-gray-50'}
                ${draggedItemId === item.id ? 'opacity-50' : ''}
                transition-all
              `}
              style={{
                borderColor: 'var(--md-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="flex items-start gap-2 flex-1">
                {canWrite ? (
                  <input
                    type="checkbox"
                    checked={!!item.done}
                    onChange={() => handleToggle(item.id)}
                    className="mt-1"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                ) : (
                  <div 
                    className="mt-1"
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      border: '2px solid var(--md-border)',
                      borderRadius: '4px',
                      backgroundColor: item.done ? 'var(--md-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {item.done && '✓'}
                  </div>
                )}
                
                <div className="flex-1">
                  <div 
                    className={`text-body ${item.done ? 'text-muted' : ''}`}
                    style={item.done ? { textDecoration: 'line-through' } : {}}
                  >
                    {item.label}
                  </div>
                  {item.done && item.done_at && (
                    <div className="text-caption text-muted mt-1">
                      ✓ Completed {formatTimestamp(item.done_at)}
                    </div>
                  )}
                </div>
              </div>

              <PermissionGate perm="tasks:checklist:delete">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-caption px-2 py-1 rounded border hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                  style={{
                    borderColor: 'var(--md-border)',
                    fontSize: '12px'
                  }}
                  title="Delete item"
                >
                  Delete
                </button>
              </PermissionGate>
            </li>
          ))}
        </ul>
      )}

      <PermissionGate 
        perm="tasks:checklist:write"
        fallback={
          items.length === 0 ? (
            <div className="text-xs text-muted italic">
              📋 View-only: You need 'tasks:checklist:write' permission to add items
            </div>
          ) : null
        }
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder="Add checklist item..."
            className="flex-1 border rounded px-3 py-2"
            style={{
              borderColor: 'var(--md-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          <button
            onClick={handleAddItem}
            disabled={!newItemLabel.trim()}
            className="btn btn-primary"
            style={{ padding: '8px 16px' }}
          >
            Add
          </button>
        </div>
      </PermissionGate>
    </div>
  );
}
