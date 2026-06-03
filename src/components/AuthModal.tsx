'use client';

import React, { useState } from 'react';
import { LogIn, X, Loader2 } from 'lucide-react';
import { signInWithGoogle, isFirebaseEnabled } from '../lib/firebase';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
};

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (!isFirebaseEnabled) {
      setError('Firebase configuration is missing or invalid.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      // Don't show cancel error as warning
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="premium-modal animate-scale-in"
        style={{
          width: '100%', maxWidth: '400px', padding: '32px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="btn-ghost"
          style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px', borderRadius: '50%' }}
        >
          <X className="w-4 h-4" />
        </button>

        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogIn className="w-5 h-5 text-[var(--accent-primary)]" />
          Sign In
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
          Connect your projects to your account. This allows you to share links, collaborate, and access your projects from any device.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            marginBottom: '20px',
            lineHeight: '1.4'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn-primary"
          style={{
            width: '100%',
            height: '44px',
            justifyContent: 'center',
            gap: '10px',
            opacity: loading ? 0.8 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.354 0-6.072-2.718-6.072-6.072s2.718-6.072 6.072-6.072c1.46 0 2.8.52 3.853 1.378l3.14-3.14A10.932 10.932 0 0 0 12.24 2c-5.96 0-10.79 4.83-10.79 10.79s4.83 10.79 10.79 10.79c6.19 0 10.79-4.35 10.79-10.79 0-.665-.08-1.3-.23-1.9H12.24z" />
            </svg>
          )}
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ width: '100%', marginTop: '12px', height: '36px', fontSize: '12px', justifyContent: 'center' }}
        >
          Stay in Guest Mode
        </button>
      </div>
    </div>
  );
}
