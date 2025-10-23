import React, { useState, useRef, useEffect } from 'react';

export default function InlineEdit({ 
  value, 
  onSave, 
  multiline = false,
  className = '',
  displayClassName = '',
  placeholder = 'Click to edit...',
  disabled = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (!multiline) {
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = async () => {
    if (editValue.trim() === value || !editValue.trim()) {
      setIsEditing(false);
      setEditValue(value || '');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue.trim());
      setIsEditing(false);
    } catch (error) {
      setEditValue(value || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && multiline && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (disabled) {
    return (
      <div className={`${displayClassName} ${className}`}>
        {value || placeholder}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div
        className={`inline-edit-display ${displayClassName} ${className} cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors duration-200`}
        onClick={() => setIsEditing(true)}
        title="Click to edit"
      >
        {value || <span className="text-muted italic">{placeholder}</span>}
      </div>
    );
  }

  return (
    <div className={`inline-edit-form ${className}`}>
      {multiline ? (
        <textarea
          ref={inputRef}
          className="input w-full text-body"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          rows={4}
          placeholder={placeholder}
        />
      ) : (
        <input
          ref={inputRef}
          className="input w-full text-body"
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          placeholder={placeholder}
        />
      )}
      <div className="flex gap-2 mt-2">
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={isSaving || !editValue.trim()}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        {multiline && (
          <span className="text-caption text-muted self-center ml-auto">
            Ctrl+Enter to save • Esc to cancel
          </span>
        )}
      </div>
    </div>
  );
}
