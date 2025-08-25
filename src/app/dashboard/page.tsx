// Filename: app/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Film, Upload, Plus, Folder, MoreVertical, Edit2, Copy, FileDown, Trash2, Calendar, Clock, List, Video } from 'lucide-react';
import { exportProject, importProject } from '../utils/file';
import { generateId } from '../utils/id';
import { deleteImage } from '../utils/db';

// Component to show when there are no projects
function EmptyState({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800 mb-6">
        <Folder className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
      <p className="text-gray-400 mb-8 max-w-sm mx-auto">
        Create your first project to manage your shooting schedules and shot lists.
      </p>
      <button
        onClick={onCreateProject}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Create Your First Project
      </button>
    </div>
  );
}

// Dropdown menu for each project card
function ProjectCardMenu({ 
  project, 
  onEdit, 
  onDuplicate, 
  onExport, 
  onDelete 
}: {
  project: any;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }} 
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Edit Details
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }} 
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onExport(); setIsOpen(false); }} 
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" /> Export
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }} 
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Main dashboard component
export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [projectToOpen, setProjectToOpen] = useState<any>(null);

  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    savedProjects.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(savedProjects);
  }, []);

  const handleOpenEditModal = (project: any) => {
    setEditingProject(project);
    setEditedName(project.name);
    setEditedDescription(project.description || '');
  };

  const handleCloseEditModal = () => setEditingProject(null);

  const handleUpdateProject = () => {
    if (!editingProject || !editedName.trim()) return;
    const updatedProjects = projects.map(p =>
      p.id === editingProject.id ? { ...p, name: editedName, description: editedDescription, updatedAt: new Date().toISOString() } : p
    );
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    handleCloseEditModal();
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProject = {
      id: generateId(),
      name: newProjectName,
      description: newProjectDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        scheduleData: null,
        shotListData: null,
      }
    };
    const updatedProjects = [newProject, ...projects];
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    setNewProjectName('');
    setNewProjectDescription('');
    setShowNewProjectModal(false);
    setProjectToOpen(newProject);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    
    try {
      const projectToDelete = projects.find(p => p.id === projectId);

      if (projectToDelete?.data?.shotListData?.shotListItems) {
        console.log("Cleaning up images for deleted project...");
        const imageDeletionPromises = projectToDelete.data.shotListData.shotListItems
          .filter((shot: any) => shot.imageUrl)
          .map((shot: any) => deleteImage(shot.id));
        
        await Promise.all(imageDeletionPromises);
        console.log("Image cleanup complete.");
      }

      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));

    } catch (error) {
      console.error("Error deleting project and its assets:", error);
      alert("There was an error deleting the project.");
    }
  };

  const handleDuplicateProject = (project: any) => {
    const duplicatedProject = {
      ...project,
      id: generateId(),
      name: `${project.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedProjects = [duplicatedProject, ...projects];
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  };

  const handleExportProject = async (project: any) => {
    alert("Preparing project for export. This may take a moment...");
    try {
      await exportProject(project);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please check the console for details.");
    }
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedProject = await importProject(file);
      const projectExists = projects.some(p => p.id === importedProject.id);
      let updatedProjects;
      if (projectExists) {
        if(window.confirm('A project with this ID already exists. Do you want to overwrite it?')) {
          updatedProjects = projects.map(p => p.id === importedProject.id ? importedProject : p);
        } else {
          e.target.value = '';
          return;
        }
      } else {
        updatedProjects = [...projects, importedProject];
      }
      
      updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(updatedProjects);
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
      alert('Project imported successfully!');
    } catch (error: any) {
      alert(error.message || 'Import failed. The file may be corrupt or not a valid project file.');
    }
    if (e.target) e.target.value = '';
  };

  const handleSelectProject = (project: any, mode: 'shotlist' | 'schedule') => {
    // This would navigate to the appropriate editor
    // For now, we'll use window.location or you can implement proper routing
    window.location.href = `/projects/${project.id}?mode=${mode}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Film className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-xl font-semibold text-white">MentalBreakdown</h1>
                <p className="text-xs text-gray-400">Film Production Suite</p>
              </div>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" /> Import Project
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".mbd,.json" 
              onChange={handleImportProject} 
              className="hidden" 
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Your Projects</h2>
          <p className="text-gray-400">Manage your shooting schedules and production timelines</p>
        </div>

        {projects.length === 0 ? (
          <EmptyState onCreateProject={() => setShowNewProjectModal(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Create New Project Card */}
            <button 
              onClick={() => setShowNewProjectModal(true)} 
              className="h-64 rounded-xl border-2 border-dashed border-gray-600 hover:border-blue-500 hover:bg-gray-800/50 transition-all duration-200 group"
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-full bg-gray-700 group-hover:bg-blue-600/20 flex items-center justify-center mb-3 transition-colors">
                  <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <span className="text-gray-400 font-medium group-hover:text-blue-300 transition-colors">Create New Project</span>
              </div>
            </button>

            {/* Existing Projects */}
            {projects.map(project => (
              <div 
                key={project.id} 
                onClick={() => setProjectToOpen(project)} 
                className="h-64 bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col"
              >
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
                      {project.name}
                    </h3>
                    <ProjectCardMenu 
                      project={project} 
                      onEdit={() => handleOpenEditModal(project)} 
                      onDuplicate={() => handleDuplicateProject(project)} 
                      onExport={() => handleExportProject(project)} 
                      onDelete={() => handleDeleteProject(project.id)} 
                    />
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-3 mb-4">
                    {project.description || 'No description'}
                  </p>
                </div>
                <div className="px-6 py-4 bg-gray-700/50 border-t border-gray-600">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 
                      {new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Project Selection Modal */}
      {projectToOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setProjectToOpen(null)}></div>
            <div className="relative bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-2">Open Project</h3>
              <p className="text-gray-400 mb-6">Choose which editor you want to use for "{projectToOpen.name}".</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => { handleSelectProject(projectToOpen, 'shotlist'); setProjectToOpen(null); }} 
                  className="flex flex-col items-center justify-center p-6 bg-gray-700 hover:bg-blue-600/20 border border-gray-600 hover:border-blue-500 rounded-lg transition-all"
                >
                  <List className="w-10 h-10 text-gray-400 mb-3" />
                  <span className="text-sm font-semibold text-white">Shot List</span>
                  <span className="text-xs text-gray-400">Organize all your shots</span>
                </button>
                <button 
                  onClick={() => { handleSelectProject(projectToOpen, 'schedule'); setProjectToOpen(null); }} 
                  className="flex flex-col items-center justify-center p-6 bg-gray-700 hover:bg-blue-600/20 border border-gray-600 hover:border-blue-500 rounded-lg transition-all"
                >
                  <Video className="w-10 h-10 text-gray-400 mb-3" />
                  <span className="text-sm font-semibold text-white">Shooting Schedule</span>
                  <span className="text-xs text-gray-400">Plan your shooting days</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowNewProjectModal(false)}></div>
            <div className="relative bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Create New Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                  <input 
                    type="text" 
                    value={newProjectName} 
                    onChange={(e) => setNewProjectName(e.target.value)} 
                    placeholder="Enter project name" 
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                  <textarea 
                    value={newProjectDescription} 
                    onChange={(e) => setNewProjectDescription(e.target.value)} 
                    placeholder="Brief description of your project" 
                    rows={3} 
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowNewProjectModal(false)} 
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateProject} 
                  disabled={!newProjectName.trim()} 
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={handleCloseEditModal}></div>
            <div className="relative bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Edit Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                  <input 
                    type="text" 
                    value={editedName} 
                    onChange={(e) => setEditedName(e.target.value)} 
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                  <textarea 
                    value={editedDescription} 
                    onChange={(e) => setEditedDescription(e.target.value)} 
                    rows={3} 
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={handleCloseEditModal} 
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateProject} 
                  disabled={!editedName.trim()} 
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}