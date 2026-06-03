'use client';

import { useEffect } from 'react';

interface Shortcut {
  key: string; // e.g., 's', 'p', 'n', 'z', 'Escape', 'Delete'
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: (e: KeyboardEvent) => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const isUndoRedoShortcut =
        (event.key.toLowerCase() === 'z' || event.code.toLowerCase() === 'keyz' || event.key.toLowerCase() === 'y' || event.code.toLowerCase() === 'keyy') &&
        (event.ctrlKey || event.metaKey);

      if (isInputFocused && !isUndoRedoShortcut) {
        if (event.key.toLowerCase() === 'escape') {
          (document.activeElement as HTMLElement | null)?.blur();
          event.preventDefault();
        }
        return;
      }

      for (const shortcut of shortcuts) {
        const matchesKey =
          event.key.toLowerCase() === shortcut.key.toLowerCase() ||
          event.code.toLowerCase() === shortcut.key.toLowerCase();

        if (!matchesKey) continue;

        const matchesCtrl = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const matchesShift = !!shortcut.shift === event.shiftKey;
        const matchesAlt = !!shortcut.alt === event.altKey;

        if (matchesCtrl && matchesShift && matchesAlt) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
