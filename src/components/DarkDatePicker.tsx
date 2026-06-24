'use client';

import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

// ─── Shared trigger styles (matches DarkSelect) ───────────────────────────────

const triggerBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  padding: '6px 12px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  cursor: 'pointer',
  userSelect: 'none',
  outline: 'none',
  minHeight: '34px',
  boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
  textAlign: 'left',
};

// ─── DarkDatePicker ───────────────────────────────────────────────────────────

interface DarkDatePickerProps {
  value: string;           // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

// eslint-disable-next-line react/display-name
const DateTrigger = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void; placeholder?: string }>(
  ({ value, onClick, placeholder }, ref) => (
    <button ref={ref} type="button" onClick={onClick} style={triggerBase}>
      <Calendar size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <span style={{ flex: 1, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value || placeholder || 'Select date'}
      </span>
    </button>
  )
);



export function DarkDatePicker({ value, onChange, placeholder, style }: DarkDatePickerProps) {
  const selected = value ? new Date(value + 'T00:00:00') : null;

  return (
    <div style={{ width: '100%', ...style }}>
      <DatePicker
        selected={selected}
        onChange={(date: Date | null) => {
          if (date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            onChange(`${y}-${m}-${d}`);
          }
        }}
        dateFormat="dd MMM yyyy"
        placeholderText={placeholder || 'Select date'}
        customInput={<DateTrigger placeholder={placeholder || 'Select date'} />}
        popperPlacement="right-start"
        popperClassName="dark-picker-popper"
        calendarClassName="dark-picker-calendar"
        showPopperArrow={false}
        portalId="datepicker-portal"
      />
    </div>
  );
}

// ─── DarkTimePicker ───────────────────────────────────────────────────────────

interface DarkTimePickerProps {
  value: string;           // "HH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  isClearable?: boolean;
}

interface TimeTriggerProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  onClear?: () => void;
}

// eslint-disable-next-line react/display-name
const TimeTrigger = forwardRef<HTMLButtonElement, TimeTriggerProps>(
  ({ value, onClick, placeholder, disabled, onClear }, ref) => {
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClear) onClear();
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          ...triggerBase,
          background: disabled ? 'rgb(255, 255, 255, 0.02)' : 'var(--bg-input)',
          border: disabled ? '1px solid transparent' : '1px solid var(--border-default)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
          position: 'relative',
          paddingRight: onClear && value && !disabled ? '28px' : '12px',
        }}
      >
        <span style={{
          flex: 1,
          color: value ? (disabled ? 'var(--text-muted)' : 'var(--text-primary)') : 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: value ? 600 : 400,
          letterSpacing: '0.02em',
        }}>
          {value || placeholder || '--:--'}
        </span>
        {onClear && value && !disabled && (
          <span
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '10px',
              lineHeight: 1,
              cursor: 'pointer',
              zIndex: 2,
              background: 'transparent',
              transition: 'background-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            ✕
          </span>
        )}
      </button>
    );
  }
);

export function DarkTimePicker({ value, onChange, placeholder, style, disabled, isClearable = true }: DarkTimePickerProps) {
  // Parse "HH:MM" into a Date object for react-datepicker
  const selected = (() => {
    if (!value) return null;
    const [h, m] = value.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const showClear = isClearable && value && !disabled;

  return (
    <div style={{ width: '100%', ...style }}>
      <DatePicker
        selected={selected}
        onChange={(date: Date | null) => {
          if (date) {
            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            onChange(`${h}:${m}`);
          } else {
            onChange('');
          }
        }}
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={15}
        timeCaption=""
        dateFormat="HH:mm"
        timeFormat="HH:mm"
        placeholderText={placeholder || '--:--'}
        customInput={
          <TimeTrigger 
            placeholder={placeholder || '--:--'} 
            disabled={disabled} 
            onClear={showClear ? () => onChange('') : undefined} 
          />
        }
        popperPlacement="right-start"
        popperClassName="dark-picker-popper"
        calendarClassName="dark-picker-calendar dark-picker-time-only"
        showPopperArrow={false}
        disabled={disabled}
        portalId="datepicker-portal"
      />
    </div>
  );
}
