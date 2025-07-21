'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Film, Plus, Save, Trash2, Download, ArrowLeft,
  Loader2, Check, CloudOff, Image as ImageIcon, X, List, Camera
} from 'lucide-react';
import { generateId } from '@/utils/id';
import { exportProject } from '@/utils/file';
// A new PDF export utility will be needed for the shot list format
// For now, we can imagine a utility like this:
// import { exportShotListToPDF } from '@/utils/pdf'; 
import Footer from '@/components/Footer';

// Save status indicator component (reusable)
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

// Sortable shot list item (table row) component
function SortableItem({ id, item, index, imagePreviews, handleItemChange, handleImageUpload, handlePasteImage, removeShotItem, handleRemoveImage }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className={`group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
      <td className="px-2 py-3 whitespace-nowrap text-center"><button {...attributes} {...listeners} className="cursor-grab p-1 text-gray-400 hover:text-gray-600 transition-colors"><GripVertical size={16} /></button></td>
      <td className="px-4 py-3"><input type="text" value={item.sceneNumber} onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)} className="text-gray-600 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all" placeholder="1A" /></td>
      <td className="px-4 py-3"><input type="text" value={item.shotNumber} onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)} className="text-gray-600 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all" placeholder="001" /></td>
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
      <td className="px-4 py-3"><textarea value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="text-gray-600 w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" placeholder="Shot description" rows="2" /></td>
      <td className="px-4 py-3" onPaste={(e) => handlePasteImage(e, item.id)}>
        <div className="flex flex-col items-center gap-2">
          {imagePreviews[item.id] ? (
            <div className="relative group"><img src={imagePreviews[item.id]} alt={`Ref for ${item.shotNumber}`} className="w-24 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(imagePreviews[item.id], '_blank')} /><button onClick={() => handleRemoveImage(item.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button></div>
          ) : (
            <div className="w-24 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-400" /></div>
          )}
          <input type="file" accept="image/*" id={`image-${item.id}`} onChange={(e) => handleImageUpload(item.id, e.target.files[0])} className="hidden" />
          <label htmlFor={`image-${item.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors">{imagePreviews[item.id] ? 'Change' : 'Upload'}</label>
        </div>
      </td>
      <td className="px-4 py-3"><textarea value={item.notes} onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} className="text-gray-600 w-52 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all" placeholder="Notes" rows="2" /></td>
      <td className="px-4 py-3 whitespace-nowrap text-center"><button onClick={() => removeShotItem(item.id)} className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button></td>
    </tr>
  );
}

// Main editor component
export default function ShotListEditor({ project, onBack, onSave }) {
  const [projectTitle, setProjectTitle] = useState(() => project?.name || 'Untitled Project');
  const [shotListItems, setShotListItems] = useState(() => project?.data?.shotListData?.shotListItems || []);
  const [imagePreviews, setImagePreviews] = useState(() => project?.data?.shotListData?.imagePreviews || {});
  const [saveStatus, setSaveStatus] = useState('idle');
  const debounceTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  // Autosave effect
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    setSaveStatus('dirty');
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      await new Promise(resolve => setTimeout(resolve, 500));
      // Save data under the 'shotListData' key
      onSave({ shotListData: { shotListItems, imagePreviews } });
      setSaveStatus('saved');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSaveStatus('idle');
    }, 1200);
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [shotListItems, imagePreviews, onSave]);

  const handleItemChange = useCallback((itemId, field, value) => {
    setShotListItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const addShot = useCallback(() => {
    const newShot = { id: generateId(), sceneNumber: '', shotNumber: '', shotSize: 'MS', angle: 'Eye Level', movement: 'Still', lens: '', description: '', notes: '', imageUrl: '' };
    setShotListItems(prev => [...prev, newShot]);
  }, []);

  const removeShotItem = useCallback((itemId) => {
    setShotListItems(prevItems => prevItems.filter(item => item.id !== itemId));
    if (imagePreviews[itemId]) {
      const newPreviews = { ...imagePreviews };
      delete newPreviews[itemId];
      setImagePreviews(newPreviews);
    }
  }, [imagePreviews]);

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

  const stats = useMemo(() => ({
    shotCount: shotListItems.length,
  }), [shotListItems]);

  const handleExportProject = () => exportProject({ ...project, data: { ...project.data, shotListData: { shotListItems, imagePreviews } } });
  
  // Dummy export function for now
  const handleExportPDF = () => {
    alert("Exporting Shot List to PDF is not yet implemented.");
    // exportShotListToPDF(projectTitle, shotListItems, imagePreviews);
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleDragEnd({ active, over }) {
    if (active && over && active.id !== over.id) {
      setShotListItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-x-hidden flex flex-col">
       <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='110' height='73.33' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cstyle%3E.pattern %7B width: 100%25; height: 100%25; --s: 110px; --c1: %23dedede; --c2: %23ededed; --c3: %23d6d6d6; --_g: var(--c1) 10%25,var(--c2) 10.5%25 19%25,%230000 19.5%25 80.5%25,var(--c2) 81%25 89.5%25,var(--c3) 90%25; --_c: from -90deg at 37.5%25 50%25,%230000 75%25; --_l1: linear-gradient(145deg,var(--_g)); --_l2: linear-gradient( 35deg,var(--_g)); background: var(--_l1), var(--_l1) calc(var(--s)/2) var(--s), var(--_l2), var(--_l2) calc(var(--s)/2) var(--s), conic-gradient(var(--_c),var(--c1) 0) calc(var(--s)/8) 0, conic-gradient(var(--_c),var(--c3) 0) calc(var(--s)/2) 0, linear-gradient(90deg,var(--c3) 38%25,var(--c1) 0 50%25,var(--c3) 0 62%25,var(--c1) 0); background-size: var(--s) calc(2*var(--s)/3); %7D%3C/style%3E%3C/defs%3E%3CforeignObject width='100%25' height='100%25'%3E%3Cdiv class='pattern' xmlns='http://www.w3.org/1999/xhtml'%3E%3C/div%3E%3C/foreignObject%3E%3C/svg%3E")` }}></div>
      <div className="relative z-10 flex flex-col flex-grow">
        <header className="w-screen bg-white shadow-sm border-b border-gray-100 fixed top-0 z-40">
          <div className="px-6"><div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
              <div><h1 className="text-xl font-semibold text-gray-900">{projectTitle}</h1><p className="text-xs text-gray-500">Shot List Editor</p></div>
            </div>
            <div className="flex items-center gap-3">
              <SaveStatusIndicator status={saveStatus} />
              <div className="h-6 w-px bg-gray-200"></div>
              <button onClick={handleExportProject} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"><Save className="w-4 h-4" /><span className="hidden sm:inline">Save .mbd</span></button>
              <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"><Download className="w-4 h-4" /><span className="hidden sm:inline">Export PDF</span></button>
            </div>
          </div></div>
        </header>

        <main className="flex-1 p-8 pt-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
             <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Shots</p><p className="text-2xl font-semibold text-gray-900">{stats.shotCount}</p></div><div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Camera className="w-6 h-6 text-purple-600" /></div></div></div>
          </div>

          <div className="flex gap-3 mb-6">
            <button onClick={addShot} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"><Plus className="w-4 h-4" />Add Shot</button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <table className="w-full" style={{ minWidth: '1600px' }}>
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20"><tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Scene</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Shot</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Angle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Movement</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Lens</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    <SortableContext items={shotListItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                      {shotListItems.map((item, index) => <SortableItem key={item.id} id={item.id} item={item} index={index} imagePreviews={imagePreviews} handleItemChange={handleItemChange} handleImageUpload={handleImageUpload} handlePasteImage={handlePasteImage} removeShotItem={removeShotItem} handleRemoveImage={handleRemoveImage} />)}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
              {shotListItems.length === 0 && <div className="text-center py-16"><List className="mx-auto h-12 w-12 text-gray-300 mb-4" /><p className="text-gray-500">No shots added yet</p><p className="text-sm text-gray-400 mt-2">Click "Add Shot" to start building your shot list</p></div>}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
