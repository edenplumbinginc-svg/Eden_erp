import React, { useState } from 'react';

export default function TagsEditor({ tags = [], onSave, disabled = false }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredTags = Array.isArray(tags) ? tags.filter(t => t && t.trim()) : [];

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    const trimmedTag = newTag.trim().toLowerCase();
    if (filteredTags.includes(trimmedTag)) {
      setNewTag('');
      setIsAdding(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave([...filteredTags, trimmedTag]);
      setNewTag('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    setIsSaving(true);
    try {
      await onSave(filteredTags.filter(t => t !== tagToRemove));
    } catch (error) {
      console.error('Failed to remove tag:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setNewTag('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-body font-medium">Tags:</span>
        {!disabled && !isAdding && (
          <button
            className="text-caption text-primary hover:underline"
            onClick={() => setIsAdding(true)}
            disabled={isSaving}
          >
            + Add Tag
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {filteredTags.length === 0 && !isAdding && (
          <span className="text-caption text-muted italic">No tags yet</span>
        )}

        {filteredTags.map((tag, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-caption border border-blue-300 transition-all hover:bg-blue-200"
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                className="hover:text-red-600 ml-1 font-bold"
                onClick={() => handleRemoveTag(tag)}
                disabled={isSaving}
                title="Remove tag"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {isAdding && (
          <div className="inline-flex items-center gap-2">
            <input
              type="text"
              className="input text-caption px-2 py-1"
              style={{ width: '150px' }}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter tag..."
              autoFocus
              disabled={isSaving}
              maxLength={64}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddTag}
              disabled={isSaving || !newTag.trim()}
            >
              {isSaving ? 'Saving...' : 'Add'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setNewTag('');
                setIsAdding(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="text-caption text-muted">
          Press Enter to add • Esc to cancel
        </div>
      )}
    </div>
  );
}
