'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { generateId } from './utils/id';

// Dynamic imports to prevent SSR issues with localStorage
const FilmProductionDashboard = dynamic(() => import('./components/ProjectDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  )
});

// Legacy components for existing functionality
const ShootingScheduleEditor = dynamic(() => import('./components/ShootingScheduleEditor'), {
  ssr: false
});

const ShotListEditor = dynamic(() => import('./components/ShotListEditor'), {
  ssr: false
});

// Types for better type safety
interface Project {
  id: string;
  name: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  lastModified?: string;
  thumbnail?: string | null;
  data: {
    scheduleData: any;
    shotListData: any;
  };
}

interface LegacyProject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  data: {
    scheduleData: any;
    shotListData: any;
  };
}

// Data migration utility
const migrateProjects = (legacyProjects: LegacyProject[]): Project[] => {
  return legacyProjects.map(project => ({
    ...project,
    title: project.name, // Map name to title for the new dashboard
    type: 'Feature Film', // Default type for migrated projects
    status: 'Pre-Production', // Default status
    lastModified: project.updatedAt,
    thumbnail: null
  }));
};

export default function Page() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'legacy'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editorType, setEditorType] = useState<'shotlist' | 'schedule' | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Initialize and migrate data on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if migration has already been completed
        const migrationFlag = localStorage.getItem('dashboardMigrationComplete');
        
        if (!migrationFlag) {
          console.log('Starting data migration...');
          
          // Load legacy projects
          const legacyProjectsJson = localStorage.getItem('shootingScheduleProjects');
          const legacyProjects: LegacyProject[] = legacyProjectsJson ? JSON.parse(legacyProjectsJson) : [];
          
          // Migrate to new format
          const migratedProjects = migrateProjects(legacyProjects);
          
          // Save migrated projects
          localStorage.setItem('filmProductionProjects', JSON.stringify(migratedProjects));
          localStorage.setItem('dashboardMigrationComplete', 'true');
          
          setProjects(migratedProjects);
          console.log(`Migration complete. Migrated ${migratedProjects.length} projects.`);
        } else {
          // Load existing projects
          const projectsJson = localStorage.getItem('filmProductionProjects');
          const existingProjects: Project[] = projectsJson ? JSON.parse(projectsJson) : [];
          setProjects(existingProjects);
        }
        
        setMigrationComplete(true);
      } catch (error) {
        console.error('Error during initialization:', error);
        // Fallback to empty projects array
        setProjects([]);
        setMigrationComplete(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Save projects to localStorage whenever projects state changes
  useEffect(() => {
    if (migrationComplete && projects.length >= 0) {
      localStorage.setItem('filmProductionProjects', JSON.stringify(projects));
      // Also maintain backward compatibility with legacy storage
      const legacyFormat = projects.map(({ title, type, status, lastModified, thumbnail, ...rest }) => ({
        ...rest,
        name: rest.title || rest.name
      }));
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(legacyFormat));
    }
  }, [projects, migrationComplete]);

  const handleCreateProject = (projectData: { title: string; type: string }) => {
    const newProject: Project = {
      id: generateId(),
      name: projectData.title, // For backward compatibility
      title: projectData.title,
      description: '',
      type: projectData.type,
      status: 'Pre-Production',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastModified: new Date().toISOString().split('T')[0],
      thumbnail: null,
      data: {
        scheduleData: null,
        shotListData: null,
      }
    };

    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  const handleSelectProject = (project: Project, editorType?: 'shotlist' | 'schedule') => {
    setSelectedProject(project);
    
    if (editorType) {
      // Open legacy editor directly
      setEditorType(editorType);
      setCurrentView('legacy');
    } else {
      // Open new dashboard
      setCurrentView('dashboard');
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => 
      prev.map(p => 
        p.id === updatedProject.id 
          ? { ...updatedProject, updatedAt: new Date().toISOString() }
          : p
      )
    );
    setSelectedProject(updatedProject);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
      setCurrentView('dashboard');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedProject(null);
    setEditorType(null);
  };

  const handleBackToHub = () => {
    setCurrentView('dashboard');
    setSelectedProject(null);
    setEditorType(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg mb-2">Initializing ProFilm Dashboard</p>
          <p className="text-gray-500 text-sm">Loading your projects...</p>
        </div>
      </div>
    );
  }

  // Legacy editor views
  if (currentView === 'legacy' && selectedProject && editorType) {
    if (editorType === 'shotlist') {
      return (
        <div className="min-h-screen bg-gray-50">
          {/* Legacy Shot List Editor Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToDashboard}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ← Back to Dashboard
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{selectedProject.title}</h1>
                  <p className="text-sm text-gray-500">Shot List Editor</p>
                </div>
              </div>
            </div>
          </div>
          
          <ShotListEditor
            project={selectedProject}
            onUpdateProject={handleUpdateProject}
          />
        </div>
      );
    }

    if (editorType === 'schedule') {
      return (
        <div className="min-h-screen bg-gray-50">
          {/* Legacy Schedule Editor Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToDashboard}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ← Back to Dashboard
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{selectedProject.title}</h1>
                  <p className="text-sm text-gray-500">Shooting Schedule Editor</p>
                </div>
              </div>
            </div>
          </div>
          
          <ShootingScheduleEditor
            project={selectedProject}
            onUpdateProject={handleUpdateProject}
          />
        </div>
      );
    }
  }

  // Main dashboard view
  return (
    <FilmProductionDashboard
      projects={projects}
      onCreateProject={handleCreateProject}
      onSelectProject={handleSelectProject}
      onUpdateProject={handleUpdateProject}
      onDeleteProject={handleDeleteProject}
      onBackToHub={handleBackToHub}
    />
  );
}