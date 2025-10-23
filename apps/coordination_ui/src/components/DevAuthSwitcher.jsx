import React, { useState } from 'react';
import { devAuth } from '../services/api';

function DevAuthSwitcher({ onUserChange }) {
  const [currentUser, setCurrentUser] = useState(devAuth.getCurrentUser());
  const [showCustom, setShowCustom] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customId, setCustomId] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const handlePresetChange = (presetKey) => {
    const preset = devAuth.presets[presetKey];
    devAuth.setUser(preset.email, preset.id);
    setCurrentUser(devAuth.getCurrentUser());
    setShowCustom(false);
    window.dispatchEvent(new Event('dev-user-changed'));
    if (onUserChange) onUserChange();
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customEmail && customId) {
      devAuth.setUser(customEmail, customId);
      setCurrentUser(devAuth.getCurrentUser());
      setShowCustom(false);
      window.dispatchEvent(new Event('dev-user-changed'));
      if (onUserChange) onUserChange();
    }
  };

  if (isMinimized) {
    return (
      <div className="dev-banner-minimized">
        <span>🔧 Dev Mode: {currentUser.email.split('@')[0]}</span>
        <button onClick={() => setIsMinimized(false)} className="dev-banner-btn-expand">
          Expand
        </button>
      </div>
    );
  }

  return (
    <div className="dev-banner">
      <div className="dev-banner-header">
        <div>
          <div className="dev-banner-info">
            <strong>🔧 Dev Mode:</strong> {currentUser.email}
          </div>
          <div className="dev-banner-uuid">
            UUID: {currentUser.id}
          </div>
        </div>
        <div className="dev-banner-actions">
          <button onClick={() => setIsMinimized(true)} className="dev-banner-btn">
            Minimize
          </button>
          <button onClick={() => setShowCustom(!showCustom)} className="dev-banner-btn dev-banner-btn-primary">
            {showCustom ? 'Cancel' : 'Custom User'}
          </button>
        </div>
      </div>

      {showCustom ? (
        <form onSubmit={handleCustomSubmit} className="dev-banner-custom-form">
          <div className="dev-banner-input-group">
            <input
              type="email"
              placeholder="Email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              className="dev-banner-input"
            />
            <input
              type="text"
              placeholder="User ID (UUID)"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="dev-banner-input"
            />
          </div>
          <button type="submit" className="btn btn-success">
            Set Custom User
          </button>
        </form>
      ) : (
        <div className="dev-banner-presets">
          {Object.entries(devAuth.presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`dev-banner-preset-btn ${currentUser.email === preset.email ? 'active' : ''}`}
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
