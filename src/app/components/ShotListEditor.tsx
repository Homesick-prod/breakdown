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
  LayoutGrid, Eye, Edit3, Move3D, Aperture, FileText, StickyNote, Hash, ChevronsRight
} from 'lucide-react';

// --- Important: Make sure the path to your db helper and pdf utility is correct ---
import { exportShotListToPDF } from '../utils/shotpdf'; 
import { setImage, getImage, deleteImage } from '../utils/db'; 

//==============================================================================
// TYPE DEFINITIONS (No changes needed)
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
  imageUrl: string; 
};

type ImagePreviews = {
  [key: string]: string;
};

type ShotListData = {
  shotListItems: ShotItem[];
  imagePreviews?: ImagePreviews;
};

type ProjectSaveData = {
  name: string;
  shotListData: {
    shotListItems: ShotItem[];
  };
}

type ProjectData = {
  shotListData?: ShotListData;
};

type Project = {
  id: string;
  name: string;
  data?: ProjectData;
};

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved';
type ViewMode = 'cards' | 'list';

type ShotListEditorProps = {
  project?: Partial<Project>;
  onBack?: () => void;
  onSave?: (data: ProjectSaveData) => void | Promise<void>;
};

type SortableItemProps = {
  id: string;
  item: ShotItem;
  index: number;
  imagePreviews: ImagePreviews;
  activeImageUploadId: string | null;
  setActiveImageUploadId: (id: string | null) => void;
  handleItemChange: (itemId: string, field: keyof ShotItem, value: any) => void;
  handleImageUpload: (itemId: string, file: File | null) => void;
  removeShotItem: (itemId: string) => void;
  handleRemoveImage: (itemId: string) => void;
};


//==============================================================================
// MOCK UTILITY FUNCTIONS (No changes needed)
//==============================================================================
const generateId = (): string => `shot_${Math.random().toString(36).substr(2, 9)}`;
const exportProject = (project: Project) => console.log('Exporting project:', project);


//==============================================================================
// CHILD COMPONENTS (No changes needed)
//==============================================================================
const SaveStatusIndicator: React.FC<{ status: SaveStatus }> = ({ status }) => {
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

const SortableCard: React.FC<SortableItemProps> = ({ id, item, imagePreviews, activeImageUploadId, setActiveImageUploadId, handleItemChange, handleImageUpload, removeShotItem, handleRemoveImage }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isActiveForUpload = activeImageUploadId === item.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white rounded-xl border ${isActiveForUpload ? 'border-indigo-400 ring-2 ring-indigo-300' : 'border-gray-200'} shadow-xs hover:shadow-lg transition-all duration-200 ${isDragging ? 'rotate-3 scale-105' : ''}`}
    >
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
                    className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none text-center"
                    placeholder="1A"
                    style={{ width: `${Math.max(String(item.sceneNumber).length, 2)}ch` }}
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="text"
                    value={item.shotNumber}
                    onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)}
                    className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none text-center"
                    placeholder="001"
                    style={{ width: `${Math.max(String(item.shotNumber).length, 3)}ch` }}
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

      <div className="p-4 space-y-4">
        <div className="relative flex justify-center">
          {imagePreviews[item.id] ? (
            <div className="relative group/img" onClick={() => setActiveImageUploadId(isActiveForUpload ? null : item.id)}>
              <img
                src={imagePreviews[item.id]}
                alt={`Ref for ${item.shotNumber}`}
                className={`w-32 h-24 object-cover rounded-lg border-2 ${isActiveForUpload ? 'border-indigo-300' : 'border-gray-200'} cursor-pointer transition-colors`}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveImage(item.id); }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label htmlFor={`image-${item.id}`} onClick={() => setActiveImageUploadId(isActiveForUpload ? null : item.id)} className={`w-32 h-24 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${isActiveForUpload ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50 ring-2 ring-indigo-200' : 'border-dashed border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50'}`}>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide"><Eye className="w-3 h-3" />Size</label>
            <select value={item.shotSize} onChange={(e) => handleItemChange(item.id, 'shotSize', e.target.value)} className="text-gray-600 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
              <option value="">Select Size...</option>
              <optgroup label="Wide Shots">
                <option value="EWS">EWS - Extreme Wide Shot</option>
                <option value="VWS">VWS - Very Wide Shot</option>
                <option value="WS">WS - Wide Shot</option>
                <option value="LS">LS - Long Shot</option>
                <option value="FLS">FLS - Full Length Shot</option>
              </optgroup>
              <optgroup label="Medium Shots">
                <option value="MS">MS - Medium Shot</option>
                <option value="MCU">MCU - Medium Close-Up</option>
                <option value="Cowboy">Cowboy Shot</option>
              </optgroup>
              <optgroup label="Close-Ups">
                <option value="CU">CU - Close-Up</option>
                <option value="ECU">ECU - Extreme Close-Up</option>
                <option value="Insert">Insert Shot</option>
              </optgroup>
              <optgroup label="Multi-Subject">
                <option value="2S">Two-Shot</option>
                <option value="3S">Three-Shot</option>
                <option value="Group">Group Shot</option>
              </optgroup>
              <optgroup label="Specialty">
                <option value="POV">POV - Point of View</option>
                <option value="OTS">OTS - Over the Shoulder</option>
                <option value="Cutaway">Cutaway</option>
                <option value="Establishing">Establishing Shot</option>
              </optgroup>
            </select>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide"><Edit3 className="w-3 h-3" />Angle</label>
            <select value={item.angle} onChange={(e) => handleItemChange(item.id, 'angle', e.target.value)} className="text-gray-600 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
              <option value="">Select Angle...</option>
              <optgroup label="Vertical Angles">
                <option value="High Angle">High Angle</option>
                <option value="Eye Level">Eye Level</option>
                <option value="Low Angle">Low Angle</option>
                <option value="Worm's Eye">Worm's Eye View</option>
                <option value="Bird's Eye">Bird's Eye View</option>
                <option value="Ground Level">Ground Level</option>
              </optgroup>
              <optgroup label="Horizontal Angles">
                <option value="Front">Front Angle</option>
                <option value="3/4 Front">3/4 Front</option>
                <option value="Profile">Profile</option>
                <option value="3/4 Back">3/4 Back</option>
                <option value="Rear">Rear Angle</option>
              </optgroup>
              <optgroup label="Specialty">
                <option value="Dutch/Canted">Dutch Angle / Canted</option>
                <option value="OTS">Over-the-Shoulder (OTS)</option>
                <option value="POV">Point of View (POV)</option>
              </optgroup>            </select>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide"><Move3D className="w-3 h-3" />Movement</label>
            <select value={item.movement} onChange={(e) => handleItemChange(item.id, 'movement', e.target.value)} className="text-gray-600 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
              <option value="">Select Movement...</option>
              <optgroup label="Stationary Camera">
                <option value="Static">Static / Still</option>
                <option value="Pan Left">Pan Left</option>
                <option value="Pan Right">Pan Right</option>
                <option value="Whip Pan">Whip Pan Left</option>
                <option value="Whip Pan">Whip Pan Right</option>
                <option value="Tilt Up">Tilt Up</option>
                <option value="Tilt Down">Tilt Down</option>
                <option value="Pedestal Up">Pedestal Up</option>
                <option value="Pedestal Down">Pedestal Down</option>
              </optgroup>
              <optgroup label="Camera on Wheels">
                <option value="Dolly In">Dolly In</option>
                <option value="Dolly Out">Dolly Out</option>
                <option value="Truck Left">Truck Left</option>
                <option value="Truck Right">Truck Right</option>
                <option value="Arc Left">Arc Left</option>
                <option value="Arc Right">Arc Right</option>
                <option value="Creep In">Creep In</option>
                <option value="Creep Out">Creep Out</option>
              </optgroup>
              <optgroup label="Camera in Motion">
                <option value="Handheld">Handheld</option>
                <option value="Steadicam">Steadicam</option>
                <option value="Gimbal">Gimbal (e.g., Ronin)</option>
                <option value="Follow">Follow</option>
                <option value="Lead">Lead</option>
              </optgroup>
              <optgroup label="Lens Movement">
                <option value="Zoom In">Zoom In</option>
                <option value="Zoom Out">Zoom Out</option>
                <option value="Dolly Zoom">Dolly Zoom (Vertigo)</option>
              </optgroup>
              <optgroup label="Crane / Jib">
                <option value="Crane Up">Crane Up</option>
                <option value="Crane Down">Crane Down</option>
                <option value="Swing Left">Swing Left</option>
                <option value="Swing Right">Swing Right</option>
              </optgroup>
              <optgroup label="Specialized">
                <option value="Drone/Aerial">Drone / Aerial</option>
                <option value="360 Rotation">360° Rotation</option>
              </optgroup>            </select>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide"><Aperture className="w-3 h-3" />Lens</label>
            <div className="flex items-center gap-1">
              <input type="number" value={item.lens ? item.lens.replace('mm', '').trim() : ''} onChange={(e) => handleItemChange(item.id, 'lens', e.target.value)} className="text-gray-600 flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="50" />
              <span className="text-sm text-gray-500 font-medium">mm</span>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide"><FileText className="w-3 h-3" />Description</label>
          <textarea value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="text-gray-600 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" placeholder="Describe the shot..." rows={2} />
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide"><StickyNote className="w-3 h-3" />Notes</label>
          <textarea value={item.notes} onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} className="text-gray-600 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" placeholder="Additional notes..." rows={2} />
        </div>
      </div>
    </div>
  );
}

const SortableRow: React.FC<SortableItemProps> = ({ id, item, index, imagePreviews, activeImageUploadId, setActiveImageUploadId, handleItemChange, handleImageUpload, removeShotItem, handleRemoveImage }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isActiveForUpload = activeImageUploadId === item.id;

  return (
    <tr ref={setNodeRef} style={style} className={`group ${isActiveForUpload ? 'bg-indigo-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')} hover:bg-indigo-50/30 transition-colors`}>
      <td className="px-2 py-4 whitespace-nowrap text-center"><button {...attributes} {...listeners} className="cursor-grab p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"><GripVertical size={16} /></button></td>
      <td className="px-4 py-4"><input type="text" value={item.sceneNumber} onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)} className="text-gray-600 w-20 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="1A" /></td>
      <td className="px-4 py-4"><input type="text" value={item.shotNumber} onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)} className="text-gray-600 w-20 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="001" /></td>
      <td className="px-4 py-4"><select value={item.shotSize} onChange={(e) => handleItemChange(item.id, 'shotSize', e.target.value)} className="text-gray-600 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[140px]">
        <option value="">Select Size...</option>
        <optgroup label="Wide Shots">
          <option value="EWS">EWS - Extreme Wide Shot</option>
          <option value="VWS">VWS - Very Wide Shot</option>
          <option value="WS">WS - Wide Shot</option>
          <option value="LS">LS - Long Shot</option>
          <option value="FLS">FLS - Full Length Shot</option>
        </optgroup>
        <optgroup label="Medium Shots">
          <option value="MS">MS - Medium Shot</option>
          <option value="MCU">MCU - Medium Close-Up</option>
          <option value="Cowboy">Cowboy Shot</option>
        </optgroup>
        <optgroup label="Close-Ups">
          <option value="CU">CU - Close-Up</option>
          <option value="ECU">ECU - Extreme Close-Up</option>
          <option value="Insert">Insert Shot</option>
        </optgroup>
        <optgroup label="Multi-Subject">
          <option value="2S">Two-Shot</option>
          <option value="3S">Three-Shot</option>
          <option value="Group">Group Shot</option>
        </optgroup>
        <optgroup label="Specialty">
          <option value="POV">POV - Point of View</option>
          <option value="OTS">OTS - Over the Shoulder</option>
          <option value="Cutaway">Cutaway</option>
          <option value="Establishing">Establishing Shot</option>
        </optgroup></select></td>
      <td className="px-4 py-4"><select value={item.angle} onChange={(e) => handleItemChange(item.id, 'angle', e.target.value)} className="text-gray-600 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[130px]">
        <option value="">Select Angle...</option>
        <optgroup label="Vertical Angles">
          <option value="High Angle">High Angle</option>
          <option value="Eye Level">Eye Level</option>
          <option value="Low Angle">Low Angle</option>
          <option value="Worm's Eye">Worm's Eye View</option>
          <option value="Bird's Eye">Bird's Eye View</option>
          <option value="Ground Level">Ground Level</option>
        </optgroup>
        <optgroup label="Horizontal Angles">
          <option value="Front">Front Angle</option>
          <option value="3/4 Front">3/4 Front</option>
          <option value="Profile">Profile</option>
          <option value="3/4 Back">3/4 Back</option>
          <option value="Rear">Rear Angle</option>
        </optgroup>
        <optgroup label="Specialty">
          <option value="Dutch/Canted">Dutch Angle / Canted</option>
          <option value="OTS">Over-the-Shoulder (OTS)</option>
          <option value="POV">Point of View (POV)</option>
        </optgroup></select></td>
      <td className="px-4 py-4"><select value={item.movement} onChange={(e) => handleItemChange(item.id, 'movement', e.target.value)} className="text-gray-600 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[130px]">
        <option value="">Select Movement...</option>
        <optgroup label="Stationary Camera">
          <option value="Static">Static / Still</option>
          <option value="Pan Left">Pan Left</option>
          <option value="Pan Right">Pan Right</option>
          <option value="Whip Pan">Whip Pan Left</option>
          <option value="Whip Pan">Whip Pan Right</option>
          <option value="Tilt Up">Tilt Up</option>
          <option value="Tilt Down">Tilt Down</option>
          <option value="Pedestal Up">Pedestal Up</option>
          <option value="Pedestal Down">Pedestal Down</option>
        </optgroup>
        <optgroup label="Camera on Wheels">
          <option value="Dolly In">Dolly In</option>
          <option value="Dolly Out">Dolly Out</option>
          <option value="Truck Left">Truck Left</option>
          <option value="Truck Right">Truck Right</option>
          <option value="Arc Left">Arc Left</option>
          <option value="Arc Right">Arc Right</option>
          <option value="Creep In">Creep In</option>
          <option value="Creep Out">Creep Out</option>
        </optgroup>
        <optgroup label="Camera in Motion">
          <option value="Handheld">Handheld</option>
          <option value="Steadicam">Steadicam</option>
          <option value="Gimbal">Gimbal (e.g., Ronin)</option>
          <option value="Follow">Follow</option>
          <option value="Lead">Lead</option>
        </optgroup>
        <optgroup label="Lens Movement">
          <option value="Zoom In">Zoom In</option>
          <option value="Zoom Out">Zoom Out</option>
          <option value="Dolly Zoom">Dolly Zoom (Vertigo)</option>
        </optgroup>
        <optgroup label="Crane / Jib">
          <option value="Crane Up">Crane Up</option>
          <option value="Crane Down">Crane Down</option>
          <option value="Swing Left">Swing Left</option>
          <option value="Swing Right">Swing Right</option>
        </optgroup>
        <optgroup label="Specialized">
          <option value="Drone/Aerial">Drone / Aerial</option>
          <option value="360 Rotation">360° Rotation</option>
        </optgroup></select></td>
      <td className="px-4 py-4"><div className="flex items-center gap-2"><input type="number" value={item.lens ? item.lens.replace('mm', '').trim() : ''} onChange={(e) => handleItemChange(item.id, 'lens', e.target.value)} className="text-gray-600 w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="50" /><span className="text-sm text-gray-500 font-medium">mm</span></div></td>
      <td className="px-4 py-4"><textarea value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="text-gray-600 w-72 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" placeholder="Shot description" rows={2} /></td>
      <td className="px-4 py-4" onClick={() => setActiveImageUploadId(isActiveForUpload ? null : item.id)}>
        <div className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${isActiveForUpload ? 'bg-indigo-100 ring-2 ring-indigo-300' : ''}`}>
          {imagePreviews[item.id] ? (
            <div className="relative group/img">
              <img src={imagePreviews[item.id]} alt={`Ref for ${item.shotNumber}`} className="w-24 h-20 object-cover rounded-lg border-2 border-gray-200" />
              <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(item.id); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <label htmlFor={`image-row-${item.id}`} className="w-24 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-all">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </label>
          )}
          <input type="file" accept="image/*" id={`image-row-${item.id}`} onChange={(e) => handleImageUpload(item.id, e.target.files ? e.target.files[0] : null)} className="hidden" />
          <label htmlFor={`image-row-${item.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors" onClick={(e) => e.stopPropagation()}>
            {imagePreviews[item.id] ? 'Change' : 'Upload'}
          </label>
        </div>
      </td>
      <td className="px-4 py-4"><textarea value={item.notes} onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} className="w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" placeholder="Notes" rows={2} /></td>
      <td className="px-4 py-4 whitespace-nowrap text-center"><button onClick={() => removeShotItem(item.id)} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button></td>
    </tr>
  );
}


//==============================================================================
// MAIN EDITOR COMPONENT
//==============================================================================

const ShotListEditor: React.FC<ShotListEditorProps> = ({
  project = {},
  onBack = () => { },
  onSave = () => { }
}) => {
  const [projectTitle, setProjectTitle] = useState<string>(() => project?.name || 'Untitled Project');
  const [shotListItems, setShotListItems] = useState<ShotItem[]>(() => project?.data?.shotListData?.shotListItems || []);
  const [imagePreviews, setImagePreviews] = useState<ImagePreviews>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(true);
  const [activeImageUploadId, setActiveImageUploadId] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false); // New state for PDF export loading

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; });

  useEffect(() => {
    const loadImages = async () => {
      const previews: ImagePreviews = {};
      for (const item of shotListItems) {
        if (item.imageUrl) {
          try {
            const imageFile = await getImage(item.id);
            if (imageFile) {
              previews[item.id] = URL.createObjectURL(imageFile);
            }
          } catch (error) {
            console.error(`Failed to load image for shot ${item.id}:`, error);
          }
        }
      }
      setImagePreviews(previews);
    };

    if (shotListItems.length > 0) {
        loadImages();
    }

    return () => {
      Object.values(imagePreviews).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // FIX 1: Auto-saving with guaranteed animation time
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('dirty');
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

debounceTimeoutRef.current = setTimeout(() => {
      // Create a complete data payload for saving
      const dataToSave = { 
        name: projectTitle, 
        shotListData: { 
          shotListItems 
        } 
      };

      setSaveStatus('saving');

      const savePromise = Promise.resolve(onSaveRef.current(dataToSave));
      const minDelayPromise = new Promise(resolve => setTimeout(resolve, 400));

      Promise.all([savePromise, minDelayPromise])
        .then(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 1500);
        })
        .catch(err => {
          console.error("Save failed:", err);
          setSaveStatus('dirty');
        });
    }, 1200);
    
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [projectTitle, shotListItems]);


  const handleItemChange = useCallback((itemId: string, field: keyof ShotItem, value: any) => {
    setShotListItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  }, []);

  const addShot = useCallback(() => {
    const newShot: ShotItem = { id: generateId(), sceneNumber: '', shotNumber: '', shotSize: '', angle: '', movement: '', lens: '', description: '', notes: '', imageUrl: '' };
    setShotListItems(prev => [...prev, newShot]);
  }, []);

  const removeShotItem = useCallback(async (itemId: string) => {
    await deleteImage(itemId);
    setShotListItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setImagePreviews(prevPreviews => {
      const newPreviews = { ...prevPreviews };
      if (newPreviews[itemId]) {
        URL.revokeObjectURL(newPreviews[itemId]);
        delete newPreviews[itemId];
      }
      return newPreviews;
    });
  }, []);

  const handleImageUpload = useCallback(async (itemId: string, file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    
    await setImage(itemId, file);

    setShotListItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, imageUrl: 'true' } : item
    ));

    setImagePreviews(prev => {
      if (prev[itemId]) {
        URL.revokeObjectURL(prev[itemId]);
      }
      return { ...prev, [itemId]: URL.createObjectURL(file) };
    });
    
    setActiveImageUploadId(null);
  }, []);

  const handleRemoveImage = useCallback(async (itemId: string) => {
    await deleteImage(itemId);
    
    setShotListItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, imageUrl: '' } : item
    ));

    setImagePreviews(prev => {
      const newPreviews = { ...prev };
      if (newPreviews[itemId]) {
        URL.revokeObjectURL(newPreviews[itemId]);
        delete newPreviews[itemId];
      }
      return newPreviews;
    });
  }, []);

  const handlePasteImage = useCallback(async (e: React.ClipboardEvent, targetItemId?: string) => {
    const itemIdToUse = targetItemId || activeImageUploadId;
    if (!itemIdToUse) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { 
          e.preventDefault(); 
          await handleImageUpload(itemIdToUse, file); 
          return;
        }
      }
    }
  }, [activeImageUploadId, handleImageUpload]);

  useEffect(() => {
    const globalPasteHandler = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      if (activeImageUploadId) {
        handlePasteImage(e as any, activeImageUploadId);
      }
    };
    document.addEventListener('paste', globalPasteHandler);
    return () => document.removeEventListener('paste', globalPasteHandler);
  }, [activeImageUploadId, handlePasteImage]);

  const handleExportProject = () => {
    const fullProject: Project = { 
        id: project.id || 'proj-1', 
        name: projectTitle, 
        data: { shotListData: { shotListItems } } 
    };
    exportProject(fullProject);
  };

  // FIX 2: PDF Export now converts images to Data URLs before exporting
  const handleExportPDF = async () => {
    if (shotListItems.length === 0) {
      alert("Cannot export an empty shot list.");
      return;
    }
    setIsExportingPDF(true);

    try {
      const imagePreviewsForPDF: ImagePreviews = {};
      const itemsWithImages = shotListItems.filter(item => item.imageUrl);

      for (const item of itemsWithImages) {
        const imageFile = await getImage(item.id);
        if (imageFile) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
          imagePreviewsForPDF[item.id] = dataUrl;
        }
      }

      await exportShotListToPDF(projectTitle, shotListItems, imagePreviewsForPDF);
      console.log("PDF export finished.");
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Sorry, there was an error creating the PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.05, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.05, 0.80));

  const stats = useMemo(() => ({
    shotCount: shotListItems.length,
    completedShots: shotListItems.filter(shot => shot.shotSize && shot.angle && shot.movement).length,
    withReferences: shotListItems.filter(shot => !!shot.imageUrl).length,
  }), [shotListItems]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (active && over && active.id !== over.id) {
      setShotListItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-x-hidden flex flex-col" onPaste={(e) => handlePasteImage(e)}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='110' height='73.33' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cstyle%3E.pattern %7B width: 100%25; height: 100%25; --s: 110px; --c1: %23dedede; --c2: %23ededed; --c3: %23d6d6d6; --_g: var(--c1) 10%25,var(--c2) 10.5%25 19%25,%230000 19.5%25 80.5%25,var(--c2) 81%25 89.5%25,var(--c3) 90%25; --_c: from -90deg at 37.5%25 50%25,%230000 75%25; --_l1: linear-gradient(145deg,var(--_g)); --_l2: linear-gradient( 35deg,var(--_g)); background: var(--_l1), var(--_l1) calc(var(--s)/2) var(--s), var(--_l2), var(--_l2) calc(var(--s)/2) var(--s), conic-gradient(var(--_c),var(--c1) 0) calc(var(--s)/8) 0, conic-gradient(var(--_c),var(--c3) 0) calc(var(--s)/2) 0, linear-gradient(90deg,var(--c3) 38%25,var(--c1) 0 50%25,var(--c3) 0 62%25,var(--c1) 0); background-size: var(--s) calc(2*var(--s)/3); %7D%3C/style%3E%3C/defs%3E%3CforeignObject width='100%25' height='100%25'%3E%3Cdiv class='pattern' xmlns='http://www.w3.org/1999/xhtml'%3E%3C/div%3E%3C/foreignObject%3E%3C/svg%3E")` }}></div>
      <div className="relative z-10 flex flex-col flex-grow">
        <header className="w-full bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-100 fixed top-0 z-40">
          <div className="px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
                <div><h1 className="text-xl font-semibold text-gray-900">{projectTitle}</h1><p className="text-xs text-gray-500">Shot List Editor</p></div>
              </div>
              <div className="flex items-center gap-3">
                <SaveStatusIndicator status={saveStatus} />
                <div className="h-6 w-px bg-gray-200"></div>
                <button onClick={handleExportProject} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"><Save className="w-4 h-4" /><span className="hidden sm:inline">Save Project</span></button>
                <button onClick={handleExportPDF} disabled={isExportingPDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed">
                  {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isExportingPDF ? 'Exporting...' : 'Export PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 pt-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Total Shots</p><p className="text-3xl font-bold text-gray-900 mt-1">{stats.shotCount}</p></div><div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"><Camera className="w-6 h-6 text-white" /></div></div></div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Completed</p><p className="text-3xl font-bold text-gray-900 mt-1">{stats.completedShots}</p></div><div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg"><Check className="w-6 h-6 text-white" /></div></div></div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">With References</p><p className="text-3xl font-bold text-gray-900 mt-1">{stats.withReferences}</p></div><div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg"><ImageIcon className="w-6 h-6 text-white" /></div></div></div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Progress</p><p className="text-3xl font-bold text-gray-900 mt-1">{stats.shotCount > 0 ? Math.round((stats.completedShots / stats.shotCount) * 100) : 0}%</p></div><div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg"><Hash className="w-6 h-6 text-white" /></div></div></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
            <div className="flex gap-3"><button onClick={addShot} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"><Plus className="w-5 h-5" />Add Shot</button></div>
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button onClick={() => setViewMode('cards')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}><LayoutGrid className="w-4 h-4" />Cards</button>
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}><List className="w-4 h-4" />List</button>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {viewMode === 'cards' ? (
              <div className="min-h-[400px]">
                <SortableContext items={shotListItems.map(item => item.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {shotListItems.map((item, index) => (<SortableCard key={item.id} id={item.id} item={item} index={index} {...{ imagePreviews, activeImageUploadId, setActiveImageUploadId, handleItemChange, handleImageUpload, removeShotItem, handleRemoveImage }} />))}
                  </div>
                </SortableContext>
                {shotListItems.length === 0 && (<div className="text-center py-20"><div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6"><Camera className="w-12 h-12 text-indigo-500" /></div><h3 className="text-xl font-semibold text-gray-900 mb-2">No shots added yet</h3><p className="text-gray-500 mb-6 max-w-md mx-auto">Create your first shot to start building your shot list. Each shot can include technical details, reference images, and production notes.</p><button onClick={addShot} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg mx-auto"><Plus className="w-5 h-5" />Add Your First Shot</button></div>)}
              </div>
            ) : (
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
                        {shotListItems.map((item, index) => (<SortableRow key={item.id} id={item.id} item={item} index={index} {...{ imagePreviews, activeImageUploadId, setActiveImageUploadId, handleItemChange, handleImageUpload, removeShotItem, handleRemoveImage }} />))}
                      </SortableContext>
                    </tbody>
                  </table>
                  {shotListItems.length === 0 && (<div className="text-center py-16"><div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4"><List className="w-10 h-10 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 mb-2">No shots in your list</h3><p className="text-gray-500 mb-4">Click "Add Shot" to start building your shot list</p></div>)}
                </div>
              </div>
            )}
          </DndContext>
        </main>

        {viewMode === 'list' && (
          <div className="fixed bottom-10 right-2 z-50 flex items-center gap-1">
            <div className={`flex flex-col items-center gap-2 transition-all duration-300 ease-in-out ${showZoomControls ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
              <button onClick={handleZoomIn} className="w-8 h-8 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 transition-all" title="Zoom In"><Plus className="w-4 h-4 text-gray-700" /></button>
              <span className="text-xs font-bold text-gray-600 bg-white/80 backdrop-blur-sm py-1 px-2 rounded-full border border-gray-200">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={handleZoomOut} className="w-8 h-8 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 transition-all" title="Zoom Out"><Minus className="w-4 h-4 text-gray-700" /></button>
            </div>
            <button onClick={() => setShowZoomControls(!showZoomControls)} className="w-8 h-8 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 transition-all" title={showZoomControls ? 'Hide Controls' : 'Show Controls'}><ChevronsRight className={`w-5 h-5 text-gray-700 transition-transform duration-300 ${showZoomControls ? '' : 'rotate-180'}`} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShotListEditor;