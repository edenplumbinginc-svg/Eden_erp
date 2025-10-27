import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import '@fontsource-variable/inter'
import App from './App.jsx'
import './index.css'

// Initialize Sentry for frontend error tracking and performance monitoring
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENV || 'development',
    release: import.meta.env.VITE_RELEASE_SHA,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
  
  // Set release tag for build identification
  if (import.meta.env.VITE_RELEASE_SHA) {
    Sentry.setTag("release", import.meta.env.VITE_RELEASE_SHA);
  }
}

const Fallback = () => (
  <div style={{ padding: 16, fontFamily: 'var(--font-sans)', textAlign: 'center', marginTop: '48px' }}>
    <h2>Something went wrong</h2>
    <p>We've logged the issue and will fix it as soon as possible.</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<Fallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)