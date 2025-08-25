`use client`;

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Clock, Film, Plus, Save, ChevronDown, Trash2, Download, Settings,
  FileDown, CloudRain, ListPlus, Search, Layers, Github, ArrowLeft, Users, MapPin, Sunrise, Sunset, Thermometer,
  CloudDrizzle, Coffee, Moon, Loader2, Check, CloudOff, Image as ImageIcon, X, Minus, ChevronsRight, AlertTriangle
} from 'lucide-react';
import { generateId } from '../utils/id';
import { calculateEndTime, calculateDuration } from '../utils/time';
import { exportProject } from '../utils/file';
import { exportToPDF } from '../utils/pdf';
import { getImage } from '../utils/db'; // Import db helper
import { StorageManager } from '../utils/storage';
import Footer from './Footer';

// Save status indicator component
function SaveStatusIndicator({ status }) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'saving': return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Saving...', className: 'text-gray-600' };
      case 'dirty': return { icon: <CloudOff className="w-4 h-4" />, text: 'Unsaved changes', className: 'text-amber-600' };
      case 'saved': return { icon: <Check className="w-4 h-4" />, text: 'Saved', className: 'text-green-600' };
      case 'error': return { icon: <AlertTriangle className="w-4 h-4" />, text: 'Save failed', className: 'text-red-600' };
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

// Sortable timeline item (table row) component
function SortableItem({ id, item, index, imagePreviews, handleItemChange, handleImageUpload, removeTimelineItem, handleRemoveImage, activeImageUploadId, setActiveImageUploadId }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isBreak = item.type === 'break';
  const isFirstItem = index === 0;
  const isActiveForUpload = activeImageUploadId === item.id;

  const handleImageAreaClick = () => {
    setActiveImageUploadId(isActiveForUpload ? null : item.id);
  };

  return (
    <tr ref={setNodeRef} style={style} className={`group transition-colors duration-200 ${isBreak ? 'bg-amber-50 hover:bg-amber-100/70' : `${(index % 2 === 0 ? 'bg-white' : 'bg-gray-50')} hover:bg-indigo-50/60`}`}>
      <td className="px-2 py-3 whitespace-nowrap text-center"><button {...attributes} {...listeners} className="cursor-grab p-1 text-gray-400 hover:text-gray-600 transition-colors"><GripVertical size={16} /></button></td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <input type="time" value={item.start} onChange={(e) => handleItemChange(item.id, 'start', e.target.value)} disabled={!isFirstItem} className={`text-gray-600 px-3 py-1.5 text-sm border rounded-lg font-medium transition-all ${isFirstItem ? 'border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'}`} />
          <span className="text-gray-400">→</span>
          <input type="time" value={item.end} onChange={(e) => handleItemChange(item.id, 'end', e.target.value)} className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all" />
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <input type="number" min="0" value={item.duration} onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)} className="text-gray-600 w-16 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all" />
          <span className="text-sm text-gray-500">min</span>
        </div>
      </td>
      {isBreak ? (
        <td colSpan="15" className="px-4 py-3"><input type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="text-amber-700 w-full px-4 py-2 bg-amber-100 border border-amber-200 rounded-lg hover:border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium transition-all" placeholder="Break description" /></td>
      ) : (
        <>
          <td className="px-4 py-3"><input type="text" value={item.sceneNumber} onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)} className="text-gray-600 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all" placeholder="1A" /></td>
          <td className="px-4 py-3"><input type="text" value={item.shotNumber} onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)} className="text-gray-600 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all" placeholder="001" /></td>
          <td className="px-4 py-3"><select value={item.intExt} onChange={(e) => handleItemChange(item.id, 'intExt', e.target.value)} className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"><option value="INT">INT</option><option value="EXT">EXT</option><option value="INT/EXT">INT/EXT</option></select></td>
          <td className="px-4 py-3"><select value={item.dayNight} onChange={(e) => handleItemChange(item.id, 'dayNight', e.target.value)} className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"><option value="DAY">DAY</option><option value="NIGHT">NIGHT</option><option value="DAWN">DAWN</option><option value="DUSK">DUSK</option></select></td>
          <td className="px-4 py-3"><input type="text" value={item.location} onChange={(e) => handleItemChange(item.id, 'location', e.target.value)} className="text-gray-600 w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="Location" /></td>
          <td className="px-4 py-3">
            <select value={item.shotSize} onChange={(e) => handleItemChange(item.id, 'shotSize', e.target.value)} className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
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
          </td>
          <td className="px-4 py-3">
            <select value={item.angle} onChange={(e) => handleItemChange(item.id, 'angle', e.target.value)} className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
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
              </optgroup>
            </select>
          </td>
          <td className="px-4 py-3">
            <select value={item.movement} onChange={(e) => handleItemChange(item.id, 'movement', e.target.value)} className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
              <option value="">Select Movement...</option>
              <optgroup label="Stationary Camera">
                <option value="Static">Static / Still</option>
                <option value="Pan">Pan (Left/Right)</option>
                <option value="Whip Pan">Whip Pan</option>
                <option value="Tilt">Tilt (Up/Down)</option>
                <option value="Pedestal">Pedestal (Up/Down)</option>
              </optgroup>
              <optgroup label="Camera on Wheels">
                <option value="Dolly">Dolly (In/Out)</option>
                <option value="Truck">Truck / Track (Left/Right)</option>
                <option value="Arc">Arc (Left/Right)</option>
                <option value="Creep">Creep (In/Out)</option>
              </optgroup>
              <optgroup label="Camera in Motion">
                <option value="Handheld">Handheld</option>
                <option value="Steadicam">Steadicam</option>
                <option value="Gimbal">Gimbal (e.g., Ronin)</option>
                <option value="Follow">Follow</option>
                <option value="Lead">Lead</option>
              </optgroup>
              <optgroup label="Lens Movement">
                <option value="Zoom">Zoom (In/Out)</option>
                <option value="Dolly Zoom">Dolly Zoom (Vertigo)</option>
              </optgroup>
              <optgroup label="Crane / Jib">
                <option value="Crane/Jib">Crane / Jib (Up/Down)</option>
                <option value="Swing">Swing</option>
              </optgroup>
              <optgroup label="Specialized">
                <option value="Drone/Aerial">Drone / Aerial</option>
                <option value="360 Rotation">360° Rotation</option>
              </optgroup>
            </select>
          </td>
          <td className="px-4 py-3"><div className="flex items-center gap-1"><input type="number" value={item.lens ? item.lens.replace('mm', '').trim() : ''} onChange={(e) => handleItemChange(item.id, 'lens', e.target.value)} className="text-gray-600 w-16 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="50" /><span className="text-sm text-gray-500">mm</span></div></td>
          <td className="px-4 py-3"><textarea value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="text-gray-600 w-52 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" placeholder="Scene description" rows="2" /></td>
          <td className="px-4 py-3"><input type="text" value={item.cast} onChange={(e) => handleItemChange(item.id, 'cast', e.target.value)} className="text-gray-600 w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="Cast" /></td>
          <td className="px-4 py-3">
            <div className="flex flex-col items-center gap-2">
                {imagePreviews[item.id] ? (
                <div className="relative group/img">
                    <img 
                        src={imagePreviews[item.id]} 
                        alt={`Ref for ${item.shotNumber}`} 
                        className="w-20 h-16 object-cover rounded-lg border border-gray-200 transition-all cursor-pointer"
                        onClick={handleImageAreaClick}
                    />
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(item.id); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"><X className="w-3 h-3" /></button>
                </div>
                ) : (
                    <div 
                className={`w-20 h-16 bg-gray-100 rounded-lg border-2 border-dashed flex items-center justify-center hover:border-indigo-400 transition-all cursor-pointer ${isActiveForUpload ? 'border-indigo-500 bg-indigo-100 ring-2 ring-indigo-300' : 'border-gray-300'}`}
                        onClick={handleImageAreaClick}
                    >
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                )}
                <input type="file" accept="image/*" id={`image-${item.id}`} onChange={(e) => handleImageUpload(item.id, e.target.files[0])} className="hidden" />
                <label htmlFor={`image-${item.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors">
                    {imagePreviews[item.id] ? 'Change' : 'Upload'}
                </label>
            </div>
          </td>
          <td className="px-4 py-3"><input type="text" value={item.props} onChange={(e) => handleItemChange(item.id, 'props', e.target.value)} className="text-gray-600 w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="Props" /></td>
          <td className="px-4 py-3"><input type="text" value={item.costume} onChange={(e) => handleItemChange(item.id, 'costume', e.target.value)} className="text-gray-600 w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="Costume" /></td>
          <td className="px-4 py-3"><textarea value={item.notes} onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} className="text-gray-600 w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" placeholder="Notes" rows="2" /></td>
        </>
      )}
      <td className="px-4 py-3 whitespace-nowrap text-center"><button onClick={() => removeTimelineItem(item.id)} className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button></td>
    </tr>
  );
}

function ShotImportModal({ isOpen, onClose, shotList, onImport }) {
    // Hooks are now at the top level
    const [selectedShots, setSelectedShots] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [shotListImagePreviews, setShotListImagePreviews] = useState({});

    // Load images from IndexedDB when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedShots(new Set());
            setSearchTerm('');
            
            // Load images for all shots that have imageUrl
            const loadImages = async () => {
                const imageMap = {};
                for (const shot of shotList) {
                    if (shot.imageUrl) {
                        try {
                            const imageFile = await getImage(shot.id);
                            if (imageFile) {
                                const dataUrl = await new Promise((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(imageFile);
                                });
                                imageMap[shot.id] = dataUrl;
                            }
                        } catch (error) {
                            console.error(`Failed to load image for shot ${shot.id}:`, error);
                        }
                    }
                }
                setShotListImagePreviews(imageMap);
            };
            
            loadImages();
        }
    }, [isOpen, shotList]);

    const groupedAndFilteredShots = useMemo(() => {
        const filtered = shotList.filter(shot => 
            shot.sceneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shot.shotNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shot.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const groups = filtered.reduce((acc, shot) => {
            const sceneKey = shot.sceneNumber || 'Uncategorized';
            if (!acc[sceneKey]) {
                acc[sceneKey] = [];
            }
            acc[sceneKey].push(shot);
            return acc;
        }, {});

        return Object.keys(groups)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .reduce((acc, key) => ({ ...acc, [key]: groups[key] }), {});

    }, [shotList, searchTerm]);

    // Conditional return is now after all hooks
    if (!isOpen) return null;

    const handleImportClick = () => {
        onImport(Array.from(selectedShots), shotListImagePreviews);
        onClose();
    };

    const handleSelectAllFiltered = () => {
        const allFilteredIds = Object.values(groupedAndFilteredShots).flat().map(s => s.id);
        if (selectedShots.size === allFilteredIds.length) {
            setSelectedShots(new Set());
        } else {
            setSelectedShots(new Set(allFilteredIds));
        }
    };
    
    const handleSelectScene = (sceneShots) => {
        const sceneShotIds = sceneShots.map(s => s.id);
        const allCurrentlySelected = sceneShotIds.every(id => selectedShots.has(id));
        
        setSelectedShots(prev => {
            const newSet = new Set(prev);
            if (allCurrentlySelected) {
                sceneShotIds.forEach(id => newSet.delete(id));
            } else {
                sceneShotIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
                <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full my-8 animate-in fade-in zoom-in-95 duration-300 flex flex-col">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-900">Import from Shot List</h3>
                        <p className="text-sm text-gray-500 mt-1">Select shots to add to your schedule.</p>
                    </div>
                    <div className="p-6 flex-grow overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Search by scene, shot, or description..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="text-gray-600 w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button onClick={handleSelectAllFiltered} className="ml-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                {selectedShots.size === Object.values(groupedAndFilteredShots).flat().length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg bg-gray-50/50">
                            {Object.entries(groupedAndFilteredShots).length > 0 ? Object.entries(groupedAndFilteredShots).map(([sceneKey, shots]) => (
                                <div key={sceneKey} className="border-b border-gray-200 last:border-b-0">
                                    <div className="flex items-center justify-between p-3 bg-gray-100 sticky top-0 z-10">
                                        <h4 className="font-semibold text-gray-800 flex items-center gap-2"><Layers size={16} /> Scene {sceneKey}</h4>
                                        <button onClick={() => handleSelectScene(shots)} className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors">
                                            Select/Deselect Scene
                                        </button>
                                    </div>
                                    <ul className="divide-y divide-gray-100">
                                        {shots.map(shot => (
                                            <li key={shot.id} onClick={() => setSelectedShots(prev => { const n = new Set(prev); n.has(shot.id) ? n.delete(shot.id) : n.add(shot.id); return n; })} className={`flex items-center gap-4 p-3 cursor-pointer transition-colors ${selectedShots.has(shot.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                                <input type="checkbox" checked={selectedShots.has(shot.id)} readOnly className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                                                <img 
                                                    src={shotListImagePreviews[shot.id] || 'https://placehold.co/80x60/e2e8f0/94a3b8?text=No+Ref'} 
                                                    alt="Ref" 
                                                    className="w-20 h-16 object-cover rounded-md bg-gray-100" 
                                                />
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-gray-800">Shot {shot.shotNumber}</p>
                                                    <p className="text-sm text-gray-600 truncate">{shot.description || 'No description'}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )) : (
                                <div className="text-center p-8 text-gray-500">No shots found.</div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={handleImportClick} disabled={selectedShots.size === 0} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">Import {selectedShots.size} Shot(s)</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main editor component
export default function ShootingScheduleEditor({ project, onBack, onSave }) {
  const [headerInfo, setHeaderInfo] = useState(() => {
    const defaultHeader = { projectTitle: project?.name || '', episodeNumber: '', shootingDay: '', totalDays: '', date: new Date().toISOString().split('T')[0], callTime: '', sunrise: '06:30', sunset: '18:30', weather: '', location1: '', location2: '', director: '', producer: '', dop: '', firstAD: '', secondAD: '', pd: '', artTime: '', lunchTime: '', dinnerTime: '', precipProb: '', temp: '', realFeel: '', firstmealTime: '', secondmealTime: '', wrapTime: '' };
    return project?.data?.headerInfo ? { ...defaultHeader, ...project.data.headerInfo } : defaultHeader;
  });
  const [timelineItems, setTimelineItems] = useState(() => project?.data?.timelineItems || []);
  const [imagePreviews, setImagePreviews] = useState(() => project?.data?.imagePreviews || {});
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(true);
  const [activeImageUploadId, setActiveImageUploadId] = useState(null);
  const debounceTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const tableContainerRef = useRef(null);
  const floatingScrollbarRef = useRef(null);
  const floatingScrollbarContentRef = useRef(null);
  const [showFloatingScrollbar, setShowFloatingScrollbar] = useState(false);
  const isSyncingScroll = useRef(false);
  const tableRef = useRef(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const shotList = useMemo(() => project?.data?.shotListData?.shotListItems || [], [project]);

  const stringifiedData = useMemo(() => JSON.stringify({ headerInfo, timelineItems, imagePreviews }), [headerInfo, timelineItems, imagePreviews]);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; });

  // --- START: AUTOSAVE WITH IMPROVED ERROR HANDLING ---
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus('dirty');
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(async () => {
      // Create a complete data payload for saving
      const dataToSave = {
        headerInfo,
        timelineItems,
        imagePreviews
      };
      
      setSaveStatus('saving');
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        await onSaveRef.current(dataToSave);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (error) {
        console.error('Save failed:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 5000);
      }
    }, 1000);
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [stringifiedData, headerInfo, timelineItems, imagePreviews]);
  // --- END: AUTOSAVE ---

  // --- START: UI BEHAVIOR HOOKS ---
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const floatingScrollbar = floatingScrollbarRef.current;
    const tableEl = tableContainer?.querySelector('table');
    if (!tableContainer || !floatingScrollbar || !tableEl) return;

    const updateScrollbar = () => {
      if (floatingScrollbarContentRef.current) floatingScrollbarContentRef.current.style.width = `${tableEl.offsetWidth + 100}px`;
      setShowFloatingScrollbar(tableContainer.scrollWidth > tableContainer.clientWidth && tableContainer.getBoundingClientRect().bottom > window.innerHeight);
    };
    const handleTableScroll = () => { if (!isSyncingScroll.current) { isSyncingScroll.current = true; floatingScrollbar.scrollLeft = tableContainer.scrollLeft; requestAnimationFrame(() => { isSyncingScroll.current = false; }); } };
    const handleFloatingScroll = () => { if (!isSyncingScroll.current) { isSyncingScroll.current = true; tableContainer.scrollLeft = floatingScrollbar.scrollLeft; requestAnimationFrame(() => { isSyncingScroll.current = false; }); } };

    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(tableEl);
    tableContainer.addEventListener('scroll', handleTableScroll);
    floatingScrollbar.addEventListener('scroll', handleFloatingScroll);
    window.addEventListener('resize', updateScrollbar);
    window.addEventListener('scroll', updateScrollbar, true);
    updateScrollbar();

    return () => {
      observer.disconnect();
      if (tableContainer) tableContainer.removeEventListener('scroll', handleTableScroll);
      if (floatingScrollbar) floatingScrollbar.removeEventListener('scroll', handleFloatingScroll);
      window.removeEventListener('resize', updateScrollbar);
      window.removeEventListener('scroll', updateScrollbar, true);
    };
  }, [timelineItems, zoomLevel]);

  // Deselect active row/image upload when clicking outside the table
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tableRef.current && !tableRef.current.contains(event.target)) {
        setActiveImageUploadId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // --- END: UI BEHAVIOR HOOKS ---

  const recalculateAndUpdateTimes = useCallback((items) => {
    let lastEndTime = headerInfo.callTime || '06:00';
    const updatedItems = items.map(item => {
      const newStart = lastEndTime;
      const newEnd = calculateEndTime(newStart, item.duration);
      lastEndTime = newEnd || lastEndTime;
      return { ...item, start: newStart, end: newEnd };
    });
    setTimelineItems(updatedItems);
  }, [headerInfo.callTime]);

  const handleItemChange = useCallback((itemId, field, value) => {
    const itemIndex = timelineItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    if (field === 'start' && itemIndex === 0) { setHeaderInfo(prev => ({ ...prev, callTime: value })); return; }

    let newItems = [...timelineItems];
    const itemToChange = { ...newItems[itemIndex] };
    let requiresRecalculation = false;

    if (field === 'end') {
      itemToChange.end = value < itemToChange.start ? itemToChange.start : value;
      itemToChange.duration = calculateDuration(itemToChange.start, itemToChange.end);
      requiresRecalculation = true;
    } else if (field === 'duration') {
      itemToChange.duration = parseInt(value, 10) >= 0 ? parseInt(value, 10) : 0;
      itemToChange.end = calculateEndTime(itemToChange.start, itemToChange.duration);
      requiresRecalculation = true;
    } else if (field !== 'start') {
      itemToChange[field] = value;
    }
    newItems[itemIndex] = itemToChange;

    if (requiresRecalculation) {
      let lastEndTime = newItems[itemIndex].end;
      for (let i = itemIndex + 1; i < newItems.length; i++) {
        newItems[i].start = lastEndTime;
        newItems[i].end = calculateEndTime(lastEndTime, newItems[i].duration);
        lastEndTime = newItems[i].end;
      }
    }
    setTimelineItems(newItems);
  }, [timelineItems]);

  const addShot = useCallback(() => {
    const lastItem = timelineItems[timelineItems.length - 1];
    const newStartTime = lastItem ? lastItem.end : (headerInfo.callTime || '06:00');
    const newShot = { id: generateId(), type: 'shot', start: newStartTime, duration: 10, end: '', sceneNumber: '', shotNumber: '', intExt: 'INT', dayNight: 'DAY', location: '', description: '', cast: '', shotSize: '', angle: '', movement: '', lens: '', props: '', costume: '', notes: '', imageUrl: '' };
    newShot.end = calculateEndTime(newShot.start, newShot.duration);
    setTimelineItems(prev => [...prev, newShot]);
  }, [timelineItems, headerInfo.callTime]);

  const addBreak = useCallback(() => {
    const lastItem = timelineItems[timelineItems.length - 1];
    const newStartTime = lastItem ? lastItem.end : (headerInfo.callTime || '06:00');
    const newBreak = { id: generateId(), type: 'break', start: newStartTime, duration: 30, end: '', description: 'Meal Break' };
    newBreak.end = calculateEndTime(newBreak.start, newBreak.duration);
    setTimelineItems(prev => [...prev, newBreak]);
  }, [timelineItems, headerInfo.callTime]);

  const removeTimelineItem = useCallback((itemId) => {
    if (imagePreviews[itemId]) {
      const newPreviews = { ...imagePreviews };
      delete newPreviews[itemId];
      setImagePreviews(newPreviews);
    }
    recalculateAndUpdateTimes(timelineItems.filter(item => item.id !== itemId));
  }, [timelineItems, recalculateAndUpdateTimes, imagePreviews]);

  // Enhanced image upload with compression
  const handleImageUpload = useCallback(async (itemId, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    
    try {
      // Compress the image before storing
      const compressedImage = await StorageManager.compressImage(file, 600, 0.7);
      
      if (compressedImage) {
        setImagePreviews(prev => ({ ...prev, [itemId]: compressedImage }));
        setActiveImageUploadId(null);
      } else {
        console.error('Failed to compress image');
        // Fallback to original file reading (but with size warning)
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            // Check if the result is too large
            const sizeInMB = (reader.result.length * 3) / 4 / (1024 * 1024); // Rough base64 size calculation
            if (sizeInMB > 1) {
              alert('Image is very large and may cause storage issues. Consider using a smaller image.');
            }
            setImagePreviews(prev => ({ ...prev, [itemId]: reader.result }));
            setActiveImageUploadId(null);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Image processing failed:', error);
      alert('Failed to process image. Please try a smaller image.');
    }
  }, []);

  const handleRemoveImage = useCallback((itemId) => {
    setImagePreviews(prev => { const newPreviews = { ...prev }; delete newPreviews[itemId]; return newPreviews; });
  }, []);

  const handlePasteImage = useCallback(async (e, targetItemId) => {
    const itemIdToUse = targetItemId || activeImageUploadId;
    if (!itemIdToUse) return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    e.preventDefault();

    const html = clipboardData.getData('text/html');
    if (html && html.includes('<img')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const img = doc.querySelector('img');
      if (img && img.src) {
        try {
          if (img.src.startsWith('data:image')) {
            const compressedImage = await StorageManager.compressImage(img.src, 600, 0.7);
            setImagePreviews((prev) => ({ ...prev, [itemIdToUse]: compressedImage || img.src }));
            setActiveImageUploadId(null);
          } else {
            const response = await fetch(img.src);
            const blob = await response.blob();
            const compressedImage = await StorageManager.compressImage(blob, 600, 0.7);
            if (compressedImage) {
              setImagePreviews((prev) => ({ ...prev, [itemIdToUse]: compressedImage }));
              setActiveImageUploadId(null);
            }
          }
        } catch (err) {
          console.error("Error processing pasted image:", err);
        }
        return;
      }
    }

    if (clipboardData.files && clipboardData.files.length > 0) {
      const file = Array.from(clipboardData.files).find(f => f.type.startsWith('image/'));
      if (file) {
        handleImageUpload(itemIdToUse, file);
        return;
      }
    }
  }, [activeImageUploadId, handleImageUpload]);
  
  useEffect(() => {
    const globalPasteHandler = (e) => {
        if (activeImageUploadId) {
            handlePasteImage(e, activeImageUploadId);
        }
    };
    document.addEventListener('paste', globalPasteHandler);
    return () => document.removeEventListener('paste', globalPasteHandler);
  }, [activeImageUploadId, handlePasteImage]);

  const handleImportShots = useCallback((shotIdsToImport, shotImagePreviews) => {
    const shotsToAdd = shotIdsToImport
        .map(shotId => shotList.find(s => s.id === shotId))
        .filter(Boolean);

    const newTimelineItems = shotsToAdd.map(shot => {
        const newShot = {
            id: generateId(),
            type: 'shot',
            start: '', // Will be set by recalculation
            duration: 15, // Default duration for imported shots
            end: '', // Will be set by recalculation
            sceneNumber: shot.sceneNumber,
            shotNumber: shot.shotNumber,
            shotSize: shot.shotSize,
            angle: shot.angle,
            movement: shot.movement,
            lens: shot.lens,
            description: shot.description,
            notes: shot.notes,
            linkedShotId: shot.id,
            intExt: 'INT', dayNight: 'DAY', location: '', cast: '', props: '', costume: '',
        };
        return newShot;
    });
    
    // Copy and compress images from shot list to schedule
    const newImagePreviews = { ...imagePreviews };
    for (let i = 0; i < shotsToAdd.length; i++) {
        const shot = shotsToAdd[i];
        if (shotImagePreviews[shot.id]) {
            try {
                // Compress imported images
                StorageManager.compressImage(shotImagePreviews[shot.id], 600, 0.7).then(compressed => {
                    if (compressed) {
                        setImagePreviews(prev => ({ ...prev, [newTimelineItems[i].id]: compressed }));
                    }
                });
            } catch (error) {
                console.error('Failed to compress imported image:', error);
                newImagePreviews[newTimelineItems[i].id] = shotImagePreviews[shot.id];
            }
        }
    }
    
    setImagePreviews(newImagePreviews);
    recalculateAndUpdateTimes([...timelineItems, ...newTimelineItems]);
  }, [shotList, timelineItems, imagePreviews, recalculateAndUpdateTimes]);

  const stats = useMemo(() => {
    const totalDuration = timelineItems.reduce((sum, item) => sum + (item.duration || 0), 0);
    const shotCount = timelineItems.filter(item => item.type === 'shot').length;
    const breakTime = timelineItems.filter(item => item.type === 'break').reduce((sum, item) => sum + (item.duration || 0), 0);
    return { totalHours: Math.floor(totalDuration / 60), totalMinutes: totalDuration % 60, shotCount, breakHours: Math.floor(breakTime / 60), breakMinutes: breakTime % 60 };
  }, [timelineItems]);

  const handleExportProject = () => {
    // Explicitly construct the project object to ensure the ID is always included.
    const fullProject = {
      ...project,
      id: project.id || generateId(), // Fallback to generate a new ID if one doesn't exist
      data: { 
        ...project.data,
        headerInfo, 
        timelineItems, 
        imagePreviews 
      }
    };
    exportProject(fullProject);
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleDragEnd({ active, over }) {
    if (active && over && active.id !== over.id) {
      const oldIndex = timelineItems.findIndex(item => item.id === active.id);
      const newIndex = timelineItems.findIndex(item => item.id === over.id);
      recalculateAndUpdateTimes(arrayMove(timelineItems, oldIndex, newIndex));
    }
  }

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.05, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.05, 0.60));

  useEffect(() => { recalculateAndUpdateTimes(timelineItems); }, [headerInfo.callTime, recalculateAndUpdateTimes]);

  const dragModifiers = [({ transform }) => ({ ...transform, x: transform.x / zoomLevel, y: transform.y / zoomLevel })];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-x-hidden flex flex-col">
      <ShotImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        shotList={shotList}
        onImport={handleImportShots}
      />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='110' height='73.33' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cstyle%3E.pattern %7B width: 100%25; height: 100%25; --s: 110px; --c1: %23dedede; --c2: %23ededed; --c3: %23d6d6d6; --_g: var(--c1) 10%25,var(--c2) 10.5%25 19%25,%230000 19.5%25 80.5%25,var(--c2) 81%25 89.5%25,var(--c3) 90%25; --_c: from -90deg at 37.5%25 50%25,%230000 75%25; --_l1: linear-gradient(145deg,var(--_g)); --_l2: linear-gradient( 35deg,var(--_g)); background: var(--_l1), var(--_l1) calc(var(--s)/2) var(--s), var(--_l2), var(--_l2) calc(var(--s)/2) var(--s), conic-gradient(var(--_c),var(--c1) 0) calc(var(--s)/8) 0, conic-gradient(var(--_c),var(--c3) 0) calc(var(--s)/2) 0, linear-gradient(90deg,var(--c3) 38%25,var(--c1) 0 50%25,var(--c3) 0 62%25,var(--c1) 0); background-size: var(--s) calc(2*var(--s)/3); %7D%3C/style%3E%3C/defs%3E%3CforeignObject width='100%25' height='100%25'%3E%3Cdiv class='pattern' xmlns='http://www.w3.org/1999/xhtml'%3E%3C/div%3E%3C/foreignObject%3E%3C/svg%3E")` }}></div>
      <div className="relative z-10 flex flex-col flex-grow">
        <header className="w-screen bg-white shadow-sm border-b border-gray-100 fixed top-0 z-40">
          <div className="px-6"><div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
              <div><h1 className="text-xl font-semibold text-gray-900">{headerInfo.projectTitle || 'Untitled Project'}</h1><p className="text-xs text-gray-500">Shooting Schedule Editor</p></div>
            </div>
            <div className="flex items-center gap-3">
              <SaveStatusIndicator status={saveStatus} />
              <div className="h-6 w-px bg-gray-200"></div>
              <button onClick={handleExportProject} className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"><FileDown className="w-4 h-4" /><span className="hidden sm:inline">Save .mbd</span></button>
              <button onClick={() => exportToPDF(headerInfo, timelineItems, stats, imagePreviews)} className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"><Download className="w-4 h-4" /><span className="hidden sm:inline">Export PDF</span></button>
            </div>
          </div></div>
        </header>

        <main className="flex-1 p-8 pt-24">
          <div className="mb-6">
            <button onClick={() => setShowProductionDetails(!showProductionDetails)} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <Settings className="w-4 h-4 text-gray-700" />
              <span className="font-medium text-gray-900">Production Details</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showProductionDetails ? 'rotate-180' : ''}`} />
            </button>
            {showProductionDetails && (
              <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Film className="w-4 h-4 text-gray-600" />Project Information</h3>
                    <div className="space-y-3">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label><input type="text" value={headerInfo.projectTitle} onChange={(e) => setHeaderInfo({ ...headerInfo, projectTitle: e.target.value })} className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Episode #</label><input type="text" value={headerInfo.episodeNumber} placeholder="Ep. No." onChange={(e) => setHeaderInfo({ ...headerInfo, episodeNumber: e.target.value })} className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Day/Total</label><div className="flex items-center gap-2"><input type="text" value={headerInfo.shootingDay} onChange={(e) => setHeaderInfo({ ...headerInfo, shootingDay: e.target.value })} className="text-gray-500 w-14 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center transition-all" placeholder="1" /><span className="text-gray-500">/</span><input type="text" value={headerInfo.totalDays} onChange={(e) => setHeaderInfo({ ...headerInfo, totalDays: e.target.value })} className="text-gray-500 w-14 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center transition-all" placeholder="3" /></div></div>
                      </div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Shooting Date</label><input type="date" value={headerInfo.date} onChange={(e) => setHeaderInfo({ ...headerInfo, date: e.target.value })} className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-600" />Time & Location</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Call Time</label><input type="time" value={headerInfo.callTime} onChange={(e) => setHeaderInfo({ ...headerInfo, callTime: e.target.value })} className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Wrap Time</label><input type="time" value={headerInfo.wrapTime} onChange={(e) => setHeaderInfo({ ...headerInfo, wrapTime: e.target.value })} className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1"><Sunrise className="w-3 h-3 inline mr-1" />Sunrise</label><input type="time" value={headerInfo.sunrise} onChange={(e) => setHeaderInfo({ ...headerInfo, sunrise: e.target.value })} className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1"><Sunset className="w-3 h-3 inline mr-1" />Sunset</label><input type="time" value={headerInfo.sunset} onChange={(e) => setHeaderInfo({ ...headerInfo, sunset: e.target.value })} className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      </div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Location 1</label><input type="text" value={headerInfo.location1} onChange={(e) => setHeaderInfo({ ...headerInfo, location1: e.target.value })} placeholder="Main location" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Location 2</label><input type="text" value={headerInfo.location2} onChange={(e) => setHeaderInfo({ ...headerInfo, location2: e.target.value })} placeholder="Secondary location (optional)" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><CloudRain className="w-4 h-4 text-gray-600" />Weather & Meals</h3>
                    <div className="space-y-3">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Weather Forecast</label><input type="text" value={headerInfo.weather} onChange={(e) => setHeaderInfo({ ...headerInfo, weather: e.target.value })} placeholder="Considerable cloudiness" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1"><Thermometer className="w-3 h-3 inline mr-1" />Temp</label><input type="text" value={headerInfo.temp} onChange={(e) => setHeaderInfo({ ...headerInfo, temp: e.target.value })} placeholder="34°" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Real Feel</label><input type="text" value={headerInfo.realFeel} onChange={(e) => setHeaderInfo({ ...headerInfo, realFeel: e.target.value })} placeholder="37°" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      </div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1"><CloudDrizzle className="w-3 h-3 inline mr-1" />Precipitation %</label><input type="text" value={headerInfo.precipProb} onChange={(e) => setHeaderInfo({ ...headerInfo, precipProb: e.target.value })} placeholder="73%" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1"><Coffee className="w-3 h-3 inline mr-1" />First Meal</label><input type="time" value={headerInfo.firstmealTime} onChange={(e) => setHeaderInfo({ ...headerInfo, firstmealTime: e.target.value })} className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1"><Moon className="w-3 h-3 inline mr-1" />Second Meal</label><input type="time" value={headerInfo.secondmealTime} onChange={(e) => setHeaderInfo({ ...headerInfo, secondmealTime: e.target.value })} className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-gray-600" />Key Crew</h3>
                    <div className="space-y-3">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Producer</label><input type="text" value={headerInfo.producer} onChange={(e) => setHeaderInfo({ ...headerInfo, producer: e.target.value })} placeholder="Name & Phone" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Director</label><input type="text" value={headerInfo.director} onChange={(e) => setHeaderInfo({ ...headerInfo, director: e.target.value })} placeholder="Name & Phone" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Production Designer</label><input type="text" value={headerInfo.pd} onChange={(e) => setHeaderInfo({ ...headerInfo, pd: e.target.value })} placeholder="Name & Phone" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Director of Photography</label><input type="text" value={headerInfo.dop} onChange={(e) => setHeaderInfo({ ...headerInfo, dop: e.target.value })} placeholder="Name & Phone" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">1st AD</label><input type="text" value={headerInfo.firstAD} onChange={(e) => setHeaderInfo({ ...headerInfo, firstAD: e.target.value })} placeholder="Name & Phone" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">2nd AD</label><input type="text" value={headerInfo.secondAD} onChange={(e) => setHeaderInfo({ ...headerInfo, secondAD: e.target.value })} placeholder="Name & Phone" className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Duration</p><p className="text-2xl font-semibold text-gray-900">{stats.totalHours}h {stats.totalMinutes}m</p></div><div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center"><Clock className="w-6 h-6 text-indigo-600" /></div></div></div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Shots</p><p className="text-2xl font-semibold text-gray-900">{stats.shotCount}</p></div><div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Film className="w-6 h-6 text-purple-600" /></div></div></div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Break Time</p><p className="text-2xl font-semibold text-gray-900">{stats.breakHours}h {stats.breakMinutes}m</p></div><div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center"><Coffee className="w-6 h-6 text-amber-600" /></div></div></div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Est. Wrap</p><p className="text-2xl font-semibold text-gray-900">{timelineItems.length > 0 ? timelineItems[timelineItems.length - 1].end : '--:--'}</p></div><div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><Check className="w-6 h-6 text-green-600" /></div></div></div>
          </div>

          <div className="flex gap-3 mb-6">
            <button onClick={addShot} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"><Plus className="w-4 h-4" />Add Shot</button>
            <button onClick={addBreak} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"><Coffee className="w-4 h-4" />Add Break</button>
            <div className="w-px bg-gray-300 mx-2"></div>
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"><ListPlus className="w-4 h-4" />Import from Shot List</button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div
              ref={tableContainerRef}
              className="overflow-x-auto"
              style={{ zoom: zoomLevel }}
            >
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
                modifiers={dragModifiers}
              >
                <table className="w-full" style={{ minWidth: '2400px' }} ref={tableRef}>
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20"><tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Dur.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Scene</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Shot</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">INT/EXT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Angle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Movement</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Lens</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Cast</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Props</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Costume</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    <SortableContext items={timelineItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                      {timelineItems.map((item, index) => <SortableItem key={item.id} id={item.id} item={item} index={index} imagePreviews={imagePreviews} handleItemChange={handleItemChange} handleImageUpload={handleImageUpload} removeTimelineItem={removeTimelineItem} handleRemoveImage={handleRemoveImage} activeImageUploadId={activeImageUploadId} setActiveImageUploadId={setActiveImageUploadId} />)}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
              {timelineItems.length === 0 && <div className="text-center py-16"><Film className="mx-auto h-12 w-12 text-gray-300 mb-4" /><p className="text-gray-500">No shots added yet</p><p className="text-sm text-gray-400 mt-2">Click "Add Shot" to start building your schedule</p></div>}
            </div>
          </div>
        </main>

        <div ref={floatingScrollbarRef} className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 overflow-x-auto transition-opacity duration-200" style={{ opacity: showFloatingScrollbar ? 1 : 0, pointerEvents: showFloatingScrollbar ? 'auto' : 'none', height: '20px' }}>
          <div ref={floatingScrollbarContentRef} style={{ height: '1px' }}></div>
        </div>

        <div className="fixed bottom-10 right-2 z-50 flex items-center gap-1">
            <div className={`flex flex-col items-center gap-2 transition-all duration-300 ease-in-out ${showZoomControls ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                <button
                    onClick={handleZoomIn}
                    className="w-8 h-8 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                    title="Zoom In"
                >
                    <Plus className="w-4 h-4 text-gray-700" />
                </button>
                <span className="text-xs font-bold text-gray-600 bg-white/80 backdrop-blur-sm py-1 px-2 rounded-full border border-gray-200">
                    {Math.round(zoomLevel * 100)}%
                </span>
                <button
                    onClick={handleZoomOut}
                    className="w-8 h-8 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                    title="Zoom Out"
                >
                    <Minus className="w-4 h-4 text-gray-700" />
                </button>
            </div>

            <button
                onClick={() => setShowZoomControls(!showZoomControls)}
                className="w-8 h-8 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                title={showZoomControls ? 'Hide Controls' : 'Show Controls'}
            >
                <ChevronsRight className={`w-5 h-5 text-gray-700 transition-transform duration-300 ${showZoomControls ? '' : 'rotate-180'}`} />
            </button>
        </div>

      </div>
    </div>
  );
}