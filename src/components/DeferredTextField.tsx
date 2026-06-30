'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

export interface DeferredTextFieldProps {
  value?: string | number | null;
  onCommit: (value: string) => void;
  as?: 'input' | 'textarea';
  commitDelay?: number;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  type?: string;
  rows?: number;
  disabled?: boolean;
  title?: string;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
}

export const DeferredTextField = React.memo(function DeferredTextField({
  value,
  onCommit,
  as = 'input',
  commitDelay = 250,
  ...props
}: DeferredTextFieldProps) {
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const draftRef = useRef(draft);
  const committedRef = useRef(value == null ? '' : String(value));
  const onCommitRef = useRef(onCommit);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    const nextValue = value == null ? '' : String(value);
    committedRef.current = nextValue;
    if (!isFocusedRef.current && nextValue !== draftRef.current) {
      draftRef.current = nextValue;
      setDraft(nextValue);
    }
  }, [value]);

  const clearPendingCommit = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const commit = useCallback((nextValue = draftRef.current) => {
    clearPendingCommit();
    if (nextValue === committedRef.current) return;
    committedRef.current = nextValue;
    onCommitRef.current(nextValue);
  }, [clearPendingCommit]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    draftRef.current = nextValue;
    setDraft(nextValue);
    clearPendingCommit();
    timeoutRef.current = setTimeout(() => commit(nextValue), commitDelay);
  }, [clearPendingCommit, commit, commitDelay]);

  useEffect(() => () => clearPendingCommit(), [clearPendingCommit]);

  const sharedProps = {
    ...props,
    value: draft,
    onChange: handleChange,
    onFocus: (e: any) => {
      isFocusedRef.current = true;
      if (props.onFocus) props.onFocus(e);
    },
    onBlur: (e: any) => {
      isFocusedRef.current = false;
      commit();
      if (props.onBlur) props.onBlur(e);
    },
  };

  return as === 'textarea'
    ? <textarea {...sharedProps as any} />
    : <input {...sharedProps as any} />;
});
