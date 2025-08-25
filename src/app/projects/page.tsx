'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Film, Plus, Folder, Calendar, Clock, MoreVertical, 
  Edit2, Copy, FileDown, Trash2, Search, Filter,
  Sparkles, TrendingUp, Activity, FolderPlus
} from 'lucide-react';
import { 
  getAllProjects, 
  createNewProject, 
  updateProjectMetadata, 
  duplicateProject, 
  deleteProject,
  getProjectStats,
  ProjectSummary 
} from '@/lib/project-data';

// Project card menu dropdown component
function ProjectCardMenu({ 
  project, 
  onEdit, 
  onDuplicate, 
  onExport, 
  onDelete 
}: {
  project: ProjectSummary;
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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-200"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
          <button 
            onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              onEdit(); 
              setIsOpen(false); 
            }} 
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Edit2 className="w-4 h-4" /> Edit Details
          </button>
          <button 
            onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              onDuplicate(); 
              setIsOpen(false); 
            }} 
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button 
            onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              onExport(); 
              setIsOpen(false); 
            }} 
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <FileDown className="w-4 h-4" /> Export
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button 
            onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              onDelete(); 
              setIsOpen(false); 
            }} 
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Empty state when no projects exist
function EmptyState({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="relative mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
          <Folder className="w-12 h-12 text-indigo-400" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-6 h-6 text-amber-400" />
        </div>
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-2">Ready to create something amazing?</h3>
      <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
        Start your first film production project and manage everything from shooting schedules to shot lists in one beautiful interface.
      </p>
      <button
        onClick={onCreateProject}
        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <FolderPlus className="w-5 h-5" />
        Create Your First Project
      </button>
    </div>
  );
}

// Create project modal
function CreateProjectModal({ 
  isOpen, 
  onClose, 
  onCreateProject 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onCreateProject: (name: string, description: string) => void; 
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreateProject(name.trim(), description.trim());
    setName('');
    setDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
          onClick={onClose}
        />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 mb-4">
              <Film className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">Create New Project</h3>
            <p className="text-gray-500 mt-2">Start a new film production project</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-700"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your project"
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all text-gray-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Projects Hub Page
export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [stats, setStats] = useState(getProjectStats());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const loadedProjects = getAllProjects();
    setProjects(loadedProjects);
    setStats(getProjectStats());
  };

  const handleCreateProject = (name: string, description: string) => {
    createNewProject(name, description);
    loadProjects();
    setShowCreateModal(false);
  };

  const handleEditProject = (project: ProjectSummary) => {
    setEditingProject(project);
    setEditedName(project.name);
    setEditedDescription(project.description || '');
  };

  const handleUpdateProject = () => {
    if (!editingProject || !editedName.trim()) return;
    
    updateProjectMetadata(editingProject.id, {
      name: editedName.trim(),
      description: editedDescription.trim()
    });
    
    loadProjects();
    setEditingProject(null);
  };

  const handleDuplicateProject = (project: ProjectSummary) => {
    duplicateProject(project.id);
    loadProjects();
  };

  const handleExportProject = async (project: ProjectSummary) => {
    // Placeholder for export functionality
    alert(`Export functionality for "${project.name}" would be implemented here`);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    
    deleteProject(projectId);
    loadProjects();
  };

  // Filter projects based on search term
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div 
          className="w-full h-full" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #4f46e5 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-100 bg-white/80 backdrop-blur-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Film className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Your Projects
                    </h1>
                    <p className="text-gray-500 text-sm">Manage your film productions</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all w-64"
                  />
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 duration-200"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Dashboard */}
          {projects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Projects</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalProjects}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Folder className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Schedules</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.projectsWithSchedules}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Shot Lists</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.projectsWithShotLists}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projects Grid */}
          {filteredProjects.length === 0 && searchTerm === '' ? (
            <EmptyState onCreateProject={() => setShowCreateModal(true)} />
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No projects found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Create New Project Card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-72 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-300 group"
              >
                <div className="flex flex-col items-center justify-center h-full p-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-indigo-100 group-hover:to-purple-100 flex items-center justify-center mb-4 transition-all duration-300 transform group-hover:scale-110">
                    <Plus className="w-8 h-8 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <span className="text-lg font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors mb-2">
                    Create New Project
                  </span>
                  <span className="text-sm text-gray-500 text-center leading-relaxed">
                    Start a new film production with scheduling and shot planning
                  </span>
                </div>
              </button>

              {/* Project Cards */}
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group"
                >
                  <div className="h-72 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col transform hover:scale-[1.02]">
                    {/* Card Header */}
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                          <Film className="w-6 h-6 text-white" />
                        </div>
                        <ProjectCardMenu
                          project={project}
                          onEdit={() => handleEditProject(project)}
                          onDuplicate={() => handleDuplicateProject(project)}
                          onExport={() => handleExportProject(project)}
                          onDelete={() => handleDeleteProject(project.id)}
                        />
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors mb-2">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                        {project.description || 'No description provided'}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(project.updatedAt || project.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          