'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable, 
  verticalListSortingStrategy, 
  rectSortingStrategy 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Film, Plus, Save, Trash2, Download, ArrowLeft,
  Loader2, Check, CloudOff, Image as ImageIcon, X, List, Camera, Minus,
  LayoutGrid, Eye, Edit3, Move3D, Aperture, FileText, StickyNote, Hash
} from 'lucide-react';

//==============================================================================
// TYPE DEFINITIONS
//==============================================================================

type ShotItem = {
  id: string;
  sceneNumber: string;
  shotNumber: string;
  shotSize: string;
  angle: string;
  movement: string;
  lens: string;
  description: string;
  notes: string;
  imageUrl: string; // Retained for data model consistency, though previews are handled separately
};

type ImagePreviews = {
  [key: string]: string; // Maps item.id to a base64 data URL
};

type ShotListData = {
  shotListItems: ShotItem[];
  imagePreviews: ImagePreviews;
};

type ProjectData = {
  shotListData?: ShotListData;
  // Other project data can be added here
};

type Project = {
  id: string;
  name: string;
  data?: ProjectData;
};

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved';
type ViewMode = 'cards' | 'list';

// Props for the main editor
type ShotListEditorProps = {
  project?: Partial<Project>;
  onBack?: () => void;
  onSave?: (data: { shotListData: ShotListData }) => void | Promise<void>;
};

// Props for child components
type SaveStatusIndicatorProps = {
  status: SaveStatus;
};

type SortableItemProps = {
  id: string;
  item: ShotItem;
  index: number;
  imagePreviews: ImagePreviews;
  handleItemChange: (itemId: string, field: keyof ShotItem, value: any) => void;
  handleImageUpload: (itemId: string, file: File | null) => void;
  handlePasteImage: (event: React.ClipboardEvent, itemId: string) => void;
  removeShotItem: (itemId: string) => void;
  handleRemoveImage: (itemId: string) => void;
};


//==============================================================================
// MOCK UTILITY FUNCTIONS
//==============================================================================

/**
 * Generates a simple unique ID.
 * In a real application, use a more robust library like `uuid`.
 */
const generateId = (): string => `shot_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Mock function to simulate exporting project data.
 */
const exportProject = (project: Project) => {
  console.log('Exporting project:', project);
  // In a real app, this would trigger a file download or API call.
};


//==============================================================================
// CHILD COMPONENTS
//==============================================================================

/**
 * Displays the current save status with an icon and text.
 */
const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({ status }) => {
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
};

/**
 * Renders a single shot item as a draggable card.
 */
const SortableCard: React.FC<SortableItemProps> = ({ id, item, imagePreviews, handleItemChange, handleImageUpload, handlePasteImage, removeShotItem, handleRemoveImage }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-lg transition-all duration-200 ${isDragging ? 'rotate-3 scale-105' : ''}`}
    >
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button {...attributes} {...listeners} className="cursor-grab p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg transition-all">
              <GripVertical size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={item.sceneNumber} 
                    onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)} 
                    className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none w-16" 
                    placeholder="1A" 
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                    type="text" 
                    value={item.shotNumber} 
                    onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)} 
                    className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none w-16" 
                    placeholder="001" 
                  />
                </div>
                <p className="text-xs text-gray-500">Scene - Shot</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => removeShotItem(item.id)} 
            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-4">
        {/* Visual Reference */}
        <div className="relative flex justify-center" onPaste={(e) => handlePasteImage(e, item.id)}>
          {imagePreviews[item.id] ? (
            <div className="relative group/img">
              <img 
                src={imagePreviews[item.id]} 
                alt={`Ref for ${item.shotNumber}`} 
                className="w-32 h-24 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors" 
                onClick={() => window.open(imagePreviews[item.id], '_blank')} 
              />
              <button 
                onClick={() => handleRemoveImage(item.id)} 
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label htmlFor={`image-${item.id}`} className="w-32 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 transition-all">
              <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Add Reference</span>
            </label>
          )}
          <input 
            type="file" 
            accept="image/*" 
            id={`image-${item.id}`} 
            onChange={(e) => handleImageUpload(item.id, e.target.files ? e.target.files[0] : null)} 
            className="hidden" 
          />
        </div>

        {/* Shot Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
              <Eye className="w-3 h-3" />
              Size
            </label>
            <select 
              value={item.shotSize} 
              onChange={(e) => handleItemChange(item.id, 'shotSize', e.target.value)} 
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
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
            </select>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
              <Edit3 className="w-3 h-3" />
              Angle
            </label>
            <select 
              value={item.angle} 
              onChange={(e) => handleItemChange(item.id, 'angle', e.target.value)} 
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">Select...</option>
              <option value="Eye Level">Eye Level</option>
              <option value="High Angle">High Angle</option>
              <option value="Low Angle">Low Angle</option>
              <option value="Dutch/Canted">Dutch/Canted</option>
              <option value="Bird's Eye">Bird's Eye View</option>
              <option value="Worm's Eye">Worm's Eye View</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
              <Move3D className="w-3 h-3" />
              Movement
            </label>
            <select 
              value={item.movement} 
              onChange={(e) => handleItemChange(item.id, 'movement', e.target.value)} 
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">Select...</option>
              <option value="Still">Still</option>
              <option value="Pan Left">Pan Left</option>
              <option value="Pan Right">Pan Right</option>
              <option value="Tilt Up">Tilt Up</option>
              <option value="Tilt Down">Tilt Down</option>
              <option value="Dolly In">Dolly In</option>
              <option value="Dolly Out">Dolly Out</option>
              <option value="Handheld">Handheld</option>
              <option value="Steadicam">Steadicam</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
              <Aperture className="w-3 h-3" />
              Lens
            </label>
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                value={item.lens ? item.lens.replace('mm', '').trim() : ''} 
                onChange={(e) => handleItemChange(item.id, 'lens', `${e.target.value}mm`)} 
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" 
                placeholder="50" 
              />
              <span className="text-sm text-gray-500 font-medium">mm</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
            <FileText className="w-3 h-3" />
            Description
          </label>
          <textarea 
            value={item.description} 
            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} 
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" 
            placeholder="Describe the shot..." 
            rows={2} 
          />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
            <StickyNote className="w-3 h-3" />
            Notes
          </label>
          <textarea 
            value={item.notes} 
            onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} 
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" 
            placeholder="Additional notes..." 
            rows={2} 
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a single shot item as a draggable table row.
 */
const SortableRow: React.FC<SortableItemProps> = ({ id, item, index, imagePreviews, handleItemChange, handleImageUpload, handlePasteImage, removeShotItem, handleRemoveImage }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className={`group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/30 transition-colors`}>
      <td className="px-2 py-4 whitespace-nowrap text-center">
        <button {...attributes} {...listeners} className="cursor-grab p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-4 py-4">
        <input 
          type="text" 
          value={item.sceneNumber} 
          onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)} 
          className="w-20 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" 
          placeholder="1A" 
        />
      </td>
      <td className="px-4 py-4">
        <input 
          type="text" 
          value={item.shotNumber} 
          onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)} 
          className="w-20 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" 
          placeholder="001" 
        />
      </td>
      <td className="px-4 py-4">
        <select 
          value={item.shotSize} 
          onChange={(e) => handleItemChange(item.id, 'shotSize', e.target.value)} 
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[140px]"
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
        </select>
      </td>
      <td className="px-4 py-4">
        <select 
          value={item.angle} 
          onChange={(e) => handleItemChange(item.id, 'angle', e.target.value)} 
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[130px]"
        >
          <option value="">Select...</option>
          <option value="Eye Level">Eye Level</option>
          <option value="High Angle">High Angle</option>
          <option value="Low Angle">Low Angle</option>
          <option value="Dutch/Canted">Dutch/Canted</option>
          <option value="Bird's Eye">Bird's Eye View</option>
          <option value="Worm's Eye">Worm's Eye View</option>
        </select>
      </td>
      <td className="px-4 py-4">
        <select 
          value={item.movement} 
          onChange={(e) => handleItemChange(item.id, 'movement', e.target.value)} 
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[130px]"
        >
          <option value="">Select...</option>
          <option value="Still">Still</option>
          <option value="Pan Left">Pan Left</option>
          <option value="Pan Right">Pan Right</option>
          <option value="Tilt Up">Tilt Up</option>
          <option value="Tilt Down">Tilt Down</option>
          <option value="Dolly In">Dolly In</option>
          <option value="Dolly Out">Dolly Out</option>
          <option value="Handheld">Handheld</option>
          <option value="Steadicam">Steadicam</option>
        </select>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            value={item.lens ? item.lens.replace('mm', '').trim() : ''} 
            onChange={(e) => handleItemChange(item.id, 'lens', `${e.target.value}mm`)} 
            className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" 
            placeholder="50" 
          />
          <span className="text-sm text-gray-500 font-medium">mm</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <textarea 
          value={item.description} 
          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} 
          className="w-72 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" 
          placeholder="Shot description" 
          rows={2} 
        />
      </td>
      <td className="px-4 py-4" onPaste={(e) => handlePasteImage(e, item.id)}>
        <div className="flex flex-col items-center gap-2">
          {imagePreviews[item.id] ? (
            <div className="relative group/img">
              <img 
                src={imagePreviews[item.id]} 
                alt={`Ref for ${item.shotNumber}`} 
                className="w-24 h-20 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors" 
                onClick={() => window.open(imagePreviews[item.id], '_blank')} 
              />
              <button 
                onClick={() => handleRemoveImage(item.id)} 
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
             <label htmlFor={`image-${item.id}`} className="w-24 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-all">
                <ImageIcon className="w-6 h-6 text-gray-400" />
            </label>
          )}
          <input 
            type="file" 
            accept="image/*" 
            id={`image-row-${item.id}`} 
            onChange={(e) => handleImageUpload(item.id, e.target.files ? e.target.files[0] : null)} 
            className="hidden" 
          />
          <label 
            htmlFor={`image-row-${item.id}`} 
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
          >
            {imagePreviews[item.id] ? 'Change' : 'Upload'}
          </label>
        </div>
      </td>
      <td className="px-4 py-4">
        <textarea 
          value={item.notes} 
          onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} 
          className="w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" 
          placeholder="Notes" 
          rows={2} 
        />
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-center">
        <button 
          onClick={() => removeShotItem(item.id)} 
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}


//==============================================================================
// MAIN EDITOR COMPONENT
//==============================================================================

const ShotListEditor: React.FC<ShotListEditorProps> = ({ 
  project = {}, 
  onBack = () => {}, 
  onSave = () => {} 
}) => {
  //----------------------------------------------------------------------------
  // STATE MANAGEMENT
  //----------------------------------------------------------------------------
  const [projectTitle, setProjectTitle] = useState<string>(() => project?.name || 'Untitled Project');
  const [shotListItems, setShotListItems] = useState<ShotItem[]>(() => project?.data?.shotListData?.shotListItems || []);
  const [imagePreviews, setImagePreviews] = useState<ImagePreviews>(() => project?.data?.shotListData?.imagePreviews || {});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  //----------------------------------------------------------------------------
  // AUTOSAVE LOGIC
  //----------------------------------------------------------------------------
  
  // Memoize the stringified data to use as a dependency for the autosave effect.
  // This prevents the effect from running if the data hasn't actually changed.
  const stringifiedData = useMemo(() => JSON.stringify({ shotListItems, imagePreviews }), [shotListItems, imagePreviews]);
  
  // Use a ref to hold the onSave callback. This prevents the useEffect from
  // re-triggering every time the parent component re-renders and passes a new function instance.
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  useEffect(() => {
    // Skip autosave on the initial render.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('dirty');

    // Clear any existing debounce timer.
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timer to trigger the save operation.
    debounceTimeoutRef.current = setTimeout(() => {
      const dataToSave: ShotListData = JSON.parse(stringifiedData);
      setSaveStatus('saving');
      
      // Simulate an async save operation.
      Promise.resolve()
        .then(() => new Promise(resolve => setTimeout(resolve, 500))) // Artificial delay
        .then(() => onSaveRef.current({ shotListData: dataToSave }))
        .then(() => {
          setSaveStatus('saved');
          // After saving, transition back to idle status after a short delay.
          return new Promise(resolve => setTimeout(resolve, 1500));
        })
        .then(() => setSaveStatus('idle'))
        .catch(err => {
            console.error("Save failed:", err);
            setSaveStatus('dirty'); // Revert to dirty if save fails
        });
    }, 1200); // Debounce delay

    // Cleanup function to clear the timeout if the component unmounts or data changes again.
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [stringifiedData]);

  //----------------------------------------------------------------------------
  // CRUD & EVENT HANDLERS
  //----------------------------------------------------------------------------

  const handleItemChange = useCallback((itemId: string, field: keyof ShotItem, value: any) => {
    setShotListItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const addShot = useCallback(() => {
    const newShot: ShotItem = { 
      id: generateId(), 
      sceneNumber: '', 
      shotNumber: '', 
      shotSize: 'MS', 
      angle: 'Eye Level', 
      movement: 'Still', 
      lens: '', 
      description: '', 
      notes: '', 
      imageUrl: '' 
    };
    setShotListItems(prev => [...prev, newShot]);
  }, []);

  const removeShotItem = useCallback((itemId: string) => {
    setShotListItems(prevItems => prevItems.filter(item => item.id !== itemId));
    
    // Use the functional update form to prevent race conditions.
    // This ensures we are always modifying the latest version of the state.
    setImagePreviews(prevPreviews => {
      if (!prevPreviews[itemId]) {
        return prevPreviews; // No change needed
      }
      const newPreviews = { ...prevPreviews };
      delete newPreviews[itemId];
      return newPreviews;
    });
  }, []);

  const handleImageUpload = useCallback((itemId: string, file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            setImagePreviews(prev => ({ ...prev, [itemId]: reader.result as string }));
        }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback((itemId: string) => {
    setImagePreviews(prev => { 
      const newPreviews = { ...prev }; 
      delete newPreviews[itemId]; 
      return newPreviews; 
    });
  }, []);

  const handlePasteImage = useCallback((e: React.ClipboardEvent, itemId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { 
          e.preventDefault(); 
          handleImageUpload(itemId, file); 
          return; // Stop after handling the first image
        }
      }
    }
  }, [handleImageUpload]);

  const handleExportProject = () => {
    const fullProject: Project = { 
        id: project.id || 'proj-1',
        name: projectTitle,
        data: { 
            ...project.data, 
            shotListData: { shotListItems, imagePreviews } 
        } 
    };
    exportProject(fullProject);
  };
  
  const handleExportPDF = () => {
    // This is a placeholder. A real implementation would use a library
    // like jsPDF or a server-side rendering service.
    alert("Exporting Shot List to PDF is not yet implemented.");
  };
  
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.05, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.05, 0.80));

  //----------------------------------------------------------------------------
  // DERIVED STATE & DND SETUP
  //----------------------------------------------------------------------------

  const stats = useMemo(() => ({
    shotCount: shotListItems.length,
    completedShots: shotListItems.filter(shot => shot.shotSize && shot.angle && shot.movement).length,
    withReferences: shotListItems.filter(shot => imagePreviews[shot.id]).length,
  }), [shotListItems, imagePreviews]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (active && over && active.id !== over.id) {
      setShotListItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  //----------------------------------------------------------------------------
  // RENDER LOGIC
  //----------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-x-hidden flex flex-col">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='110' height='73.33' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cstyle%3E.pattern %7B width: 100%25; height: 100%25; --s: 110px; --c1: %23dedede; --c2: %23ededed; --c3: %23d6d6d6; --_g: var(--c1) 10%25,var(--c2) 10.5%25 19%25,%230000 19.5%25 80.5%25,var(--c2) 81%25 89.5%25,var(--c3) 90%25; --_c: from -90deg at 37.5%25 50%25,%230000 75%25; --_l1: linear-gradient(145deg,var(--_g)); --_l2: linear-gradient( 35deg,var(--_g)); background: var(--_l1), var(--_l1) calc(var(--s)/2) var(--s), var(--_l2), var(--_l2) calc(var(--s)/2) var(--s), conic-gradient(var(--_c),var(--c1) 0) calc(var(--s)/8) 0, conic-gradient(var(--_c),var(--c3) 0) calc(var(--s)/2) 0, linear-gradient(90deg,var(--c3) 38%25,var(--c1) 0 50%25,var(--c3) 0 62%25,var(--c1) 0); background-size: var(--s) calc(2*var(--s)/3); %7D%3C/style%3E%3C/defs%3E%3CforeignObject width='100%25' height='100%25'%3E%3Cdiv class='pattern' xmlns='http://www.w3.org/1999/xhtml'%3E%3C/div%3E%3C/foreignObject%3E%3C/svg%3E")` }}></div>
      
      <div className="relative z-10 flex flex-col flex-grow">
        {/* Header */}
        <header className="w-full bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-100 fixed top-0 z-40">
          <div className="px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{projectTitle}</h1>
                  <p className="text-xs text-gray-500">Shot List Editor</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SaveStatusIndicator status={saveStatus} />
                <div className="h-6 w-px bg-gray-200"></div>
                <button onClick={handleExportProject} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save Project</span>
                </button>
                <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 pt-24">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Shots</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.shotCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.completedShots}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Check className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">With References</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.withReferences}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Progress</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.shotCount > 0 ? Math.round((stats.completedShots / stats.shotCount) * 100) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Hash className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
            <div className="flex gap-3">
              <button onClick={addShot} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl">
                <Plus className="w-5 h-5" />
                Add Shot
              </button>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button onClick={() => setViewMode('cards')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                <LayoutGrid className="w-4 h-4" />
                Cards
              </button>
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                <List className="w-4 h-4" />
                List
              </button>
            </div>
          </div>

          {/* Content Area */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {viewMode === 'cards' ? (
              // Cards View
              <div className="min-h-[400px]">
                <SortableContext items={shotListItems.map(item => item.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {shotListItems.map((item, index) => (
                      <SortableCard key={item.id} id={item.id} item={item} index={index} {...{imagePreviews, handleItemChange, handleImageUpload, handlePasteImage, removeShotItem, handleRemoveImage}} />
                    ))}
                  </div>
                </SortableContext>
                
                {shotListItems.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Camera className="w-12 h-12 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No shots added yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">Create your first shot to start building your shot list. Each shot can include technical details, reference images, and production notes.</p>
                    <button onClick={addShot} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg mx-auto">
                      <Plus className="w-5 h-5" />
                      Add Your First Shot
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // List View
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto" style={{ zoom: zoomLevel }}>
                    <table className="w-full" style={{ minWidth: '1600px' }}>
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-20">
                        <tr>
                          <th className="px-2 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"></th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Scene</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Shot</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Size</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Angle</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Movement</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lens</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Reference</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Notes</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <SortableContext items={shotListItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                          {shotListItems.map((item, index) => (
                            <SortableRow key={item.id} id={item.id} item={item} index={index} {...{imagePreviews, handleItemChange, handleImageUpload, handlePasteImage, removeShotItem, handleRemoveImage}} />
                          ))}
                        </SortableContext>
                      </tbody>
                    </table>
                  {shotListItems.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <List className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No shots in your list</h3>
                      <p className="text-gray-500 mb-4">Click "Add Shot" to start building your shot list</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DndContext>
        </main>
        
        {/* Zoom Controls (only for list view) */}
        {viewMode === 'list' && (
          <div className="fixed bottom-10 right-6 z-50 flex flex-col items-center gap-2">
            <button onClick={handleZoomIn} className="w-12 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-xl transition-all transform hover:scale-105" title="Zoom In">
              <Plus className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-xs font-bold text-gray-600 bg-white/90 backdrop-blur-sm py-2 px-3 rounded-full border border-gray-200 shadow-sm">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button onClick={handleZoomOut} className="w-12 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-xl transition-all transform hover:scale-105" title="Zoom Out">
              <Minus className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShotListEditor;
