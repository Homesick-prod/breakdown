'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, ArrowUpFromLine } from 'lucide-react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if running in a browser environment
    if (typeof window === 'undefined') return;

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
      dontShowAgain = localStorage.getItem('pwa_dont_show_again') === 'true';
      if (dontShowAgain) {
        return; // Do not show prompt if user checked "Don't show again"
      }
      count = parseInt(localStorage.getItem('pwa_dismiss_count') || '0', 10);
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
    setDismissCount(count);

    // 4. Detect iOS
    const userAgent = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // 5. Listen for beforeinstallprompt event (non-iOS browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 6. Show prompt immediately on enter/load
    setShowPrompt(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDeny = () => {
    const nextCount = dismissCount + 1;
    try {
      localStorage.setItem('pwa_dismiss_count', String(nextCount));
    } catch (e) {
      console.warn("Failed to set localStorage dismiss count:", e);
    }
    setDismissCount(nextCount);
    setShowPrompt(false);
  };

  const handleDontShowAgain = () => {
    try {
      localStorage.setItem('pwa_dont_show_again', 'true');
    } catch (e) {
      console.warn("Failed to set localStorage dont show again:", e);
    }
    setShowPrompt(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        try {
          localStorage.setItem('pwa_dont_show_again', 'true');
        } catch (e) {
          console.warn("Failed to set localStorage dont show again:", e);
        }
        setShowPrompt(false);
      } else {
        handleDeny();
      }
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
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(76, 161, 138, 0.1)',
          position: 'relative',
          color: '#d5d5d5',
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
            color: '#8a8a8a',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#d5d5d5';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#8a8a8a';
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
          background: 'linear-gradient(135deg, rgba(76, 161, 138, 0.2) 0%, rgba(138, 76, 161, 0.2) 100%)',
          border: '1px solid rgba(76, 161, 138, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#4CA18A',
        }}>
          <Smartphone size={36} />
        </div>

        {/* Title & Description */}
        <h3 style={{
          fontSize: '22px',
          fontWeight: 700,
          marginBottom: '10px',
          color: '#ffffff',
          fontFamily: 'var(--font-sans)',
        }}>
          Install MentalBreakdown
        </h3>
        <p style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#8a8a8a',
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
            <p style={{ fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>
              To install on your iOS device:
            </p>
            <ol style={{ margin: 0, paddingLeft: '20px', color: '#8a8a8a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                backgroundColor: '#4CA18A',
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
                boxShadow: '0 4px 12px rgba(76, 161, 138, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5eb69e';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(76, 161, 138, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4CA18A';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 161, 138, 0.3)';
              }}
            >
              <Download size={18} />
              Install Now
            </button>
          )}

          <button
            onClick={handleDeny}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#d5d5d5',
              border: '1px solid rgba(255, 255, 255, 0.1)',
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

          {/* Don't show again option (visible only after 3 dismissals) */}
          {dismissCount >= 3 && (
            <button
              onClick={handleDontShowAgain}
              style={{
                background: 'none',
                border: 'none',
                color: '#8a8a8a',
                fontSize: '12px',
                textDecoration: 'underline',
                cursor: 'pointer',
                marginTop: '8px',
                padding: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8a8a8a'}
            >
              Don't show this again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
