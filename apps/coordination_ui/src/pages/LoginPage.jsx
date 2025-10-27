import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthProvider';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: 'var(--space-3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <img src="/logo-eden.svg" alt="EDEN" style={{ height: '36px', width: 'auto', margin: '0 auto var(--space-2)' }} />
          <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 400, color: 'var(--md-on-surface)', marginBottom: 'var(--space-1)' }}>
            Sign in to Eden
          </h1>
          <p className="text-caption" style={{ color: 'var(--md-on-surface-variant)' }}>
            Enter your credentials to continue
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
              autoComplete="current-password"
              disabled={isLoading}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
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
            Don't have an account?{' '}
            <Link to="/signup" className="text-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
