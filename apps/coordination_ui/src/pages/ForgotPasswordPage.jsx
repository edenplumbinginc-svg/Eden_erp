import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', margin: 'var(--space-3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
            <img src="/eden-logo.png" alt="EDEN" style={{ height: '48px', width: 'auto', margin: '0 auto var(--space-2)' }} />
            <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 400, color: 'var(--md-on-surface)', marginBottom: 'var(--space-1)' }}>
              Check your email
            </h1>
            <p className="text-caption" style={{ color: 'var(--md-on-surface-variant)' }}>
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>

          <div className="success" style={{ marginBottom: 'var(--space-3)' }}>
            Click the link in your email to reset your password. The link will expire in 1 hour.
          </div>

          <Link to="/login" className="btn btn-primary" style={{ width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Back to Login
          </Link>

          <div style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
            <p className="text-caption" style={{ color: 'var(--md-on-surface-variant)' }}>
              Didn't receive an email?{' '}
              <button
                onClick={() => setSuccess(false)}
                className="text-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: 'var(--space-3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <img src="/eden-logo.png" alt="EDEN" style={{ height: '48px', width: 'auto', margin: '0 auto var(--space-2)' }} />
          <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 400, color: 'var(--md-on-surface)', marginBottom: 'var(--space-1)' }}>
            Reset your password
          </h1>
          <p className="text-caption" style={{ color: 'var(--md-on-surface-variant)' }}>
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: 'var(--space-3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              disabled={isLoading}
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
          <Link to="/login" className="text-link">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
