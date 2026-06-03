`use client`;

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Clock, Film, Plus, Save, ChevronDown, Trash2, Download, Settings,
  FileDown, CloudRain, ListPlus, Search, Layers, Github, ArrowLeft, Users, MapPin, Sunrise, Sunset, Thermometer,
  CloudDrizzle, Coffee, Moon, Loader2, Check, CloudOff, Image as ImageIcon, X, Minus, ChevronsRight,
  Undo2, Redo2
} from 'lucide-react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { generateId } from '../utils/id';
import { calculateEndTime, calculateDuration } from '../utils/time';
import { exportProject } from '../utils/file';
import { exportToPDF } from '../utils/pdf';
import Footer from './Footer';
import { DarkSelect, findOption, SHOT_SIZE_OPTIONS, ANGLE_OPTIONS, MOVEMENT_OPTIONS, INT_EXT_OPTIONS, PERIOD_OPTIONS, SelectOption } from './DarkSelect';
import { DarkDatePicker, DarkTimePicker } from './DarkDatePicker';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';


interface LocationAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelectLocation: (loc: { lat: number; lon: number; displayName: string }) => void;
  placeholder?: string;
  className?: string;
}

function LocationAutocomplete({ value, onChange, onSelectLocation, placeholder, className }: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!inputValue || inputValue.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (suggestions.some(s => s.display_name === inputValue)) {
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const thUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputValue)}&format=json&limit=5&countrycodes=th&accept-language=th,en;q=0.9`;
        const res = await fetch(thUrl, {
          headers: { 'User-Agent': 'MentalBreakdown-Film-Production-Suite-Client' }
        });
        let data = res.ok ? await res.json() : [];

        if (!data || data.length === 0) {
          const globalUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputValue)}&format=json&limit=5&accept-language=th,en;q=0.9`;
          const globalRes = await fetch(globalUrl, {
            headers: { 'User-Agent': 'MentalBreakdown-Film-Production-Suite-Client' }
          });
          data = globalRes.ok ? await globalRes.json() : [];
        }

        setSuggestions(data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Error fetching autocomplete suggestions:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [inputValue]);

  const handleSelect = (item: any) => {
    const displayName = item.display_name;
    setInputValue(displayName);
    onChange(displayName);
    onSelectLocation({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName
    });
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        className={className}
      />
      {loading && (
        <div style={{ position: 'absolute', right: '10px', top: '10px', display: 'flex', alignItems: 'center' }}>
          <div className="animate-spin" style={{ width: '14px', height: '14px', border: '2px solid var(--text-muted)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
        </div>
      )}
      {showDropdown && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {suggestions.map((item, idx) => (
            <div
              key={item.place_id || idx}
              onClick={() => handleSelect(item)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text-primary)',
                transition: 'background 0.15s',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-surface)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {item.name || item.display_name.split(',')[0]}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={item.display_name}>
                {item.display_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Save status indicator component
function SaveStatusIndicator({ status }) {
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
}

// Sortable timeline item (table row) component
function SortableItem({ id, item, index, imagePreviews, handleItemChange, handleImageUpload, removeTimelineItem, handleRemoveImage, activeImageUploadId, setActiveImageUploadId, focusedItemId, setFocusedItemId }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isBreak = item.type === 'break';
  const isFirstItem = index === 0;
  const isActiveForUpload = activeImageUploadId === item.id;
  const isFocused = focusedItemId === item.id;

  const handleImageAreaClick = () => {
    setActiveImageUploadId(isActiveForUpload ? null : item.id);
  };

  const isEvenRow = index % 2 !== 0;
  const rowBg = isBreak
    ? 'rgba(245,158,11,0.05)'
    : isEvenRow
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
      className="group transition-colors duration-200"
    >
      <td className="col-drag" style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap', width: '48px', borderLeft: isFocused ? '3px solid var(--accent-primary)' : '3px solid transparent' }}>
        <button {...attributes} {...listeners} style={{ cursor: 'grab', padding: '6px', color: 'var(--text-muted)', background: 'transparent', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', margin: '0 auto' }}>
          <GripVertical size={16} />
        </button>
      </td>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <DarkTimePicker value={item.start} onChange={(val) => handleItemChange(item.id, 'start', val)} disabled={!isFirstItem} style={{ width: '72px', padding: '6px 8px', fontSize: '13px' }} />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <DarkTimePicker value={item.end} onChange={(val) => handleItemChange(item.id, 'end', val)} style={{ width: '72px', padding: '6px 8px', fontSize: '13px' }} />
        </div>
      </td>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input type="number" min="0" value={item.duration} onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)} className="no-style" style={{ width: '64px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>min</span>
        </div>
      </td>
      {isBreak ? (
        <td colSpan={15} style={{ padding: '8px 12px' }}>
          <input type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="no-style" style={{ width: '100%', padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: 'var(--accent-amber)', fontWeight: 600, fontSize: '13px', outline: 'none' }} placeholder="Break description" />
        </td>
      ) : (
        <>
          <td className="col-scene" style={{ padding: '8px 12px', width: '84px' }}>
            <input type="text" value={item.sceneNumber} onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)} className="no-style" style={{ width: '60px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center', outline: 'none' }} placeholder="1A" />
          </td>
          <td className="col-shot" style={{ padding: '8px 12px', width: '84px' }}>
            <input type="text" value={item.shotNumber} onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)} className="no-style" style={{ width: '60px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center', outline: 'none' }} placeholder="001" />
          </td>
          <td style={{ padding: '8px 12px', minWidth: '100px' }}>
            <DarkSelect<SelectOption> instanceId={`row-intExt-${item.id}`} options={INT_EXT_OPTIONS} value={findOption(INT_EXT_OPTIONS, item.intExt)} onChange={(opt) => handleItemChange(item.id, 'intExt', (opt as SelectOption)?.value ?? '')} placeholder="INT/EXT" isClearable={false} />
          </td>
          <td style={{ padding: '8px 12px', minWidth: '115px' }}>
            <DarkSelect<SelectOption> instanceId={`row-period-${item.id}`} options={PERIOD_OPTIONS} value={findOption(PERIOD_OPTIONS, item.dayNight)} onChange={(opt) => handleItemChange(item.id, 'dayNight', (opt as SelectOption)?.value ?? '')} placeholder="DAY/NIGHT" isClearable={false} />
          </td>
          <td style={{ padding: '8px 12px' }}>
            <input type="text" value={item.location} onChange={(e) => handleItemChange(item.id, 'location', e.target.value)} className="no-style" style={{ width: '140px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} placeholder="Location" />
          </td>
          <td style={{ padding: '8px 12px', minWidth: '140px' }}>
            <DarkSelect<SelectOption> instanceId={`row-size-${item.id}`} options={SHOT_SIZE_OPTIONS} value={findOption(SHOT_SIZE_OPTIONS, item.shotSize)} onChange={(opt) => handleItemChange(item.id, 'shotSize', (opt as SelectOption)?.value ?? '')} placeholder="Size..." isClearable />
          </td>
          <td style={{ padding: '8px 12px', minWidth: '140px' }}>
            <DarkSelect<SelectOption>
              instanceId={`row-angle-${item.id}`}
              options={ANGLE_OPTIONS}
              value={item.angle}
              onChange={(val: any) => {
                const valueStr = Array.isArray(val)
                  ? val.map((opt: any) => opt.value).join(',')
                  : (val?.value ?? '');
                handleItemChange(item.id, 'angle', valueStr);
              }}
              placeholder="Angle..."
              isMulti
            />
          </td>
          <td style={{ padding: '8px 12px', minWidth: '140px' }}>
            <DarkSelect<SelectOption>
              instanceId={`row-movement-${item.id}`}
              options={MOVEMENT_OPTIONS}
              value={item.movement}
              onChange={(val: any) => {
                const valueStr = Array.isArray(val)
                  ? val.map((opt: any) => opt.value).join(',')
                  : (val?.value ?? '');
                handleItemChange(item.id, 'movement', valueStr);
              }}
              placeholder="Movement..."
              isMulti
            />
          </td>
          <td style={{ padding: '8px 12px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input type="number" value={item.lens ? item.lens.replace('mm', '').trim() : ''} onChange={(e) => handleItemChange(item.id, 'lens', e.target.value ? `${e.target.value}mm` : '')} className="no-style" style={{ width: '72px', height: '36px', paddingLeft: '8px', paddingRight: '28px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} placeholder="50" />
              <span style={{ position: 'absolute', right: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', pointerEvents: 'none' }}>mm</span>
            </div>
          </td>
          <td style={{ padding: '8px 12px' }}>
            <textarea value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="no-style" style={{ width: '200px', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} placeholder="Scene description" rows={2} />
          </td>
          <td style={{ padding: '8px 12px' }}>
            <input type="text" value={item.cast} onChange={(e) => handleItemChange(item.id, 'cast', e.target.value)} className="no-style" style={{ width: '110px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} placeholder="Cast" />
          </td>
          <td style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '4px', borderRadius: '8px', cursor: 'pointer', background: isActiveForUpload ? 'var(--accent-glow-sm)' : 'transparent', border: isActiveForUpload ? '1px solid var(--accent-primary)' : '1px solid transparent', transition: 'all 0.2s' }}>
              {imagePreviews[item.id] ? (
                <div className="relative group/img" onClick={handleImageAreaClick}>
                  <img src={imagePreviews[item.id]} alt={`Ref for ${item.shotNumber}`} style={{ width: '72px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-default)' }} />
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(item.id); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <label htmlFor={`image-${item.id}`} style={{ width: '72px', height: '56px', background: 'var(--bg-input)', borderRadius: '6px', border: '2px dashed var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); handleImageAreaClick(); }}>
                  <ImageIcon style={{ width: '15px', height: '15px', color: 'var(--text-muted)' }} />
                </label>
              )}
              <input type="file" accept="image/*" id={`image-${item.id}`} onChange={(e) => handleImageUpload(item.id, e.target.files ? e.target.files[0] : null)} className="hidden" />
              <label htmlFor={`image-${item.id}`} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                {imagePreviews[item.id] ? 'Change' : 'Upload'}
              </label>
            </div>
          </td>
          <td style={{ padding: '8px 12px' }}>
            <input type="text" value={item.props} onChange={(e) => handleItemChange(item.id, 'props', e.target.value)} className="no-style" style={{ width: '120px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} placeholder="Props" />
          </td>
          <td style={{ padding: '8px 12px' }}>
            <input type="text" value={item.costume} onChange={(e) => handleItemChange(item.id, 'costume', e.target.value)} className="no-style" style={{ width: '120px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} placeholder="Costume" />
          </td>
          <td style={{ padding: '8px 12px' }}>
            <textarea value={item.notes} onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} className="no-style" style={{ width: '140px', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} placeholder="Notes" rows={2} />
          </td>
        </>
      )}
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', textAlign: 'center' }}>
        <button onClick={() => removeTimelineItem(item.id)} className="opacity-0 group-hover:opacity-100" style={{ padding: '6px', color: 'var(--text-muted)', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', margin: '0 auto' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function SortableMobileCard({
  id,
  item,
  index,
  imagePreviews,
  handleItemChange,
  handleImageUpload,
  removeTimelineItem,
  handleRemoveImage,
  activeImageUploadId,
  setActiveImageUploadId
}: {
  id: string;
  item: any;
  index: number;
  imagePreviews: Record<string, string>;
  handleItemChange: (itemId: string, field: string, value: any) => void;
  handleImageUpload: (itemId: string, file: File | null) => void;
  removeTimelineItem: (itemId: string) => void;
  handleRemoveImage: (itemId: string) => void;
  activeImageUploadId: any;
  setActiveImageUploadId: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    marginBottom: '12px',
    overflow: 'hidden',
    position: 'relative' as const,
  };
  const [isExpanded, setIsExpanded] = useState(false);

  const isBreak = item.type === 'break';

  if (isBreak) {
    return (
      <div ref={setNodeRef} style={style}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px', background: 'rgba(245,158,11,0.06)' }}>
          {/* Drag Handle */}
          <div {...attributes} {...listeners} className="touch-target" style={{ cursor: 'grab', color: 'var(--text-muted)' }}>
            <GripVertical className="w-5 h-5" />
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span className="chip chip-amber" style={{ fontSize: '11px', fontWeight: 700 }}>BREAK</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.start} - {item.end}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({item.duration}m)</span>
            <input
              type="text"
              value={item.description || ''}
              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
              className="no-style"
              style={{
                flex: 1,
                minWidth: '120px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px dashed var(--border-subtle)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                padding: '2px 4px',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={() => removeTimelineItem(item.id)}
            className="btn-ghost"
            style={{ color: 'var(--accent-red)', padding: '8px' }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Header section (Always visible) */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '12px 16px', 
          gap: '12px', 
          borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className="touch-target" 
          style={{ cursor: 'grab', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()} // Stop propagation so it doesn't toggle expand
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Scene Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {item.sceneNumber && (
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                Sc. {item.sceneNumber}
              </span>
            )}
            {item.shotNumber && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Sh. {item.shotNumber}
              </span>
            )}
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {item.start} - {item.end}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ({item.duration}m)
            </span>
          </div>

          {/* Location & Int/Ext info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600, color: item.intExt === 'EXT' ? 'var(--accent-amber)' : 'var(--text-accent)' }}>
              {item.intExt}
            </span>
            <span>•</span>
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
              {item.location || 'No Location'}
            </span>
          </div>
        </div>

        {/* Action button: Expand/Collapse & Delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => removeTimelineItem(item.id)}
            className="btn-ghost"
            style={{ color: 'var(--accent-red)', padding: '8px' }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-ghost"
            style={{ padding: '8px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content Details */}
      {isExpanded && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.1)' }}>
          {/* Row 1: Int/Ext & Period */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>INT/EXT</label>
              <DarkSelect<SelectOption>
                instanceId={`mobile-intExt-${item.id}`}
                value={findOption(INT_EXT_OPTIONS, item.intExt)}
                onChange={(opt) => handleItemChange(item.id, 'intExt', (opt as SelectOption)?.value ?? '')}
                options={INT_EXT_OPTIONS}
                isClearable={false}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Period/DayNight</label>
              <DarkSelect<SelectOption>
                instanceId={`mobile-period-${item.id}`}
                value={findOption(PERIOD_OPTIONS, item.dayNight)}
                onChange={(opt) => handleItemChange(item.id, 'dayNight', (opt as SelectOption)?.value ?? '')}
                options={PERIOD_OPTIONS}
                isClearable={false}
              />
            </div>
          </div>

          {/* Row 2: Scene # & Shot # */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Scene Number</label>
              <input
                type="text"
                value={item.sceneNumber || ''}
                onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Shot Number</label>
              <input
                type="text"
                value={item.shotNumber || ''}
                onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Row 3: Duration & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Duration</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="0"
                  value={item.duration}
                  onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>m</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Location</label>
              <input
                type="text"
                value={item.location || ''}
                onChange={(e) => handleItemChange(item.id, 'location', e.target.value)}
                placeholder="e.g. Living Room"
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Size, Angle, Movement */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Shot Size</label>
              <DarkSelect<SelectOption>
                instanceId={`mobile-size-${item.id}`}
                options={SHOT_SIZE_OPTIONS}
                value={findOption(SHOT_SIZE_OPTIONS, item.shotSize)}
                onChange={(opt) => handleItemChange(item.id, 'shotSize', (opt as SelectOption)?.value ?? '')}
                placeholder="Size..."
                isClearable
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Lens</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={item.lens ? item.lens.replace('mm', '').trim() : ''}
                  onChange={(e) => handleItemChange(item.id, 'lens', e.target.value ? `${e.target.value}mm` : '')}
                  placeholder="50"
                  style={{ width: '100%', padding: '8px 30px 8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
                <span style={{ position: 'absolute', right: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', pointerEvents: 'none' }}>mm</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Angle</label>
              <DarkSelect<SelectOption>
                instanceId={`mobile-angle-${item.id}`}
                options={ANGLE_OPTIONS}
                value={item.angle}
                onChange={(val: any) => {
                  const valueStr = Array.isArray(val)
                    ? val.map((opt: any) => opt.value).join(',')
                    : (val?.value ?? '');
                  handleItemChange(item.id, 'angle', valueStr);
                }}
                placeholder="Angle..."
                isMulti
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Movement</label>
              <DarkSelect<SelectOption>
                instanceId={`mobile-movement-${item.id}`}
                options={MOVEMENT_OPTIONS}
                value={item.movement}
                onChange={(val: any) => {
                  const valueStr = Array.isArray(val)
                    ? val.map((opt: any) => opt.value).join(',')
                    : (val?.value ?? '');
                  handleItemChange(item.id, 'movement', valueStr);
                }}
                placeholder="Movement..."
                isMulti
              />
            </div>
          </div>

          {/* Row 4: Description */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={item.description || ''}
              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
              placeholder="e.g. John enters and sits down"
              rows={2}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {/* Row 5: Cast */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Cast / Characters</label>
            <input
              type="text"
              value={item.cast || ''}
              onChange={(e) => handleItemChange(item.id, 'cast', e.target.value)}
              placeholder="e.g. John, Sarah"
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
          </div>

          {/* Image Upload/Reference */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Reference Image</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {imagePreviews[item.id] ? (
                <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={imagePreviews[item.id]} alt="Reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={() => handleRemoveImage(item.id)} 
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', padding: '4px', border: 'none', cursor: 'pointer' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(item.id, file);
                    }}
                    id={`file-upload-mobile-${item.id}`}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor={`file-upload-mobile-${item.id}`}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ImageIcon className="w-4 h-4" /> Upload Image
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Row 6: Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Notes</label>
            <input
              type="text"
              value={item.notes || ''}
              onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
              placeholder="Any additional notes..."
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ShotImportModal({ isOpen, onClose, shotList, imagePreviews, onImport }) {
  // Hooks are now at the top level
  const [selectedShots, setSelectedShots] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedShots(new Set());
      setSearchTerm('');
    }
  }, [isOpen]);

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
    onImport(Array.from(selectedShots));
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl max-w-4xl w-full my-8 animate-in fade-in zoom-in-95 duration-300 flex flex-col" style={{ color: 'var(--text-primary)', overflow: 'hidden' }}>
          <div className="p-6 border-b border-[var(--border-default)]">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Import from Shot List</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Select shots to add to your schedule.</p>
          </div>

          <div className="p-6 flex-grow overflow-hidden flex flex-col gap-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Search
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    color: 'var(--text-secondary)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by scene, shot, or description..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                />
              </div>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                  transition: 'opacity 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {selectedShots.size === Object.values(groupedAndFilteredShots).flat().length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div
              style={{
                maxHeight: '45vh',
                overflowY: 'auto',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                background: 'var(--bg-input)',
              }}
            >
              {Object.entries(groupedAndFilteredShots).length > 0 ? Object.entries(groupedAndFilteredShots).map(([sceneKey, shots]) => (
                <div key={sceneKey} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'between',
                      padding: '10px 14px',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      background: 'var(--bg-elevated)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', flexGrow: 1 }}>
                      <Layers size={14} style={{ color: 'var(--text-secondary)' }} /> Scene {sceneKey}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleSelectScene(shots)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-glow)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      Select/Deselect Scene
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {shots.map(shot => (
                      <div
                        key={shot.id}
                        onClick={() => setSelectedShots(prev => { const n = new Set(prev); n.has(shot.id) ? n.delete(shot.id) : n.add(shot.id); return n; })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '10px 14px',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          background: selectedShots.has(shot.id) ? 'var(--accent-glow-sm)' : 'transparent',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                        onMouseEnter={e => {
                          if (!selectedShots.has(shot.id)) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!selectedShots.has(shot.id)) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {/* Custom Checkbox */}
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: selectedShots.has(shot.id) ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            background: selectedShots.has(shot.id) ? 'var(--accent-primary)' : 'var(--bg-input)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            transition: 'all 0.15s',
                            flexShrink: 0,
                          }}
                        >
                          {selectedShots.has(shot.id) && (
                            <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Local Image/No-Ref placeholder */}
                        {imagePreviews[shot.id] ? (
                          <img
                            src={imagePreviews[shot.id]}
                            alt="Ref"
                            style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-default)', flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '72px',
                              height: '54px',
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              flexShrink: 0,
                            }}
                          >
                            <Film style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              NO REF
                            </span>
                          </div>
                        )}

                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>Shot {shot.shotNumber}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {shot.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>No shots found.</div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t rounded-b-xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
            <button onClick={onClose} className="btn-ghost" style={{ fontSize: '13px' }}>Cancel</button>
            <button onClick={handleImportClick} disabled={selectedShots.size === 0} className="btn-primary" style={{ fontSize: '13px', opacity: selectedShots.size === 0 ? 0.5 : 1 }}>Import {selectedShots.size} Shot(s)</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main editor component
export default function ShootingScheduleEditor({ project, onBack, onSave }) {
  const [docState, setDocState, { undo, redo, canUndo, canRedo }] = useUndoRedo(() => {
    const defaultHeader = { projectTitle: project?.name || '', episodeNumber: '', shootingDay: '', totalDays: '', date: new Date().toISOString().split('T')[0], callTime: '', sunrise: '06:30', sunset: '18:30', weather: '', location1: '', location2: '', director: '', producer: '', dop: '', firstAD: '', secondAD: '', pd: '', artTime: '', lunchTime: '', dinnerTime: '', precipProb: '', temp: '', realFeel: '', firstmealTime: '', secondmealTime: '', wrapTime: '' };
    return {
      headerInfo: project?.data?.headerInfo ? { ...defaultHeader, ...project.data.headerInfo } : defaultHeader,
      timelineItems: project?.data?.timelineItems || [],
      imagePreviews: project?.data?.imagePreviews || {}
    };
  });

  const headerInfo = docState.headerInfo;
  const timelineItems = docState.timelineItems;
  const imagePreviews = docState.imagePreviews;

  const setHeaderInfo = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    const prevHeaderInfo = docState.headerInfo;
    const headerInfoVal = typeof newValOrFn === 'function' ? newValOrFn(prevHeaderInfo) : newValOrFn;
    
    let isContinuous = options?.isContinuous;
    if (isContinuous === undefined) {
      const changedKeys = Object.keys(headerInfoVal).filter(k => headerInfoVal[k] !== prevHeaderInfo[k]);
      const discreteKeys = ['date', 'callTime', 'wrapTime', 'firstmealTime', 'secondmealTime', 'sunrise', 'sunset', 'location1', 'location2'];
      const hasDiscreteChange = changedKeys.some(k => discreteKeys.includes(k));
      isContinuous = changedKeys.length > 0 && !hasDiscreteChange;
    }

    setDocState(prev => ({
      ...prev,
      headerInfo: headerInfoVal
    }), { isContinuous });
  }, [setDocState, docState.headerInfo]);

  const setTimelineItems = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    setDocState(prev => {
      const timelineItemsVal = typeof newValOrFn === 'function' ? newValOrFn(prev.timelineItems) : newValOrFn;
      return {
        ...prev,
        timelineItems: timelineItemsVal
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
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(true);
  const [activeImageUploadId, setActiveImageUploadId] = useState(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const debounceTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const tableContainerRef = useRef(null);
  const floatingScrollbarRef = useRef(null);
  const floatingScrollbarContentRef = useRef(null);
  const [showFloatingScrollbar, setShowFloatingScrollbar] = useState(false);
  const [isTableScrolled, setIsTableScrolled] = useState(false);
  const isSyncingScroll = useRef(false);
  const tableRef = useRef(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherToast, setWeatherToast] = useState<{ visible: boolean; locationName: string }>({ visible: false, locationName: '' });
  const [resolvedCoords, setResolvedCoords] = useState<{
    location1?: { lat: number; lon: number; displayName: string };
    location2?: { lat: number; lon: number; displayName: string };
  }>({});

  useEffect(() => {
    if (weatherToast.visible) {
      const timer = setTimeout(() => {
        setWeatherToast(prev => ({ ...prev, visible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [weatherToast.visible]);

  const handleAutoFillWeather = async () => {
    if (!headerInfo.location1) {
      alert('Please enter a location in "Location 1" first.');
      return;
    }
    setLoadingWeather(true);
    try {
      // Helper function to query OSM Nominatim API (prioritizes Thailand & Thai language)
      const runGeocoding = async (query: string) => {
        const fetchGeocode = async (url: string) => {
          try {
            const res = await fetch(url, {
              headers: {
                'User-Agent': 'MentalBreakdown-Film-Production-Suite-Client'
              }
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (data && data.length > 0) {
              return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                displayName: data[0].display_name
              };
            }
          } catch (err) {
            console.error('Single geocoding fetch error:', err);
          }
          return null;
        };

        // 1. Try Thailand search first
        const thUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=th&accept-language=th,en;q=0.9`;
        let result = await fetchGeocode(thUrl);

        // 2. Fall back to global search if no result inside Thailand
        if (!result) {
          const globalUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=th,en;q=0.9`;
          result = await fetchGeocode(globalUrl);
        }

        return result;
      };

      let locationQuery = headerInfo.location1;
      let geocodeData = null;

      // Check if we already have cached coordinates from autocomplete
      if (resolvedCoords.location1 && resolvedCoords.location1.displayName === locationQuery) {
        geocodeData = {
          latitude: resolvedCoords.location1.lat,
          longitude: resolvedCoords.location1.lon,
          displayName: resolvedCoords.location1.displayName
        };
      } else {
        geocodeData = await runGeocoding(locationQuery);
      }

      // Fallback 1: If full name fails, check if we have a comma and search the parent segment (e.g. "Studio 4, Bangkok" -> "Bangkok")
      if (!geocodeData && locationQuery.includes(',')) {
        const parts = locationQuery.split(',');
        const fallbackRegion = parts[parts.length - 1].trim();
        if (fallbackRegion) {
          geocodeData = await runGeocoding(fallbackRegion);
        }
      }

      // Fallback 2: Interactive Prompt asking user for a nearby city/region (e.g. if location is "My Bedroom" or "Studio 3")
      if (!geocodeData) {
        const promptLocation = prompt(
          `Could not resolve coordinates for "${locationQuery}".\nPlease enter a nearby city or region name (e.g., "Bangkok", "London") to fetch weather:`
        );
        if (promptLocation && promptLocation.trim()) {
          geocodeData = await runGeocoding(promptLocation.trim());
        }
      }

      if (!geocodeData) {
        alert(`Could not find weather coordinates for "${locationQuery}".`);
        setLoadingWeather(false);
        return;
      }

      const { latitude, longitude } = geocodeData;
      const targetDate = headerInfo.date || new Date().toISOString().split('T')[0];

      // 2. Fetch Weather — use forecast API for future/today, archive API for past dates
      const today = new Date().toISOString().split('T')[0];
      const isPast = targetDate < today;
      const baseUrl = isPast
        ? `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,apparent_temperature_max,precipitation_probability_max,sunrise,sunset&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`
        : `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,apparent_temperature_max,precipitation_probability_max,sunrise,sunset&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`;

      const weatherRes = await fetch(baseUrl);
      if (!weatherRes.ok) {
        const errText = await weatherRes.text().catch(() => '');
        throw new Error(`Weather API error (${weatherRes.status}): ${errText.slice(0, 200)}`);
      }
      const weatherData = await weatherRes.json();

      if (weatherData.daily) {
        const d = weatherData.daily;
        const code = d.weather_code?.[0] ?? 0;
        const tempMax = d.temperature_2m_max?.[0] ?? '';
        const feelMax = d.apparent_temperature_max?.[0] ?? '';
        const precipProb = d.precipitation_probability_max?.[0] ?? '';

        let sunriseTime = '';
        if (d.sunrise?.[0]) {
          const parts = d.sunrise[0].split('T');
          if (parts[1]) sunriseTime = parts[1].slice(0, 5);
        }

        let sunsetTime = '';
        if (d.sunset?.[0]) {
          const parts = d.sunset[0].split('T');
          if (parts[1]) sunsetTime = parts[1].slice(0, 5);
        }

        const mapWeatherCode = (c) => {
          if (c === 0) return 'Clear sky';
          if (c >= 1 && c <= 3) return 'Partly cloudy';
          if (c === 45 || c === 48) return 'Foggy';
          if (c >= 51 && c <= 55) return 'Drizzle';
          if (c >= 61 && c <= 65) return 'Rainy';
          if (c >= 71 && c <= 75) return 'Snowy';
          if (c >= 80 && c <= 82) return 'Rain showers';
          if (c >= 95 && c <= 99) return 'Thunderstorm';
          return 'Overcast';
        };

        setHeaderInfo(prev => ({
          ...prev,
          weather: mapWeatherCode(code),
          temp: tempMax !== '' ? `${Math.round(tempMax)}°` : prev.temp,
          realFeel: feelMax !== '' ? `${Math.round(feelMax)}°` : prev.realFeel,
          precipProb: precipProb !== '' ? `${precipProb}%` : prev.precipProb,
          sunrise: sunriseTime || prev.sunrise,
          sunset: sunsetTime || prev.sunset
        }));

        setWeatherToast({
          visible: true,
          locationName: geocodeData.displayName || locationQuery
        });
      } else {
        alert('No weather data returned for this date.');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to fetch weather data. Please check connection and try again.');
    } finally {
      setLoadingWeather(false);
    }
  };

  const shotList = useMemo(() => project?.data?.shotListData?.shotListItems || [], [project]);
  const shotListImagePreviews = useMemo(() => project?.data?.shotListData?.imagePreviews || {}, [project]);

  const stringifiedData = useMemo(() => JSON.stringify({ headerInfo, timelineItems, imagePreviews }), [headerInfo, timelineItems, imagePreviews]);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; });

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
        headerInfo,
        timelineItems,
        imagePreviews
      };

      setSaveStatus('saving');
      Promise.resolve()
        .then(() => new Promise(resolve => setTimeout(resolve, 500)))
        .then(() => onSaveRef.current(dataToSave))
        .then(() => {
          setSaveStatus('saved');
          return new Promise(resolve => setTimeout(resolve, 2500));
        })
        .then(() => setSaveStatus('idle'));
    }, 1000);
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [stringifiedData]);
  // --- END: AUTOSAVE ---

  // --- START: UI BEHAVIOR HOOKS ---
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const floatingScrollbar = floatingScrollbarRef.current;
    const tableEl = tableContainer?.querySelector('table');
    if (!tableContainer || !floatingScrollbar || !tableEl) return;

    const updateScrollbar = () => {
      if (floatingScrollbarContentRef.current) {
        floatingScrollbarContentRef.current.style.width = `${tableContainer.scrollWidth}px`;
      }
      setShowFloatingScrollbar(tableContainer.scrollWidth > tableContainer.clientWidth);
    };
    const handleTableScroll = () => {
      // Drive the freeze-shadow opacity proportionally: 0 at rest, 1.0 after 180px of scroll
      const opacity = Math.min(tableContainer.scrollLeft / 180, 1);
      tableContainer.style.setProperty('--freeze-opacity', String(opacity));
      if (!isSyncingScroll.current) { isSyncingScroll.current = true; floatingScrollbar.scrollLeft = tableContainer.scrollLeft; requestAnimationFrame(() => { isSyncingScroll.current = false; }); }
    };
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
        setFocusedItemId(null);
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
      }
    }
    const isTextField = ['sceneNumber', 'shotNumber', 'location', 'description', 'lens', 'cast', 'props', 'costume', 'notes'].includes(field);
    setTimelineItems(newItems, { isContinuous: isTextField });
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

  const handleImageUpload = useCallback((itemId, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImagePreviews(prev => ({ ...prev, [itemId]: reader.result }));
        setActiveImageUploadId(null);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback((itemId) => {
    setImagePreviews(prev => { const newPreviews = { ...prev }; delete newPreviews[itemId]; return newPreviews; });
  }, []);

  const handlePasteImage = useCallback((e, targetItemId) => {
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
        if (img.src.startsWith('data:image')) {
          setImagePreviews((prev) => ({ ...prev, [itemIdToUse]: img.src }));
          setActiveImageUploadId(null);
        } else {
          fetch(img.src)
            .then(res => res.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  setImagePreviews((prev) => ({ ...prev, [itemIdToUse]: reader.result }));
                  setActiveImageUploadId(null);
                }
              };
              reader.readAsDataURL(blob);
            }).catch(err => console.error("Error fetching pasted image:", err));
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

  const handleImportShots = useCallback((shotIdsToImport) => {
    const shotsToAdd = shotIdsToImport
      .map(shotId => shotList.find(s => s.id === shotId))
      .filter(Boolean);

    const newTimelineItems = shotsToAdd.map(shot => {
      const newShot: TimelineItem = {
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

    recalculateAndUpdateTimes([...timelineItems, ...newTimelineItems]);

  }, [shotList, timelineItems, recalculateAndUpdateTimes]);

  const stats = useMemo(() => {
    const totalDuration = timelineItems.reduce((sum, item) => sum + (item.duration || 0), 0);
    const shotCount = timelineItems.filter(item => item.type === 'shot').length;
    const breakTime = timelineItems.filter(item => item.type === 'break').reduce((sum, item) => sum + (item.duration || 0), 0);
    return { totalHours: Math.floor(totalDuration / 60), totalMinutes: totalDuration % 60, shotCount, breakHours: Math.floor(breakTime / 60), breakMinutes: breakTime % 60 };
  }, [timelineItems]);

  const handleExportProject = useCallback(() => {
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
  }, [project, headerInfo, timelineItems, imagePreviews]);

  const forceSave = useCallback(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    const dataToSave = {
      headerInfo,
      timelineItems,
      imagePreviews
    };
    setSaveStatus('saving');
    Promise.resolve()
      .then(() => onSaveRef.current(dataToSave))
      .then(() => {
        setSaveStatus('saved');
        return new Promise(resolve => setTimeout(resolve, 2500));
      })
      .then(() => setSaveStatus('idle'))
      .catch((err) => {
        console.error(err);
        setSaveStatus('dirty');
      });
  }, [headerInfo, timelineItems, imagePreviews]);

  const handleDeleteShortcut = useCallback(() => {
    if (focusedItemId) {
      removeTimelineItem(focusedItemId);
      setFocusedItemId(null);
    }
  }, [focusedItemId, removeTimelineItem]);

  useKeyboardShortcuts([
    {
      key: 's',
      ctrl: true,
      action: forceSave,
    },
    {
      key: 'p',
      ctrl: true,
      action: () => exportToPDF(headerInfo, timelineItems, stats, imagePreviews),
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

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
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Background glows */}
      <div style={{ display: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <ShotImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        shotList={shotList}
        imagePreviews={shotListImagePreviews}
        onImport={handleImportShots}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
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
                <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{headerInfo.projectTitle || 'Untitled Project'}</h1>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shooting Schedule Editor</p>
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
              <button onClick={handleExportProject} className="btn-ghost" style={{ fontSize: '13px', gap: '6px' }}><FileDown className="w-4 h-4" /><span className="hidden sm:inline">Save .mbd</span></button>
              <button onClick={() => exportToPDF(headerInfo, timelineItems, stats, imagePreviews)} className="btn-primary" style={{ fontSize: '13px', gap: '6px' }}><Download className="w-4 h-4" /><span className="hidden sm:inline">Export PDF</span></button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px', paddingTop: '88px' }}>
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setShowProductionDetails(!showProductionDetails)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: '10px', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600,
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Settings className="w-4 h-4" />
              <span>Production Details</span>
              <ChevronDown style={{ width: '14px', height: '14px', transform: showProductionDetails ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
            {showProductionDetails && (
              <div style={{ marginTop: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '24px' }} className="animate-fade-in-up">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Film className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />Project Information</h3>
                    <div className="space-y-3">
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Project Title</label><input type="text" value={headerInfo.projectTitle} onChange={(e) => setHeaderInfo({ ...headerInfo, projectTitle: e.target.value })} className="w-full px-3 py-2" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Episode #</label><input type="text" value={headerInfo.episodeNumber} placeholder="Ep. No." onChange={(e) => setHeaderInfo({ ...headerInfo, episodeNumber: e.target.value })} className="w-full px-3 py-2" /></div>
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Day/Total</label><div className="flex items-center gap-2"><input type="text" value={headerInfo.shootingDay} onChange={(e) => setHeaderInfo({ ...headerInfo, shootingDay: e.target.value })} className="w-14 px-2 py-2 text-center" placeholder="1" /><span style={{ color: 'var(--text-muted)' }}>/</span><input type="text" value={headerInfo.totalDays} onChange={(e) => setHeaderInfo({ ...headerInfo, totalDays: e.target.value })} className="w-14 px-2 py-2 text-center" placeholder="3" /></div></div>
                      </div>
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Shooting Date</label><DarkDatePicker value={headerInfo.date} onChange={(val) => setHeaderInfo({ ...headerInfo, date: val })} className="w-full px-3 py-2" /></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><MapPin className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />Time, Location & Meals</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Call Time</label><DarkTimePicker value={headerInfo.callTime} onChange={(val) => setHeaderInfo({ ...headerInfo, callTime: val })} className="w-full px-3 py-2" /></div>
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Wrap Time</label><DarkTimePicker value={headerInfo.wrapTime} onChange={(val) => setHeaderInfo({ ...headerInfo, wrapTime: val })} className="w-full px-3 py-2" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}><Coffee className="w-3 h-3 inline mr-1" />First Meal</label><DarkTimePicker value={headerInfo.firstmealTime} onChange={(val) => setHeaderInfo({ ...headerInfo, firstmealTime: val })} className="w-full px-3 py-2" /></div>
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}><Moon className="w-3 h-3 inline mr-1" />Second Meal</label><DarkTimePicker value={headerInfo.secondmealTime} onChange={(val) => setHeaderInfo({ ...headerInfo, secondmealTime: val })} className="w-full px-3 py-2" /></div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Location 1</label>
                        <LocationAutocomplete
                          value={headerInfo.location1}
                          onChange={(val) => setHeaderInfo({ ...headerInfo, location1: val })}
                          onSelectLocation={(loc) => setResolvedCoords(prev => ({ ...prev, location1: loc }))}
                          placeholder="Main location"
                          className="w-full px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Location 2</label>
                        <LocationAutocomplete
                          value={headerInfo.location2}
                          onChange={(val) => setHeaderInfo({ ...headerInfo, location2: val })}
                          onSelectLocation={(loc) => setResolvedCoords(prev => ({ ...prev, location2: loc }))}
                          placeholder="Secondary location (optional)"
                          className="w-full px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><CloudRain className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />Weather & Sun</h3>
                      <button
                        type="button"
                        onClick={handleAutoFillWeather}
                        className="btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px', height: '28px', gap: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}
                        disabled={loadingWeather}
                      >
                        {loadingWeather ? 'Fetching...' : 'Auto-Fill Weather'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Weather Forecast</label><input type="text" value={headerInfo.weather} onChange={(e) => setHeaderInfo({ ...headerInfo, weather: e.target.value })} placeholder="Considerable cloudiness" className="w-full px-3 py-2" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}><Thermometer className="w-3 h-3 inline mr-1" />Temp</label><input type="text" value={headerInfo.temp} onChange={(e) => setHeaderInfo({ ...headerInfo, temp: e.target.value })} placeholder="34°" className="w-full px-3 py-2" /></div>
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Real Feel</label><input type="text" value={headerInfo.realFeel} onChange={(e) => setHeaderInfo({ ...headerInfo, realFeel: e.target.value })} placeholder="37°" className="w-full px-3 py-2" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}><Sunrise className="w-3 h-3 inline mr-1" />Sunrise</label><DarkTimePicker value={headerInfo.sunrise} onChange={(val) => setHeaderInfo({ ...headerInfo, sunrise: val })} className="w-full px-3 py-2" /></div>
                        <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}><Sunset className="w-3 h-3 inline mr-1" />Sunset</label><DarkTimePicker value={headerInfo.sunset} onChange={(val) => setHeaderInfo({ ...headerInfo, sunset: val })} className="w-full px-3 py-2" /></div>
                      </div>
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}><CloudDrizzle className="w-3 h-3 inline mr-1" />Precipitation %</label><input type="text" value={headerInfo.precipProb} onChange={(e) => setHeaderInfo({ ...headerInfo, precipProb: e.target.value })} placeholder="73%" className="w-full px-3 py-2" /></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />Key Crew</h3>
                    <div className="space-y-3">
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Producer</label><input type="text" value={headerInfo.producer} onChange={(e) => setHeaderInfo({ ...headerInfo, producer: e.target.value })} placeholder="Name & Phone" className="w-full px-3 py-2" /></div>
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Director</label><input type="text" value={headerInfo.director} onChange={(e) => setHeaderInfo({ ...headerInfo, director: e.target.value })} placeholder="Name & Phone" className="w-full px-3 py-2" /></div>
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Production Designer</label><input type="text" value={headerInfo.pd} onChange={(e) => setHeaderInfo({ ...headerInfo, pd: e.target.value })} placeholder="Name & Phone" className="w-full px-3 py-2" /></div>
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Director of Photography</label><input type="text" value={headerInfo.dop} onChange={(e) => setHeaderInfo({ ...headerInfo, dop: e.target.value })} placeholder="Name & Phone" className="w-full px-3 py-2" /></div>
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>1st AD</label><input type="text" value={headerInfo.firstAD} onChange={(e) => setHeaderInfo({ ...headerInfo, firstAD: e.target.value })} placeholder="Name & Phone" className="w-full px-3 py-2" /></div>
                      <div><label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>2nd AD</label><input type="text" value={headerInfo.secondAD} onChange={(e) => setHeaderInfo({ ...headerInfo, secondAD: e.target.value })} placeholder="Name & Phone" className="w-full px-3 py-2" /></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total Duration', value: `${stats.totalHours}h ${stats.totalMinutes}m`, icon: Clock, gradient: 'var(--accent-primary)' },
              { label: 'Total Shots', value: stats.shotCount, icon: Film, gradient: 'var(--text-accent)' },
              { label: 'Break Time', value: `${stats.breakHours}h ${stats.breakMinutes}m`, icon: Coffee, gradient: 'var(--accent-amber)' },
              { label: 'Est. Wrap', value: timelineItems.length > 0 ? timelineItems[timelineItems.length - 1].end : '--:--', icon: Check, gradient: 'var(--accent-green)' },
            ].map(({ label, value, icon: Icon, gradient }) => (
              <div key={label} className="stat-card">
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</p>
                  <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</p>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: '18px', height: '18px', color: '#fff' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button onClick={addShot} className="btn-primary" style={{ fontSize: '13px' }}><Plus className="w-4 h-4" />Add Shot</button>
            <button onClick={addBreak} className="btn-secondary" style={{ color: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}><Coffee className="w-4 h-4" />Add Break</button>
            <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />
            <button onClick={() => setIsImportModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'rgba(20,184,166,0.15)', color: '#2dd4bf', fontWeight: 600, fontSize: '13px', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}><ListPlus className="w-4 h-4" />Import from Shot List</button>
          </div>

          {/* Schedule list container */}
          {isMobile ? (
            <div style={{ padding: '4px' }}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={dragModifiers}
              >
                <SortableContext items={timelineItems.map((item: any) => item.id)} strategy={verticalListSortingStrategy}>
                  {timelineItems.map((item: any, index: number) => (
                    <SortableMobileCard
                      key={item.id}
                      id={item.id}
                      item={item}
                      index={index}
                      imagePreviews={imagePreviews}
                      handleItemChange={handleItemChange}
                      handleImageUpload={handleImageUpload}
                      removeTimelineItem={removeTimelineItem}
                      handleRemoveImage={handleRemoveImage}
                      activeImageUploadId={activeImageUploadId}
                      setActiveImageUploadId={setActiveImageUploadId}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {timelineItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <div className="empty-state-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 16px' }}>
                    <Film style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}>No shots added yet</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Click "Add Shot" to start building your schedule</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '14px', overflow: 'hidden' }}>
              <div
                ref={tableContainerRef}
                className={`table-scroll-hidden ${isTableScrolled ? 'table-scrolled' : ''}`}
                style={{ overflowX: 'auto', zoom: zoomLevel }}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={dragModifiers}
                >
                  <table className="dark-table" style={{ minWidth: '2400px' }} ref={tableRef}>
                    <thead>
                      <tr>
                        <th className="col-drag" style={{ width: '48px' }}></th>
                        <th>Time</th>
                        <th>Dur.</th>
                        <th className="col-scene" style={{ width: '84px' }}>Scene</th>
                        <th className="col-shot" style={{ width: '84px' }}>Shot</th>
                        <th>INT/EXT</th>
                        <th>Period</th>
                        <th>Location</th>
                        <th>Size</th>
                        <th>Angle</th>
                        <th>Movement</th>
                        <th>Lens</th>
                        <th>Description</th>
                        <th>Cast</th>
                        <th style={{ textAlign: 'center' }}>Reference</th>
                        <th>Props</th>
                        <th>Costume</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <SortableContext items={timelineItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                        {timelineItems.map((item, index) => <SortableItem key={item.id} id={item.id} item={item} index={index} imagePreviews={imagePreviews} handleItemChange={handleItemChange} handleImageUpload={handleImageUpload} removeTimelineItem={removeTimelineItem} handleRemoveImage={handleRemoveImage} activeImageUploadId={activeImageUploadId} setActiveImageUploadId={setActiveImageUploadId} focusedItemId={focusedItemId} setFocusedItemId={setFocusedItemId} />)}
                      </SortableContext>
                    </tbody>
                  </table>
                </DndContext>
                {timelineItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                    <div className="empty-state-icon" style={{ width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px' }}>
                      <Film style={{ width: '28px', height: '28px', color: 'var(--accent-primary)' }} />
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No shots added yet</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Click "Add Shot" to start building your schedule</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Floating scrollbar */}
        <div
          ref={floatingScrollbarRef}
          className="floating-scrollbar-container desktop-only"
          style={{
            opacity: showFloatingScrollbar ? 1 : 0,
            pointerEvents: showFloatingScrollbar ? 'auto' : 'none'
          }}
        >
          <div ref={floatingScrollbarContentRef} style={{ height: '50px' }}></div>
        </div>

        {/* Zoom controls */}
        <div className="desktop-only" style={{ position: 'fixed', bottom: '40px', right: '8px', zIndex: 50, display: 'flex', alignItems: 'center', gap: '4px' }}>
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

        {/* Weather Autofill Success Toast */}
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: weatherToast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -150%)',
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
            opacity: weatherToast.visible ? 1 : 0,
            zIndex: 99999,
            pointerEvents: weatherToast.visible ? 'auto' : 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 2px 8px 0 rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text-primary)',
              maxWidth: '400px',
              width: 'calc(100vw - 48px)',
            }}
          >
            {/* Minimal Check mark - no background circle, no glow */}
            <svg style={{ width: '16px', height: '16px', color: 'var(--accent-green)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)', letterSpacing: '-0.01em' }}>
                Weather Autofill Complete
              </span>
              <span
                title={weatherToast.locationName}
                style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                Fetched from <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{weatherToast.locationName}</strong>
              </span>
            </div>

            <button
              onClick={() => setWeatherToast(prev => ({ ...prev, visible: false }))}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}