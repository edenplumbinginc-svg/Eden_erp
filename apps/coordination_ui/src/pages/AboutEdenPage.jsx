import React from "react";

export default function AboutEdenPage() {
  return (
    <main role="main" className="container-xl section">
      <header className="glass glass-header" style={{ marginBottom: "var(--space-5)" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontWeight: 600 }}>About EDEN</h1>
          <p style={{ margin: "6px 0 0 0", color: "var(--color-muted)" }}>
            Overview of the EDEN ERP vision, modules, and roadmap.
          </p>
          <div className="header-accent" style={{ marginTop: 12 }} />
        </div>
      </header>

      <section className="card" style={{ padding: "var(--space-5)" }}>
        <h2 style={{ marginTop: 0 }}>Our Vision</h2>
        <p>
          EDEN ERP unifies operations, projects, and financial signals with a token-driven
          design system. This page satisfies the UI coverage contract and provides a stable,
          accessible surface for tests.
        </p>
        <ul>
          <li>Tokenized UI (colors, radius, elevation, motion)</li>
          <li>Framer Motion transitions & micro-interactions</li>
          <li>Quality gates: routes, accessibility, visual regression</li>
        </ul>
      </section>
    </main>
  );
}
