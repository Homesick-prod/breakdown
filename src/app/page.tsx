'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ProjectDashboard from '../components/ProjectDashboard';
import ShootingScheduleEditor from '../components/ShootingScheduleEditor';

/**
 * The main application component that handles view routing between the
 * project dashboard and the shooting schedule editor.
 */
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);

  // Callback to switch to the editor view when a project is selected
  const handleSelectProject = useCallback((project) => {
    setSelectedProject(project);
    setCurrentView('editor');
  }, []);

  // Callback to switch to the editor view when a new project is created
  const handleCreateProject = useCallback((project) => {
    setSelectedProject(project);
    setCurrentView('editor');
  }, []);

  // Callback to save project data from the editor to localStorage
  const handleSaveProject = useCallback((data) => {
    if (!selectedProject) return;

    const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          data,
          name: data.headerInfo.projectTitle,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });

    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  }, [selectedProject]);

  // Callback to return to the dashboard from the editor
  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedProject(null);
  }, []);

  // Effect to load custom fonts for the application
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    document.body.style.fontFamily = "'Plus Jakarta Sans', 'IBM Plex Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif";
  }, []);


  return (
    <>
      {currentView === 'dashboard' && (
        <ProjectDashboard
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
        />
      )}

      {currentView === 'editor' && selectedProject && (
        <ShootingScheduleEditor
          project={selectedProject}
          onBack={handleBackToDashboard}
          onSave={handleSaveProject}
        />
      )}
    </>
  );
}

export default App;
