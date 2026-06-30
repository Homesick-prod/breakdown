`use client`;

import React, { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Clock, Film, Plus, Save, ChevronDown, Trash2, Download, Settings,
  FileDown, CloudRain, ListPlus, Search, Layers, Github, ArrowLeft, Users, MapPin, Sunrise, Sunset, Thermometer,
  CloudDrizzle, Coffee, Moon, Loader2, Check, CloudOff, Image as ImageIcon, X, Minus, ChevronsRight,
  Undo2, Redo2, ClipboardList, FileText
} from 'lucide-react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { DeferredTextField } from './DeferredTextField';
import { generateId } from '../utils/id';
import { calculateEndTime, calculateDuration } from '../utils/time';
import { exportProject } from '../utils/file';
import { exportToPDF } from '../utils/pdf';
import { exportCallSheetToPDF } from '../utils/callsheetpdf';
import Footer from './Footer';
import EditorMobileCommandBar from './EditorMobileCommandBar';
import { DarkSelect, findOption, SHOT_SIZE_OPTIONS, ANGLE_OPTIONS, MOVEMENT_OPTIONS, INT_EXT_OPTIONS, PERIOD_OPTIONS, SelectOption } from './DarkSelect';
import { DarkDatePicker, DarkTimePicker } from './DarkDatePicker';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { setImage, deleteImage, getImage } from '../utils/db';
import { isFirebaseEnabled, uploadImageToStorage, deleteImageFromStorage, logActivity } from '../lib/firebase';
import { fetchImageUrlAsDataUrl, fileToDataUrl, optimizeImageFile } from '../utils/imageOptimizer';
import { migrateLegacyStoredImage } from '../utils/imageMigration';

const toTranslateOnlyTransform = (transform: any) => {
  if (!transform) return undefined;
  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`;
};

const getScheduleShotLinkKey = (item: any) => {
  if (!item || item.type === 'break') return '';
  if (item.linkedShotId) return `id:${item.linkedShotId}`;
  const sceneNumber = String(item.sceneNumber || '').trim().toLowerCase();
  const shotNumber = String(item.shotNumber || '').trim().toLowerCase();
  return sceneNumber && shotNumber ? `key:${sceneNumber}::${shotNumber}` : '';
};

interface TimelineItem {
  id: string;
  type: string;
  start: string;
  duration: number;
  end: string;
  sceneNumber?: string;
  shotNumber?: string;
  shotSize?: string;
  angle?: string;
  movement?: string;
  lens?: string;
  description?: string;
  shotDescription?: string;
  notes?: string;
  linkedShotId?: string;
  intExt?: string;
  dayNight?: string;
  location?: string;
  cast?: string;
  sceneCast?: string;
  props?: string;
  costume?: string;
  imageUrl?: string;
}

interface BreakdownScene {
  id: string;
  sceneNumber: string;
  intExt: string;
  dayNight: string;
  location: string;
  description: string;
  cast: string;
  props: string;
  wardrobe: string;
  notes: string;
}

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
function SaveStatusIndicator({ status }: { status: string }) {
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

const SCENE_GROUP_TIMING_TITLE = 'Edit shot timing in Shot View';
const SCENE_GROUP_TIMING_FIELDS = new Set(['start', 'end', 'duration']);
const SHOT_LINKED_FIELDS = new Set(['sceneNumber', 'shotNumber', 'shotSize', 'angle', 'movement', 'lens', 'shotDescription', 'cast', 'notes']);
const isDefaultZoom = (value: number) => Math.abs(value - 1) < 0.001;



// Static placeholder rendered when a row is actively being dragged
const SortableItemDraggingPlaceholder = ({ item, viewMode, sceneCast }: any) => {
  const isBreak = item.type === 'break';
  if (isBreak) {
    return (
      <td colSpan={viewMode === 'shot' ? 18 : 10} style={{ padding: '8px 12px' }}>
        <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: 'var(--accent-amber)', fontWeight: 600, fontSize: '13px' }}>
          {item.description || 'Meal Break'}
        </div>
      </td>
    );
  }

  const staticStyle = {
    padding: '6px 8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'inline-flex',
    alignItems: 'center',
    height: '34px',
  };

  return (
    <>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)', height: '34px' }}>
          <span>{item.start || '--:--'}</span>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <span>{item.end || '--:--'}</span>
        </div>
      </td>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', height: '34px', display: 'flex', alignItems: 'center' }}>
          {item.duration} min
        </div>
      </td>
      <td className="col-scene" style={{ padding: '8px 12px', width: '84px' }}>
        <div style={{ ...staticStyle, width: '60px', justifyContent: 'center' }}>{item.sceneNumber || '-'}</div>
      </td>
      {viewMode === 'shot' && (
        <td className="col-shot" style={{ padding: '8px 12px', width: '84px' }}>
          <div style={{ ...staticStyle, width: '60px', justifyContent: 'center' }}>{item.shotNumber || '-'}</div>
        </td>
      )}
      <td style={{ padding: '8px 12px', minWidth: '100px' }}>
        <div style={{ ...staticStyle, width: '96px' }}>{item.intExt || '-'}</div>
      </td>
      <td style={{ padding: '8px 12px', minWidth: '115px' }}>
        <div style={{ ...staticStyle, width: '108px' }}>{item.dayNight || '-'}</div>
      </td>
      <td style={{ padding: '8px 12px' }}>
        <div style={{ ...staticStyle, width: '140px' }}>{item.location || '-'}</div>
      </td>
      {viewMode === 'shot' && (
        <>
          <td style={{ padding: '8px 12px', minWidth: '140px' }}>
            <div style={{ ...staticStyle, width: '132px' }}>{item.shotSize || '-'}</div>
          </td>
          <td style={{ padding: '8px 12px', minWidth: '140px' }}>
            <div style={{ ...staticStyle, width: '132px' }}>{item.angle || '-'}</div>
          </td>
          <td style={{ padding: '8px 12px', minWidth: '140px' }}>
            <div style={{ ...staticStyle, width: '132px' }}>{item.movement || '-'}</div>
          </td>
          <td style={{ padding: '8px 12px' }}>
            <div style={{ ...staticStyle, width: '72px' }}>{item.lens || '-'}</div>
          </td>
        </>
      )}
      <td style={{ padding: '8px 12px' }}>
        <div style={{ ...staticStyle, width: '200px' }}>
          {viewMode === 'shot' ? (item.shotDescription || '-') : (item.description || '-')}
        </div>
      </td>
      <td style={{ padding: '8px 12px', minWidth: '160px' }}>
        <div style={{ ...staticStyle, width: '152px' }}>
          {viewMode === 'shot' ? (item.cast || '-') : (sceneCast || '-')}
        </div>
      </td>
      {viewMode === 'shot' && (
        <td style={{ padding: '8px 12px' }}>
          <div style={{ width: '72px', height: '56px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Image</span>
          </div>
        </td>
      )}
      <td style={{ padding: '8px 12px' }}>
        <div style={{ ...staticStyle, width: '120px' }}>{item.props || '-'}</div>
      </td>
      <td style={{ padding: '8px 12px' }}>
        <div style={{ ...staticStyle, width: '120px' }}>{item.costume || '-'}</div>
      </td>
      <td style={{ padding: '8px 12px' }}>
        <div style={{ ...staticStyle, width: '140px' }}>{item.notes || '-'}</div>
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
        <div style={{ width: '24px', height: '24px', margin: '0 auto' }}></div>
      </td>
    </>
  );
};

// Memoized content containing all heavy cell items (inputs, selects, image pickers)
const SortableItemContent = React.memo(function SortableItemContent({
  id,
  item,
  index,
  imagePreview,
  handleItemChange,
  handleImageUpload,
  removeTimelineItem,
  handleRemoveImage,
  isActiveForUpload,
  setActiveImageUploadId,
  isFocused,
  setFocusedItemId,
  viewMode,
  castOptions,
  sceneCast
}: any) {
  const isBreak = item.type === 'break';
  const isSceneTimingReadOnly = viewMode === 'scene' && !isBreak;
  const useLiteShotCells = false;

  const isFirstItem = index === 0;
  const readOnlyTimingStyle = {
    width: '72px',
    padding: '6px 8px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid transparent',
    color: 'var(--text-secondary)',
    background: 'transparent',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'not-allowed',
  };
  const readOnlyDurationStyle = {
    width: '64px',
    padding: '6px 8px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid transparent',
    color: 'var(--text-secondary)',
    background: 'transparent',
    textAlign: 'center' as const,
    cursor: 'not-allowed',
  };

  const shotCastOptions = useMemo(() => {
    const names = String(sceneCast || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const options = names.map((name: string) => ({ value: name, label: name }));
    return [
      {
        label: 'Scene Cast',
        options
      }
    ];
  }, [sceneCast]);

  const handleImageAreaClick = () => {
    setActiveImageUploadId(isActiveForUpload ? null : item.id);
  };

  const formatCellValue = (value: any) => {
    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (typeof entry === 'string') return entry;
          return entry?.label || entry?.value || '';
        })
        .filter(Boolean)
        .join(', ');
    }
    if (value && typeof value === 'object') {
      return value.label || value.value || '';
    }
    return String(value || '').trim();
  };

  const renderLiteCell = (value: any, placeholder: string, width: number, options?: { area?: boolean; compact?: boolean; static?: boolean }) => {
    const displayValue = formatCellValue(value);
    const classNames = [
      'schedule-lite-cell',
      displayValue ? '' : 'empty',
      options?.area ? 'area' : '',
      options?.compact ? 'compact' : '',
      options?.static ? 'static' : '',
    ].filter(Boolean).join(' ');

    return (
      <span
        className={classNames}
        title={displayValue || placeholder}
        style={{ '--lite-width': `${width}px` } as React.CSSProperties}
      >
        {displayValue || placeholder}
      </span>
    );
  };

  return (
    <>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {useLiteShotCells ? (
            renderLiteCell(item.start || '--:--', '--:--', 72, { compact: true, static: true })
          ) : isSceneTimingReadOnly ? (
            <span title={SCENE_GROUP_TIMING_TITLE} style={readOnlyTimingStyle}>{item.start || '--:--'}</span>
          ) : (
            <DarkTimePicker value={item.start} onChange={(val) => handleItemChange(item.id, 'start', val)} disabled={!isFirstItem} style={{ width: '72px', padding: '6px 8px', fontSize: '13px' }} />
          )}
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          {useLiteShotCells ? (
            renderLiteCell(item.end || '--:--', '--:--', 72, { compact: true, static: true })
          ) : isSceneTimingReadOnly ? (
            <span title={SCENE_GROUP_TIMING_TITLE} style={readOnlyTimingStyle}>{item.end || '--:--'}</span>
          ) : (
            <DarkTimePicker value={item.end} onChange={(val) => handleItemChange(item.id, 'end', val)} style={{ width: '72px', padding: '6px 8px', fontSize: '13px' }} />
          )}
        </div>
      </td>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {useLiteShotCells ? (
            renderLiteCell(item.duration, '0', 64, { compact: true })
          ) : isSceneTimingReadOnly ? (
            <span title={SCENE_GROUP_TIMING_TITLE} style={readOnlyDurationStyle}>{item.duration}</span>
          ) : (
            <input type="number" min="0" value={item.duration} onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)} className="no-style" style={{ width: '64px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>min</span>
        </div>
      </td>
      {isBreak ? (
        <td colSpan={viewMode === 'shot' ? 15 : 9} style={{ padding: '8px 12px' }}>
          <DeferredTextField type="text" value={item.description} onCommit={(value) => handleItemChange(item.id, 'description', value)} className="no-style" style={{ width: '100%', padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: 'var(--accent-amber)', fontWeight: 600, fontSize: '13px', outline: 'none' }} placeholder="Break description" />
        </td>
      ) : (
        <>
          <td className="col-scene" style={{ padding: '8px 12px', width: '84px' }}>
            {useLiteShotCells ? (
              renderLiteCell(item.sceneNumber, '1A', 60, { compact: true })
            ) : (
              <DeferredTextField type="text" value={item.sceneNumber} onCommit={(value) => handleItemChange(item.id, 'sceneNumber', value)} className="no-style" style={{ width: '60px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center', outline: 'none' }} placeholder="1A" />
            )}
          </td>
          {viewMode === 'shot' && (
            <td className="col-shot" style={{ padding: '8px 12px', width: '84px' }}>
              {useLiteShotCells ? (
                renderLiteCell(item.shotNumber, '001', 60, { compact: true })
              ) : (
                <DeferredTextField type="text" value={item.shotNumber} onCommit={(value) => handleItemChange(item.id, 'shotNumber', value)} className="no-style" style={{ width: '60px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center', outline: 'none' }} placeholder="001" />
              )}
            </td>
          )}
          <td style={{ padding: '8px 12px', minWidth: '100px' }} title={viewMode === 'shot' ? 'Edit INT/EXT in Scene View only' : undefined}>
            {useLiteShotCells ? (
              renderLiteCell(item.intExt, 'INT/EXT', 96)
            ) : (
              <DarkSelect<SelectOption>
                instanceId={`row-intExt-${item.id}`}
                options={INT_EXT_OPTIONS}
                value={findOption(INT_EXT_OPTIONS, item.intExt)}
                onChange={(opt) => handleItemChange(item.id, 'intExt', (opt as SelectOption)?.value ?? '')}
                placeholder="INT/EXT"
                isClearable={false}
                isDisabled={viewMode === 'shot'}
              />
            )}
          </td>
          <td style={{ padding: '8px 12px', minWidth: '115px' }} title={viewMode === 'shot' ? 'Edit Period in Scene View only' : undefined}>
            {useLiteShotCells ? (
              renderLiteCell(item.dayNight, 'DAY/NIGHT', 108)
            ) : (
              <DarkSelect<SelectOption>
                instanceId={`row-period-${item.id}`}
                options={PERIOD_OPTIONS}
                value={findOption(PERIOD_OPTIONS, item.dayNight)}
                onChange={(opt) => handleItemChange(item.id, 'dayNight', (opt as SelectOption)?.value ?? '')}
                placeholder="DAY/NIGHT"
                isClearable={false}
                isDisabled={viewMode === 'shot'}
              />
            )}
          </td>
          <td style={{ padding: '8px 12px' }}>
            <DeferredTextField
              type="text"
              value={item.location}
              onCommit={(value) => handleItemChange(item.id, 'location', value)}
              className="no-style"
              style={{
                width: '140px',
                padding: viewMode === 'shot' ? '6px 0' : '6px 8px',
                background: viewMode === 'shot' ? 'transparent' : 'var(--bg-input)',
                border: viewMode === 'shot' ? '1px solid transparent' : '1px solid var(--border-default)',
                borderRadius: '6px',
                color: viewMode === 'shot' ? 'var(--text-secondary)' : 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                cursor: viewMode === 'shot' ? 'default' : 'text',
              }}
              placeholder={viewMode === 'shot' ? '-' : 'Location'}
              disabled={viewMode === 'shot'}
            />
          </td>
          {viewMode === 'shot' && (
            <>
              <td style={{ padding: '8px 12px', minWidth: '140px' }}>
                {useLiteShotCells ? (
                  renderLiteCell(item.shotSize, 'Size...', 132)
                ) : (
                  <DarkSelect<SelectOption, true>
                    instanceId={`row-size-${item.id}`}
                    options={SHOT_SIZE_OPTIONS}
                    value={item.shotSize}
                    onChange={(val: any) => handleItemChange(item.id, 'shotSize', val)}
                    placeholder="Size..."
                    isMulti
                    constrainShotSize={true}
                  />
                )}
              </td>
              <td style={{ padding: '8px 12px', minWidth: '140px' }}>
                {useLiteShotCells ? (
                  renderLiteCell(item.angle, 'Angle...', 132)
                ) : (
                  <DarkSelect<SelectOption, true>
                    instanceId={`row-angle-${item.id}`}
                    options={ANGLE_OPTIONS}
                    value={item.angle}
                    onChange={(val: any) => handleItemChange(item.id, 'angle', val)}
                    placeholder="Angle..."
                    isMulti
                    constrainOnePerGroup={true}
                  />
                )}
              </td>
              <td style={{ padding: '8px 12px', minWidth: '140px' }}>
                {useLiteShotCells ? (
                  renderLiteCell(item.movement, 'Movement...', 132)
                ) : (
                  <DarkSelect<SelectOption, true>
                    instanceId={`row-movement-${item.id}`}
                    options={MOVEMENT_OPTIONS}
                    value={item.movement}
                    onChange={(val: any) => handleItemChange(item.id, 'movement', val)}
                    placeholder="Movement..."
                    isMulti
                  />
                )}
              </td>
              <td style={{ padding: '8px 12px' }}>
                {useLiteShotCells ? (
                  renderLiteCell(item.lens, '50mm', 72)
                ) : (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type="number" value={item.lens ? item.lens.replace('mm', '').trim() : ''} onChange={(e) => handleItemChange(item.id, 'lens', e.target.value ? `${e.target.value}mm` : '')} className="no-style" style={{ width: '72px', height: '36px', paddingLeft: '8px', paddingRight: '28px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} placeholder="50" />
                    <span style={{ position: 'absolute', right: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', pointerEvents: 'none' }}>mm</span>
                  </div>
                )}
              </td>
            </>
          )}
          <td style={{ padding: '8px 12px' }}>
            {useLiteShotCells ? (
              renderLiteCell(item.shotDescription || item.description, 'Shot description', 200, { area: true })
            ) : (
              <DeferredTextField
                as="textarea"
                value={viewMode === 'shot' ? (item.shotDescription || '') : (item.description || '')}
                onCommit={(value) => handleItemChange(item.id, viewMode === 'shot' ? 'shotDescription' : 'description', value)}
                className="no-style"
                style={{ width: '200px', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                placeholder={viewMode === 'shot' ? 'Shot description' : 'Scene description'}
                rows={2}
              />
            )}
          </td>
          <td style={{ padding: '8px 12px', minWidth: '160px' }}>
            {useLiteShotCells ? (
              renderLiteCell(item.cast, 'Cast...', 152)
            ) : (
              <DarkSelect<SelectOption, true>
                instanceId={`row-cast-${item.id}`}
                options={viewMode === 'shot' ? shotCastOptions : castOptions}
                value={viewMode === 'shot' ? (item.cast || '') : sceneCast}
                onChange={(val: any) => handleItemChange(item.id, viewMode === 'shot' ? 'cast' : 'sceneCast', val)}
                placeholder="Cast..."
                isMulti
                isCreatable={viewMode === 'scene'}
                useChips={true}
              />
            )}
          </td>
          {viewMode === 'shot' && (
            <td style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '4px', borderRadius: '8px', cursor: 'pointer', background: isActiveForUpload ? 'var(--accent-glow-sm)' : 'transparent', border: isActiveForUpload ? '1px solid var(--accent-primary)' : '1px solid transparent', transition: 'all 0.2s' }}>
                {imagePreview ? (
                  <div className="relative group/img" onClick={handleImageAreaClick}>
                    <img src={imagePreview} alt={`Ref for ${item.shotNumber}`} style={{ width: '72px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-default)' }} />
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(item.id); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <label htmlFor={`image-${item.id}`} style={{ width: '72px', height: '56px', background: 'var(--bg-input)', borderRadius: '6px', border: '2px dashed var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); handleImageAreaClick(); }}>
                    <ImageIcon style={{ width: '15px', height: '15px', color: 'var(--text-muted)' }} />
                  </label>
                )}
                <input type="file" accept="image/*" id={`image-${item.id}`} onChange={(e) => handleImageUpload(item.id, e.target.files ? e.target.files[0] : null)} className="hidden" />
                <label htmlFor={`image-${item.id}`} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                  {imagePreview ? 'Change' : 'Upload'}
                </label>
              </div>
            </td>
          )}
          <td style={{ padding: '8px 12px' }}>
            {useLiteShotCells ? (
              renderLiteCell(item.props, 'Props', 120)
            ) : (
              <DeferredTextField type="text" value={item.props} onCommit={(value) => handleItemChange(item.id, 'props', value)} className="no-style" style={{ width: '120px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} placeholder="Props" />
            )}
          </td>
          <td style={{ padding: '8px 12px' }}>
            {useLiteShotCells ? (
              renderLiteCell(item.costume, 'Costume', 120)
            ) : (
              <DeferredTextField type="text" value={item.costume} onCommit={(value) => handleItemChange(item.id, 'costume', value)} className="no-style" style={{ width: '120px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} placeholder="Costume" />
            )}
          </td>
          <td style={{ padding: '8px 12px' }}>
            {useLiteShotCells ? (
              renderLiteCell(item.notes, 'Notes', 140, { area: true })
            ) : (
              <DeferredTextField as="textarea" value={item.notes} onCommit={(value) => handleItemChange(item.id, 'notes', value)} className="no-style" style={{ width: '140px', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} placeholder="Notes" rows={2} />
            )}
          </td>
        </>
      )}
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', textAlign: 'center' }}>
        <button onClick={() => removeTimelineItem(item.id)} className="opacity-0 group-hover:opacity-100" style={{ padding: '6px', color: 'var(--text-muted)', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', margin: '0 auto' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </>
  );
}, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.index === next.index &&
    prev.imagePreview === next.imagePreview &&
    prev.isActiveForUpload === next.isActiveForUpload &&
    prev.isFocused === next.isFocused &&
    prev.viewMode === next.viewMode &&
    prev.sceneCast === next.sceneCast &&
    prev.castOptions === next.castOptions &&
    prev.item === next.item
  );
});

// Sortable timeline item (table row) shell component
const SortableItem = React.memo(function SortableItem({ id, item, index, imagePreview, handleItemChange, handleImageUpload, removeTimelineItem, handleRemoveImage, isActiveForUpload, setActiveImageUploadId, isFocused, setFocusedItemId, viewMode, castOptions, sceneCast }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const pendingFocusCellIndexRef = useRef<number | null>(null);
  const [dragSnapshot, setDragSnapshot] = useState<{ height: number; width: number } | null>(null);

  const setCombinedRef = useCallback((node: HTMLTableRowElement | null) => {
    rowRef.current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  const handleRowClick = useCallback((event: React.MouseEvent<HTMLTableRowElement>) => {
    if (isFocused) return;
    const td = (event.target as HTMLElement).closest('td');
    if (!td) return;
    pendingFocusCellIndexRef.current = td.cellIndex;
    setFocusedItemId(item.id);
  }, [isFocused, item.id, setFocusedItemId]);

  useEffect(() => {
    if (isFocused && pendingFocusCellIndexRef.current !== null) {
      const cellIndex = pendingFocusCellIndexRef.current;
      pendingFocusCellIndexRef.current = null;
      const timer = setTimeout(() => {
        const rowEl = rowRef.current;
        if (rowEl) {
          const td = rowEl.cells[cellIndex];
          if (td) {
            const focusable = td.querySelector('input, textarea, select, [tabindex="0"]') as HTMLElement | null;
            if (focusable) {
              focusable.focus();
            }
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isFocused]);

  useLayoutEffect(() => {
    if (!isDragging) {
      if (dragSnapshot) setDragSnapshot(null);
      return;
    }

    const rowEl = rowRef.current;
    if (!rowEl || dragSnapshot) return;
    const rect = rowEl.getBoundingClientRect();
    setDragSnapshot({
      height: rect.height,
      width: rect.width,
    });
  }, [isDragging, dragSnapshot]);

  const style = {
    transform: toTranslateOnlyTransform(transform),
    transition: isDragging ? 'none' : transition,
    opacity: 1,
    willChange: isDragging ? 'transform' : 'auto',
    width: isDragging && dragSnapshot ? `${dragSnapshot.width}px` : undefined,
    height: isDragging && dragSnapshot ? `${dragSnapshot.height}px` : undefined,
    minHeight: isDragging && dragSnapshot ? `${dragSnapshot.height}px` : undefined,
  };

  const isEvenRow = index % 2 !== 0;
  const isBreak = item.type === 'break';
  const rowBg = isBreak
    ? 'rgba(245,158,11,0.05)'
    : isEvenRow
      ? 'var(--bg-table-striped)'
      : 'var(--bg-elevated)';

  return (
    <tr
      ref={setCombinedRef}
      onFocusCapture={() => setFocusedItemId(item.id)}
      onClickCapture={handleRowClick}
      style={{
        ...style,
        background: rowBg,
      }}
      className={`group ${isDragging ? 'dragging-row' : ''}`}
    >
      <td className="col-drag" style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap', width: '48px', borderLeft: isFocused ? '3px solid var(--accent-primary)' : '3px solid transparent' }}>
        <button
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', padding: '6px', color: 'var(--text-muted)', opacity: 1, background: 'transparent', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', margin: '0 auto' }}
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <SortableItemContent
        id={id}
        item={item}
        index={index}
        imagePreview={imagePreview}
        handleItemChange={handleItemChange}
        handleImageUpload={handleImageUpload}
        removeTimelineItem={removeTimelineItem}
        handleRemoveImage={handleRemoveImage}
        isActiveForUpload={isActiveForUpload}
        setActiveImageUploadId={setActiveImageUploadId}
        isFocused={isFocused}
        setFocusedItemId={setFocusedItemId}
        viewMode={viewMode}
        castOptions={castOptions}
        sceneCast={sceneCast}
      />
    </tr>
  );
});

const DraggableSceneCard = React.memo(function DraggableSceneCard({ scene }: { scene: any }) {
  // Drag and drop disabled for now
  /*
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: scene.id,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 9999 : 1,
  } : undefined;
  */

  return (
    <div
      className="glass-card"
      style={{
        padding: '12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        userSelect: 'none',
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{
          padding: '2px 6px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          fontWeight: 800,
          fontSize: '11px',
          color: 'var(--text-primary)'
        }}>
          SC. {scene.sceneNumber}
        </span>
        <span className="chip chip-violet" style={{ fontSize: '9px', padding: '1px 4px' }}>{scene.intExt}</span>
        <span className="chip chip-amber" style={{ fontSize: '9px', padding: '1px 4px' }}>{scene.dayNight}</span>
      </div>
      {scene.location && (
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {scene.location}
        </div>
      )}
      {scene.description && (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {scene.description}
        </div>
      )}
    </div>
  );
});

// Static placeholder rendered when a mobile card is actively being dragged
const SortableMobileCardDraggingPlaceholder = ({ item, viewMode }: { item: any, viewMode: 'scene' | 'shot' }) => {
  const isBreak = item.type === 'break';
  if (isBreak) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px', background: 'rgba(245,158,11,0.06)' }}>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <span className="chip chip-amber" style={{ fontSize: '11px', fontWeight: 700 }}>BREAK</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.start} - {item.end}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({item.duration}m)</span>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', borderBottom: '1px dashed var(--border-subtle)', padding: '2px 4px', minWidth: '120px' }}>
            {item.description || 'Meal Break'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {item.sceneNumber && (
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-primary)' }}>
              Sc. {item.sceneNumber}
            </span>
          )}
          {viewMode === 'shot' && item.shotNumber && (
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
    </div>
  );
};

// Memoized mobile card content containing inputs and selects
const SortableMobileCardContent = React.memo(function SortableMobileCardContent({
  id,
  item,
  index,
  imagePreview,
  handleItemChange,
  handleImageUpload,
  removeTimelineItem,
  handleRemoveImage,
  isActiveForUpload,
  setActiveImageUploadId,
  viewMode,
  castOptions,
  sceneCast
}: {
  id: string;
  item: any;
  index: number;
  imagePreview?: string;
  handleItemChange: (itemId: string, field: string, value: any) => void;
  handleImageUpload: (itemId: string, file: File | null) => void;
  removeTimelineItem: (itemId: string) => void;
  handleRemoveImage: (itemId: string) => void;
  isActiveForUpload: boolean;
  setActiveImageUploadId: any;
  viewMode: 'scene' | 'shot';
  castOptions: any;
  sceneCast: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const shotCastOptions = useMemo(() => {
    const names = sceneCast.split(',').map(s => s.trim()).filter(Boolean);
    const options = names.map(name => ({ value: name, label: name }));
    return [
      {
        label: 'Scene Cast',
        options
      }
    ];
  }, [sceneCast]);

  const isBreak = item.type === 'break';
  const isSceneTimingReadOnly = viewMode === 'scene' && !isBreak;
  const mobileReadOnlyTimingStyle = {
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'not-allowed',
  };

  if (isBreak) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px', background: 'rgba(245,158,11,0.06)' }}>
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
    );
  }

  return (
    <>
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
        {/* Scene Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {item.sceneNumber && (
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                Sc. {item.sceneNumber}
              </span>
            )}
            {viewMode === 'shot' && item.shotNumber && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Sh. {item.shotNumber}
              </span>
            )}
            <span
              title={isSceneTimingReadOnly ? SCENE_GROUP_TIMING_TITLE : undefined}
              style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}
            >
              {item.start} - {item.end}
            </span>
            <span
              title={isSceneTimingReadOnly ? SCENE_GROUP_TIMING_TITLE : undefined}
              style={{ fontSize: '11px', color: 'var(--text-muted)' }}
            >
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
          {viewMode === 'shot' ? (
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
          ) : (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Scene Number</label>
              <input
                type="text"
                value={item.sceneNumber || ''}
                onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              />
            </div>
          )}

          {/* Row 3: Duration & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Duration</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isSceneTimingReadOnly ? (
                  <span title={SCENE_GROUP_TIMING_TITLE} style={mobileReadOnlyTimingStyle}>{item.duration}</span>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={item.duration}
                    onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  />
                )}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>m</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Location</label>
              <input
                type="text"
                value={item.location || ''}
                onChange={(e) => handleItemChange(item.id, 'location', e.target.value)}
                placeholder={viewMode === 'shot' ? '-' : 'e.g. Living Room'}
                style={{
                  width: '100%',
                  padding: viewMode === 'shot' ? '8px 0' : '8px 12px',
                  background: viewMode === 'shot' ? 'transparent' : 'var(--bg-input)',
                  border: viewMode === 'shot' ? '1px solid transparent' : '1px solid var(--border-default)',
                  borderRadius: '6px',
                  color: viewMode === 'shot' ? 'var(--text-secondary)' : 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: viewMode === 'shot' ? 'default' : 'text',
                }}
                disabled={viewMode === 'shot'}
              />
            </div>
          </div>

          {/* Size, Angle, Movement */}
          {viewMode === 'shot' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Shot Size</label>
                  <DarkSelect<SelectOption, true>
                    instanceId={`mobile-size-${item.id}`}
                    options={SHOT_SIZE_OPTIONS}
                    value={item.shotSize}
                    onChange={(val: any) => handleItemChange(item.id, 'shotSize', val)}
                    placeholder="Size..."
                    isMulti
                    constrainShotSize={true}
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
                  <DarkSelect<SelectOption, true>
                    instanceId={`mobile-angle-${item.id}`}
                    options={ANGLE_OPTIONS}
                    value={item.angle}
                    onChange={(val: any) => handleItemChange(item.id, 'angle', val)}
                    placeholder="Angle..."
                    isMulti
                    constrainOnePerGroup={true}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Movement</label>
                  <DarkSelect<SelectOption, true>
                    instanceId={`mobile-movement-${item.id}`}
                    options={MOVEMENT_OPTIONS}
                    value={item.movement}
                    onChange={(val: any) => handleItemChange(item.id, 'movement', val)}
                    placeholder="Movement..."
                    isMulti
                  />
                </div>
              </div>
            </>
          )}

          {/* Row 4: Description */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={viewMode === 'shot' ? (item.shotDescription || '') : (item.description || '')}
              onChange={(e) => handleItemChange(item.id, viewMode === 'shot' ? 'shotDescription' : 'description', e.target.value)}
              placeholder={viewMode === 'shot' ? 'Shot description' : 'Scene description'}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {/* Row 5: Cast */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Cast / Characters</label>
            <DarkSelect<SelectOption, true>
              instanceId={`mobile-cast-${item.id}`}
              options={viewMode === 'shot' ? shotCastOptions : castOptions}
              value={viewMode === 'shot' ? (item.cast || '') : sceneCast}
              onChange={(val: any) => handleItemChange(item.id, viewMode === 'shot' ? 'cast' : 'sceneCast', val)}
              placeholder="Cast..."
              isMulti
              isCreatable={viewMode === 'scene'}
              useChips={true}
            />
          </div>

          {/* Reference Image */}
          {viewMode === 'shot' && (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Reference Image</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {imagePreview ? (
                  <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={imagePreview} alt="Reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          )}

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
    </>
  );
}, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.index === next.index &&
    prev.imagePreview === next.imagePreview &&
    prev.isActiveForUpload === next.isActiveForUpload &&
    prev.viewMode === next.viewMode &&
    prev.sceneCast === next.sceneCast &&
    prev.castOptions === next.castOptions &&
    prev.item === next.item
  );
});

// Sortable mobile card shell component
const SortableMobileCard = React.memo(function SortableMobileCard({
  id,
  item,
  index,
  imagePreview,
  handleItemChange,
  handleImageUpload,
  removeTimelineItem,
  handleRemoveImage,
  isActiveForUpload,
  setActiveImageUploadId,
  viewMode,
  castOptions,
  sceneCast
}: {
  id: string;
  item: any;
  index: number;
  imagePreview?: string;
  handleItemChange: (itemId: string, field: string, value: any) => void;
  handleImageUpload: (itemId: string, file: File | null) => void;
  removeTimelineItem: (itemId: string) => void;
  handleRemoveImage: (itemId: string) => void;
  isActiveForUpload: boolean;
  setActiveImageUploadId: any;
  viewMode: 'scene' | 'shot';
  castOptions: any;
  sceneCast: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [dragSnapshot, setDragSnapshot] = useState<{ height: number; width: number } | null>(null);

  const setCombinedRef = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  useLayoutEffect(() => {
    if (!isDragging) {
      if (dragSnapshot) setDragSnapshot(null);
      return;
    }

    const cardEl = cardRef.current;
    if (!cardEl || dragSnapshot) return;
    const rect = cardEl.getBoundingClientRect();
    setDragSnapshot({
      height: rect.height,
      width: rect.width,
    });
  }, [isDragging, dragSnapshot]);

  const style = {
    transform: toTranslateOnlyTransform(transform),
    transition: isDragging ? 'none' : transition,
    opacity: 1,
    zIndex: isDragging ? 20 : 1,
    willChange: isDragging ? 'transform' : 'auto',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    marginBottom: '12px',
    overflow: 'hidden',
    position: 'relative' as const,
    width: isDragging && dragSnapshot ? `${dragSnapshot.width}px` : undefined,
    height: isDragging && dragSnapshot ? `${dragSnapshot.height}px` : undefined,
    minHeight: isDragging && dragSnapshot ? `${dragSnapshot.height}px` : undefined,
  };

  return (
    <div ref={setCombinedRef} className={`editor-render-surface ${isDragging ? 'dragging-card' : ''}`} style={style}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
        <div 
          {...attributes} 
          {...listeners} 
          className="touch-target" 
          style={{ 
            cursor: 'grab', 
            color: 'var(--text-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '12px 12px',
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <GripVertical className="w-5 h-5" />
        </div>
        <div style={{ flex: 1 }}>
          <SortableMobileCardContent
            id={id}
            item={item}
            index={index}
            imagePreview={imagePreview}
            handleItemChange={handleItemChange}
            handleImageUpload={handleImageUpload}
            removeTimelineItem={removeTimelineItem}
            handleRemoveImage={handleRemoveImage}
            isActiveForUpload={isActiveForUpload}
            setActiveImageUploadId={setActiveImageUploadId}
            viewMode={viewMode}
            castOptions={castOptions}
            sceneCast={sceneCast}
          />
        </div>
      </div>
    </div>
  );
});;

function ShotImportModal({ isOpen, onClose, shotList, imagePreviews, onImport }: { isOpen: boolean; onClose: () => void; shotList: any[]; imagePreviews: Record<string, string>; onImport: (selectedShots: string[]) => void; }) {
  // Hooks are now at the top level
  const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedShots(new Set());
      setSearchTerm('');
    }
  }, [isOpen]);

  const groupedAndFilteredShots = useMemo((): Record<string, any[]> => {
    const filtered = shotList.filter((shot: any) =>
      shot.sceneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shot.shotNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shot.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups = filtered.reduce((acc: Record<string, any[]>, shot: any) => {
      const sceneKey = shot.sceneNumber || 'Uncategorized';
      if (!acc[sceneKey]) {
        acc[sceneKey] = [];
      }
      acc[sceneKey].push(shot);
      return acc;
    }, {} as Record<string, any[]>);

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
    const allFilteredIds = Object.values(groupedAndFilteredShots).flat().map((s: any) => s.id);
    if (selectedShots.size === allFilteredIds.length) {
      setSelectedShots(new Set());
    } else {
      setSelectedShots(new Set(allFilteredIds));
    }
  };

  const handleSelectScene = (sceneShots: any[]) => {
    const sceneShotIds = sceneShots.map((s: any) => s.id);
    const allCurrentlySelected = sceneShotIds.every((id: any) => selectedShots.has(id));

    setSelectedShots(prev => {
      const newSet = new Set(prev);
      if (allCurrentlySelected) {
        sceneShotIds.forEach((id: any) => newSet.delete(id));
      } else {
        sceneShotIds.forEach((id: any) => newSet.add(id));
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
              {Object.entries(groupedAndFilteredShots).length > 0 ? Object.entries(groupedAndFilteredShots).map(([sceneKey, shots]: [string, any]) => (
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
                    {shots.map((shot: any) => (
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

type CastCall = {
  id: string;
  role: string;
  name: string;
  callTime: string;
  notes: string;
};

type CallSheetData = {
  generalCall: string;
  castCalls: CastCall[];
  emergencyContact: string;
  nearestHospital: string;
  hospitalAddress: string;
  parkingNotes: string;
  departmentNotes: string;
  transportNotes: string;
  safetyNotes: string;
  lineRemarks: string;
  lastGeneratedAt?: string;
};

const createDefaultCallSheetData = (headerInfo: any, timelineItems: any[]): CallSheetData => {
  const castNames = Array.from(new Set(
    timelineItems
      .filter(item => item.type === 'shot' && item.cast)
      .flatMap(item => String(item.cast).split(','))
      .map(name => name.trim())
      .filter(Boolean)
  ));

  return {
    generalCall: headerInfo.callTime || '',
    castCalls: castNames.map(name => ({
      id: generateId(),
      role: '',
      name,
      callTime: headerInfo.callTime || '',
      notes: ''
    })),
    emergencyContact: '',
    nearestHospital: '',
    hospitalAddress: '',
    parkingNotes: '',
    departmentNotes: '',
    transportNotes: '',
    safetyNotes: '',
    lineRemarks: '',
  };
};

const mergeCallSheetData = (base: CallSheetData, saved?: Partial<CallSheetData> | null): CallSheetData => {
  const normalizeName = (name: string) => name.trim().toLowerCase();
  const savedCalls = (saved?.castCalls || []).map(call => ({
    id: call.id || generateId(),
    role: call.role || '',
    name: call.name || '',
    callTime: call.callTime || base.generalCall || '',
    notes: call.notes || ''
  }));
  const savedByName = new Map(savedCalls.map(call => [normalizeName(call.name), call]));
  const missingBaseCalls = base.castCalls
    .filter(call => call.name && !savedByName.has(normalizeName(call.name)))
    .map(call => ({ ...call, callTime: call.callTime || base.generalCall || '' }));

  return {
    ...base,
    ...(saved || {}),
    emergencyContact: saved?.emergencyContact || base.emergencyContact,
    nearestHospital: saved?.nearestHospital || base.nearestHospital,
    hospitalAddress: saved?.hospitalAddress || base.hospitalAddress,
    parkingNotes: saved?.parkingNotes || base.parkingNotes,
    departmentNotes: saved?.departmentNotes || base.departmentNotes,
    transportNotes: saved?.transportNotes || base.transportNotes,
    safetyNotes: saved?.safetyNotes || base.safetyNotes,
    lineRemarks: saved?.lineRemarks || base.lineRemarks,
    castCalls: [...savedCalls, ...missingBaseCalls]
  };
};

type CallSheetBuilderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  headerInfo: any;
  timelineItems: any[];
  stats: any;
  callSheetData: CallSheetData | null;
  onChange: (data: CallSheetData) => void;
  onExport: () => void;
};

function CallSheetBuilderModal({ isOpen, onClose, headerInfo, timelineItems, stats, callSheetData, onChange, onExport }: CallSheetBuilderModalProps) {
  if (!isOpen || !callSheetData) return null;

  const updateField = (field: keyof CallSheetData, value: any) => {
    onChange({ ...callSheetData, [field]: value });
  };

  const updateCastCall = (id: string, field: keyof CastCall, value: string) => {
    updateField('castCalls', callSheetData.castCalls.map(call => call.id === id ? { ...call, [field]: value } : call));
  };

  const addCastCall = () => {
    updateField('castCalls', [
      ...callSheetData.castCalls,
      { id: generateId(), role: '', name: '', callTime: callSheetData.generalCall || headerInfo.callTime || '', notes: '' }
    ]);
  };

  const removeCastCall = (id: string) => {
    updateField('castCalls', callSheetData.castCalls.filter(call => call.id !== id));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit'
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '84px',
    resize: 'vertical' as const,
    lineHeight: 1.45
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px'
  };

  const shotCount = timelineItems.filter(item => item.type === 'shot').length;
  const breakCount = timelineItems.filter(item => item.type === 'break').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl max-w-5xl w-full my-8 animate-in fade-in zoom-in-95 duration-300 flex flex-col" style={{ color: 'var(--text-primary)', overflow: 'hidden', maxHeight: '88vh' }}>
          <div className="p-6 border-b border-[var(--border-default)]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                Call Sheet Builder
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Review daily details, then export an A4 portrait call sheet for LINE or print.</p>
            </div>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '8px', display: 'flex', alignItems: 'center' }} title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Project', value: headerInfo.projectTitle || 'Untitled Project' },
                { label: 'Shoot Day', value: `Q${headerInfo.shootingDay || '-'} / ${headerInfo.totalDays || '-'}` },
                { label: 'Schedule', value: `${shotCount} shots, ${breakCount} breaks` },
                { label: 'Duration', value: `${stats.totalHours}h ${stats.totalMinutes}m` },
              ].map(item => (
                <div key={item.label} className="stat-card" style={{ minHeight: '76px', padding: '14px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>{item.label}</p>
                    <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                Daily Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>General Crew Call</label>
                  <DarkTimePicker value={callSheetData.generalCall} onChange={(val) => updateField('generalCall', val)} className="w-full px-3 py-2" />
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="text" value={headerInfo.date || ''} readOnly style={{ ...inputStyle, color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <label style={labelStyle}>Location 1</label>
                  <input type="text" value={headerInfo.location1 || ''} readOnly style={{ ...inputStyle, color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <label style={labelStyle}>Location 2 / 3</label>
                  <input type="text" value={[headerInfo.location2, headerInfo.location3].filter(Boolean).join(' / ')} readOnly style={{ ...inputStyle, color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <label style={labelStyle}>Weather</label>
                  <input type="text" value={headerInfo.weather || ''} readOnly style={{ ...inputStyle, color: 'var(--text-secondary)' }} />
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  Cast Call List
                </h4>
                <button onClick={addCastCall} className="btn-secondary" style={{ fontSize: '12px', padding: '7px 10px', gap: '6px' }}>
                  <Plus className="w-4 h-4" /> Add Cast
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {callSheetData.castCalls.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '18px', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-default)', borderRadius: '8px' }}>
                    No cast calls yet.
                  </div>
                )}
                {callSheetData.castCalls.map(call => (
                  <div key={call.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 110px 1.4fr 36px', gap: '10px', alignItems: 'center' }}>
                    <input type="text" value={call.role} onChange={(e) => updateCastCall(call.id, 'role', e.target.value)} placeholder="Role" style={inputStyle} />
                    <input type="text" value={call.name} onChange={(e) => updateCastCall(call.id, 'name', e.target.value)} placeholder="Name" style={inputStyle} />
                    <DarkTimePicker value={call.callTime} onChange={(val) => updateCastCall(call.id, 'callTime', val)} style={{ width: '100%', padding: '8px 10px', fontSize: '13px' }} />
                    <input type="text" value={call.notes} onChange={(e) => updateCastCall(call.id, 'notes', e.target.value)} placeholder="Notes" style={inputStyle} />
                    <button onClick={() => removeCastCall(call.id)} className="btn-ghost" style={{ padding: '8px', display: 'flex', justifyContent: 'center', color: 'var(--accent-red)' }} title="Remove cast call">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListPlus className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                Production Notes
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Department Notes</label>
                  <textarea value={callSheetData.departmentNotes} onChange={(e) => updateField('departmentNotes', e.target.value)} placeholder="Art, camera, wardrobe, makeup..." style={textareaStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Parking / Access</label>
                  <textarea value={callSheetData.parkingNotes} onChange={(e) => updateField('parkingNotes', e.target.value)} placeholder="Parking gate, entrance, access timing..." style={textareaStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Transport / Shuttle</label>
                  <textarea value={callSheetData.transportNotes} onChange={(e) => updateField('transportNotes', e.target.value)} placeholder="Shuttle plan, route, pickup notes..." style={textareaStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Safety / Emergency</label>
                  <textarea value={callSheetData.safetyNotes} onChange={(e) => updateField('safetyNotes', e.target.value)} placeholder="Emergency contact, hospital, safety reminders..." style={textareaStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Emergency Contact</label>
                  <textarea value={callSheetData.emergencyContact} onChange={(e) => updateField('emergencyContact', e.target.value)} placeholder="Production manager, medic, emergency numbers..." style={textareaStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nearest Hospital</label>
                  <textarea value={callSheetData.nearestHospital} onChange={(e) => updateField('nearestHospital', e.target.value)} placeholder="Hospital / clinic name..." style={textareaStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hospital Address</label>
                  <textarea value={callSheetData.hospitalAddress} onChange={(e) => updateField('hospitalAddress', e.target.value)} placeholder="Address, route note, phone..." style={textareaStyle} />
                </div>
                <div>
                  <label style={labelStyle}>LINE Remarks</label>
                  <textarea value={callSheetData.lineRemarks} onChange={(e) => updateField('lineRemarks', e.target.value)} placeholder="Short daily notes for crew group..." style={textareaStyle} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t rounded-b-xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
            <button onClick={onClose} className="btn-ghost" style={{ fontSize: '13px' }}>Cancel</button>
            <button onClick={onExport} className="btn-primary" style={{ fontSize: '13px', gap: '6px' }}>
              <Download className="w-4 h-4" /> Export Call Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main editor component
export default function ShootingScheduleEditor({
  project,
  onBack,
  onSave
}: {
  project?: any;
  onBack: () => void;
  onSave: (data: any, projectObj?: any) => void | Promise<void>;
}) {
  const [docState, setDocState, { undo, redo, canUndo, canRedo }] = useUndoRedo(() => {
    const defaultHeader = { projectTitle: project?.name || '', episodeNumber: '', shootingDay: '', totalDays: '', date: new Date().toISOString().split('T')[0], callTime: '', sunrise: '06:30', sunset: '18:30', weather: '', location1: '', location2: '', location3: '', director: '', producer: '', dop: '', firstAD: '', secondAD: '', pd: '', artTime: '', lunchTime: '', dinnerTime: '', precipProb: '', temp: '', realFeel: '', firstShotTime: '', firstmealTime: '', secondmealTime: '', thirdmealTime: '', wrapTime: '' };
    
    // Legacy compatibility check
    const legacySchedule = project?.data?.scheduleData || {};
    const headerInfo = project?.data?.headerInfo || legacySchedule.headerInfo;
    const timelineItems = project?.data?.timelineItems || legacySchedule.timelineItems || [];
    const imagePreviews = project?.data?.imagePreviews || legacySchedule.imagePreviews || {};
    const callSheetData = project?.data?.callSheetData || legacySchedule.callSheetData || null;

    return {
      headerInfo: headerInfo ? { ...defaultHeader, ...headerInfo } : defaultHeader,
      timelineItems,
      imagePreviews,
      callSheetData
    };
  });

  const headerInfo = docState.headerInfo;
  const timelineItems = docState.timelineItems;
  const imagePreviews = docState.imagePreviews;
  const callSheetData = docState.callSheetData;

  const setHeaderInfo = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    const prevHeaderInfo = docState.headerInfo;
    const headerInfoVal = typeof newValOrFn === 'function' ? newValOrFn(prevHeaderInfo) : newValOrFn;
    
    let isContinuous = options?.isContinuous;
    if (isContinuous === undefined) {
      const changedKeys = Object.keys(headerInfoVal).filter(k => headerInfoVal[k] !== prevHeaderInfo[k]);
      const discreteKeys = ['date', 'callTime', 'firstShotTime', 'wrapTime', 'firstmealTime', 'secondmealTime', 'thirdmealTime', 'sunrise', 'sunset', 'location1', 'location2', 'location3'];
      const hasDiscreteChange = changedKeys.some(k => discreteKeys.includes(k));
      isContinuous = changedKeys.length > 0 && !hasDiscreteChange;
    }

    setDocState(prev => ({
      ...prev,
      headerInfo: headerInfoVal
    }), { isContinuous });
    setDirtyRevision((revision: number) => revision + 1);
  }, [setDocState, docState.headerInfo]);

  const setTimelineItems = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    setDocState(prev => {
      const timelineItemsVal = typeof newValOrFn === 'function' ? newValOrFn(prev.timelineItems) : newValOrFn;
      return {
        ...prev,
        timelineItems: timelineItemsVal
      };
    }, options);
    setDirtyRevision((revision: number) => revision + 1);
  }, [setDocState]);

  const setImagePreviews = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    setDocState(prev => {
      const imagePreviewsVal = typeof newValOrFn === 'function' ? newValOrFn(prev.imagePreviews) : newValOrFn;
      return {
        ...prev,
        imagePreviews: imagePreviewsVal
      };
    }, options);
    setDirtyRevision((revision: number) => revision + 1);
  }, [setDocState]);
  const setCallSheetData = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    setDocState(prev => {
      const callSheetDataVal = typeof newValOrFn === 'function' ? newValOrFn(prev.callSheetData) : newValOrFn;
      return {
        ...prev,
        callSheetData: callSheetDataVal
      };
    }, options);
    setDirtyRevision((revision: number) => revision + 1);
  }, [setDocState]);
  const [viewMode, setViewMode] = useState<'scene' | 'shot'>('scene');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [isCallSheetOpen, setIsCallSheetOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(true);
  const [activeImageUploadId, setActiveImageUploadId] = useState(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [dirtyRevision, setDirtyRevision] = useState(0);
  const debounceTimeoutRef = useRef<any>(null);
  const isInitialMount = useRef(true);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarContentRef = useRef<HTMLDivElement | null>(null);
  const [showFloatingScrollbar, setShowFloatingScrollbar] = useState(false);
  const [isTableScrolled, setIsTableScrolled] = useState(false);
  const [isDraggingTimelineItem, setIsDraggingTimelineItem] = useState(false);
  const isSyncingScroll = useRef<string | null>(null);
  const isDraggingTimelineItemRef = useRef(false);
  const dragLockedScrollLeftRef = useRef<number | null>(null);
  const legacyImageMigrationRunRef = useRef(false);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const unscheduledScenes = useMemo(() => {
    const breakdownScenes = project?.data?.breakdownData?.scenes || [];
    const scheduledSceneNumbers = new Set(
      timelineItems
        .filter((item: any) => item.type === 'shot' && item.sceneNumber)
        .map((item: any) => item.sceneNumber.trim().toLowerCase())
    );
    return breakdownScenes.filter((scene: any) => 
      scene.sceneNumber && !scheduledSceneNumbers.has(scene.sceneNumber.trim().toLowerCase())
    );
  }, [project?.data?.breakdownData?.scenes, timelineItems]);

  const sceneCastByScene = useMemo(() => {
    const sceneCastMap = new Map<string, string>();
    const fallbackCastMap = new Map<string, Set<string>>();

    timelineItems.forEach((item: any) => {
      if (item.type !== 'shot') return;

      const sceneNum = (item.sceneNumber || '').trim().toLowerCase();
      if (!sceneNum) return;

      if (item.sceneCast && !sceneCastMap.has(sceneNum)) {
        sceneCastMap.set(sceneNum, item.sceneCast);
      }

      if (item.cast) {
        let castSet = fallbackCastMap.get(sceneNum);
        if (!castSet) {
          castSet = new Set<string>();
          fallbackCastMap.set(sceneNum, castSet);
        }
        String(item.cast).split(',').map(s => s.trim()).filter(Boolean).forEach(c => castSet.add(c));
      }
    });

    fallbackCastMap.forEach((castSet, sceneNum) => {
      if (!sceneCastMap.has(sceneNum)) {
        sceneCastMap.set(sceneNum, Array.from(castSet).join(', '));
      }
    });

    return sceneCastMap;
  }, [timelineItems]);

  const getSceneCast = useCallback((item: any) => {
    const sceneNum = (item.sceneNumber || '').trim().toLowerCase();
    if (!sceneNum) return '';
    return sceneCastByScene.get(sceneNum) || '';
  }, [sceneCastByScene]);

  const castOptions = useMemo(() => {
    const uniqueCast = new Set<string>();

    const breakdownScenes = project?.data?.breakdownData?.scenes || [];
    breakdownScenes.forEach((scene: any) => {
      if (scene.cast) {
        String(scene.cast)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .forEach(c => uniqueCast.add(c));
      }
    });

    timelineItems.forEach((item: any) => {
      if (item.cast) {
        String(item.cast)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .forEach(c => uniqueCast.add(c));
      }
      if (item.sceneCast) {
        String(item.sceneCast)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .forEach(c => uniqueCast.add(c));
      }
    });

    const options = Array.from(uniqueCast)
      .sort((a, b) => a.localeCompare(b))
      .map(c => ({ value: c, label: c }));

    return [
      {
        label: 'Cast / Characters',
        options
      }
    ];
  }, [project?.data?.breakdownData?.scenes, timelineItems]);

  const groupedTimelineItems = useMemo(() => {
    const result: any[] = [];
    let currentGroup: any = null;

    timelineItems.forEach((item: any) => {
      if (item.type === 'break') {
        if (currentGroup) {
          result.push(currentGroup);
          currentGroup = null;
        }
        result.push(item);
      } else {
        const sceneNum = (item.sceneNumber || '').trim();
        if (!sceneNum) {
          if (currentGroup) {
            result.push(currentGroup);
            currentGroup = null;
          }
          result.push({
            ...item,
            underlyingItems: [item]
          });
        } else {
          if (currentGroup && currentGroup.sceneNumber === sceneNum) {
            currentGroup.underlyingItems.push(item);
            currentGroup.duration += Number(item.duration || 0);
            currentGroup.end = item.end;
            
            const shotNumbers = currentGroup.underlyingItems.map((ui: any) => ui.shotNumber).filter(Boolean);
            currentGroup.shotNumber = shotNumbers.length > 0 ? shotNumbers.join(', ') : '';

            const unionCSV = (a: string, b: string) => {
              const set = new Set([...(a || '').split(',').map(s => s.trim()), ...(b || '').split(',').map(s => s.trim())].filter(Boolean));
              return Array.from(set).join(', ');
            };
             currentGroup.cast = unionCSV(currentGroup.cast, item.cast);
            if (!currentGroup.sceneCast && item.sceneCast) {
              currentGroup.sceneCast = item.sceneCast;
            }
            currentGroup.props = unionCSV(currentGroup.props, item.props);
            currentGroup.costume = unionCSV(currentGroup.costume, item.costume);
            
            if (item.description && !currentGroup.description.includes(item.description)) {
              currentGroup.description = currentGroup.description 
                ? `${currentGroup.description} | ${item.description}` 
                : item.description;
            }
            if (item.notes && !currentGroup.notes.includes(item.notes)) {
              currentGroup.notes = currentGroup.notes 
                ? `${currentGroup.notes} | ${item.notes}` 
                : item.notes;
            }
          } else {
            if (currentGroup) {
              result.push(currentGroup);
            }
            currentGroup = {
              id: `scene-group-${sceneNum}-${item.id}`,
              type: 'scene-group',
              start: item.start,
              duration: Number(item.duration || 0),
              end: item.end,
              sceneNumber: sceneNum,
              shotNumber: item.shotNumber || '',
              intExt: item.intExt || 'INT',
              dayNight: item.dayNight || 'DAY',
              location: item.location || '',
              description: item.description || '',
              cast: item.cast || '',
              sceneCast: item.sceneCast || '',
              props: item.props || '',
              costume: item.costume || '',
              notes: item.notes || '',
              underlyingItems: [item]
            };
          }
        }
      }
    });

    if (currentGroup) {
      result.push(currentGroup);
    }
    return result;
  }, [timelineItems]);

  const itemsToRender = useMemo(() => {
    return viewMode === 'scene' ? groupedTimelineItems : timelineItems;
  }, [viewMode, groupedTimelineItems, timelineItems]);

  const itemsToRenderIds = useMemo(() => itemsToRender.map((item: any) => item.id), [itemsToRender]);

  const { setNodeRef: setTimelineDroppableRef } = useDroppable({
    id: 'schedule-timeline-empty',
  });

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

        const mapWeatherCode = (c: any) => {
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

        setHeaderInfo((prev: any) => ({
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

  const onSaveRef = useRef(onSave);
  const hasPendingSaveRef = useRef(false);
  const latestSaveDataRef = useRef({
    headerInfo,
    timelineItems,
    imagePreviews,
    callSheetData
  });
  useEffect(() => { onSaveRef.current = onSave; });
  useEffect(() => {
    latestSaveDataRef.current = {
      headerInfo,
      timelineItems,
      imagePreviews,
      callSheetData
    };
  }, [headerInfo, timelineItems, imagePreviews, callSheetData]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    hasPendingSaveRef.current = true;
    setSaveStatus('dirty');
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saving');
      Promise.resolve()
        .then(() => new Promise(resolve => setTimeout(resolve, 500)))
        .then(() => onSaveRef.current(latestSaveDataRef.current, project))
        .then(() => {
          hasPendingSaveRef.current = false;
          setSaveStatus('saved');
          return new Promise(resolve => setTimeout(resolve, 2500));
        })
        .then(() => setSaveStatus('idle'));
    }, 1000);
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [dirtyRevision]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (hasPendingSaveRef.current) {
        Promise.resolve(onSaveRef.current(latestSaveDataRef.current, project)).catch((err) => {
          console.error('Failed to flush schedule changes on exit:', err);
        });
      }
    };
  }, []);
  // --- END: AUTOSAVE ---

  // --- START: UI BEHAVIOR HOOKS ---
  useEffect(() => {
    isDraggingTimelineItemRef.current = isDraggingTimelineItem;
  }, [isDraggingTimelineItem]);

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
      if (isDraggingTimelineItemRef.current && dragLockedScrollLeftRef.current !== null) {
        const lockedScrollLeft = dragLockedScrollLeftRef.current;
        if (tableContainer.scrollLeft !== lockedScrollLeft) {
          tableContainer.scrollLeft = lockedScrollLeft;
        }
        if (floatingScrollbar.scrollLeft !== lockedScrollLeft) {
          floatingScrollbar.scrollLeft = lockedScrollLeft;
        }
        return;
      }

      const opacity = Math.min(tableContainer.scrollLeft / 180, 1);
      tableContainer.style.setProperty('--freeze-opacity', String(opacity));

      if (isSyncingScroll.current === 'floating') return;

      isSyncingScroll.current = 'table';
      floatingScrollbar.scrollLeft = tableContainer.scrollLeft;

      setTimeout(() => {
        if (isSyncingScroll.current === 'table') {
          isSyncingScroll.current = null;
        }
      }, 0);
    };

    const handleFloatingScroll = () => {
      if (isDraggingTimelineItemRef.current && dragLockedScrollLeftRef.current !== null) {
        const lockedScrollLeft = dragLockedScrollLeftRef.current;
        if (floatingScrollbar.scrollLeft !== lockedScrollLeft) {
          floatingScrollbar.scrollLeft = lockedScrollLeft;
        }
        return;
      }

      if (isSyncingScroll.current === 'table') return;

      isSyncingScroll.current = 'floating';
      tableContainer.scrollLeft = floatingScrollbar.scrollLeft;

      setTimeout(() => {
        if (isSyncingScroll.current === 'floating') {
          isSyncingScroll.current = null;
        }
      }, 0);
    };

    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(tableEl);
    tableContainer.addEventListener('scroll', handleTableScroll, { passive: true });
    tableContainer.addEventListener('wheel', handleTableScroll, { passive: true });
    floatingScrollbar.addEventListener('scroll', handleFloatingScroll, { passive: true });
    window.addEventListener('resize', updateScrollbar);
    updateScrollbar();
    handleTableScroll();

    return () => {
      observer.disconnect();
      if (tableContainer) tableContainer.removeEventListener('scroll', handleTableScroll);
      if (tableContainer) tableContainer.removeEventListener('wheel', handleTableScroll);
      if (floatingScrollbar) floatingScrollbar.removeEventListener('scroll', handleFloatingScroll);
      window.removeEventListener('resize', updateScrollbar);
    };
  }, [timelineItems, zoomLevel]);

  // Deselect active row/image upload when clicking outside the table
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setActiveImageUploadId(null);
        setFocusedItemId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // --- END: UI BEHAVIOR HOOKS ---

  const addHours = useCallback((timeStr: string, hoursOffset: number): string => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const d = new Date();
    d.setHours(h + hoursOffset, m, 0, 0);
    const resH = String(d.getHours()).padStart(2, '0');
    const resM = String(d.getMinutes()).padStart(2, '0');
    return `${resH}:${resM}`;
  }, []);

  const handleFirstShotChange = useCallback((val: string) => {
    setHeaderInfo((prev: any) => ({
      ...prev,
      firstShotTime: val,
      callTime: addHours(val, -1)
    }));
  }, [setHeaderInfo, addHours]);

  const handleCallTimeChange = useCallback((val: string) => {
    setHeaderInfo((prev: any) => {
      const firstShot = prev.firstShotTime || '09:00';
      if (val > firstShot) {
        return { ...prev, callTime: firstShot };
      }
      return { ...prev, callTime: val };
    });
  }, [setHeaderInfo]);

  const recalculateAndUpdateTimes = useCallback((items: any[]) => {
    let lastEndTime = headerInfo.firstShotTime || '09:00';
    const updatedItems = items.map((item: any) => {
      const newStart = lastEndTime;
      const newEnd = calculateEndTime(newStart, item.duration);
      lastEndTime = newEnd || lastEndTime;
      return { ...item, start: newStart, end: newEnd };
    });
    setTimelineItems(updatedItems);
  }, [headerInfo.firstShotTime]);

  const timelineItemsRef = useRef(timelineItems);
  const groupedTimelineItemsRef = useRef(groupedTimelineItems);
  const viewModeRef = useRef(viewMode);
  const handleFirstShotChangeRef = useRef(handleFirstShotChange);

  useEffect(() => {
    timelineItemsRef.current = timelineItems;
    groupedTimelineItemsRef.current = groupedTimelineItems;
    viewModeRef.current = viewMode;
    handleFirstShotChangeRef.current = handleFirstShotChange;
  }, [timelineItems, groupedTimelineItems, viewMode, handleFirstShotChange]);

  const handleItemChange = useCallback((itemId: any, field: any, value: any) => {
    let newItems = [...timelineItemsRef.current];
    let itemsToUpdate: string[] = [];
    const isSceneGroupUpdate = String(itemId).startsWith('scene-group-');

    if (SCENE_GROUP_TIMING_FIELDS.has(field)) {
      if (isSceneGroupUpdate) return;

      const itemToUpdate = newItems.find(item => item.id === itemId);
      if (viewModeRef.current === 'scene' && itemToUpdate?.type !== 'break') return;
    }

    if (isSceneGroupUpdate) {
      const group = groupedTimelineItemsRef.current.find(g => g.id === itemId);
      if (!group) return;
      itemsToUpdate = group.underlyingItems.map((ui: any) => ui.id);
    } else {
      itemsToUpdate = [itemId];
    }

    if (itemsToUpdate.length === 0) return;

    if (!isSceneGroupUpdate && SHOT_LINKED_FIELDS.has(field)) {
      const sourceItem = newItems.find(item => item.id === itemsToUpdate[0]);
      const linkKey = getScheduleShotLinkKey(sourceItem);
      if (linkKey) {
        itemsToUpdate = newItems
          .filter(item => getScheduleShotLinkKey(item) === linkKey)
          .map(item => item.id);
      }
    }

    let requiresRecalculation = false;
    let firstUpdatedIndex = -1;

    // Find the scene number of the item(s) being changed (before update)
    let sourceSceneNumber = '';
    const firstItemToUpdate = newItems.find(item => item.id === itemsToUpdate[0]);
    if (firstItemToUpdate && firstItemToUpdate.type !== 'break') {
      sourceSceneNumber = (firstItemToUpdate.sceneNumber || '').trim().toLowerCase();
    }

    // If we are updating a scene-level linked field and the source scene number is not empty,
    // update ALL items in the timeline with that same scene number.
    if (['location', 'props', 'costume', 'sceneCast'].includes(field) && sourceSceneNumber) {
      newItems = newItems.map(item => {
        if (item.type !== 'break' && (item.sceneNumber || '').trim().toLowerCase() === sourceSceneNumber) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'sceneCast') {
            const newSceneCastSet = new Set(String(value).split(',').map(s => s.trim()).filter(Boolean));
            const currentShotCast = String(item.cast || '').split(',').map(s => s.trim()).filter(Boolean);
            updatedItem.cast = currentShotCast.filter(c => newSceneCastSet.has(c)).join(', ');
          }
          return updatedItem;
        }
        return item;
      });
    } else {
      itemsToUpdate.forEach((id, idx) => {
        const itemIndex = newItems.findIndex(item => item.id === id);
        if (itemIndex === -1) return;

        if (firstUpdatedIndex === -1 || itemIndex < firstUpdatedIndex) {
          firstUpdatedIndex = itemIndex;
        }

        const itemToChange = { ...newItems[itemIndex] };

        if (field === 'start' && itemIndex === 0) {
          handleFirstShotChangeRef.current(value);
          return;
        }

        if (field === 'end') {
          itemToChange.end = value < itemToChange.start ? itemToChange.start : value;
          itemToChange.duration = calculateDuration(itemToChange.start, itemToChange.end);
          requiresRecalculation = true;
        } else if (field === 'duration') {
          if (idx === 0) {
            itemToChange.duration = parseInt(value, 10) >= 0 ? parseInt(value, 10) : 0;
            itemToChange.end = calculateEndTime(itemToChange.start, itemToChange.duration);
            requiresRecalculation = true;
          } else {
            return;
          }
        } else if (field === 'sceneCast') {
          itemToChange.sceneCast = value;
          const newSceneCastSet = new Set(String(value).split(',').map(s => s.trim()).filter(Boolean));
          const currentShotCast = String(itemToChange.cast || '').split(',').map(s => s.trim()).filter(Boolean);
          const updatedShotCast = currentShotCast.filter(c => newSceneCastSet.has(c)).join(', ');
          itemToChange.cast = updatedShotCast;
        } else if (field === 'sceneNumber') {
          itemToChange.sceneNumber = value;
          const cleanNewScene = String(value).trim().toLowerCase();
          if (cleanNewScene) {
            // Find another shot with the new scene number to inherit scene-level properties
            const matchingShot = newItems.find(item => 
              item.type === 'shot' && 
              item.id !== itemToChange.id && 
              (item.sceneNumber || '').trim().toLowerCase() === cleanNewScene
            );
            if (matchingShot) {
              itemToChange.location = matchingShot.location || '';
              itemToChange.props = matchingShot.props || '';
              itemToChange.costume = matchingShot.costume || '';
              itemToChange.sceneCast = matchingShot.sceneCast || '';
              
              // Also filter shot cast based on the matching scene's sceneCast
              const newSceneCastSet = new Set(String(matchingShot.sceneCast || '').split(',').map(s => s.trim()).filter(Boolean));
              const currentShotCast = String(itemToChange.cast || '').split(',').map(s => s.trim()).filter(Boolean);
              itemToChange.cast = currentShotCast.filter(c => newSceneCastSet.has(c)).join(', ');
            }
          }
        } else if (field !== 'start') {
          itemToChange[field] = value;
        }
        newItems[itemIndex] = itemToChange;
      });
    }

    if (requiresRecalculation && firstUpdatedIndex !== -1) {
      let lastEndTime = newItems[firstUpdatedIndex].end;
      for (let i = firstUpdatedIndex + 1; i < newItems.length; i++) {
        newItems[i].start = lastEndTime;
        newItems[i].end = calculateEndTime(lastEndTime, newItems[i].duration);
        lastEndTime = newItems[i].end;
      }
    }

    const isTextField = ['sceneNumber', 'shotNumber', 'location', 'description', 'shotDescription', 'lens', 'cast', 'sceneCast', 'props', 'costume', 'notes'].includes(field);
    timelineItemsRef.current = newItems;
    setTimelineItems(newItems, { isContinuous: isTextField });
  }, [setTimelineItems]);

  const addShot = useCallback(() => {
    const lastItem = timelineItems[timelineItems.length - 1];
    let newStartTime = '';
    
    if (lastItem) {
      newStartTime = lastItem.end;
    } else {
      if (headerInfo.callTime) {
        newStartTime = addHours(headerInfo.callTime, 1);
        setHeaderInfo((prev: any) => ({
          ...prev,
          firstShotTime: newStartTime
        }));
      } else {
        newStartTime = headerInfo.firstShotTime || '09:00';
        setHeaderInfo((prev: any) => ({
          ...prev,
          firstShotTime: newStartTime,
          callTime: addHours(newStartTime, -1)
        }));
      }
    }

    const newShot = { id: generateId(), type: 'shot', start: newStartTime, duration: 10, end: '', sceneNumber: '', shotNumber: '', intExt: 'INT', dayNight: 'DAY', location: '', description: '', cast: '', shotSize: '', angle: '', movement: '', lens: '', props: '', costume: '', notes: '', imageUrl: '' };
    newShot.end = calculateEndTime(newShot.start, newShot.duration);
    setTimelineItems((prev: any[]) => [...prev, newShot]);
  }, [timelineItems, headerInfo.callTime, headerInfo.firstShotTime, setHeaderInfo, addHours]);

  const addBreak = useCallback(() => {
    const lastItem = timelineItems[timelineItems.length - 1];
    let newStartTime = '';
    
    if (lastItem) {
      newStartTime = lastItem.end;
    } else {
      if (headerInfo.callTime) {
        newStartTime = addHours(headerInfo.callTime, 1);
        setHeaderInfo((prev: any) => ({
          ...prev,
          firstShotTime: newStartTime
        }));
      } else {
        newStartTime = headerInfo.firstShotTime || '09:00';
        setHeaderInfo((prev: any) => ({
          ...prev,
          firstShotTime: newStartTime,
          callTime: addHours(newStartTime, -1)
        }));
      }
    }

    const newBreak = { id: generateId(), type: 'break', start: newStartTime, duration: 30, end: '', description: 'Meal Break' };
    newBreak.end = calculateEndTime(newBreak.start, newBreak.duration);
    setTimelineItems((prev: any[]) => [...prev, newBreak]);
  }, [timelineItems, headerInfo.callTime, headerInfo.firstShotTime, setHeaderInfo, addHours]);

  const removeTimelineItem = useCallback((itemId: any) => {
    let idsToRemove = [itemId];
    if (String(itemId).startsWith('scene-group-')) {
      const group = groupedTimelineItems.find(g => g.id === itemId);
      if (group) {
        idsToRemove = group.underlyingItems.map((ui: any) => ui.id);
      }
    }

    const newPreviews = { ...imagePreviews };
    let hasPreviewDeleted = false;
    const itemsToRemove = timelineItems.filter((item: any) => idsToRemove.includes(item.id));
    const storageUrls: string[] = Array.from(new Set(
      itemsToRemove
        .map((item: any) => item.imageUrl)
        .filter((url: any): url is string => !!url && url.startsWith('http'))
    ));

    void Promise.all([
      ...idsToRemove.map(id => deleteImage(id)),
      ...storageUrls.map((url: string) => deleteImageFromStorage(url).catch(err => {
        console.error('Failed to delete image from Firebase Storage:', err);
      })),
    ]);

    idsToRemove.forEach(id => {
      if (newPreviews[id]) {
        if (!newPreviews[id].startsWith('http')) {
          URL.revokeObjectURL(newPreviews[id]);
        }
        delete newPreviews[id];
        hasPreviewDeleted = true;
      }
    });
    if (hasPreviewDeleted) {
      setImagePreviews(newPreviews);
    }
    
    recalculateAndUpdateTimes(timelineItems.filter((item: any) => !idsToRemove.includes(item.id)));
  }, [timelineItems, recalculateAndUpdateTimes, imagePreviews, groupedTimelineItems]);

  const handleImageUpload = useCallback(async (itemId: any, file: any) => {
    if (!file || !file.type.startsWith('image/')) return;
    const sourceItem = timelineItemsRef.current.find((item: any) => item.id === itemId);
    const linkKey = getScheduleShotLinkKey(sourceItem);
    const idsToUpdate = linkKey
      ? timelineItemsRef.current
          .filter((item: any) => getScheduleShotLinkKey(item) === linkKey)
          .map((item: any) => item.id)
      : [itemId];

    // Always store the optimized image in IndexedDB as local cache.
    const optimizedFile = await optimizeImageFile(file);
    await Promise.all(idsToUpdate.map((id: string) => setImage(id, optimizedFile)));

    let finalImageUrl = 'true';
    if (isFirebaseEnabled) {
      try {
        finalImageUrl = await uploadImageToStorage(`projects/${project?.id || 'schedule'}/images/${itemId}.jpg`, optimizedFile);
      } catch (err) {
        console.error('Failed to upload image to Firebase Storage:', err);
      }
    }

    setTimelineItems((prev: any[]) => prev.map((item: any) => (
      idsToUpdate.includes(item.id) ? { ...item, imageUrl: finalImageUrl } : item
    )));

    setImagePreviews((prev: any) => {
      const prevVal = prev || {};
      const next = { ...prevVal };
      idsToUpdate.forEach((id: string) => {
        if (next[id] && !next[id].startsWith('http')) {
          URL.revokeObjectURL(next[id]);
        }
      });

      const previewUrl = URL.createObjectURL(optimizedFile);
      idsToUpdate.forEach((id: string) => {
        next[id] = previewUrl;
      });

      return next;
    });
    setActiveImageUploadId(null);
  }, [project?.id, setImagePreviews, setTimelineItems]);

  const handleRemoveImage = useCallback(async (itemId: any) => {
    const sourceItem = timelineItemsRef.current.find((item: any) => item.id === itemId);
    const linkKey = getScheduleShotLinkKey(sourceItem);
    const idsToUpdate = linkKey
      ? timelineItemsRef.current
          .filter((item: any) => getScheduleShotLinkKey(item) === linkKey)
          .map((item: any) => item.id)
      : [itemId];

    const storageUrls: string[] = Array.from(new Set(
      timelineItemsRef.current
        .filter((item: any) => idsToUpdate.includes(item.id))
        .map((item: any) => item.imageUrl)
        .filter((url: any): url is string => !!url && url.startsWith('http'))
    ));

    await Promise.all([
      ...idsToUpdate.map((id: string) => deleteImage(id)),
      ...storageUrls.map((url: string) => deleteImageFromStorage(url).catch(err => {
        console.error('Failed to delete image from Firebase Storage:', err);
      })),
    ]);
    setTimelineItems((prev: any[]) => prev.map((item: any) => (
      idsToUpdate.includes(item.id) ? { ...item, imageUrl: '' } : item
    )));

    setImagePreviews((prev: any) => {
      const newPreviews = { ...prev };
      idsToUpdate.forEach((id: string) => {
        if (newPreviews[id]) {
          if (!newPreviews[id].startsWith('http')) {
            URL.revokeObjectURL(newPreviews[id]);
          }
          delete newPreviews[id];
        }
      });
      return newPreviews;
    });
  }, [setImagePreviews, setTimelineItems]);

  const handlePasteImage = useCallback(async (e: any, targetItemId?: any) => {
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
          try {
            const res = await fetch(img.src);
            const blob = await res.blob();
            const file = new File([blob], `pasted-${itemIdToUse}.png`, { type: blob.type });
            await handleImageUpload(itemIdToUse, file);
          } catch (err) {
            console.error("Error processing pasted data URL image:", err);
          }
        } else {
          fetch(img.src)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], `pasted-${itemIdToUse}.png`, { type: blob.type });
              handleImageUpload(itemIdToUse, file);
            }).catch(err => console.error("Error fetching pasted image:", err));
        }
        return;
      }
    }

    if (clipboardData.files && clipboardData.files.length > 0) {
      const file = Array.from(clipboardData.files).find((f: any) => f.type.startsWith('image/'));
      if (file) {
        await handleImageUpload(itemIdToUse, file);
        return;
      }
    }
  }, [activeImageUploadId, handleImageUpload]);

  useEffect(() => {
    const globalPasteHandler = (e: any) => {
      if (activeImageUploadId) {
        handlePasteImage(e, activeImageUploadId);
      }
    };
    document.addEventListener('paste', globalPasteHandler);
    return () => document.removeEventListener('paste', globalPasteHandler);
  }, [activeImageUploadId, handlePasteImage]);

  // Load and migrate legacy IndexedDB/data-URL images on mount.
  useEffect(() => {
    if (legacyImageMigrationRunRef.current) return;
    legacyImageMigrationRunRef.current = true;

    let cancelled = false;
    const objectUrlsToRevoke: string[] = [];

    const loadAndMigrateImages = async () => {
      const previews = { ...imagePreviews };
      const migratedUrls: Record<string, string> = {};
      let previewsChanged = false;

      for (const item of timelineItems) {
        if (!item?.id) continue;

        const itemId = item.id;
        const currentImageUrl = typeof item.imageUrl === 'string' ? item.imageUrl : '';
        const currentPreview = typeof imagePreviews?.[itemId] === 'string' ? imagePreviews[itemId] : '';

        if (!currentImageUrl && !currentPreview) continue;

        if (currentImageUrl.startsWith('http')) {
          if (previews[itemId] !== currentImageUrl) previewsChanged = true;
          previews[itemId] = currentImageUrl;
        } else if (currentPreview.startsWith('http')) {
          if (previews[itemId] !== currentPreview) previewsChanged = true;
          previews[itemId] = currentPreview;
        }

        try {
          // 1. Helper to search IndexedDB by timeline ID, linked shot ID, or matching scene/shot list ID
          const resolveImageFile = async (timelineItem: any) => {
            let file = await getImage(timelineItem.id);
            if (file) return file;

            if (timelineItem.linkedShotId) {
              file = await getImage(timelineItem.linkedShotId);
              if (file) return file;
            }

            const shotList = project?.data?.shotListData?.shotListItems || [];
            const sceneStr = String(timelineItem.sceneNumber || '').trim().toLowerCase();
            const shotStr = String(timelineItem.shotNumber || '').trim().toLowerCase();

            if (sceneStr && shotStr) {
              const matchingShot = shotList.find((s: any) =>
                String(s.sceneNumber || '').trim().toLowerCase() === sceneStr &&
                String(s.shotNumber || '').trim().toLowerCase() === shotStr
              );
              if (matchingShot) {
                file = await getImage(matchingShot.id);
                if (file) return file;
              }
            }
            return undefined;
          };

          const file = await resolveImageFile(item);
          if (file) {
            // Save local cache under item.id if it wasn't there
            const localExists = await getImage(itemId);
            if (!localExists) {
              await setImage(itemId, file);
            }
            const objectUrl = URL.createObjectURL(file);
            objectUrlsToRevoke.push(objectUrl);
            previews[itemId] = objectUrl;
            previewsChanged = true;
            continue; // Skip migrateLegacyStoredImage
          }

          const migratedImage = await migrateLegacyStoredImage({
            projectId: project?.id,
            itemId,
            imageUrl: currentImageUrl,
            previewUrl: currentPreview,
          });

          if (!migratedImage) continue;

          migratedUrls[itemId] = migratedImage.imageUrl;
          if (migratedImage.file) {
            const objectUrl = URL.createObjectURL(migratedImage.file);
            objectUrlsToRevoke.push(objectUrl);
            previews[itemId] = objectUrl;
            previewsChanged = true;
          } else if (migratedImage.imageUrl.startsWith('http')) {
            if (previews[itemId] !== migratedImage.imageUrl) previewsChanged = true;
            previews[itemId] = migratedImage.imageUrl;
          }
        } catch (error) {
          console.error(`Failed to migrate image for schedule item ${itemId}:`, error);
        }
      }

      if (cancelled) return;

      if (previewsChanged) {
        setImagePreviews(previews);
      }

      if (Object.keys(migratedUrls).length > 0) {
        setTimelineItems((prevItems: any[]) => prevItems.map(item => (
          migratedUrls[item.id] && migratedUrls[item.id] !== item.imageUrl
            ? { ...item, imageUrl: migratedUrls[item.id] }
            : item
        )));
      }
    };

    if (timelineItems.length > 0 || Object.keys(imagePreviews || {}).length > 0) {
      loadAndMigrateImages();
    }

    return () => {
      cancelled = true;
      objectUrlsToRevoke.forEach(url => URL.revokeObjectURL(url));
      legacyImageMigrationRunRef.current = false;
    };
  }, []);

  const handleImportShots = useCallback((shotIdsToImport: any[]) => {
    const shotsToAdd = shotIdsToImport
      .map((shotId: any) => shotList.find((s: any) => s.id === shotId))
      .filter(Boolean);

    const breakdownScenes = project?.data?.breakdownData?.scenes || [];

    const newTimelineItems = shotsToAdd.map((shot: any) => {
      const correspondingScene = breakdownScenes.find(
        (s: any) => s.sceneNumber && s.sceneNumber.trim().toLowerCase() === shot.sceneNumber.trim().toLowerCase()
      );

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
        description: correspondingScene?.description || shot.description || '',
        shotDescription: shot.description || '',
        notes: correspondingScene?.notes || shot.notes || '',
        linkedShotId: shot.id,
        imageUrl: shot.imageUrl || '',
        intExt: correspondingScene?.intExt || 'INT',
        dayNight: correspondingScene?.dayNight || 'DAY',
        location: correspondingScene?.location || '',
        sceneCast: correspondingScene?.cast || '',
        cast: '',
        props: correspondingScene?.props || '',
        costume: correspondingScene?.wardrobe || '',
      };
      return newShot;
    });

    const importedImagePreviews = newTimelineItems.reduce((acc: Record<string, string>, item: any, index: number) => {
      const sourceShot = shotsToAdd[index];
      const preview = shotListImagePreviews[sourceShot.id];
      const imageUrl = sourceShot.imageUrl;
      if (preview) acc[item.id] = preview;
      else if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) acc[item.id] = imageUrl;
      return acc;
    }, {} as Record<string, string>);

    if (Object.keys(importedImagePreviews).length > 0) {
      setImagePreviews((prev: any) => ({ ...prev, ...importedImagePreviews }));
    }

    recalculateAndUpdateTimes([...timelineItems, ...newTimelineItems]);

  }, [shotList, shotListImagePreviews, timelineItems, recalculateAndUpdateTimes, project, setImagePreviews]);

  const stats = useMemo(() => {
    const totalDuration = timelineItems.reduce((sum: number, item: any) => sum + (item.duration || 0), 0);
    const shotCount = timelineItems.filter((item: any) => item.type === 'shot').length;
    const breakTime = timelineItems.filter((item: any) => item.type === 'break').reduce((sum: number, item: any) => sum + (item.duration || 0), 0);
    return { totalHours: Math.floor(totalDuration / 60), totalMinutes: totalDuration % 60, shotCount, breakHours: Math.floor(breakTime / 60), breakMinutes: breakTime % 60 };
  }, [timelineItems]);

  const ensureCallSheetData = useCallback(() => {
    const base = createDefaultCallSheetData(headerInfo, timelineItems);
    const merged = mergeCallSheetData(base, callSheetData);
    setCallSheetData(merged);
    return merged;
  }, [headerInfo, timelineItems, callSheetData, setCallSheetData]);

  const handleOpenCallSheet = useCallback(() => {
    ensureCallSheetData();
    setIsCallSheetOpen(true);
  }, [ensureCallSheetData]);

  const handleExportCallSheet = useCallback(() => {
    const dataForExport = {
      ...ensureCallSheetData(),
      lastGeneratedAt: new Date().toISOString()
    };
    setCallSheetData(dataForExport);
    exportCallSheetToPDF(headerInfo, timelineItems, dataForExport, stats);
    if (project.ownerId) {
      logActivity(project.ownerId, 'export_callsheet_pdf', { projectId: project.id });
    }
  }, [ensureCallSheetData, setCallSheetData, headerInfo, timelineItems, stats, project]);

  const handleExportProject = useCallback(() => {
    // Explicitly construct the project object to ensure the ID is always included.
    const fullProject = {
      ...project,
      id: project.id || generateId(), // Fallback to generate a new ID if one doesn't exist
      data: {
        ...project.data,
        headerInfo,
        timelineItems,
        imagePreviews,
        callSheetData
      }
    };
    exportProject(fullProject);
  }, [project, headerInfo, timelineItems, imagePreviews, callSheetData]);

  const forceSave = useCallback(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    const dataToSave = {
      headerInfo,
      timelineItems,
      imagePreviews,
      callSheetData
    };
    setSaveStatus('saving');
    Promise.resolve()
      .then(() => onSaveRef.current(dataToSave, project))
      .then(() => {
        setSaveStatus('saved');
        return new Promise(resolve => setTimeout(resolve, 2500));
      })
      .then(() => setSaveStatus('idle'))
      .catch((err) => {
        console.error(err);
        setSaveStatus('dirty');
      });
  }, [project, headerInfo, timelineItems, imagePreviews, callSheetData]);

  const handleBack = useCallback(async () => {
    if (hasPendingSaveRef.current) {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      const dataToSave = {
        headerInfo,
        timelineItems,
        imagePreviews,
        callSheetData
      };
      setSaveStatus('saving');
      try {
        await onSaveRef.current(dataToSave, project);
        hasPendingSaveRef.current = false;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save on back:', err);
      }
    }
    onBack();
  }, [onBack, project, headerInfo, timelineItems, imagePreviews, callSheetData]);

  const handleExportSchedulePDF = useCallback(async () => {
    const preparedItems = itemsToRender.map((item: any) => {
      if (viewMode === 'shot') {
        return {
          ...item,
          description: item.shotDescription || item.description || '',
          cast: item.cast || ''
        };
      }

      return {
        ...item,
        description: item.description || '',
        cast: item.sceneCast || item.cast || ''
      };
    });

    const pdfImagePreviews: { [key: string]: string } = {};
    const itemIds = Array.from(new Set([
      ...preparedItems.map((item: any) => item.id),
      ...Object.keys(imagePreviews || {})
    ])).filter(Boolean);

    await Promise.all(itemIds.map(async (itemId) => {
      try {
        const timelineItem = preparedItems.find((item: any) => item.id === itemId);

        // 1. Helper to search IndexedDB by timeline ID, linked shot ID, or matching scene/shot list ID
        const resolveImageFromDB = async () => {
          // Direct timeline item ID check
          let file = await getImage(itemId);
          if (file) return file;

          if (timelineItem) {
            // Linked shot ID check
            if (timelineItem.linkedShotId) {
              file = await getImage(timelineItem.linkedShotId);
              if (file) return file;
            }

            // Match by scene & shot number in the project's shot list
            const shotList = project?.data?.shotListData?.shotListItems || [];
            const sceneStr = String(timelineItem.sceneNumber || '').trim().toLowerCase();
            const shotStr = String(timelineItem.shotNumber || '').trim().toLowerCase();

            if (sceneStr && shotStr) {
              const matchingShot = shotList.find((s: any) =>
                String(s.sceneNumber || '').trim().toLowerCase() === sceneStr &&
                String(s.shotNumber || '').trim().toLowerCase() === shotStr
              );
              if (matchingShot?.id && matchingShot.id !== itemId && matchingShot.id !== timelineItem.linkedShotId) {
                file = await getImage(matchingShot.id);
                if (file) return file;
              }
            }
          }
          return undefined;
        };

        const imageFile = await resolveImageFromDB();
        if (imageFile) {
          const dataUrl = await fileToDataUrl(imageFile);
          pdfImagePreviews[itemId] = dataUrl;
          return;
        }

        // 2. Fallback to remote download URL (prioritizing imagePreviews, then timelineItem, then linked shot list item)
        let url = imagePreviews[itemId] || timelineItem?.imageUrl;
        if ((!url || !url.startsWith('http')) && timelineItem && timelineItem.linkedShotId) {
          const shotList = project?.data?.shotListData?.shotListItems || [];
          const matchedShot = shotList.find((s: any) => s.id === timelineItem.linkedShotId);
          if (matchedShot?.imageUrl?.startsWith('http')) {
            url = matchedShot.imageUrl;
          }
        }

        if (typeof url === 'string' && url.startsWith('http')) {
          const dataUrl = await fetchImageUrlAsDataUrl(url);
          if (dataUrl) {
            pdfImagePreviews[itemId] = dataUrl;
          }
        }
      } catch (err) {
        console.error(`Failed to resolve PDF image preview for ID ${itemId}:`, err);
      }
    }));

    exportToPDF(headerInfo, preparedItems, stats, pdfImagePreviews);
    if (project.ownerId) {
      logActivity(project.ownerId, 'export_schedule_pdf', { projectId: project.id });
    }
  }, [itemsToRender, viewMode, headerInfo, stats, imagePreviews, project]);

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
      action: handleExportSchedulePDF,
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
      action: () => {
        if (isCallSheetOpen) {
          setIsCallSheetOpen(false);
        } else {
          handleBack();
        }
      },
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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback(() => {
    const lockedScrollLeft = tableContainerRef.current?.scrollLeft ?? 0;
    dragLockedScrollLeftRef.current = lockedScrollLeft;
    isDraggingTimelineItemRef.current = true;
    setIsDraggingTimelineItem(true);
    if (floatingScrollbarRef.current) {
      floatingScrollbarRef.current.scrollLeft = lockedScrollLeft;
    }
  }, []);

  const releaseDragScrollLock = useCallback(() => {
    isDraggingTimelineItemRef.current = false;
    dragLockedScrollLeftRef.current = null;
    setIsDraggingTimelineItem(false);
  }, []);

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    releaseDragScrollLock();
    if (!active || !over) return;

    const isSidebarDrag = !itemsToRender.some((item: any) => item.id === active.id);

    if (isSidebarDrag) {
      // Sidebar drag disabled for now
    } else {
      if (active.id !== over.id) {
        if (viewMode === 'scene') {
          const oldGroupIndex = groupedTimelineItems.findIndex(g => g.id === active.id);
          const newGroupIndex = groupedTimelineItems.findIndex(g => g.id === over.id);
          if (oldGroupIndex !== -1 && newGroupIndex !== -1) {
            const reorderedGroups = arrayMove([...groupedTimelineItems], oldGroupIndex, newGroupIndex);
            const flatItems: any[] = [];
            reorderedGroups.forEach(g => {
              if (g.type === 'scene-group') {
                flatItems.push(...g.underlyingItems);
              } else {
                flatItems.push(g);
              }
            });
            recalculateAndUpdateTimes(flatItems);
          }
        } else {
          const oldIndex = timelineItems.findIndex((item: any) => item.id === active.id);
          const newIndex = timelineItems.findIndex((item: any) => item.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            recalculateAndUpdateTimes(arrayMove(timelineItems, oldIndex, newIndex));
          }
        }
      }
    }
  }, [groupedTimelineItems, itemsToRender, recalculateAndUpdateTimes, releaseDragScrollLock, timelineItems, viewMode]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.05, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.05, 0.60));

  useEffect(() => { recalculateAndUpdateTimes(timelineItems); }, [headerInfo.firstShotTime, recalculateAndUpdateTimes]);

  useEffect(() => {
    if (timelineItems.length > 0) {
      const lastItemEnd = timelineItems[timelineItems.length - 1].end;
      setHeaderInfo((prev: any) => {
        if (prev.wrapTime === lastItemEnd) return prev;
        return { ...prev, wrapTime: lastItemEnd };
      });
    }
  }, [timelineItems, setHeaderInfo]);

  const dragModifiers = useMemo(
    () => [({ transform }: any) => ({ ...transform, x: transform.x / zoomLevel, y: transform.y / zoomLevel })],
    [zoomLevel]
  );

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

      <CallSheetBuilderModal
        isOpen={isCallSheetOpen}
        onClose={() => setIsCallSheetOpen(false)}
        headerInfo={headerInfo}
        timelineItems={timelineItems}
        stats={stats}
        callSheetData={callSheetData}
        onChange={(nextData: CallSheetData) => setCallSheetData(nextData, { isContinuous: true })}
        onExport={handleExportCallSheet}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
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
              <button onClick={handleBack} style={{ padding: '8px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div style={{ height: '28px', width: '1px', background: 'var(--border-subtle)' }} />
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{headerInfo.projectTitle || 'Untitled Project'}</h1>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shooting Schedule Editor</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="desktop-only-header">
              {/* View Mode Toggle */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '2px',
                marginRight: '8px'
              }}>
                <button
                  onClick={() => setViewMode('scene')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: viewMode === 'scene' ? 'var(--accent-primary)' : 'transparent',
                    color: viewMode === 'scene' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Scene View
                </button>
                <button
                  onClick={() => setViewMode('shot')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: viewMode === 'shot' ? 'var(--accent-primary)' : 'transparent',
                    color: viewMode === 'shot' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Shot View
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
                <button onClick={undo} disabled={!canUndo} className="btn-ghost" style={{ padding: '6px', opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed', borderRadius: '6px', display: 'flex', alignItems: 'center' }} title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
                <button onClick={redo} disabled={!canRedo} className="btn-ghost" style={{ padding: '6px', opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed', borderRadius: '6px', display: 'flex', alignItems: 'center' }} title="Redo (Ctrl+Shift+Z)"><Redo2 className="w-4 h-4" /></button>
              </div>
              <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)' }} />
              <SaveStatusIndicator status={saveStatus} />
              <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)' }} />
              <button onClick={handleExportProject} className="btn-ghost" style={{ fontSize: '13px', gap: '6px' }}><FileDown className="w-4 h-4" /><span className="hidden sm:inline">Save .mbd</span></button>
              <button onClick={handleOpenCallSheet} className="btn-secondary" style={{ fontSize: '13px', gap: '6px' }}><ClipboardList className="w-4 h-4" /><span className="hidden sm:inline">Call Sheet</span></button>
              <button onClick={handleExportSchedulePDF} className="btn-primary" style={{ fontSize: '13px', gap: '6px' }}><Download className="w-4 h-4" /><span className="hidden sm:inline">Export PDF</span></button>
            </div>
          </div>
        </header>

        <EditorMobileCommandBar
          status={<SaveStatusIndicator status={saveStatus} />}
          segments={[
            { label: 'Scene', active: viewMode === 'scene', onClick: () => setViewMode('scene') },
            { label: 'Shot', active: viewMode === 'shot', onClick: () => setViewMode('shot') },
          ]}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          actions={[
            { label: 'Save .mbd', icon: <FileDown className="w-4 h-4" />, onClick: handleExportProject },
            { label: 'Call Sheet', icon: <ClipboardList className="w-4 h-4" />, onClick: handleOpenCallSheet },
            { label: 'Export PDF', icon: <Download className="w-4 h-4" />, onClick: handleExportSchedulePDF, primary: true },
          ]}
        />

        <main className="editor-main" style={{ flex: 1, padding: '24px', paddingTop: '88px' }}>
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
                    <div className="space-y-4">
                      {/* Times Row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Call Time</label>
                          <DarkTimePicker value={headerInfo.callTime} onChange={handleCallTimeChange} className="w-full px-3 py-2" isClearable={false} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>First Shot</label>
                          <DarkTimePicker value={headerInfo.firstShotTime} onChange={handleFirstShotChange} className="w-full px-3 py-2" isClearable={false} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Wrap Time</label>
                          <DarkTimePicker value={headerInfo.wrapTime} onChange={() => {}} className="w-full px-3 py-2" disabled={true} />
                        </div>
                      </div>

                      {/* Meals Row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}><Coffee className="w-3 h-3 inline mr-1" />1st Meal</label>
                          <DarkTimePicker value={headerInfo.firstmealTime} onChange={(val) => setHeaderInfo({ ...headerInfo, firstmealTime: val })} className="w-full px-3 py-2" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}><Moon className="w-3 h-3 inline mr-1" />2nd Meal</label>
                          <DarkTimePicker value={headerInfo.secondmealTime} onChange={(val) => setHeaderInfo({ ...headerInfo, secondmealTime: val })} className="w-full px-3 py-2" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}><Moon className="w-3 h-3 inline mr-1" />3rd Meal</label>
                          <DarkTimePicker value={headerInfo.thirdmealTime} onChange={(val) => setHeaderInfo({ ...headerInfo, thirdmealTime: val })} className="w-full px-3 py-2" />
                        </div>
                      </div>

                      {/* Locations (Stacked in 3 rows) */}
                      <div className="space-y-3">
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
                            placeholder="Secondary location"
                            className="w-full px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Location 3</label>
                          <LocationAutocomplete
                            value={headerInfo.location3}
                            onChange={(val) => setHeaderInfo({ ...headerInfo, location3: val })}
                            onSelectLocation={(loc) => setResolvedCoords(prev => ({ ...prev, location3: loc }))}
                            placeholder="Location 3"
                            className="w-full px-3 py-2"
                          />
                        </div>
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
          <div className="editor-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
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
          <div className="editor-action-toolbar">
            <button onClick={addShot} className="btn-primary" style={{ fontSize: '13px' }}><Plus className="w-4 h-4" />Add Shot</button>
            <button onClick={addBreak} className="btn-secondary" style={{ color: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}><Coffee className="w-4 h-4" />Add Break</button>
            <div aria-hidden="true" style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />
            <button onClick={() => setIsImportModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'rgba(20,184,166,0.15)', color: '#2dd4bf', fontWeight: 600, fontSize: '13px', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}><ListPlus className="w-4 h-4" />Import from Shot List</button>
            
            <button 
              onClick={() => setShowSidebar(!showSidebar)} 
              className="btn-secondary editor-holding-pen-toggle"
              style={{ 
                marginLeft: 'auto', 
                fontSize: '13px', 
                gap: '6px',
                borderColor: showSidebar ? 'var(--accent-primary)' : 'var(--border-default)',
                color: showSidebar ? 'var(--text-accent)' : 'var(--text-primary)'
              }}
            >
              <FileText className="w-4 h-4" />
              <span>{showSidebar ? 'Hide Holding Pen' : 'Show Holding Pen'}</span>
              {unscheduledScenes.length > 0 && (
                <span style={{
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  borderRadius: '99px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  {unscheduledScenes.length}
                </span>
              )}
            </button>
          </div>

          {/* Schedule list container */}
          <div style={{ display: 'flex', overflow: 'hidden', alignItems: 'flex-start', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isMobile ? (
                <div className="editor-mobile-card-list" style={{ padding: '4px' }}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={releaseDragScrollLock}
                  >
                    <SortableContext items={itemsToRenderIds} strategy={verticalListSortingStrategy}>
                      {itemsToRender.map((item: any, index: number) => (
                        <SortableMobileCard
                          key={item.id}
                          id={item.id}
                          item={item}
                          index={index}
                          imagePreview={imagePreviews[item.id]}
                          handleItemChange={handleItemChange}
                          handleImageUpload={handleImageUpload}
                          removeTimelineItem={removeTimelineItem}
                          handleRemoveImage={handleRemoveImage}
                          isActiveForUpload={activeImageUploadId === item.id}
                          setActiveImageUploadId={setActiveImageUploadId}
                          viewMode={viewMode}
                          castOptions={castOptions}
                          sceneCast={getSceneCast(item)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
	                  {itemsToRender.length === 0 && (
	                    <div ref={setTimelineDroppableRef} style={{ textAlign: 'center', padding: '48px 16px' }}>
	                      <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}>No shots added yet</p>
	                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Click "Add Shot" to start building your schedule</p>
	                    </div>
                  )}
                </div>
              ) : (
                <div className="editor-table-shell" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '14px', overflow: 'hidden' }}>
                  <div
                    ref={tableContainerRef}
                    className={`table-scroll-hidden ${isTableScrolled ? 'table-scrolled' : ''}`}
                    style={{ overflowX: 'auto', ...(isDefaultZoom(zoomLevel) ? {} : { zoom: zoomLevel }) }}
                  >
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragCancel={releaseDragScrollLock}
                      modifiers={dragModifiers}
                    >
                      <table className="dark-table" style={{ minWidth: viewMode === 'shot' ? '2400px' : '1500px' }} ref={tableRef}>
                        <thead>
                          <tr>
                            <th className="col-drag" style={{ width: '48px' }}></th>
                            <th>Time</th>
                            <th>Dur.</th>
                            <th className="col-scene" style={{ width: '84px' }}>Scene</th>
                            {viewMode === 'shot' && <th className="col-shot" style={{ width: '84px' }}>Shot</th>}
                            <th>INT/EXT</th>
                            <th>Period</th>
                            <th>Location</th>
                            {viewMode === 'shot' && (
                              <>
                                <th>Size</th>
                                <th>Angle</th>
                                <th>Movement</th>
                                <th>Lens</th>
                              </>
                            )}
                            <th>Description</th>
                            <th>Cast</th>
                            {viewMode === 'shot' && <th style={{ textAlign: 'center' }}>Reference</th>}
                            <th>Props</th>
                            <th>Costume</th>
                            <th>Notes</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <SortableContext items={itemsToRenderIds} strategy={verticalListSortingStrategy}>
                            {itemsToRender.map((item: any, index: number) => <SortableItem key={item.id} id={item.id} item={item} index={index} imagePreview={imagePreviews[item.id]} handleItemChange={handleItemChange} handleImageUpload={handleImageUpload} removeTimelineItem={removeTimelineItem} handleRemoveImage={handleRemoveImage} isActiveForUpload={activeImageUploadId === item.id} setActiveImageUploadId={setActiveImageUploadId} isFocused={focusedItemId === item.id} setFocusedItemId={setFocusedItemId} viewMode={viewMode} castOptions={castOptions} sceneCast={getSceneCast(item)} />)}
                          </SortableContext>
                        </tbody>
                      </table>
                    </DndContext>
	                    {itemsToRender.length === 0 && (
	                      <div ref={setTimelineDroppableRef} style={{ textAlign: 'center', padding: '64px 24px' }}>
	                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No shots added yet</p>
	                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Click "Add Shot" to start building your schedule</p>
	                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Holding Pen */}
            {!isMobile && showSidebar && (
              <div style={{
                width: '320px',
                borderLeft: '1px solid var(--border-default)',
                background: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                marginLeft: '20px',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)'
              }} className="animate-fade-in-up">
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-elevated)',
                  flexShrink: 0
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    Unscheduled Scenes
                  </h3>
                  <button 
                    onClick={() => setShowSidebar(false)} 
                    className="btn-ghost" 
                    style={{ padding: '4px' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {unscheduledScenes.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '32px 16px',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '150px'
                    }}>
                      <Check className="w-8 h-8 text-emerald-400 mb-2" />
                      <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>All scenes scheduled!</p>
                      <p style={{ fontSize: '11px', marginTop: '4px' }}>Or no scene breakdown exists.</p>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: 1.4 }}>
                        Drag these scenes directly into the timeline table on the left.
                      </p>
                      {unscheduledScenes.map((scene: BreakdownScene) => (
                        <DraggableSceneCard key={scene.id} scene={scene} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Floating scrollbar */}
        <div
          ref={floatingScrollbarRef}
          className="floating-scrollbar-container desktop-only"
          style={{
            opacity: showFloatingScrollbar ? 1 : 0,
            pointerEvents: showFloatingScrollbar && !isDraggingTimelineItem ? 'auto' : 'none'
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
