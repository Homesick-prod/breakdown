'use client';

import React from 'react';
import { Github, Clapperboard } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      padding: '18px 0',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 14  px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                MentalBreakdown
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                ©{new Date().getFullYear()} &middot; V.2.3.5.1 (Beta) &middot; by Tawich P.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a
              href="https://github.com/Homesick-prod/breakdown"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', color: 'var(--text-muted)',
                textDecoration: 'none', transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Github style={{ width: '16px', height: '16px' }} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
