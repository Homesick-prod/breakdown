'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ProjectDashboard from '@/components/ProjectDashboard';
import ShootingScheduleEditor from '@/components/ShootingScheduleEditor';
import ShotListEditor from '@/components/ShotListEditor';

/**
 * The main application component that handles view routing between the
 * project dashboard and the different editors.
 */
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);

  // Callback to switch to an editor view when a project is selected
  const handleSelectProject = useCallback((project, editorType) => {
    setSelectedProject(project);
    if (editorType === 'schedule') {
      setCurrentView('scheduleEditor');
    } else if (editorType === 'shotlist') {
      setCurrentView('shotListEditor');
    }
  }, []);

  // Callback to handle new project creation
  const handleCreateProject = useCallback((project) => {
    // The dashboard now handles asking the user which editor to open,
    // so this function can be simplified or removed if the dashboard
    // directly calls handleSelectProject. For now, we keep it clean.
    // The logic is now in the dashboard's handleCreateProject and the subsequent modal.
  }, []);

  // Callback to save project data from an editor to localStorage
  const handleSaveProject = useCallback((data) => {
    if (!selectedProject) return;

    const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        // Deep merge the new data with existing data
        const updatedData = {
          ...p.data,
          ...data
        };
        
        // Update project name from schedule header if available
        const projectName = data.scheduleData?.headerInfo?.projectTitle || p.name;

        return {
          ...p,
          data: updatedData,
          name: projectName,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });

    // Update the state of the selected project as well to reflect changes immediately
    const updatedSelectedProject = updatedProjects.find(p => p.id === selectedProject.id);
    if (updatedSelectedProject) {
      setSelectedProject(updatedSelectedProject);
    }

    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  }, [selectedProject]);

  // Callback to return to the dashboard from an editor
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

      {currentView === 'scheduleEditor' && selectedProject && (
        <ShootingScheduleEditor
          project={selectedProject}
          onBack={handleBackToDashboard}
          onSave={handleSaveProject}
        />
      )}

      {currentView === 'shotListEditor' && selectedProject && (
        <ShotListEditor
          project={selectedProject}
          onBack={handleBackToDashboard}
          onSave={handleSaveProject}
        />
      )}
    </>
  );
}

export default App;
