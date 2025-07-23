'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Clock, Film, Plus, Save, ChevronDown, Trash2, Download, Settings,
  FileDown, CloudRain, Github, ArrowLeft, Users, MapPin, Sunrise, Sunset, Thermometer,
  CloudDrizzle, Coffee, Moon, Loader2, Check, CloudOff, Image as ImageIcon, X, Minus
} from 'lucide-react';
import { generateId } from '../utils/id';
import { calculateEndTime, calculateDuration } from '../utils/time';
import { exportProject } from '../utils/file';
import { exportToPDF } from '../utils/pdf';
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

// Sortable timeline item (table row) component
function SortableItem({ id, item, index, imagePreviews, handleItemChange, handleImageUpload, handlePasteImage, removeTimelineItem, handleRemoveImage }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isBreak = item.type === 'break';
  const isFirstItem = index === 0;

  return (
    <tr ref={setNodeRef} style={style} className={`group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${isBreak ? 'bg-amber-50' : ''}`}>
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
          <td className="px-4 py-3"><select value={item.shotSize} onChange={(e) => handleItemChange(item.id, 'shotSize', e.target.value)} className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
              <option value="">Select...</option><option value="ECU">ECU - Extreme Close Up</option><option value="CU">CU - Close Up</option><option value="MCU">MCU - Medium Close Up</option><option value="MS">MS - Medium Shot</option><option value="MLS">MLS - Medium Long Shot</option><option value="LS">LS - Long Shot</option><option value="WS">WS - Wide Shot</option><option value="EWS">EWS - Extreme Wide Shot</option><option value="OTS">OTS - Over the Shoulder</option><option value="POV">POV - Point of View</option><option value="2S">2S - Two Shot</option><option value="3S">3S - Three Shot</option><option value="INS">INS - Insert</option><option value="CUTAWAY">Cutaway</option>
            </select></td>
          <td className="px-4 py-3"><select value={item.angle} onChange={(e) => handleItemChange(item.id, 'angle', e.target.value)} className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
              <option value="">Select...</option><option value="Eye Level">Eye Level</option><option value="High Angle">High Angle</option><option value="Low Angle">Low Angle</option><option value="Dutch/Canted">Dutch/Canted</option><option value="Bird's Eye">Bird's Eye View</option><option value="Worm's Eye">Worm's Eye View</option><option value="Over Head">Over Head</option><option value="Hip Level">Hip Level</option><option value="Knee Level">Knee Level</option><option value="Ground Level">Ground Level</option><option value="Shoulder Level">Shoulder Level</option><option value="Top 45">Top 45°</option><option value="Profile">Profile (90°)</option><option value="3/4 Front">3/4 Front</option><option value="3/4 Back">3/4 Back</option>
            </select></td>
          <td className="px-4 py-3"><select value={item.movement} onChange={(e) => handleItemChange(item.id, 'movement', e.target.value)} className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
              <option value="">Select...</option><option value="Still">Still</option><option value="Pan Left">Pan Left</option><option value="Pan Right">Pan Right</option><option value="Tilt Up">Tilt Up</option><option value="Tilt Down">Tilt Down</option><option value="Dolly In">Dolly In</option><option value="Dolly Out">Dolly Out</option><option value="Dolly Left">Dolly Left</option><option value="Dolly Right">Dolly Right</option><option value="Truck Left">Truck Left</option><option value="Truck Right">Truck Right</option><option value="Zoom In">Zoom In</option><option value="Zoom Out">Zoom Out</option><option value="Handheld">Handheld</option><option value="Handheld (Ronin)">Handheld (Ronin)</option><option value="Steadicam">Steadicam</option><option value="Crane Up">Crane Up</option><option value="Crane Down">Crane Down</option><option value="Jib">Jib</option><option value="Track">Track</option><option value="Arc Left">Arc Left</option><option value="Arc Right">Arc Right</option><option value="360°">360° Rotation</option><option value="Whip Pan">Whip Pan</option><option value="Push In">Push In</option><option value="Pull Out">Pull Out</option><option value="Follow">Follow</option><option value="Lead">Lead</option>
            </select></td>
          <td className="px-4 py-3"><div className="flex items-center gap-1"><input type="number" value={item.lens ? item.lens.replace('mm', '').trim() : ''} onChange={(e) => handleItemChange(item.id, 'lens', e.target.value)} className="text-gray-600 w-16 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="50" /><span className="text-sm text-gray-500">mm</span></div></td>
          <td className="px-4 py-3"><textarea value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="text-gray-600 w-52 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" placeholder="Scene description" rows="2" /></td>
          <td className="px-4 py-3"><input type="text" value={item.cast} onChange={(e) => handleItemChange(item.id, 'cast', e.target.value)} className="text-gray-600 w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="Cast" /></td>
          <td className="px-4 py-3" onPaste={(e) => handlePasteImage(e, item.id)}>
            <div className="flex flex-col items-center gap-2">
              {imagePreviews[item.id] ? (
                <div className="relative group"><img src={imagePreviews[item.id]} alt={`Ref for ${item.shotNumber}`} className="w-20 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(imagePreviews[item.id], '_blank')} /><button onClick={() => handleRemoveImage(item.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button></div>
              ) : (
                <div className="w-20 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-400" /></div>
              )}
              <input type="file" accept="image/*" id={`image-${item.id}`} onChange={(e) => handleImageUpload(item.id, e.target.files[0])} className="hidden" />
              <label htmlFor={`image-${item.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors">{imagePreviews[item.id] ? 'Change' : 'Upload'}</label>
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
  const debounceTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const tableContainerRef = useRef(null);
  const floatingScrollbarRef = useRef(null);
  const floatingScrollbarContentRef = useRef(null);
  const [showFloatingScrollbar, setShowFloatingScrollbar] = useState(false);
  const isSyncingScroll = useRef(false);

  // --- START: AUTOSAVE FIX ---

  // Stringify the data to create a stable, primitive dependency for the useEffect hook.
  const stringifiedData = useMemo(() => JSON.stringify({ headerInfo, timelineItems, imagePreviews }), [headerInfo, timelineItems, imagePreviews]);

  // Keep a ref to the onSave prop to prevent it from being a dependency.
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  // This is the new, robust autosave effect.
    useEffect(() => {
    onSaveRef.current = onSave;
  });

  // This is the new, robust autosave effect.
  useEffect(() => {
    // Don't save on the initial render.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('dirty');

    // Clear any existing timer.
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timer to save the data.
    debounceTimeoutRef.current = setTimeout(() => {
      const dataToSave = JSON.parse(stringifiedData);
      
      // Set status to "saving" so the user sees feedback.
      setSaveStatus('saving');
      
      // Use a promise chain with an artificial delay to ensure the "saving" state is visible.
      Promise.resolve()
        // 1. Artificially wait for 500ms to simulate a network request.
        .then(() => new Promise(resolve => setTimeout(resolve, 500)))
        // 2. Perform the actual save.
        .then(() => onSaveRef.current(dataToSave))
        // 3. Update status to "saved".
        .then(() => {
          setSaveStatus('saved');
          // 4. Wait before returning to the idle state.
          return new Promise(resolve => setTimeout(resolve, 2500));
        })
        // 5. Return to idle.
        .then(() => {
          setSaveStatus('idle');
        });
    }, 1000);

    // Cleanup the timer if the component unmounts or the effect re-runs.
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  // The effect ONLY runs when the stringified data has actually changed.
  }, [stringifiedData]);

  // --- END: AUTOSAVE FIX ---


  // Floating scrollbar logic
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
      tableContainer.removeEventListener('scroll', handleTableScroll);
      floatingScrollbar.removeEventListener('scroll', handleFloatingScroll);
      window.removeEventListener('resize', updateScrollbar);
      window.removeEventListener('scroll', updateScrollbar, true);
    };
  }, [timelineItems, zoomLevel]);

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
    const newShot = { id: generateId(), type: 'shot', start: newStartTime, duration: 10, end: '', sceneNumber: '', shotNumber: '', intExt: 'INT', dayNight: 'DAY', location: '', description: '', cast: '', shotSize: 'MS', angle: 'Eye Level', movement: 'Still', lens: '', props: '', costume: '', notes: '', imageUrl: '' };
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

  const handleImageUpload = useCallback((itemId, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreviews(prev => ({ ...prev, [itemId]: reader.result as string }));
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback((itemId) => {
    setImagePreviews(prev => { const newPreviews = { ...prev }; delete newPreviews[itemId]; return newPreviews; });
  }, []);

  const handlePasteImage = useCallback((e, itemId) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); handleImageUpload(itemId, file); return; }
      }
    }
  }, [handleImageUpload]);

  const stats = useMemo(() => {
    const totalDuration = timelineItems.reduce((sum, item) => sum + (item.duration || 0), 0);
    const shotCount = timelineItems.filter(item => item.type === 'shot').length;
    const breakTime = timelineItems.filter(item => item.type === 'break').reduce((sum, item) => sum + (item.duration || 0), 0);
    return { totalHours: Math.floor(totalDuration / 60), totalMinutes: totalDuration % 60, shotCount, breakHours: Math.floor(breakTime / 60), breakMinutes: breakTime % 60 };
  }, [timelineItems]);

  const handleExportProject = () => exportProject({ ...project, data: { headerInfo, timelineItems, imagePreviews } });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleDragEnd({ active, over }) {
    if (active && over && active.id !== over.id) {
      const oldIndex = timelineItems.findIndex(item => item.id === active.id);
      const newIndex = timelineItems.findIndex(item => item.id === over.id);
      recalculateAndUpdateTimes(arrayMove(timelineItems, oldIndex, newIndex));
    }
  }

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.05, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.05, 0.75));

  useEffect(() => { recalculateAndUpdateTimes(timelineItems); }, [headerInfo.callTime, recalculateAndUpdateTimes]);

  // This is the new modifier to correct drag-and-drop coordinates based on zoom level
  const dragModifiers = [
    ({ transform }) => {
      return {
        ...transform,
        x: transform.x / zoomLevel,
        y: transform.y / zoomLevel,
      };
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-x-hidden flex flex-col">
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
              <button onClick={handleExportProject} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"><FileDown className="w-4 h-4" /><span className="hidden sm:inline">Save .mbd</span></button>
              <button onClick={() => exportToPDF(headerInfo, timelineItems, stats, imagePreviews)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"><Download className="w-4 h-4" /><span className="hidden sm:inline">Export PDF</span></button>
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
                <table className="w-full" style={{ minWidth: '2400px' }}>
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
                      {timelineItems.map((item, index) => <SortableItem key={item.id} id={item.id} item={item} index={index} imagePreviews={imagePreviews} handleItemChange={handleItemChange} handleImageUpload={handleImageUpload} handlePasteImage={handlePasteImage} removeTimelineItem={removeTimelineItem} handleRemoveImage={handleRemoveImage} />)}
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

        <div className="fixed bottom-10 right-6 z-50 flex flex-col items-center gap-2">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
            title="Zoom In"
          >
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-xs font-bold text-gray-600 bg-white/80 backdrop-blur-sm py-1 px-2 rounded-full border border-gray-200">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
            title="Zoom Out"
          >
            <Minus className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
}