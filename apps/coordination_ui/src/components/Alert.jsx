export default function Alert({ kind="error", children }) {
  const styles = kind === "error"
    ? "error"
    : "status-badge status-active";
  return (
    <div className={`card ${styles}`} style={{padding: 'var(--space-2)'}}>
      {children}
    </div>
  );
}
