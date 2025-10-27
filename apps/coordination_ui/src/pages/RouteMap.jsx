import React from "react";
import { ROUTES } from "../routes.manifest";
import { Link } from "react-router-dom";

export default function RouteMap() {
  const criticalCount = ROUTES.filter(r => r.critical).length;
  const totalCount = ROUTES.length;
  
  return (
    <div className="container-xl">
      <header className="glass glass-header" style={{ marginBottom: "var(--space-5)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(18px, 2vw, 22px)", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text)" }}>
            Route Coverage Map
          </h1>
          <p style={{ margin: "6px 0 0 0", fontSize: "0.92rem", color: "var(--text-muted)" }}>
            {totalCount} routes · {criticalCount} critical · Click any path to test manually
          </p>
          <div className="header-accent" style={{ marginTop: "12px" }} />
        </div>
      </header>

      <div className="section">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "14px 18px", fontWeight: 600, fontSize: "0.875rem" }}>Title</th>
                <th style={{ padding: "14px 18px", fontWeight: 600, fontSize: "0.875rem" }}>Path</th>
                <th style={{ padding: "14px 18px", fontWeight: 600, fontSize: "0.875rem" }}>Owner</th>
                <th style={{ padding: "14px 18px", fontWeight: 600, fontSize: "0.875rem" }}>Priority</th>
                <th style={{ padding: "14px 18px", fontWeight: 600, fontSize: "0.875rem" }}>Test</th>
              </tr>
            </thead>
            <tbody>
              {ROUTES.map((r, idx) => (
                <tr 
                  key={r.path} 
                  style={{ 
                    borderBottom: idx < ROUTES.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background var(--dur-sm) var(--ease-standard)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "14px 18px", fontWeight: 500 }}>{r.title}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <Link 
                      to={r.path} 
                      className="focus-ring" 
                      style={{ 
                        color: "var(--primary)", 
                        textDecoration: "none",
                        fontFamily: "var(--font-mono, 'Monaco', 'Courier New', monospace)",
                        fontSize: "0.875rem"
                      }}
                    >
                      {r.path}
                    </Link>
                  </td>
                  <td style={{ padding: "14px 18px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {r.owner ?? "—"}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: r.critical 
                        ? "color-mix(in hsl, hsl(0 82% 56%) 12%, transparent)" 
                        : "color-mix(in hsl, var(--primary) 12%, transparent)",
                      color: r.critical 
                        ? "hsl(0 82% 46%)" 
                        : "var(--primary)",
                      border: "1px solid var(--border)"
                    }}>
                      {r.critical ? "Critical" : "Standard"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <a 
                      href={r.path}
                      className="focus-ring" 
                      style={{ 
                        display: "inline-block",
                        padding: "6px 12px",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        background: "var(--primary)",
                        color: "white",
                        textDecoration: "none",
                        transition: "all var(--dur-sm) var(--ease-standard)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-600)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "var(--primary)"}
                    >
                      Open →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ marginTop: "var(--space-5)", padding: "var(--space-4)", background: "var(--panel-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <h3 style={{ margin: "0 0 var(--space-2) 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
            💡 Usage
          </h3>
          <ul style={{ margin: 0, paddingLeft: "var(--space-4)", fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            <li>Click any path to manually smoke test the route</li>
            <li>Critical routes are required for core functionality</li>
            <li>Automated smoke tests run via <code style={{ padding: "2px 6px", background: "var(--panel)", borderRadius: "var(--radius-xs)", fontFamily: "var(--font-mono, monospace)" }}>npm run test:routes</code></li>
            <li>Add new routes to <code style={{ padding: "2px 6px", background: "var(--panel)", borderRadius: "var(--radius-xs)", fontFamily: "var(--font-mono, monospace)" }}>src/routes.manifest.ts</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
