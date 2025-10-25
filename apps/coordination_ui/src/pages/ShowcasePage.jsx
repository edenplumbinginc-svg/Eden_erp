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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Route Showcase</h1>
      <p className="muted">
        Click any route to visually test it. Param routes are inflated to demo values.
      </p>
      <div className="grid-auto">
        {routes.map(({ route, label }) => (
          <Link 
            key={route} 
            to={route} 
            className="card radius-xl" 
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="muted" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
              Route
            </div>
            <div style={{ fontWeight: 600 }}>{label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
