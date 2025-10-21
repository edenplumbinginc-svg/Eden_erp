import React, { useState } from 'react';
import { devAuth } from '../services/api';

function DevAuthSwitcher({ onUserChange }) {
  const [currentUser, setCurrentUser] = useState(devAuth.getCurrentUser());
  const [showCustom, setShowCustom] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customId, setCustomId] = useState('');

  const handlePresetChange = (presetKey) => {
    const preset = devAuth.presets[presetKey];
    devAuth.setUser(preset.email, preset.id);
    setCurrentUser(devAuth.getCurrentUser());
    setShowCustom(false);
    if (onUserChange) onUserChange();
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customEmail && customId) {
      devAuth.setUser(customEmail, customId);
      setCurrentUser(devAuth.getCurrentUser());
      setShowCustom(false);
      if (onUserChange) onUserChange();
    }
  };

  return (
    <div style={{
      background: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '4px',
      padding: '12px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <strong>🔧 Dev Mode:</strong> {currentUser.email}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            UUID: {currentUser.id}
          </div>
        </div>
        <button
          onClick={() => setShowCustom(!showCustom)}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            background: '#ffc107',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showCustom ? 'Cancel' : 'Custom User'}
        </button>
      </div>

      {showCustom ? (
        <form onSubmit={handleCustomSubmit} style={{ marginTop: '12px' }}>
          <div style={{ marginBottom: '8px' }}>
            <input
              type="email"
              placeholder="Email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              style={{ width: '100%', padding: '6px', marginBottom: '8px', fontSize: '13px' }}
            />
            <input
              type="text"
              placeholder="User ID (UUID)"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              style={{ width: '100%', padding: '6px', marginBottom: '8px', fontSize: '13px' }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Set Custom User
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(devAuth.presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                background: currentUser.email === preset.email ? '#007bff' : '#e9ecef',
                color: currentUser.email === preset.email ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {key.toUpperCase()} - {preset.role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DevAuthSwitcher;
