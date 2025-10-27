import React from "react";
import { ButtonPress } from "./MotionPrimitives";

export default function GlassHeader({ 
  title = "Dashboard", 
  subtitle = "Welcome back. Here's what changed since your last visit.",
  children 
}) {
  return (
    <header className="glass glass-header">
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          margin: 0,
          fontSize: "clamp(18px, 2vw, 22px)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--text)"
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            margin: "6px 0 0 0",
            fontSize: "0.92rem",
            color: "var(--text-muted)"
          }}>
            {subtitle}
          </p>
        )}
        <div className="header-accent" style={{ marginTop: "12px" }} />
      </div>

      {/* Right-side actions */}
      {children}
    </header>
  );
}
