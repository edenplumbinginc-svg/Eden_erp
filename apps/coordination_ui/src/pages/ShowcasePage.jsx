import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function ShowcasePage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../showcase/routes.json')
      .then(m => {
        setRoutes(m.routes || []);
        setLoading(false);
      })
      .catch(() => {
        setRoutes([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div data-state="loading" style={{
        minHeight: '2.5rem',
        padding: 'var(--space-3) var(--space-2)',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(90deg, #ececec, #f7f7f7, #ececec)',
        backgroundSize: '200% 100%',
        animation: 'pulse 1.1s ease-in-out infinite'
      }}>
        Loading showcase…
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-2)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{
          fontSize: 'var(--text-h4)',
          fontWeight: 500,
          color: 'var(--md-on-surface)',
          marginBottom: 'var(--space-2)'
        }}>
          Route Showcase
        </h1>
        <p style={{
          fontSize: 'var(--text-body)',
          color: 'var(--md-on-surface-variant)',
          marginBottom: 'var(--space-3)'
        }}>
          Click any route to navigate and visually test the page. All routes are auto-generated from <code style={{
            backgroundColor: 'var(--md-surface-variant)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9em'
          }}>docs/ui-contract.yaml</code>. Parameterized routes use demo values (e.g., <code style={{
            backgroundColor: 'var(--md-surface-variant)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9em'
          }}>/project/123</code>).
        </p>
        <div style={{
          padding: 'var(--space-2)',
          backgroundColor: 'rgba(26, 115, 232, 0.05)',
          borderLeft: '4px solid var(--md-primary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-caption)',
          color: 'var(--md-on-surface-variant)'
        }}>
          <strong>💡 Tip:</strong> This page provides a single-click visual smoke test for all {routes.length} routes. Perfect for QA and demos!
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-3)'
      }}>
        {routes.map(({ route, label }) => (
          <Link
            key={route}
            to={route}
            style={{
              display: 'block',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--md-outline-variant)',
              backgroundColor: 'var(--md-surface)',
              textDecoration: 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: 'var(--elevation-1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--md-surface-variant)';
              e.currentTarget.style.boxShadow = 'var(--elevation-2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--md-surface)';
              e.currentTarget.style.boxShadow = 'var(--elevation-1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--md-on-surface-variant)',
              marginBottom: 'var(--space-1)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 500
            }}>
              Route
            </div>
            <div style={{
              fontSize: 'var(--text-body)',
              color: 'var(--md-on-surface)',
              fontWeight: 600,
              fontFamily: 'monospace',
              wordBreak: 'break-all'
            }}>
              {label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
