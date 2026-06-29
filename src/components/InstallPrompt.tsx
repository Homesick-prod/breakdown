'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';

const DONT_SHOW_KEY = 'pwa_dont_show_again';
const DISMISS_COUNT_KEY = 'pwa_dismiss_count';
const LEGACY_SNOOZE_UNTIL_KEY = 'pwa_prompt_snooze_until';
const SKIP_SESSIONS_KEY = 'pwa_prompt_skip_sessions';
const SKIP_SESSION_MARKER_KEY = 'pwa_prompt_skip_session_marker';
const SESSION_SHOWN_KEY = 'pwa_prompt_shown_this_session';
const ENTRY_PROMPT_DELAY_MS = 2500;
const ENTRY_PROMPT_WINDOW_MS = 10_000;
const MAYBE_LATER_SKIP_SESSIONS = 2;

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const deferredPromptRef = useRef<any>(null);
  const timeoutRef = useRef<number | null>(null);
  const promptDeadlineRef = useRef(0);

  useEffect(() => {
    // 1. Check if running in a browser environment
    if (typeof window === 'undefined') return;
    promptDeadlineRef.current = Date.now() + ENTRY_PROMPT_WINDOW_MS;

    // 2. Check if already installed (standalone mode)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Do not show prompt if already installed
    }

    // 3. Load counts from localStorage safely
    let dontShowAgain = false;
    let count = 0;
    try {
      dontShowAgain = localStorage.getItem(DONT_SHOW_KEY) === 'true';
      if (dontShowAgain) {
        return; // Do not show prompt if user checked "Don't show again"
      }
      count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10);
      localStorage.removeItem(LEGACY_SNOOZE_UNTIL_KEY);

      const sessionMarker = sessionStorage.getItem(SKIP_SESSION_MARKER_KEY);
      let skipSessions = parseInt(localStorage.getItem(SKIP_SESSIONS_KEY) || '0', 10);
      if (skipSessions > 0 && !sessionMarker) {
        skipSessions -= 1;
        localStorage.setItem(SKIP_SESSIONS_KEY, String(skipSessions));
        sessionStorage.setItem(SKIP_SESSION_MARKER_KEY, 'true');
      }
      if (skipSessions > 0 || sessionStorage.getItem(SKIP_SESSION_MARKER_KEY) === 'true') return;
      if (sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true') return;
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
    setDismissCount(count);

    // 4. Detect iOS
    const userAgent = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const revealPrompt = () => {
      if (dontShowAgain || showPrompt) return;
      if (Date.now() > promptDeadlineRef.current) return;
      if (!ios && !deferredPromptRef.current) return;

      timeoutRef.current = window.setTimeout(() => {
        if (Date.now() > promptDeadlineRef.current) return;
        if (document.hidden) return;
        try {
          sessionStorage.setItem(SESSION_SHOWN_KEY, 'true');
        } catch {}
        setShowPrompt(true);
      }, ENTRY_PROMPT_DELAY_MS);
    };

    // 5. Listen for beforeinstallprompt event (non-iOS browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setDeferredPrompt(e);
      revealPrompt();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (ios) revealPrompt();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [showPrompt]);

  const handleDeny = () => {
    const nextCount = dismissCount + 1;
    try {
      localStorage.setItem(DISMISS_COUNT_KEY, String(nextCount));
      localStorage.setItem(SKIP_SESSIONS_KEY, String(MAYBE_LATER_SKIP_SESSIONS));
      sessionStorage.setItem(SKIP_SESSION_MARKER_KEY, 'true');
    } catch (e) {
      console.warn("Failed to set localStorage dismiss count:", e);
    }
    setDismissCount(nextCount);
    setShowPrompt(false);
  };

  const handleDontShowAgain = () => {
    try {
      localStorage.setItem(DONT_SHOW_KEY, 'true');
    } catch (e) {
      console.warn("Failed to set localStorage dont show again:", e);
    }
    setShowPrompt(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      return;
    }

    const prompt = deferredPrompt || deferredPromptRef.current;

    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        try {
          localStorage.setItem(DONT_SHOW_KEY, 'true');
        } catch (e) {
          console.warn("Failed to set localStorage dont show again:", e);
        }
        setShowPrompt(false);
      } else {
        handleDeny();
      }
      deferredPromptRef.current = null;
      setDeferredPrompt(null);
    } else {
      alert("Please open your browser menu (usually three dots in top-right or browser share button) and select 'Install App' or 'Add to Home screen'.");
    }
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 10, 12, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div 
        className="animate-fade-in-scale"
        style={{
          backgroundColor: '#1e1e24',
          border: '1px solid rgba(76, 161, 138, 0.3)', // accented glowing border
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px var(--accent-glow-sm)',
          position: 'relative',
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}
      >

        {/* Close Button */}
        <button 
          onClick={handleDeny}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={20} />
        </button>

        {/* Icon Header */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, var(--accent-glow) 0%, rgba(138, 76, 161, 0.2) 100%)',
          border: '1px solid var(--border-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--accent-primary)',
        }}>
          <Smartphone size={36} />
        </div>

        {/* Title & Description */}
        <h3 style={{
          fontSize: '22px',
          fontWeight: 700,
          marginBottom: '10px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
        }}>
          Install MentalBreakdown
        </h3>
        <p style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          padding: '0 10px',
        }}>
          Access the Shooting Schedule & Shotlist editor directly from your home screen, with offline support for film sets.
        </p>

        {/* Main Section depending on OS */}
        {isIOS ? (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left',
            fontSize: '13px',
          }}>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
              To install on your iOS device:
            </p>
            <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ listStyleType: 'decimal' }}>
                Tap the <strong>Share</strong> button <Share size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} /> in Safari.
              </li>
              <li style={{ listStyleType: 'decimal' }}>
                Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} />.
              </li>
            </ol>
          </div>
        ) : null}

        {/* Actions */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {!isIOS && (
            <button
              onClick={handleInstall}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#111111',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px var(--accent-glow-sm)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary-h)';
                e.currentTarget.style.boxShadow = '0 6px 16px var(--accent-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px var(--accent-glow-sm)';
              }}
            >
              <Download size={18} />
              Install Now
            </button>
          )}

          <button
            onClick={handleDeny}
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            {isIOS ? 'Close' : 'Maybe Later'}
          </button>

          <button
            onClick={handleDontShowAgain}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginTop: '8px',
              padding: '4px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Don't show this again
          </button>
        </div>
      </div>
    </div>
  );
}
