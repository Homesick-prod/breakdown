import React from 'react';
import { Folder, List, Video } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  projectName?: string;
}

export default function BottomNav({ currentView, onNavigate, projectName }: BottomNavProps) {
  return (
    <div className="bottom-nav-container">
      <nav className="bottom-nav">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`bottom-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          aria-label="Dashboard"
        >
          <Folder className="w-5 h-5 bottom-nav-icon" />
          <span className="bottom-nav-label">Dashboard</span>
        </button>

        <button
          onClick={() => onNavigate('scheduleEditor')}
          className={`bottom-nav-item ${currentView === 'scheduleEditor' ? 'active' : ''}`}
          aria-label="Schedule"
        >
          <Video className="w-5 h-5 bottom-nav-icon" />
          <span className="bottom-nav-label">Schedule</span>
        </button>

        <button
          onClick={() => onNavigate('shotListEditor')}
          className={`bottom-nav-item ${currentView === 'shotListEditor' ? 'active' : ''}`}
          aria-label="Shot List"
        >
          <List className="w-5 h-5 bottom-nav-icon" />
          <span className="bottom-nav-label">Shotlist</span>
        </button>
      </nav>
    </div>
  );
}
