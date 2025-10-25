import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/AuthProvider';

export default function ProfilePage() {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    title: '',
    avatar_url: '',
    timezone: '',
    locale: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/me/profile', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setProfile(data);
      setFormData({
        phone: data.phone || '',
        title: data.title || '',
        avatar_url: data.avatar_url || '',
        timezone: data.timezone || '',
        locale: data.locale || '',
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Only send changed fields
    const changes = {};
    Object.keys(formData).forEach(key => {
      const newValue = formData[key];
      const oldValue = profile?.[key] || '';
      if (newValue !== oldValue) {
        changes[key] = newValue;
      }
    });

    if (Object.keys(changes).length === 0) {
      setSuccess('No changes to save');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setSuccess('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" style={{ padding: 'var(--space-4)' }}>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p className="text-caption" style={{ textAlign: 'center', color: 'var(--md-on-surface-variant)' }}>
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ padding: 'var(--space-4)' }}>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 400, color: 'var(--md-on-surface)', marginBottom: 'var(--space-1)' }}>
            Edit Profile
          </h1>
          <p className="text-caption" style={{ color: 'var(--md-on-surface-variant)' }}>
            Update your personal information
          </p>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: 'var(--space-3)' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            padding: 'var(--space-2) var(--space-3)', 
            marginBottom: 'var(--space-3)',
            backgroundColor: 'var(--md-success-container)',
            color: 'var(--md-on-success-container)',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={profile?.email || ''}
              disabled
              style={{ backgroundColor: 'var(--md-surface-container-low)' }}
            />
            <p className="text-caption" style={{ color: 'var(--md-on-surface-variant)', marginTop: 'var(--space-1)' }}>
              Email cannot be changed
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={profile?.name || ''}
              disabled
              style={{ backgroundColor: 'var(--md-surface-container-low)' }}
            />
            <p className="text-caption" style={{ color: 'var(--md-on-surface-variant)', marginTop: 'var(--space-1)' }}>
              Name is managed by admin
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={saving}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="form-group">
            <label htmlFor="title">Job Title</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              disabled={saving}
              placeholder="e.g., Project Manager"
            />
          </div>

          <div className="form-group">
            <label htmlFor="avatar_url">Avatar URL</label>
            <input
              id="avatar_url"
              type="url"
              name="avatar_url"
              value={formData.avatar_url}
              onChange={handleChange}
              disabled={saving}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <input
              id="timezone"
              type="text"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              disabled={saving}
              placeholder="America/New_York"
            />
          </div>

          <div className="form-group">
            <label htmlFor="locale">Locale</label>
            <input
              id="locale"
              type="text"
              name="locale"
              value={formData.locale}
              onChange={handleChange}
              disabled={saving}
              placeholder="en-US"
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={saving}
              onClick={fetchProfile}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
