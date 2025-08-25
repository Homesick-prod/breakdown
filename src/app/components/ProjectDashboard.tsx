import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Film, Plus, Search, Filter, Calendar, Clock, Users, FileText, 
  Camera, Map, DollarSign, Clipboard, MoreVertical, Edit2, Copy, 
  FileDown, Trash2, Settings, Bell, User, Folder, Upload,
  ChevronDown, ChevronRight, Sparkles, Lock, Menu, X, Save, List, Video
} from 'lucide-react';
import ShootingScheduleEditor from './ShootingScheduleEditor';
import ShotListEditor from './ShotListEditor';

// Design System Components (Updated for Light Theme)
const Button = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500 border border-gray-300",
    ghost: "text-gray-700 hover:bg-gray-100 focus:ring-indigo-500"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-sm rounded-lg",
    lg: "px-6 py-3 text-base rounded-lg"
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, className = '', ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-800">{label}</label>}
    <input
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${className}`}
      {...props}
    />
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black/15 backdrop-blur-sm transition-opacity" 
          onClick={onClose}
        />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
};

const Tooltip = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

// Legacy Component Integration Wrappers
const ShootingScheduleWrapper = ({ project, onSave, onBack }) => {
  const handleSave = (data) => {
    onSave(data);
    // Update localStorage for backward compatibility
    const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    const updatedProjects = projects.map(p => 
      p.id === project.id 
        ? { ...p, data: { ...p.data, scheduleData: data }, updatedAt: new Date().toISOString() }
        : p
    );
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  };

  return (
      <ShootingScheduleEditor
    project={project}
    onBack={onBack}
    onSave={handleSave}
  />
  );
};

const ShotListWrapper = ({ project, onSave, onBack }) => {
  const handleSave = (data) => {
    onSave(data);
    // Update localStorage for backward compatibility
    const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    const updatedProjects = projects.map(p => 
      p.id === project.id 
        ? { ...p, data: { ...p.data, shotListData: data }, updatedAt: new Date().toISOString() }
        : p
    );
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  };

  return (
      <ShotListEditor
    project={project}
    onBack={onBack}
    onSave={handleSave}
  />
  );
};

// Project Hub Component (Matching your original design)
const ProjectHub = ({ onSelectProject, onCreateProject }) => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectType, setNewProjectType] = useState('Feature Film');
  const [editingProject, setEditingProject] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [projectToOpen, setProjectToOpen] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    savedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(savedProjects.map(p => ({
      ...p,
      status: p.status || 'Pre-Production',
      type: p.type || 'Feature Film'
    })));
  }, []);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    
    const newProject = {
      id: Date.now().toString(),
      name: newProjectName,
      description: newProjectDescription,
      type: newProjectType,
      status: 'Pre-Production',
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
    
    setShowCreateModal(false);
    setNewProjectName('');
    setNewProjectDescription('');
    setProjectToOpen(newProject);
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    
    try {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("There was an error deleting the project.");
    }
  };

  const handleDuplicateProject = (project) => {
    const duplicatedProject = {
      ...project,
      id: Date.now().toString(),
      name: `${project.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedProjects = [duplicatedProject, ...projects];
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setEditedName(project.name);
    setEditedDescription(project.description || '');
  };

  const handleUpdateProject = () => {
    if (!editingProject || !editedName.trim()) return;
    const updatedProjects = projects.map(p =>
      p.id === editingProject.id ? { ...p, name: editedName, description: editedDescription, updatedAt: new Date().toISOString() } : p
    );
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    setEditingProject(null);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Project Card Menu Component
  const ProjectCardMenu = ({ project, onEdit, onDuplicate, onExport, onDelete }) => {
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 relative overflow-hidden flex flex-col">
      {/* Background Pattern (matching your original) */}
      <div className="absolute inset-0 opacity-[0.01]" style={{ '--s': '100px', background: 'radial-gradient(100% 50% at 100% 0, #0000, #0004 5%, #797979FF 6% 14%, #ffffff 16% 24%, #797979FF 26% 34%, #ffffff 36% 44%, #797979FF 46% 54%, #ffffff 56% 64%, #797979FF 66% 74%, #ffffff 76% 84%, #797979FF 86% 94%, #0004 95%, #0000), radial-gradient(100% 50% at 0 50%, #0000, #0004 5%, #797979FF 6% 14%, #ffffff 16% 24%, #797979FF 26% 34%, #ffffff 36% 44%, #797979FF 46% 54%, #ffffff 56% 64%, #797979FF 66% 74%, #ffffff 76% 84%, #797979FF 86% 94%, #0004 95%, #0000), radial-gradient(100% 50% at 100% 100%, #0000, #0004 5%, #797979FF 6% 14%, #ffffff 16% 24%, #797979FF 26% 34%, #ffffff 36% 44%, #797979FF 46% 54%, #ffffff 56% 64%, #797979FF 66% 74%, #ffffff 76% 84%, #797979FF 86% 94%, #0004 95%, #0000)', backgroundSize: 'var(--s) calc(2 * var(--s))' }}></div>
      
      <main className="flex-grow z-2">
        {/* Header (matching your original) */}
        <nav className="w-screen bg-white shadow-sm border-b border-gray-100 fixed">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Film className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-xl font-semibold text-indigo-800">FilmForge Pro</h1>
                  <p className="text-xs text-gray-500">Enterprise Production Suite</p>
                </div>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                <Upload className="w-4 h-4" /> Import Project
              </button>
              <input ref={fileInputRef} type="file" accept=".mbd,.json" className="hidden" />
            </div>
          </div>
        </nav>

        <div className="pt-24 z-12 max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Projects</h2>
            <p className="text-gray-600">Manage your shooting schedules and production timelines</p>
          </div>

          {/* Enhanced Controls */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Status</option>
                <option value="Pre-Production">Pre-Production</option>
                <option value="In Production">In Production</option>
                <option value="Post-Production">Post-Production</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 && projects.length === 0 ? (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
                <Folder className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                Create your first project to manage your shooting schedules and shot lists.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Create New Project Card */}
              <button onClick={() => setShowCreateModal(true)} className="h-64 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-gray-50 transition-all duration-200 group">
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <span className="text-gray-600 font-medium group-hover:text-indigo-600 transition-colors">Create New Project</span>
                </div>
              </button>

              {/* Project Cards */}
              {filteredProjects.map(project => (
                <div key={project.id} onClick={() => setProjectToOpen(project)} className="h-64 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col">
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">{project.name}</h3>
                      <ProjectCardMenu 
                        project={project} 
                        onEdit={() => handleEditProject(project)} 
                        onDuplicate={() => handleDuplicateProject(project)} 
                        onExport={() => {}} 
                        onDelete={() => handleDeleteProject(project.id)} 
                      />
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
                <button 
                  onClick={() => { onSelectProject(projectToOpen, 'workspace'); setProjectToOpen(null); }} 
                  className="col-span-2 flex flex-col items-center justify-center p-6 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 rounded-lg transition-all"
                >
                  <Settings className="w-10 h-10 text-indigo-600 mb-3" />
                  <span className="text-sm font-semibold text-indigo-800">Full Workspace</span>
                  <span className="text-xs text-indigo-600">Access all production modules</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Project">
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Enter project name"
            autoFocus
          />
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-800">Project Type</label>
            <select
              value={newProjectType}
              onChange={(e) => setNewProjectType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Feature Film">Feature Film</option>
              <option value="Short Film">Short Film</option>
              <option value="Commercial">Commercial</option>
              <option value="Music Video">Music Video</option>
              <option value="Documentary">Documentary</option>
              <option value="Web Series">Web Series</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-800">Description (Optional)</label>
            <textarea 
              value={newProjectDescription} 
              onChange={(e) => setNewProjectDescription(e.target.value)} 
              placeholder="Brief description of your project" 
              rows={3} 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" 
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
            Create Project
          </Button>
        </div>
      </Modal>

      {editingProject && (
        <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">
          <div className="space-y-4">
            <Input
              label="Project Name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              autoFocus
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800">Description (Optional)</label>
              <textarea 
                value={editedDescription} 
                onChange={(e) => setEditedDescription(e.target.value)} 
                rows={3} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" 
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProject} disabled={!editedName.trim()}>
              Save Changes
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Project Workspace Component
const ProjectWorkspace = ({ project, onBack }) => {
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');

  const navigationItems = [
    {
      title: 'SCRIPT',
      items: [
        { id: 'script-editor', label: 'Script Editor', icon: FileText, locked: true, type: 'development' },
        { id: 'script-breakdown', label: 'Script Breakdown', icon: FileText, locked: false }
      ]
    },
    {
      title: 'PLANNING',
      items: [
        { id: 'shot-list', label: 'Shot List', icon: Camera, locked: false },
        { id: 'storyboard', label: 'Storyboard', icon: Camera, locked: true, type: 'development' },
        { id: 'budgeting', label: 'Budgeting', icon: DollarSign, locked: true, type: 'development' },
        { id: 'contacts', label: 'Contact Management', icon: Users, locked: false }
      ]
    },
    {
      title: 'SCHEDULING',
      items: [
        { id: 'shooting-schedule', label: 'Shooting Schedule', icon: Calendar, locked: false },
        { id: 'calendar', label: 'Calendar', icon: Calendar, locked: true, type: 'development' }
      ]
    },
    {
      title: 'ON-SET',
      items: [
        { id: 'call-sheets', label: 'Call Sheets', icon: Clipboard, locked: true, type: 'development' },
        { id: 'digital-binder', label: 'Digital Binder', icon: Folder, locked: true, type: 'development' }
      ]
    }
  ];

  const handleSaveProject = useCallback((data) => {
    if (!project) return;

    setSaveStatus('saving');
    
    try {
      const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
      const updatedProjects = projects.map(p => {
        if (p.id === project.id) {
          const updatedData = {
            ...p.data,
            ...data
          };
          
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

      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
      setSaveStatus('saved');
      
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
    }
  }, [project]);

  const renderModuleContent = () => {
    switch (currentModule) {
      case 'dashboard':
        return <ProjectDashboardModule project={project} />;
      case 'script-breakdown':
        return <ScriptBreakdownModule project={project} />;
      case 'shot-list':
        return <ShotListModule project={project} onSave={handleSaveProject} onBack={onBack} />;
      case 'contacts':
        return <ContactsModule project={project} />;
      case 'shooting-schedule':
        return <ShootingScheduleModule project={project} onSave={handleSaveProject} onBack={onBack} />;
      default:
        return <ComingSoonModule />;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'All changes saved';
      case 'error': return 'Save error';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 shadow-sm ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <Menu className="w-4 h-4 text-gray-400" />}
          </button>
        </div>

        <nav className="p-4">
          {navigationItems.map((section, index) => (
            <div key={index} className="mb-6">
              {!sidebarCollapsed && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Tooltip key={item.id} content={sidebarCollapsed ? item.label : ''}>
                    <button
                      onClick={() => !item.locked && setCurrentModule(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentModule === item.id
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                          : item.locked
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="flex-1 text-left">{item.label}</span>
                      )}
                      {!sidebarCollapsed && item.locked && (
                        <Tooltip content={item.type === 'development' ? 'Coming Soon! We\'re developing this feature.' : 'Advanced feature - unlock by completing basic tasks'}>
                          <div className="flex-shrink-0">
                            {item.type === 'development' ? (
                              <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full border border-yellow-200">
                                Soon
                              </span>
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                          </div>
                        </Tooltip>
                      )}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to Projects
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Save className="w-4 h-4" />
                {getSaveStatusText()}
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </header>

        {/* Module Content */}
        <main className="flex-1 overflow-auto">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
};

// Module Components
const ProjectDashboardModule = ({ project }) => {
  const [stats, setStats] = useState({
    totalScenes: 0,
    shootingDays: 0,
    castMembers: 0,
    locations: 0
  });

  useEffect(() => {
    const scheduleData = project.data?.scheduleData;
    const shotListData = project.data?.shotListData;
    
    if (scheduleData) {
      setStats(prev => ({
        ...prev,
        totalScenes: scheduleData.scenes?.length || 0,
        shootingDays: scheduleData.shootingDays?.length || 0
      }));
    }
    
    if (shotListData) {
      const uniqueLocations = new Set(shotListData.shotListItems?.map(shot => shot.location).filter(Boolean));
      setStats(prev => ({
        ...prev,
        locations: uniqueLocations.size
      }));
    }
  }, [project]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Project Overview</h2>
          <p className="text-gray-600">
            {project.type || 'Feature Film'} • {project.status || 'Pre-Production'} • Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Last modified</div>
          <div className="text-gray-700">{new Date(project.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Scenes</h3>
          <div className="text-2xl font-bold text-gray-900">{stats.totalScenes}</div>
          <div className="text-xs text-gray-500 mt-1">From shooting schedule</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Shooting Days</h3>
          <div className="text-2xl font-bold text-gray-900">{stats.shootingDays}</div>
          <div className="text-xs text-gray-500 mt-1">Planned production days</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Cast Members</h3>
          <div className="text-2xl font-bold text-gray-900">{stats.castMembers}</div>
          <div className="text-xs text-gray-500 mt-1">From contact management</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Locations</h3>
          <div className="text-2xl font-bold text-gray-900">{stats.locations}</div>
          <div className="text-xs text-gray-500 mt-1">Unique shooting locations</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="secondary" className="justify-start">
            <FileText className="w-4 h-4 mr-2" />
            Import Script
          </Button>
          <Button variant="secondary" className="justify-start">
            <Camera className="w-4 h-4 mr-2" />
            Add Shot
          </Button>
          <Button variant="secondary" className="justify-start">
            <Users className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>
    </div>
  );
};

const ScriptBreakdownModule = ({ project }) => (
  <div className="p-8">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Script Breakdown</h2>
      <Button>
        <Upload className="w-4 h-4 mr-2" />
        Import Script
      </Button>
    </div>
    
    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Script Imported</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Import your screenplay to begin the breakdown process. Tag elements like cast, props, 
          and locations to build your production catalog.
        </p>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Import Your Script
        </Button>
      </div>
    </div>
  </div>
);

const ShotListModule = ({ project, onSave, onBack }) => {
  return <ShotListWrapper project={project} onSave={onSave} onBack={onBack} />;
};

const ContactsModule = ({ project }) => (
  <div className="p-8">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Contact Management</h2>
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        Add Contact
      </Button>
    </div>
    
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex gap-4">
          <Input placeholder="Search contacts..." className="flex-1" />
          <select className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Departments</option>
            <option value="cast">Cast</option>
            <option value="camera">Camera</option>
            <option value="sound">Sound</option>
            <option value="lighting">Lighting</option>
            <option value="art">Art Department</option>
          </select>
        </div>
      </div>
      
      <div className="p-6 text-center py-12">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Contacts Added</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Build your cast and crew database. Organize contacts by department and role 
          for easy access during production.
        </p>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Your First Contact
        </Button>
      </div>
    </div>
  </div>
);

const ShootingScheduleModule = ({ project, onSave, onBack }) => {
  return <ShootingScheduleWrapper project={project} onSave={onSave} onBack={onBack} />;
};

const ComingSoonModule = () => (
  <div className="p-8 text-center">
    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
      <Sparkles className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
      <p className="text-gray-600">This feature is currently under development.</p>
    </div>
  </div>
);

// Main App Component
export default function FilmProductionDashboard() {
  const [currentView, setCurrentView] = useState('hub');
  const [selectedProject, setSelectedProject] = useState(null);
  const [editorType, setEditorType] = useState(null);

  const handleSelectProject = useCallback((project, type = 'workspace') => {
    setSelectedProject(project);
    setEditorType(type);
    
    if (type === 'shotlist' || type === 'schedule') {
      setCurrentView('editor');
    } else {
      setCurrentView('workspace');
    }
  }, []);

  const handleBackToHub = useCallback(() => {
    setCurrentView('hub');
    setSelectedProject(null);
    setEditorType(null);
  }, []);

  const handleSaveProject = useCallback((data) => {
    if (!selectedProject) return;

    const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        const updatedData = {
          ...p.data,
          ...data
        };
        
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

    const updatedSelectedProject = updatedProjects.find(p => p.id === selectedProject.id);
    if (updatedSelectedProject) {
      setSelectedProject(updatedSelectedProject);
    }

    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  }, [selectedProject]);

  return (
    <div className="min-h-screen">
      {currentView === 'hub' && (
        <ProjectHub 
          onSelectProject={handleSelectProject}
          onCreateProject={handleSelectProject}
        />
      )}
      
      {currentView === 'workspace' && selectedProject && (
        <ProjectWorkspace
          project={selectedProject}
          onBack={handleBackToHub}
        />
      )}

      {currentView === 'editor' && selectedProject && editorType === 'schedule' && (
        <ShootingScheduleWrapper
          project={selectedProject}
          onSave={handleSaveProject}
          onBack={handleBackToHub}
        />
      )}

      {currentView === 'editor' && selectedProject && editorType === 'shotlist' && (
        <ShotListWrapper
          project={selectedProject}
          onSave={handleSaveProject}
          onBack={handleBackToHub}
        />
      )}
    </div>
  );
}