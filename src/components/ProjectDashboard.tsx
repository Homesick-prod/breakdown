'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Film, Upload, Plus, Folder, MoreVertical, Edit2, Copy, FileDown, Trash2, Calendar, Clock, List, Video } from 'lucide-react';
import { exportProject, importProject } from '../utils/file';
import { generateId } from '../utils/id';
import { deleteImage } from '../utils/db'; // Import the deleteImage function
import Footer from './Footer';

// Component to show when there are no projects
function EmptyState({ onCreateProject }) {
  return (
    <div className="text-center py-24">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <Folder className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        Create your first project to manage your shooting schedules and shot lists.
      </p>
      <button
        onClick={onCreateProject}
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Create Your First Project
      </button>
    </div>
  );
}

// Dropdown menu for each project card
function ProjectCardMenu({ project, onEdit, onDuplicate, onExport, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit Details
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button onClick={(e) => { e.stopPropagation(); onExport(); setIsOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// The main dashboard component
export default function ProjectDashboard({ onSelectProject, onCreateProject }) {
  const [projects, setProjects] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const fileInputRef = useRef(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [projectToOpen, setProjectToOpen] = useState(null);

  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    savedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(savedProjects);
  }, []);

  const handleOpenEditModal = (project) => {
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

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    
    try {
      const projectToDelete = projects.find(p => p.id === projectId);

      if (projectToDelete?.data?.shotListData?.shotListItems) {
        console.log("Cleaning up images for deleted project...");
        const imageDeletionPromises = projectToDelete.data.shotListData.shotListItems
          .filter(shot => shot.imageUrl)
          .map(shot => deleteImage(shot.id));
        
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

  const handleDuplicateProject = (project) => {
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

  // --- THIS IS THE CRITICAL FIX ---
  // The function must be async and await the exportProject call.
  const handleExportProject = async (project) => {
    alert("Preparing project for export. This may take a moment...");
    try {
      await exportProject(project);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please check the console for details.");
    }
  };

  const handleImportProject = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const importedProject = await importProject(file);
      const projectExists = projects.some(p => p.id === importedProject.id);
      let updatedProjects;
      if (projectExists) {
        if(window.confirm('A project with this ID already exists. Do you want to overwrite it?')) {
          updatedProjects = projects.map(p => p.id === importedProject.id ? importedProject : p);
        } else {
          e.target.value = null;
          return;
        }
      } else {
        updatedProjects = [...projects, importedProject];
      }
      
      updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(updatedProjects);
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
      alert('Project imported successfully!');
    } catch (error) {
      alert(error.message || 'Import failed. The file may be corrupt or not a valid project file.');
    }
    if (e.target) e.target.value = null;
  };

  return (
    <div className=" min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 opacity-[0.01]" style={{ '--s': '100px', background: 'radial-gradient(100% 50% at 100% 0, #0000, #0004 5%, #797979FF 6% 14%, #ffffff 16% 24%, #797979FF 26% 34%, #ffffff 36% 44%, #797979FF 46% 54%, #ffffff 56% 64%, #797979FF 66% 74%, #ffffff 76% 84%, #797979FF 86% 94%, #0004 95%, #0000), radial-gradient(100% 50% at 0 50%, #0000, #0004 5%, #797979FF 6% 14%, #ffffff 16% 24%, #797979FF 26% 34%, #ffffff 36% 44%, #797979FF 46% 54%, #ffffff 56% 64%, #797979FF 66% 74%, #ffffff 76% 84%, #797979FF 86% 94%, #0004 95%, #0000), radial-gradient(100% 50% at 100% 100%, #0000, #0004 5%, #797979FF 6% 14%, #ffffff 16% 24%, #797979FF 26% 34%, #ffffff 36% 44%, #797979FF 46% 54%, #ffffff 56% 64%, #797979FF 66% 74%, #ffffff 76% 84%, #797979FF 86% 94%, #0004 95%, #0000)', backgroundSize: 'var(--s) calc(2 * var(--s))' }}></div>
      <main className="flex-grow z-2">
        <nav className="w-screen bg-white shadow-sm border-b border-gray-100 fixed">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Film className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-xl font-semibold text-indigo-800">MentalBreakdown</h1>
                  <p className="text-xs text-gray-500">Film Production Suite</p>
                </div>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                <Upload className="w-4 h-4" /> Import Project
              </button>
              <input ref={fileInputRef} type="file" accept=".mbd,.json" onChange={handleImportProject} className="hidden" />
            </div>
          </div>
        </nav>
        <div className="pt-24 z-12 max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Projects</h2>
            <p className="text-gray-600">Manage your shooting schedules and production timelines</p>
          </div>

          {projects.length === 0 ? (
            <EmptyState onCreateProject={() => setShowNewProjectModal(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <button onClick={() => setShowNewProjectModal(true)} className="h-64 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-gray-50 transition-all duration-200 group">
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <span className="text-gray-600 font-medium group-hover:text-indigo-600 transition-colors">Create New Project</span>
                </div>
              </button>
              {projects.map(project => (
                <div key={project.id} onClick={() => setProjectToOpen(project)} className="h-64 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col">
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">{project.name}</h3>
                      <ProjectCardMenu project={project} onEdit={() => handleOpenEditModal(project)} onDuplicate={() => handleDuplicateProject(project)} onExport={() => handleExportProject(project)} onDelete={() => handleDeleteProject(project.id)} />
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">{project.description || 'No description'}</p>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(project.updatedAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Modals */}
      {projectToOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/15 backdrop-blur-sm transition-opacity" onClick={() => setProjectToOpen(null)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Open Project</h3>
              <p className="text-gray-600 mb-6">Choose which editor you want to use for "{projectToOpen.name}".</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => { onSelectProject(projectToOpen, 'shotlist'); setProjectToOpen(null); }} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg transition-all">
                  <List className="w-10 h-10 text-gray-500 mb-3" />
                  <span className="text-sm font-semibold text-gray-800">Shot List</span>
                  <span className="text-xs text-gray-500">Organize all your shots</span>
                </button>
                <button onClick={() => { onSelectProject(projectToOpen, 'schedule'); setProjectToOpen(null); }} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg transition-all">
                  <Video className="w-10 h-10 text-gray-500 mb-3" />
                  <span className="text-sm font-semibold text-gray-800">Shooting Schedule</span>
                  <span className="text-xs text-gray-500">Plan your shooting days</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/15 backdrop-blur-sm transition-opacity" onClick={() => setShowNewProjectModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Create New Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Project Name</label>
                  <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Enter project name" className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Description (Optional)</label>
                  <textarea value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} placeholder="Brief description of your project" rows={3} className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowNewProjectModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">Create Project</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/15 backdrop-blur-sm transition-opacity" onClick={handleCloseEditModal}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Edit Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                  <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} rows={3} className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={handleCloseEditModal} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleUpdateProject} disabled={!editedName.trim()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}