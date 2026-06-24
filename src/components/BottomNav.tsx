import React, { useState, useEffect } from 'react';
import { List, Video, FileText } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  projectName?: string;
}

export default function BottomNav({ currentView, onNavigate, projectName }: BottomNavProps) {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(ios);
    }
  }, []);

  return (
    <div className="bottom-nav-container">
      <nav className="bottom-nav">
        <button
          onClick={() => onNavigate('scriptBreakdown')}
          className={`bottom-nav-item ${currentView === 'scriptBreakdown' ? 'active' : ''}`}
          aria-label="Script Breakdown"
        >
          <FileText className="w-5 h-5 bottom-nav-icon" />
          <span className="bottom-nav-label">Breakdown</span>
        </button>

        <button
          onClick={() => onNavigate('shotListEditor')}
          className={`bottom-nav-item ${currentView === 'shotListEditor' ? 'active' : ''}`}
          aria-label="Shot List"
        >
          <List className="w-5 h-5 bottom-nav-icon" />
          <span className="bottom-nav-label">Shotlist</span>
        </button>

        {isIOS && <div className="bottom-nav-spacer" style={{ flex: 1, height: '100%' }} />}

        <button
          onClick={() => onNavigate('scheduleEditor')}
          className={`bottom-nav-item ${currentView === 'scheduleEditor' ? 'active' : ''}`}
          aria-label="Schedule"
        >
          <Video className="w-5 h-5 bottom-nav-icon" />
          <span className="bottom-nav-label">Schedule</span>
        </button>
      </nav>
    </div>
  );
}
