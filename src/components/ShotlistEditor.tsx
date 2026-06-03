'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
  LayoutGrid, Eye, Edit3, Move3D, Aperture, FileText, StickyNote, Hash, ChevronsRight,
  Undo2, Redo2
} from 'lucide-react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { DarkSelect, findOption, SHOT_SIZE_OPTIONS, ANGLE_OPTIONS, MOVEMENT_OPTIONS, SelectOption } from './DarkSelect';
// --- Important: Make sure the path to your db helper and pdf utility is correct ---
import { exportShotListToPDF } from '../utils/shotpdf'; 
import { setImage, getImage, deleteImage } from '../utils/db'; 
import { isFirebaseEnabled, uploadImageToStorage } from '../lib/firebase';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

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
  focusedItemId: string | null;
  setFocusedItemId: (id: string | null) => void;
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
      case 'saving': return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Saving...', style: { color: 'var(--text-muted)' } };
      case 'dirty': return { icon: <CloudOff className="w-4 h-4" />, text: 'Unsaved changes', style: { color: 'var(--accent-amber)' } };
      case 'saved': return { icon: <Check className="w-4 h-4" />, text: 'Saved', style: { color: 'var(--accent-green)' } };
      default: return { icon: <Save className="w-4 h-4" />, text: 'All changes saved', style: { color: 'var(--text-muted)' } };
    }
  };
  const { icon, text, style } = getStatusDisplay();
  return (
    <div style={{ ...style, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, transition: 'all 0.3s' }}>
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </div>
  );
};

const SortableCard: React.FC<SortableItemProps> = ({ id, item, imagePreviews, activeImageUploadId, setActiveImageUploadId, handleItemChange, handleImageUpload, removeShotItem, handleRemoveImage, focusedItemId, setFocusedItemId }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isActiveForUpload = activeImageUploadId === item.id;
  const isFocused = focusedItemId === item.id;

  return (
    <div
      ref={setNodeRef}
      onFocusCapture={() => setFocusedItemId(item.id)}
      onClickCapture={() => setFocusedItemId(item.id)}
      className={`group`}
      style={{
        ...style,
        background: 'var(--bg-elevated)',
        border: `1px solid ${isFocused ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
        borderRadius: '14px',
        boxShadow: isFocused ? '0 0 0 3px var(--accent-glow-sm)' : 'var(--shadow-sm)',
        transition: 'all 0.25s',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
        borderRadius: '14px 14px 0 0',
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button {...attributes} {...listeners} style={{ cursor: 'grab', padding: '6px', color: 'var(--text-muted)', background: 'transparent', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <GripVertical size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.sceneNumber}
                    onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)}
                    className="no-style"
                    style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', width: `${Math.max(String(item.sceneNumber).length, 2)}ch`, padding: 0 }}
                    placeholder="1A"
                  />
                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                  <input
                    type="text"
                    value={item.shotNumber}
                    onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)}
                    className="no-style"
                    style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', width: `${Math.max(String(item.shotNumber).length, 3)}ch`, padding: 0 }}
                    placeholder="001"
                  />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Scene - Shot</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => removeShotItem(item.id)}
            className="opacity-0 group-hover:opacity-100"
            style={{ padding: '6px', color: 'var(--text-muted)', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }} className="shotlist-image-container">
          {imagePreviews[item.id] ? (
            <div className="relative group/img" onClick={() => setActiveImageUploadId(isActiveForUpload ? null : item.id)}>
              <img
                src={imagePreviews[item.id]}
                alt={`Ref for ${item.shotNumber}`}
                style={{ width: '128px', height: '96px', objectFit: 'cover', borderRadius: '10px', border: `2px solid ${isActiveForUpload ? 'var(--accent-primary)' : 'var(--border-default)'}`, cursor: 'pointer' }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveImage(item.id); }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label htmlFor={`image-${item.id}`} onClick={() => setActiveImageUploadId(isActiveForUpload ? null : item.id)} style={{ width: '128px', height: '96px', borderRadius: '10px', border: `2px dashed ${isActiveForUpload ? 'var(--accent-primary)' : 'var(--border-default)'}`, background: isActiveForUpload ? 'var(--accent-glow-sm)' : 'var(--bg-input)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
              <ImageIcon style={{ width: '22px', height: '22px', color: 'var(--text-muted)', marginBottom: '4px' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Add Reference</span>
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

        {/* Size + Angle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              <Eye className="w-3 h-3" />Size
            </label>
            <DarkSelect<SelectOption>
              instanceId={`size-${item.id}`}
              options={SHOT_SIZE_OPTIONS}
              value={findOption(SHOT_SIZE_OPTIONS, item.shotSize)}
              onChange={(opt) => handleItemChange(item.id, 'shotSize', (opt as SelectOption)?.value ?? '')}
              placeholder="Select Size..."
              isClearable
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              <Edit3 className="w-3 h-3" />Angle
            </label>
            <DarkSelect<SelectOption>
              instanceId={`angle-${item.id}`}
              options={ANGLE_OPTIONS}
              value={findOption(ANGLE_OPTIONS, item.angle)}
              onChange={(opt) => handleItemChange(item.id, 'angle', (opt as SelectOption)?.value ?? '')}
              placeholder="Select Angle..."
              isClearable
            />
          </div>
        </div>

        {/* Movement + Lens — same grid, same height */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              <Move3D className="w-3 h-3" />Movement
            </label>
            <DarkSelect<SelectOption>
              instanceId={`movement-${item.id}`}
              options={MOVEMENT_OPTIONS}
              value={findOption(MOVEMENT_OPTIONS, item.movement)}
              onChange={(opt) => handleItemChange(item.id, 'movement', (opt as SelectOption)?.value ?? '')}
              placeholder="Select Movement..."
              isClearable
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              <Aperture className="w-3 h-3" />Lens
            </label>
            {/* Lens is a plain number input — we match DarkSelect's control height (36px) manually */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                value={item.lens ? item.lens.replace('mm', '').trim() : ''}
                onChange={(e) => handleItemChange(item.id, 'lens', e.target.value ? `${e.target.value}mm` : '')}
                placeholder="50"
                className="no-style"
                style={{
                  width: '100%', height: '36px',
                  padding: '0 32px 0 10px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow-sm)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <span style={{ position: 'absolute', right: '10px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', pointerEvents: 'none' }}>mm</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            <FileText className="w-3 h-3" />Description
          </label>
          <textarea
            value={item.description}
            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
            placeholder="Describe the shot..."
            rows={2}
            className="no-style"
            style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            <StickyNote className="w-3 h-3" />Notes
          </label>
          <textarea
            value={item.notes}
            onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            className="no-style"
            style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />
        </div>
      </div>
    </div>
  );
}

const SortableRow: React.FC<SortableItemProps> = ({ id, item, index, imagePreviews, activeImageUploadId, setActiveImageUploadId, handleItemChange, handleImageUpload, removeShotItem, handleRemoveImage, focusedItemId, setFocusedItemId }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isActiveForUpload = activeImageUploadId === item.id;
  const isFocused = focusedItemId === item.id;

  const isEvenRow = index % 2 !== 0;
  const rowBg = isEvenRow
    ? 'var(--bg-table-striped)'
    : 'var(--bg-elevated)';

  return (
    <tr
      ref={setNodeRef}
      onFocusCapture={() => setFocusedItemId(item.id)}
      onClickCapture={() => setFocusedItemId(item.id)}
      style={{
        ...style,
        background: rowBg,
      }}
      className="group"
    >
      <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap', borderLeft: isFocused ? '3px solid var(--accent-primary)' : '3px solid transparent' }}>
        <button {...attributes} {...listeners} style={{ cursor: 'grab', padding: '6px', color: 'var(--text-muted)', background: 'transparent', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
          <GripVertical size={16} />
        </button>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <input type="text" value={item.sceneNumber} onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)} className="no-style" style={{ width: '60px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center', outline: 'none' }} placeholder="1A" />
      </td>
      <td style={{ padding: '10px 12px' }}>
        <input type="text" value={item.shotNumber} onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)} className="no-style" style={{ width: '60px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center', outline: 'none' }} placeholder="001" />
      </td>
      <td style={{ padding: '10px 12px', minWidth: '150px' }}>
        <DarkSelect<SelectOption>
          instanceId={`row-size-${item.id}`}
          options={SHOT_SIZE_OPTIONS}
          value={findOption(SHOT_SIZE_OPTIONS, item.shotSize)}
          onChange={(opt) => handleItemChange(item.id, 'shotSize', (opt as SelectOption)?.value ?? '')}
          placeholder="Size..."
          isClearable
        />
      </td>
      <td style={{ padding: '10px 12px', minWidth: '150px' }}>
        <DarkSelect<SelectOption>
          instanceId={`row-angle-${item.id}`}
          options={ANGLE_OPTIONS}
          value={findOption(ANGLE_OPTIONS, item.angle)}
          onChange={(opt) => handleItemChange(item.id, 'angle', (opt as SelectOption)?.value ?? '')}
          placeholder="Angle..."
          isClearable
        />
      </td>
      <td style={{ padding: '10px 12px', minWidth: '150px' }}>
        <DarkSelect<SelectOption>
          instanceId={`row-movement-${item.id}`}
          options={MOVEMENT_OPTIONS}
          value={findOption(MOVEMENT_OPTIONS, item.movement)}
          onChange={(opt) => handleItemChange(item.id, 'movement', (opt as SelectOption)?.value ?? '')}
          placeholder="Movement..."
          isClearable
        />
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input type="number" value={item.lens ? item.lens.replace('mm', '').trim() : ''} onChange={(e) => handleItemChange(item.id, 'lens', e.target.value ? `${e.target.value}mm` : '')} className="no-style" style={{ width: '72px', height: '36px', paddingLeft: '8px', paddingRight: '28px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} placeholder="50" />
          <span style={{ position: 'absolute', right: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', pointerEvents: 'none' }}>mm</span>
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <textarea value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="no-style" style={{ width: '260px', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} placeholder="Shot description" rows={2} />
      </td>
      <td style={{ padding: '10px 12px' }} onClick={() => setActiveImageUploadId(isActiveForUpload ? null : item.id)}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '6px', borderRadius: '8px', cursor: 'pointer', background: isActiveForUpload ? 'var(--accent-glow-sm)' : 'transparent', border: isActiveForUpload ? '1px solid var(--accent-primary)' : '1px solid transparent', transition: 'all 0.2s' }}>
          {imagePreviews[item.id] ? (
            <div className="relative group/img">
              <img src={imagePreviews[item.id]} alt={`Ref for ${item.shotNumber}`} style={{ width: '80px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-default)' }} />
              <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(item.id); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <label htmlFor={`image-row-${item.id}`} style={{ width: '80px', height: '64px', background: 'var(--bg-input)', borderRadius: '6px', border: '2px dashed var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
              <ImageIcon style={{ width: '20px', height: '20px', color: 'var(--text-muted)' }} />
            </label>
          )}
          <input type="file" accept="image/*" id={`image-row-${item.id}`} onChange={(e) => handleImageUpload(item.id, e.target.files ? e.target.files[0] : null)} className="hidden" />
          <label htmlFor={`image-row-${item.id}`} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
            {imagePreviews[item.id] ? 'Change' : 'Upload'}
          </label>
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <textarea value={item.notes} onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} className="no-style" style={{ width: '200px', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} placeholder="Notes" rows={2} />
      </td>
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', textAlign: 'center' }}>
        <button onClick={() => removeShotItem(item.id)} className="opacity-0 group-hover:opacity-100" style={{ padding: '6px', color: 'var(--text-muted)', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
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
  onBack = () => { },
  onSave = () => { }
}) => {
  const [docState, setDocState, { undo, redo, canUndo, canRedo }] = useUndoRedo(() => {
    return {
      projectTitle: project?.name || 'Untitled Project',
      shotListItems: (project?.data?.shotListData?.shotListItems || []) as ShotItem[],
      imagePreviews: {} as ImagePreviews
    };
  });

  const projectTitle = docState.projectTitle;
  const shotListItems = docState.shotListItems;
  const imagePreviews = docState.imagePreviews;

  const setProjectTitle = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    setDocState(prev => {
      const projectTitleVal = typeof newValOrFn === 'function' ? newValOrFn(prev.projectTitle) : newValOrFn;
      return {
        ...prev,
        projectTitle: projectTitleVal
      };
    }, options);
  }, [setDocState]);

  const setShotListItems = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    setDocState(prev => {
      const shotListItemsVal = typeof newValOrFn === 'function' ? newValOrFn(prev.shotListItems) : newValOrFn;
      return {
        ...prev,
        shotListItems: shotListItemsVal
      };
    }, options);
  }, [setDocState]);

  const setImagePreviews = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    setDocState(prev => {
      const imagePreviewsVal = typeof newValOrFn === 'function' ? newValOrFn(prev.imagePreviews) : newValOrFn;
      return {
        ...prev,
        imagePreviews: imagePreviewsVal
      };
    }, options);
  }, [setDocState]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(true);
  const [activeImageUploadId, setActiveImageUploadId] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false); // New state for PDF export loading
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; });

  useEffect(() => {
    const loadImages = async () => {
      const previews: ImagePreviews = {};
      for (const item of shotListItems) {
        if (item.imageUrl) {
          if (item.imageUrl.startsWith('http')) {
            previews[item.id] = item.imageUrl;
          } else {
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
      }
      setImagePreviews(previews);
    };

    if (shotListItems.length > 0) {
        loadImages();
    }

    return () => {
      Object.values(imagePreviews).forEach(url => {
        if (!url.startsWith('http')) {
          URL.revokeObjectURL(url);
        }
      });
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
    const isTextField = ['sceneNumber', 'shotNumber', 'lens', 'description', 'notes'].includes(field as string);
    setShotListItems(
      prevItems => prevItems.map(item => item.id === itemId ? { ...item, [field]: value } : item),
      { isContinuous: isTextField }
    );
  }, [setShotListItems]);

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
    
    // Always store in IndexedDB as a local fallback/copy
    await setImage(itemId, file);

    let finalImageUrl = 'true';
    if (isFirebaseEnabled) {
      try {
        finalImageUrl = await uploadImageToStorage(`projects/${project.id}/shots/${itemId}`, file);
      } catch (err) {
        console.error('Failed to upload image to Firebase Storage:', err);
      }
    }

    setShotListItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, imageUrl: finalImageUrl } : item
    ));

    setImagePreviews(prev => {
      if (prev[itemId] && !prev[itemId].startsWith('http')) {
        URL.revokeObjectURL(prev[itemId]);
      }
      return { 
        ...prev, 
        [itemId]: finalImageUrl.startsWith('http') ? finalImageUrl : URL.createObjectURL(file) 
      };
    });
    
    setActiveImageUploadId(null);
  }, [project?.id]);

  const handleRemoveImage = useCallback(async (itemId: string) => {
    await deleteImage(itemId);
    
    setShotListItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, imageUrl: '' } : item
    ));

    setImagePreviews(prev => {
      const newPreviews = { ...prev };
      if (newPreviews[itemId]) {
        if (!newPreviews[itemId].startsWith('http')) {
          URL.revokeObjectURL(newPreviews[itemId]);
        }
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

  const forceSave = useCallback(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
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
  }, [projectTitle, shotListItems]);

  const handleDeleteShortcut = useCallback(() => {
    if (focusedItemId) {
      removeShotItem(focusedItemId);
      setFocusedItemId(null);
    }
  }, [focusedItemId, removeShotItem]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && !target.closest('.group') && !target.closest('.stat-card') && !target.closest('.btn-primary') && !target.closest('header')) {
        setFocusedItemId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useKeyboardShortcuts([
    {
      key: 's',
      ctrl: true,
      action: forceSave,
    },
    {
      key: 'p',
      ctrl: true,
      action: () => { handleExportPDF(); },
    },
    {
      key: 'n',
      ctrl: true,
      action: addShot,
    },
    {
      key: 'z',
      ctrl: true,
      action: undo,
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: redo,
    },
    {
      key: 'y',
      ctrl: true,
      action: redo,
    },
    {
      key: 'Delete',
      action: handleDeleteShortcut,
    },
    {
      key: 'Escape',
      action: onBack,
      preventDefault: false,
    }
  ]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.05, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.05, 0.80));

  const stats = useMemo(() => ({
    shotCount: shotListItems.length,
    completedShots: shotListItems.filter(shot => shot.shotSize && shot.angle && shot.movement).length,
    withReferences: shotListItems.filter(shot => !!shot.imageUrl).length,
  }), [shotListItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }} onPaste={(e) => handlePasteImage(e)}>
      {/* Background glows */}
      <div style={{ display: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {/* Header */}
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '64px',
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center',
        }}>
          <div style={{ width: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={onBack} style={{ padding: '8px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div style={{ height: '28px', width: '1px', background: 'var(--border-subtle)' }} />
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{projectTitle}</h1>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shot List Editor</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="desktop-only-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
                <button onClick={undo} disabled={!canUndo} className="btn-ghost" style={{ padding: '6px', opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed', borderRadius: '6px', display: 'flex', alignItems: 'center' }} title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
                <button onClick={redo} disabled={!canRedo} className="btn-ghost" style={{ padding: '6px', opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed', borderRadius: '6px', display: 'flex', alignItems: 'center' }} title="Redo (Ctrl+Shift+Z)"><Redo2 className="w-4 h-4" /></button>
              </div>
              <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)' }} />
              <SaveStatusIndicator status={saveStatus} />
              <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)' }} />
              <button onClick={handleExportProject} className="btn-ghost" style={{ fontSize: '13px', gap: '6px' }}><Save className="w-4 h-4" /><span className="hidden sm:inline">Save .mbd</span></button>
              <button onClick={handleExportPDF} disabled={isExportingPDF} className="btn-primary" style={{ fontSize: '13px', gap: '6px', opacity: isExportingPDF ? 0.7 : 1, cursor: isExportingPDF ? 'not-allowed' : 'pointer' }}>
                {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline">{isExportingPDF ? 'Exporting...' : 'Export PDF'}</span>
              </button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px', paddingTop: '88px' }}>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total Shots', value: stats.shotCount, icon: Camera, gradient: 'var(--text-accent)' },
              { label: 'Completed', value: stats.completedShots, icon: Check, gradient: 'var(--accent-green)' },
              { label: 'With References', value: stats.withReferences, icon: ImageIcon, gradient: 'var(--accent-primary)' },
              { label: 'Progress', value: `${stats.shotCount > 0 ? Math.round((stats.completedShots / stats.shotCount) * 100) : 0}%`, icon: Hash, gradient: 'var(--accent-amber)' },
            ].map(({ label, value, icon: Icon, gradient }) => (
              <div key={label} className="stat-card">
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</p>
                  <p style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</p>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: '18px', height: '18px', color: '#fff' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={addShot} className="btn-primary" style={{ fontSize: '13px' }}><Plus className="w-4 h-4" />Add Shot</button>
            </div>
            {/* View Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '4px' }}>
              {(['cards', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                    background: viewMode === mode ? 'var(--accent-primary)' : 'transparent',
                    color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                    boxShadow: viewMode === mode ? '0 2px 8px var(--accent-glow-sm)' : 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  {mode === 'cards' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                  {mode === 'cards' ? 'Cards' : 'List'}
                </button>
              ))}
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {viewMode === 'cards' ? (
              <div style={{ minHeight: '400px' }}>
                <SortableContext items={shotListItems.map(item => item.id)} strategy={rectSortingStrategy}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }} className="shotlist-grid">
                    {shotListItems.map((item, index) => (<SortableCard key={item.id} id={item.id} item={item} index={index} {...{ imagePreviews, activeImageUploadId, setActiveImageUploadId, handleItemChange, handleImageUpload, removeShotItem, handleRemoveImage, focusedItemId, setFocusedItemId }} />))}
                  </div>
                </SortableContext>
                {shotListItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                    <div className="empty-state-icon animate-float">
                      <Camera style={{ width: '32px', height: '32px', color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>No shots added yet</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '380px', margin: '0 auto 24px' }}>Create your first shot to start building your shot list with technical details, references, and notes.</p>
                    <button onClick={addShot} className="btn-primary"><Plus className="w-4 h-4" />Add Your First Shot</button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', zoom: zoomLevel }}>
                  <table className="dark-table" style={{ minWidth: '1600px' }}>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Scene</th>
                        <th>Shot</th>
                        <th>Size</th>
                        <th>Angle</th>
                        <th>Movement</th>
                        <th>Lens</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'center' }}>Reference</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <SortableContext items={shotListItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                        {shotListItems.map((item, index) => (<SortableRow key={item.id} id={item.id} item={item} index={index} {...{ imagePreviews, activeImageUploadId, setActiveImageUploadId, handleItemChange, handleImageUpload, removeShotItem, handleRemoveImage, focusedItemId, setFocusedItemId }} />))}
                      </SortableContext>
                    </tbody>
                  </table>
                  {shotListItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div className="empty-state-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 14px' }}>
                        <List style={{ width: '24px', height: '24px', color: 'var(--accent-primary)' }} />
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No shots in your list</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Click "Add Shot" to begin</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DndContext>
        </main>

        {/* Zoom controls (list mode only) */}
        {viewMode === 'list' && (
          <div style={{ position: 'fixed', bottom: '40px', right: '8px', zIndex: 50, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.3s', opacity: showZoomControls ? 1 : 0, transform: showZoomControls ? 'translateX(0)' : 'translateX(100%)', pointerEvents: showZoomControls ? 'auto' : 'none' }}>
              <button onClick={handleZoomIn} title="Zoom In" style={{ width: '32px', height: '32px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)', color: 'var(--text-secondary)', transition: 'all 0.2s' }}>
                <Plus style={{ width: '14px', height: '14px' }} />
              </button>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', padding: '3px 8px', borderRadius: '99px' }}>{Math.round(zoomLevel * 100)}%</span>
              <button onClick={handleZoomOut} title="Zoom Out" style={{ width: '32px', height: '32px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)', color: 'var(--text-secondary)', transition: 'all 0.2s' }}>
                <Minus style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
            <button onClick={() => setShowZoomControls(!showZoomControls)} title={showZoomControls ? 'Hide Controls' : 'Show Controls'} style={{ width: '32px', height: '32px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)', color: 'var(--text-secondary)', transition: 'all 0.2s' }}>
              <ChevronsRight style={{ width: '16px', height: '16px', transform: showZoomControls ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShotListEditor;