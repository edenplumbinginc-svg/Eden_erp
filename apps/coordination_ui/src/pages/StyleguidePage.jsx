import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function StyleguidePage() {
  const [showCode, setShowCode] = useState({});

  const toggleCode = (section) => {
    setShowCode(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const colorTokens = [
    { name: 'Primary', var: '--md-primary', bg: 'bg-primary', text: 'text-white' },
    { name: 'Primary Dark', var: '--md-primary-dark', custom: '#1557b0', text: 'text-white' },
    { name: 'Success', var: '--md-success', custom: '#1e8e3e', text: 'text-white' },
    { name: 'Warning', var: '--md-warning', custom: '#f9ab00', text: 'text-white' },
    { name: 'Error', var: '--md-error', custom: '#d93025', text: 'text-white' },
    { name: 'Surface', var: '--md-surface', bg: 'bg-surface', text: 'text-md-on-surface', border: true },
    { name: 'Background', var: '--md-background', bg: 'bg-background', text: 'text-md-on-surface' },
  ];

  const spacingScale = [
    { name: 'space-1', value: '8px' },
    { name: 'space-2', value: '16px' },
    { name: 'space-3', value: '24px' },
    { name: 'space-4', value: '32px' },
    { name: 'space-5', value: '40px' },
    { name: 'space-6', value: '48px' },
  ];

  const radiusScale = [
    { name: 'radius-sm', value: '4px', class: 'rounded' },
    { name: 'radius-md', value: '8px', class: 'rounded-md' },
    { name: 'radius-lg', value: '12px', class: 'rounded-lg' },
    { name: 'radius-xl', value: '16px', class: 'rounded-lg' },
  ];

  return (
    <div className="min-h-screen p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--md-divider)' }}>
        <div>
          <h1 className="text-3xl font-normal mb-1" style={{ color: 'var(--md-on-surface)' }}>
            Design System
          </h1>
          <p className="text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
            Eden ERP – Material Design Tokens & Components
          </p>
        </div>
        <Link
          to="/"
          className="text-sm hover:underline"
          style={{ color: 'var(--md-primary)' }}
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Token Location */}
      <div className="card">
        <h2 className="text-xl font-medium mb-3">🎨 Design Token System</h2>
        <div className="space-y-2 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
          <p>
            <strong>Primary tokens:</strong> <code className="bg-surface-variant px-2 py-1 rounded text-xs">apps/coordination_ui/src/styles/tokens.css</code>
          </p>
          <p>
            <strong>Material Design vars:</strong> <code className="bg-surface-variant px-2 py-1 rounded text-xs">apps/coordination_ui/src/index.css</code>
          </p>
          <p className="mt-3 text-xs">
            💡 <strong>Pro tip:</strong> Change a color or spacing value in <code>index.css</code> and watch the entire app update instantly.
          </p>
        </div>
      </div>

      {/* Color Palette */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">Color Tokens</h2>
          <button
            onClick={() => toggleCode('colors')}
            className="btn-secondary text-xs px-3 py-1"
          >
            {showCode.colors ? 'Hide' : 'Show'} CSS
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {colorTokens.map((color) => (
            <div key={color.name} className="space-y-2">
              <div
                className={`h-20 ${color.bg || ''} ${color.text} flex items-end p-3 ${color.border ? 'border' : ''}`}
                style={{
                  backgroundColor: color.custom ? color.custom : undefined,
                  borderColor: color.border ? 'var(--md-border)' : undefined
                }}
              >
                <span className="text-xs font-medium">{color.name}</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                <code>var({color.var})</code>
              </div>
            </div>
          ))}
        </div>

        {showCode.colors && (
          <div className="mt-4 p-4 bg-surface-variant rounded-md overflow-x-auto">
            <pre className="text-xs">
{`:root {
  --md-primary: #1a73e8;
  --md-primary-dark: #1557b0;
  --md-success: #1e8e3e;
  --md-warning: #f9ab00;
  --md-error: #d93025;
  
  --md-surface: #ffffff;
  --md-background: #f8f9fa;
}`}
            </pre>
          </div>
        )}
      </div>

      {/* Typography */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">Typography Scale</h2>
          <button
            onClick={() => toggleCode('typography')}
            className="btn-secondary text-xs px-3 py-1"
          >
            {showCode.typography ? 'Hide' : 'Show'} CSS
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-heading-lg">Display Large (32px)</h1>
            <code className="text-xs text-muted">.text-heading-lg</code>
          </div>
          <div>
            <h2 className="text-heading-md">Headline Medium (24px)</h2>
            <code className="text-xs text-muted">.text-heading-md</code>
          </div>
          <div>
            <h3 className="text-heading-sm">Title Small (20px)</h3>
            <code className="text-xs text-muted">.text-heading-sm</code>
          </div>
          <div>
            <p className="text-body">Body text with proper line height (14px)</p>
            <code className="text-xs text-muted">.text-body</code>
          </div>
          <div>
            <p className="text-caption">Caption and helper text (12px)</p>
            <code className="text-xs text-muted">.text-caption</code>
          </div>
        </div>

        {showCode.typography && (
          <div className="mt-4 p-4 bg-surface-variant rounded-md overflow-x-auto">
            <pre className="text-xs">
{`h1 {
  font-size: 24px;
  line-height: 32px;
  font-weight: 400;
}

h2 {
  font-size: 20px;
  line-height: 28px;
  font-weight: 500;
}`}
            </pre>
          </div>
        )}
      </div>

      {/* Spacing System */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">Spacing Scale (8px Grid)</h2>
          <button
            onClick={() => toggleCode('spacing')}
            className="btn-secondary text-xs px-3 py-1"
          >
            {showCode.spacing ? 'Hide' : 'Show'} CSS
          </button>
        </div>

        <div className="space-y-3">
          {spacingScale.map((space) => (
            <div key={space.name} className="flex items-center gap-4">
              <div
                className="bg-primary"
                style={{ width: space.value, height: '24px' }}
              ></div>
              <div className="flex-1">
                <span className="font-medium">{space.name}</span>
                <span className="text-muted ml-2">{space.value}</span>
              </div>
              <code className="text-xs text-muted">var(--{space.name})</code>
            </div>
          ))}
        </div>

        {showCode.spacing && (
          <div className="mt-4 p-4 bg-surface-variant rounded-md overflow-x-auto">
            <pre className="text-xs">
{`:root {
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;
}`}
            </pre>
          </div>
        )}
      </div>

      {/* Border Radius */}
      <div className="card">
        <h2 className="text-xl font-medium mb-4">Border Radius</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {radiusScale.map((radius) => (
            <div key={radius.name} className="space-y-2">
              <div
                className={`h-20 bg-primary ${radius.class}`}
              ></div>
              <div className="text-xs">
                <div className="font-medium">{radius.name}</div>
                <div className="text-muted">{radius.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Elevation (Shadows) */}
      <div className="card">
        <h2 className="text-xl font-medium mb-4">Elevation System</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {['shadow-1', 'shadow-2', 'shadow-3', 'shadow-4'].map((shadow, i) => (
            <div key={shadow} className="space-y-2">
              <div
                className="h-20 bg-surface rounded-md flex items-center justify-center"
                style={{ boxShadow: `var(--md-${shadow})` }}
              >
                <span className="text-caption">Level {i + 1}</span>
              </div>
              <code className="text-xs text-muted">--md-{shadow}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="card">
        <h2 className="text-xl font-medium mb-4">Button Styles</h2>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary">Primary Button</button>
          <button className="btn-secondary">Secondary Button</button>
          <button className="btn-success">Success Button</button>
          <button className="btn-danger">Danger Button</button>
        </div>
        <div className="mt-4 p-4 bg-surface-variant rounded-md">
          <code className="text-xs">
            .btn-primary, .btn-secondary, .btn-success, .btn-danger
          </code>
        </div>
      </div>

      {/* Status Badges */}
      <div className="card">
        <h2 className="text-xl font-medium mb-4">Status Badges</h2>
        <div className="flex flex-wrap gap-3">
          <span className="status-badge status-active">Active</span>
          <span className="status-badge status-open">Open</span>
          <span className="status-badge status-in_progress">In Progress</span>
          <span className="status-badge status-closed">Closed</span>
        </div>
      </div>

      {/* Cards */}
      <div className="card">
        <h2 className="text-xl font-medium mb-4">Card Component</h2>
        <div className="card p-4">
          <h3 className="text-heading-sm mb-2">Example Card</h3>
          <p className="text-body text-muted">
            Cards use elevation shadows, border radius tokens, and spacing scale.
            Hover to see the elevation change.
          </p>
        </div>
      </div>

      {/* Testing Instructions */}
      <div className="card bg-primary-light">
        <h2 className="text-xl font-medium mb-3">🧪 Test Token Changes</h2>
        <div className="space-y-3 text-sm">
          <div>
            <strong>1. Open:</strong> <code className="bg-surface px-2 py-1 rounded text-xs">apps/coordination_ui/src/index.css</code>
          </div>
          <div>
            <strong>2. Change:</strong> <code className="bg-surface px-2 py-1 rounded text-xs">--md-primary: #1a73e8;</code> to <code className="bg-surface px-2 py-1 rounded text-xs">--md-primary: #10b981;</code>
          </div>
          <div>
            <strong>3. Watch:</strong> All primary buttons, links, and accents update instantly across the entire app
          </div>
          <div className="pt-2 border-t mt-3" style={{ borderColor: 'var(--md-divider)' }}>
            <strong>Try spacing:</strong> Change <code className="bg-surface px-2 py-1 rounded text-xs">--space-3: 24px;</code> to <code className="bg-surface px-2 py-1 rounded text-xs">--space-3: 32px;</code> and see all card padding adjust
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8" style={{ color: 'var(--md-on-surface-variant)' }}>
        <p className="text-sm">
          Design tokens provide a single source of truth for all visual styles.
        </p>
        <p className="text-xs mt-2">
          Eden ERP • Material Design 3 • Token-driven Architecture
        </p>
      </div>
    </div>
  );
}
