import React from "react";
import { Link } from "react-router-dom";

export default function Breadcrumbs({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav style={{ 
      marginBottom: 'var(--space-3)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: 'var(--md-on-surface-variant)'
    }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            {isLast ? (
              <span style={{ color: 'var(--md-on-surface)', fontWeight: 500 }}>
                {item.label}
              </span>
            ) : (
              <>
                <Link 
                  to={item.path}
                  className="text-link hover:underline"
                  style={{ 
                    color: 'var(--md-primary)',
                    textDecoration: 'none'
                  }}
                >
                  {item.label}
                </Link>
                <span style={{ color: 'var(--md-on-surface-variant)', userSelect: 'none' }}>
                  ›
                </span>
              </>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
