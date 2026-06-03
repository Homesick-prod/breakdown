'use client';

import { useState, useCallback, useRef } from 'react';

export interface UndoRedoOptions {
  isContinuous?: boolean;
}

export function useUndoRedo<T>(initialState: T | (() => T)) {
  const [state, _setState] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const lastPushTimeRef = useRef<number>(0);

  const [historyStatus, setHistoryStatus] = useState({
    canUndo: false,
    canRedo: false
  });

  const setState = useCallback((newValOrFn: T | ((prev: T) => T), options?: UndoRedoOptions) => {
    _setState(prev => {
      const resolved = typeof newValOrFn === 'function'
        ? (newValOrFn as Function)(prev)
        : newValOrFn;

      const limit = 50;
      const now = Date.now();
      const isContinuous = options?.isContinuous ?? false;
      const shouldMerge = isContinuous && (now - lastPushTimeRef.current < 1200) && pastRef.current.length > 0;

      if (shouldMerge) {
        futureRef.current = [];
      } else {
        pastRef.current.push(prev);
        if (pastRef.current.length > limit) {
          pastRef.current.shift();
        }
        futureRef.current = [];
        lastPushTimeRef.current = now;
      }

      setHistoryStatus({
        canUndo: pastRef.current.length > 0,
        canRedo: false
      });

      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current.pop()!;
    _setState(current => {
      futureRef.current.push(current);
      setHistoryStatus({
        canUndo: pastRef.current.length > 0,
        canRedo: futureRef.current.length > 0
      });
      return previous;
    });
    lastPushTimeRef.current = 0;
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    _setState(current => {
      pastRef.current.push(current);
      setHistoryStatus({
        canUndo: pastRef.current.length > 0,
        canRedo: futureRef.current.length > 0
      });
      return next;
    });
    lastPushTimeRef.current = 0;
  }, []);

  return [
    state,
    setState,
    {
      undo,
      redo,
      canUndo: historyStatus.canUndo,
      canRedo: historyStatus.canRedo
    }
  ] as const;
}
