import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthProvider';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: 'var(--space-3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <img src="/eden-mep-logo.png" alt="EDEN MEP INC" style={{ height: '48px', width: 'auto', margin: '0 auto var(--space-2)' }} />
          <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 400, color: 'var(--md-on-surface)', marginBottom: 'var(--space-1)' }}>
            Create your account
          </h1>
          <p className="text-caption" style={{ color: 'var(--md-on-surface-variant)' }}>
            Sign up to get started with EDEN MEP INC
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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isLoading}
              placeholder="At least 6 characters"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isLoading}
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-3)' }}>
          <Link 
            to="/guest" 
            className="btn"
            style={{ 
              width: '100%', 
              display: 'block', 
              textAlign: 'center',
              backgroundColor: 'var(--md-surface-variant)',
              color: 'var(--md-on-surface-variant)',
              textDecoration: 'none'
            }}
          >
            Continue as Guest
          </Link>
        </div>

        <div style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
          <p className="text-caption" style={{ color: 'var(--md-on-surface-variant)' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
