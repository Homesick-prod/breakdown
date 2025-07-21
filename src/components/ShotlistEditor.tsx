'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Clock, Film, Plus, Save, ChevronDown, Trash2, Download, Settings,
  FileDown, ArrowLeft, Loader2, Check, CloudOff, Image as ImageIcon, X,
  Camera, Video, FileText, Copy, Eye, EyeOff, Filter, Search, Grid, List,
  Clipboard, Hash, MapPin, Users, Clapperboard, Aperture, Focus, Palette,
  CheckSquare, Square, ChevronRight, Layers, Tag, Calendar, StickyNote
} from 'lucide-react';
import { generateId } from '../utils/id';
import { exportProject } from '../utils/file';
import Footer from './Footer';

// Save status indicator component
function SaveStatusIndicator({ status }) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'saving': return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Saving...', className: 'text-gray-600' };
      case 'dirty': return { icon: <CloudOff className="w-4 h-4" />, text: 'Unsaved changes', className: 'text-amber-600' };
      case 'saved': return { icon: <Check className="w-4 h-4" />, text: 'Saved', className: 'text-green-600' };
      default: return { icon: <Save className="w-4 h-4" />, text: 'All changes saved', className: 'text-gray-500' };
    }
  };
  const { icon, text, className } = getStatusDisplay();
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${className} transition-all duration-300`}>
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </div>
  );
}

// Shot status badge component
function StatusBadge({ status, onChange }) {
  const statusConfig = {
    'planned': { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Square },
    'ready': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckSquare },
    'in-progress': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    'completed': { color: 'bg-green-100 text-green-700 border-green-200', icon: Check },
    'on-hold': { color: 'bg-red-100 text-red-700 border-red-200', icon: X }
  };

  const config = statusConfig[status] || statusConfig['planned'];
  const Icon = config.icon;

  return (
    <select 
      value={status} 
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-1 text-xs font-medium rounded-full border ${config.color} transition-all cursor-pointer`}
    >
      <option value="planned">Planned</option>
      <option value="ready">Ready</option>
      <option value="in-progress">In Progress</option>
      <option value="completed">Completed</option>
      <option value="on-hold">On Hold</option>
    </select>
  );
}

// Shot card component for grid view
function ShotCard({ shot, index, onEdit, onDelete, onStatusChange, onToggleSelect, isSelected, imagePreview }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200'} overflow-hidden hover:shadow-md transition-all group`}>
      <div className="relative">
        {imagePreview ? (
          <img 
            src={imagePreview} 
            alt={`Shot ${shot.shotNumber}`} 
            className="w-full h-48 object-cover cursor-pointer"
            onClick={() => window.open(imagePreview, '_blank')}
          />
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
            <Camera className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelect(shot.id, e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
          <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
            {shot.sceneNumber}-{shot.shotNumber}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <StatusBadge status={shot.status} onChange={(status) => onStatusChange(shot.id, status)} />
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-medium text-gray-900">{shot.shotSize} - {shot.angle}</h3>
            <p className="text-sm text-gray-600">{shot.movement || 'Static'}</p>
          </div>
          <span className="text-xs text-gray-500">{shot.estimatedDuration || '0'}s</span>
        </div>
        
        <p className="text-sm text-gray-700 line-clamp-2 mb-3">{shot.description || 'No description'}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {shot.location || 'No location'}
          </span>
          <span className="flex items-center gap-1">
            <Aperture className="w-3 h-3" />
            {shot.lens || '--'}mm
          </span>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {shot.equipment && <Tag className="w-3 h-3 text-gray-400" />}
            {shot.notes && <StickyNote className="w-3 h-3 text-gray-400" />}
            {shot.vfx && <Layers className="w-3 h-3 text-purple-400" />}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(shot)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(shot.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sortable row component for list view
function SortableRow({ id, shot, index, onEdit, onDelete, onFieldChange, onStatusChange, onToggleSelect, isSelected, imagePreview, onImageUpload, onRemoveImage, onPasteImage }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className={`group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${isSelected ? 'bg-indigo-50' : ''}`}>
      <td className="px-2 py-3 whitespace-nowrap text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(shot.id, e.target.checked)}
          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
        />
      </td>
      <td className="px-2 py-3 whitespace-nowrap text-center">
        <button {...attributes} {...listeners} className="cursor-grab p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <input 
          type="text" 
          value={shot.sceneNumber} 
          onChange={(e) => onFieldChange(shot.id, 'sceneNumber', e.target.value)}
          className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all placeholder-gray-400"
          placeholder="1A"
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <input 
          type="text" 
          value={shot.shotNumber} 
          onChange={(e) => onFieldChange(shot.id, 'shotNumber', e.target.value)}
          className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all placeholder-gray-400"
          placeholder="001"
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={shot.status} onChange={(status) => onStatusChange(shot.id, status)} />
      </td>
      <td className="px-4 py-3">
        <select 
          value={shot.shotSize} 
          onChange={(e) => onFieldChange(shot.id, 'shotSize', e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          <option value="">Select...</option>
          <option value="ECU">ECU - Extreme Close Up</option>
          <option value="CU">CU - Close Up</option>
          <option value="MCU">MCU - Medium Close Up</option>
          <option value="MS">MS - Medium Shot</option>
          <option value="MLS">MLS - Medium Long Shot</option>
          <option value="LS">LS - Long Shot</option>
          <option value="WS">WS - Wide Shot</option>
          <option value="EWS">EWS - Extreme Wide Shot</option>
          <option value="OTS">OTS - Over the Shoulder</option>
          <option value="POV">POV - Point of View</option>
          <option value="2S">2S - Two Shot</option>
          <option value="3S">3S - Three Shot</option>
          <option value="INS">INS - Insert</option>
          <option value="CUTAWAY">Cutaway</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <select 
          value={shot.angle} 
          onChange={(e) => onFieldChange(shot.id, 'angle', e.target.value)}
          className="w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          <option value="">Select...</option>
          <option value="Eye Level">Eye Level</option>
          <option value="High Angle">High Angle</option>
          <option value="Low Angle">Low Angle</option>
          <option value="Dutch/Canted">Dutch/Canted</option>
          <option value="Bird's Eye">Bird's Eye View</option>
          <option value="Worm's Eye">Worm's Eye View</option>
          <option value="Over Head">Over Head</option>
          <option value="Hip Level">Hip Level</option>
          <option value="Knee Level">Knee Level</option>
          <option value="Ground Level">Ground Level</option>
          <option value="Shoulder Level">Shoulder Level</option>
          <option value="Top 45">Top 45°</option>
          <option value="Profile">Profile (90°)</option>
          <option value="3/4 Front">3/4 Front</option>
          <option value="3/4 Back">3/4 Back</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <select 
          value={shot.movement} 
          onChange={(e) => onFieldChange(shot.id, 'movement', e.target.value)}
          className="w-40 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          <option value="">Select...</option>
          <option value="Still">Still</option>
          <option value="Pan Left">Pan Left</option>
          <option value="Pan Right">Pan Right</option>
          <option value="Tilt Up">Tilt Up</option>
          <option value="Tilt Down">Tilt Down</option>
          <option value="Dolly In">Dolly In</option>
          <option value="Dolly Out">Dolly Out</option>
          <option value="Dolly Left">Dolly Left</option>
          <option value="Dolly Right">Dolly Right</option>
          <option value="Truck Left">Truck Left</option>
          <option value="Truck Right">Truck Right</option>
          <option value="Zoom In">Zoom In</option>
          <option value="Zoom Out">Zoom Out</option>
          <option value="Handheld">Handheld</option>
          <option value="Handheld (Ronin)">Handheld (Ronin)</option>
          <option value="Steadicam">Steadicam</option>
          <option value="Crane Up">Crane Up</option>
          <option value="Crane Down">Crane Down</option>
          <option value="Jib">Jib</option>
          <option value="Track">Track</option>
          <option value="Arc Left">Arc Left</option>
          <option value="Arc Right">Arc Right</option>
          <option value="360°">360° Rotation</option>
          <option value="Whip Pan">Whip Pan</option>
          <option value="Push In">Push In</option>
          <option value="Pull Out">Pull Out</option>
          <option value="Follow">Follow</option>
          <option value="Lead">Lead</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <textarea 
          value={shot.description} 
          onChange={(e) => onFieldChange(shot.id, 'description', e.target.value)}
          className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all placeholder-gray-400"
          placeholder="Shot description"
          rows="2"
        />
      </td>
      <td className="px-4 py-3">
        <input 
          type="text" 
          value={shot.location} 
          onChange={(e) => onFieldChange(shot.id, 'location', e.target.value)}
          className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-400"
          placeholder="Location"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <input 
            type="number" 
            value={shot.lens || ''} 
            onChange={(e) => onFieldChange(shot.id, 'lens', e.target.value)}
            className="w-16 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-400"
            placeholder="50"
          />
          <span className="text-sm text-gray-500">mm</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <input 
          type="number" 
          value={shot.estimatedDuration || ''} 
          onChange={(e) => onFieldChange(shot.id, 'estimatedDuration', e.target.value)}
          className="w-16 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-400"
          placeholder="30"
        />
      </td>
      <td className="px-4 py-3" onPaste={(e) => onPasteImage(e, shot.id)}>
        <div className="flex flex-col items-center gap-2">
          {imagePreview ? (
            <div className="relative group">
              <img 
                src={imagePreview} 
                alt={`Ref for ${shot.shotNumber}`} 
                className="w-20 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity" 
                onClick={() => window.open(imagePreview, '_blank')} 
              />
              <button
                onClick={() => onRemoveImage(shot.id)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            id={`image-${shot.id}`} 
            onChange={(e) => onImageUpload(shot.id, e.target.files[0])} 
            className="hidden" 
          />
          <label 
            htmlFor={`image-${shot.id}`} 
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
          >
            {imagePreview ? 'Change' : 'Upload'}
          </label>
        </div>
      </td>
      <td className="px-4 py-3">
        <input 
          type="text" 
          value={shot.cast || ''} 
          onChange={(e) => onFieldChange(shot.id, 'cast', e.target.value)}
          className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-400"
          placeholder="Cast"
        />
      </td>
      <td className="px-4 py-3">
        <input 
          type="text" 
          value={shot.equipment || ''} 
          onChange={(e) => onFieldChange(shot.id, 'equipment', e.target.value)}
          className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-400"
          placeholder="Equipment"
        />
      </td>
      <td className="px-4 py-3 text-center">
        <input 
          type="checkbox" 
          checked={shot.vfx || false} 
          onChange={(e) => onFieldChange(shot.id, 'vfx', e.target.checked)}
          className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
        />
      </td>
      <td className="px-4 py-3">
        <textarea 
          value={shot.notes || ''} 
          onChange={(e) => onFieldChange(shot.id, 'notes', e.target.value)}
          className="w-48 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all placeholder-gray-400"
          placeholder="Notes"
          rows="2"
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-center">
        <button 
          onClick={() => onDelete(shot.id)} 
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// Main Shot List Editor component
export default function ShotListEditor({ project, onBack, onSave, onSwitchToSchedule }) {
  const [shots, setShots] = useState(() => project?.data?.shotList || []);
  const [imagePreviews, setImagePreviews] = useState(() => project?.data?.shotListImages || {});
  const [selectedShots, setSelectedShots] = useState(new Set());
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [editingShot, setEditingShot] = useState(null);
  
  const debounceTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  // Autosave effect
  useEffect(() => {
    if (isInitialMount.current) { 
      isInitialMount.current = false; 
      return; 
    }
    setSaveStatus('dirty');
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave({ 
        ...project.data,
        shotList: shots, 
        shotListImages: imagePreviews 
      });
      setSaveStatus('saved');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSaveStatus('idle');
    }, 1200);
    return () => { 
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); 
    };
  }, [shots, imagePreviews, onSave, project]);

  // Filter and search logic
  const filteredShots = useMemo(() => {
    let filtered = [...shots];
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(shot => shot.status === filterStatus);
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(shot => 
        shot.shotNumber?.toLowerCase().includes(query) ||
        shot.sceneNumber?.toLowerCase().includes(query) ||
        shot.description?.toLowerCase().includes(query) ||
        shot.location?.toLowerCase().includes(query) ||
        shot.cast?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [shots, filterStatus, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = shots.length;
    const completed = shots.filter(s => s.status === 'completed').length;
    const totalDuration = shots.reduce((sum, shot) => sum + (parseInt(shot.estimatedDuration) || 0), 0);
    const withVfx = shots.filter(s => s.vfx).length;
    
    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalDuration,
      withVfx
    };
  }, [shots]);

  // CRUD operations
  const addShot = useCallback(() => {
    const lastShot = shots[shots.length - 1];
    const newShot = {
      id: generateId(),
      sceneNumber: '',
      shotNumber: '',
      status: 'planned',
      shotSize: 'MS',
      angle: 'Eye Level',
      movement: 'Still',
      description: '',
      location: '',
      lens: '',
      estimatedDuration: 30,
      cast: '',
      equipment: '',
      vfx: false,
      notes: ''
    };
    setShots([...shots, newShot]);
  }, [shots]);

  const deleteShot = useCallback((shotId) => {
    if (window.confirm('Are you sure you want to delete this shot?')) {
      setShots(shots.filter(s => s.id !== shotId));
      if (imagePreviews[shotId]) {
        const newPreviews = { ...imagePreviews };
        delete newPreviews[shotId];
        setImagePreviews(newPreviews);
      }
    }
  }, [shots, imagePreviews]);

  const updateShotField = useCallback((shotId, field, value) => {
    setShots(shots.map(shot => 
      shot.id === shotId ? { ...shot, [field]: value } : shot
    ));
  }, [shots]);

  const handleDragEnd = useCallback(({ active, over }) => {
    if (active && over && active.id !== over.id) {
      const oldIndex = shots.findIndex(item => item.id === active.id);
      const newIndex = shots.findIndex(item => item.id === over.id);
      setShots(arrayMove(shots, oldIndex, newIndex));
    }
  }, [shots]);

  // Image handling
  const handleImageUpload = useCallback((shotId, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreviews(prev => ({ ...prev, [shotId]: reader.result }));
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback((shotId) => {
    setImagePreviews(prev => { 
      const newPreviews = { ...prev }; 
      delete newPreviews[shotId]; 
      return newPreviews; 
    });
  }, []);

  const handlePasteImage = useCallback((e, shotId) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { 
          e.preventDefault(); 
          handleImageUpload(shotId, file); 
          return; 
        }
      }
    }
  }, [handleImageUpload]);

  // Bulk operations
  const toggleSelectAll = useCallback(() => {
    if (selectedShots.size === filteredShots.length) {
      setSelectedShots(new Set());
    } else {
      setSelectedShots(new Set(filteredShots.map(s => s.id)));
    }
  }, [selectedShots, filteredShots]);

  const toggleSelectShot = useCallback((shotId, checked) => {
    const newSelection = new Set(selectedShots);
    if (checked) {
      newSelection.add(shotId);
    } else {
      newSelection.delete(shotId);
    }
    setSelectedShots(newSelection);
  }, [selectedShots]);

  const bulkUpdateStatus = useCallback((status) => {
    setShots(shots.map(shot => 
      selectedShots.has(shot.id) ? { ...shot, status } : shot
    ));
    setSelectedShots(new Set());
  }, [shots, selectedShots]);

  const bulkDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete ${selectedShots.size} shots?`)) {
      setShots(shots.filter(s => !selectedShots.has(s.id)));
      selectedShots.forEach(shotId => {
        if (imagePreviews[shotId]) {
          const newPreviews = { ...imagePreviews };
          delete newPreviews[shotId];
          setImagePreviews(newPreviews);
        }
      });
      setSelectedShots(new Set());
    }
  }, [shots, selectedShots, imagePreviews]);

  const exportShotList = useCallback(() => {
    const projectData = {
      ...project,
      data: {
        ...project.data,
        shotList: shots,
        shotListImages: imagePreviews
      }
    };
    exportProject(projectData);
  }, [project, shots, imagePreviews]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-x-hidden flex flex-col">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
      
      <div className="relative z-10 flex flex-col flex-grow">
        {/* Header */}
        <header className="w-screen bg-white shadow-sm border-b border-gray-100 fixed top-0 z-40">
          <div className="px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{project?.name || 'Untitled Project'}</h1>
                  <p className="text-xs text-gray-500">Shot List Editor</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={onSwitchToSchedule}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Schedule</span>
                </button>
                <div className="h-6 w-px bg-gray-200"></div>
                <SaveStatusIndicator status={saveStatus} />
                <div className="h-6 w-px bg-gray-200"></div>
                <button 
                  onClick={exportShotList} 
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 pt-24 pb-8">
          <div className="max-w-[1600px] mx-auto px-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Shots</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Clapperboard className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completion</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.completionRate}%</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <div className="relative w-8 h-8">
                      <svg className="w-8 h-8 transform -rotate-90">
                        <circle cx="16" cy="16" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle cx="16" cy="16" r="14" fill="none" stroke="#3b82f6" strokeWidth="3" 
                          strokeDasharray={`${stats.completionRate * 0.88} 88`} strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Duration</p>
                    <p className="text-2xl font-semibold text-gray-900">{Math.floor(stats.totalDuration / 60)}m</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">VFX Shots</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.withVfx}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Layers className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={addShot}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Shot
                  </button>
                  
                  {selectedShots.size > 0 && (
                    <>
                      <div className="h-8 w-px bg-gray-300"></div>
                      <span className="text-sm text-gray-600">{selectedShots.size} selected</span>
                      <select
                        onChange={(e) => bulkUpdateStatus(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                        defaultValue=""
                      >
                        <option value="" disabled>Change status...</option>
                        <option value="planned">Planned</option>
                        <option value="ready">Ready</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="on-hold">On Hold</option>
                      </select>
                      <button
                        onClick={bulkDelete}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search shots..."
                      className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  {/* Filters */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                        filterStatus !== 'all' ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                    </button>
                    
                    {showFilters && (
                      <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-20">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                        >
                          <option value="all">All</option>
                          <option value="planned">Planned</option>
                          <option value="ready">Ready</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="on-hold">On Hold</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <List className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <Grid className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            {viewMode === 'list' ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="w-full" style={{ minWidth: '1800px' }}>
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
                        <tr>
                          <th className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedShots.size === filteredShots.length && filteredShots.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                            />
                          </th>
                          <th className="px-2 py-3"></th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Scene</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Shot</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Size</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Angle</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Movement</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Lens</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Duration</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Reference</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cast</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Equipment</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">VFX</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Notes</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <SortableContext items={filteredShots.map(s => s.id)} strategy={verticalListSortingStrategy}>
                          {filteredShots.map((shot, index) => (
                            <SortableRow
                              key={shot.id}
                              id={shot.id}
                              shot={shot}
                              index={index}
                              onEdit={setEditingShot}
                              onDelete={deleteShot}
                              onFieldChange={updateShotField}
                              onStatusChange={updateShotField}
                              onToggleSelect={toggleSelectShot}
                              isSelected={selectedShots.has(shot.id)}
                              imagePreview={imagePreviews[shot.id]}
                              onImageUpload={handleImageUpload}
                              onRemoveImage={handleRemoveImage}
                              onPasteImage={handlePasteImage}
                            />
                          ))}
                        </SortableContext>
                      </tbody>
                    </table>
                  </DndContext>
                  
                  {filteredShots.length === 0 && (
                    <div className="text-center py-16">
                      <Camera className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-gray-500">No shots found</p>
                      <p className="text-sm text-gray-400 mt-2">
                        {searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Click "Add Shot" to create your first shot'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredShots.map((shot, index) => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    index={index}
                    onEdit={setEditingShot}
                    onDelete={deleteShot}
                    onStatusChange={updateShotField}
                    onToggleSelect={toggleSelectShot}
                    isSelected={selectedShots.has(shot.id)}
                    imagePreview={imagePreviews[shot.id]}
                  />
                ))}
                
                {filteredShots.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <Camera className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">No shots found</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Click "Add Shot" to create your first shot'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
            
        <Footer />
      </div>
    </div>
  );
}