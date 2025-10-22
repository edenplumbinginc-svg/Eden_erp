export default function Alert({ kind="error", children }) {
  const styles = kind === "error"
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-green-50 text-green-700 border-green-200";
  return (
    <div className={`border rounded px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}
