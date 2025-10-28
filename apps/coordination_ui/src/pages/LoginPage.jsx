import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthProvider';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Failed to sign in. Please check your credentials.';
      
      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again or reset your password.';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account before signing in.';
      } else if (err.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${from}`,
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error(`${provider} OAuth error:`, err);
      setError(err.message || `Failed to sign in with ${provider}. Please try again.`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: 'var(--space-3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <img src="/eden-logo.png" alt="EDEN" style={{ height: '48px', width: 'auto', margin: '0 auto var(--space-2)' }} />
          <h1 style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 400, color: 'var(--md-on-surface)', marginBottom: 'var(--space-1)' }}>
            Sign in to EDEN
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
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              onBlur={handleEmailBlur}
              required
              autoFocus
              autoComplete="email"
              disabled={isLoading}
              placeholder="you@example.com"
              style={{ borderColor: emailError ? 'var(--md-error)' : undefined }}
            />
            {emailError && (
              <p style={{ color: 'var(--md-error)', fontSize: '13px', marginTop: 'var(--space-1)' }}>
                {emailError}
              </p>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="text-caption text-link" style={{ fontSize: '13px' }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
                placeholder="Enter your password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }
                }}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                style={{
                  position: 'absolute',
                  right: 'var(--space-1)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: 'var(--space-1)',
                  cursor: isLoading ? 'default' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                  color: 'var(--md-on-surface-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background-color var(--duration-sm) var(--ease-standard)',
                }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'var(--md-surface-variant)')}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !!emailError}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)' }}>
                <span style={{ 
                  border: '2px solid var(--md-on-primary)', 
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  width: '14px',
                  height: '14px',
                  animation: 'spin 0.6s linear infinite',
                  display: 'inline-block'
                }}></span>
                Signing in...
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <div style={{ margin: 'var(--space-3) 0', position: 'relative', textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid var(--md-divider)', position: 'absolute', top: '50%', left: 0, right: 0, zIndex: 0 }}></div>
          <span style={{ 
            backgroundColor: 'var(--md-surface)', 
            padding: '0 var(--space-2)', 
            position: 'relative', 
            zIndex: 1,
            color: 'var(--md-on-surface-variant)',
            fontSize: '13px'
          }}>
            Or continue with
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading}
            className="btn"
            title="Sign in with Google"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--md-surface)',
              border: '1px solid var(--md-divider)',
              padding: 'var(--space-2)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleOAuthSignIn('azure')}
            disabled={isLoading}
            className="btn"
            title="Sign in with Microsoft"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--md-surface)',
              border: '1px solid var(--md-divider)',
              padding: 'var(--space-2)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
              <path d="M0 0h10.937v10.937H0z" fill="#f25022"/>
              <path d="M12.063 0H23v10.937H12.063z" fill="#00a4ef"/>
              <path d="M0 12.063h10.937V23H0z" fill="#7fba00"/>
              <path d="M12.063 12.063H23V23H12.063z" fill="#ffb900"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleOAuthSignIn('apple')}
            disabled={isLoading}
            className="btn"
            title="Sign in with Apple"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--md-surface)',
              border: '1px solid var(--md-divider)',
              padding: 'var(--space-2)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          </button>
        </div>

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
            New to EDEN?{' '}
            <Link to="/signup" className="text-link">
              Create an account
            </Link>
            {' '}· It's free!
          </p>
        </div>
      </div>
    </div>
  );
}
