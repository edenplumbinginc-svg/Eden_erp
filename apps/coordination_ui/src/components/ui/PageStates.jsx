export function Loading({ label = "Loading…" }) {
  return (
    <div data-state="loading" className="card radius-xl" style={{ padding: '16px' }}>
      {label}
    </div>
  );
}

export function Empty({ title = "Nothing here yet", hint, children }) {
  return (
    <div data-state="empty" className="card radius-xl" style={{ padding: '24px', textAlign: 'center' }}>
      <h3>{title}</h3>
      {hint && <p className="muted">{hint}</p>}
      {children && <div style={{ marginTop: '16px' }}>{children}</div>}
    </div>
  );
}

export function ErrorBlock({ title = "Something went wrong", detail, children }) {
  return (
    <div data-state="error" className="card radius-xl" style={{ padding: '24px', textAlign: 'center', borderColor: 'var(--danger)' }}>
      <h3>{title}</h3>
      {detail && <p className="muted">{detail}</p>}
      {children && <div style={{ marginTop: '16px' }}>{children}</div>}
    </div>
  );
}

export function Unauthorized({ title = "You're not authorized", children }) {
  return (
    <div data-state="unauthorized" className="card radius-xl" style={{ padding: '24px', textAlign: 'center' }}>
      <h3>{title}</h3>
      <p className="muted">Try signing in or switching accounts.</p>
      {children && <div style={{ marginTop: '16px' }}>{children}</div>}
    </div>
  );
}

export function NotFound({ title = "Not found", children }) {
  return (
    <div data-state="not_found" className="card radius-xl" style={{ padding: '24px', textAlign: 'center' }}>
      <h3>{title}</h3>
      <p className="muted">The resource could not be located.</p>
      {children && <div style={{ marginTop: '16px' }}>{children}</div>}
    </div>
  );
}
