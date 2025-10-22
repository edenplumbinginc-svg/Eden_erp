import { useEffect, useState } from "react";

export default function Countdown({ target }) {
  const [left, setLeft] = useState(() => new Date(target) - Date.now());
  
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(target) - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  
  if (left <= 0) return <span style={{color: 'var(--md-error)'}}>expired</span>;
  
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  
  return <span>{d ? `${d}d ` : ""}{h}h {m}m {sec}s</span>;
}
