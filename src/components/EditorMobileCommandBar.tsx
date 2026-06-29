'use client';

import React, { useState } from 'react';
import { MoreVertical, Redo2, Undo2 } from 'lucide-react';

export type EditorMobileSegment = {
  label: string;
  active: boolean;
  onClick: () => void;
};

export type EditorMobileAction = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
};

type EditorMobileCommandBarProps = {
  status: React.ReactNode;
  segments?: EditorMobileSegment[];
  actions: EditorMobileAction[];
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

export default function EditorMobileCommandBar({
  status,
  segments = [],
  actions,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: EditorMobileCommandBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAction = (action: EditorMobileAction) => {
    if (action.disabled) return;
    setIsMenuOpen(false);
    action.onClick();
  };

  return (
    <div className="editor-mobile-command-bar mobile-only">
      <div className="editor-mobile-command-row">
        {segments.length > 0 && (
          <div className="editor-mobile-segmented" role="tablist">
            {segments.map(segment => (
              <button
                key={segment.label}
                type="button"
                className={`editor-mobile-segment ${segment.active ? 'active' : ''}`}
                onClick={segment.onClick}
                role="tab"
                aria-selected={segment.active}
              >
                {segment.label}
              </button>
            ))}
          </div>
        )}

        <div className="editor-mobile-icon-actions">
          <button
            type="button"
            className="editor-mobile-icon-button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="editor-mobile-icon-button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="editor-mobile-icon-button"
            onClick={() => setIsMenuOpen(prev => !prev)}
            aria-label="Editor actions"
            aria-expanded={isMenuOpen}
            title="Editor actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="editor-mobile-status-row">
        {status}
      </div>

      {isMenuOpen && (
        <div className="editor-mobile-actions-menu">
          {actions.map(action => (
            <button
              key={action.label}
              type="button"
              className={`editor-mobile-action ${action.primary ? 'primary' : ''}`}
              onClick={() => handleAction(action)}
              disabled={action.disabled}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
