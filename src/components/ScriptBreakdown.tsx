'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Edit2, Save, FileText, X, Loader2, Check, 
  Upload, Undo2, Redo2, RefreshCw, BookOpen
} from 'lucide-react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { generateId } from '../utils/id';
import { DarkSelect, findOption, INT_EXT_OPTIONS, PERIOD_OPTIONS, SelectOption } from './DarkSelect';
import { setImage, getImage, deleteImage } from '../utils/db';
import { isFirebaseEnabled } from '../lib/firebase';
import Footer from './Footer';

interface ScriptBreakdownProps {
  project: any;
  onBack: () => void;
  onSave: (data: any) => Promise<void>;
}

export interface BreakdownScene {
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

function SaveStatusIndicator({ status }: { status: string }) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'saving': return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Saving...', style: { color: 'var(--text-muted)' } };
      case 'dirty': return { icon: <Upload className="w-4 h-4" />, text: 'Unsaved changes', style: { color: 'var(--accent-amber)' } };
      case 'saved': return { icon: <Check className="w-4 h-4" />, text: 'Saved', style: { color: 'var(--accent-green)' } };
      default: return { icon: <Save className="w-4 h-4" />, text: 'All changes saved', style: { color: 'var(--text-muted)' } };
    }
  };
  const { icon, text, style } = getStatusDisplay();
  return (
    <div style={{ ...style, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500 }}>
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </div>
  );
}

export default function ScriptBreakdown({ project, onBack, onSave }: ScriptBreakdownProps) {
  // 1. Core State with Undo/Redo Hook
  const [docState, setDocState, { undo, redo, canUndo, canRedo }] = useUndoRedo(() => {
    const scenes = project?.data?.breakdownData?.scenes || [];
    return { scenes };
  });

  const scenes = docState.scenes as BreakdownScene[];

  const setScenes = useCallback((newValOrFn: any, options?: { isContinuous?: boolean }) => {
    setDocState(prev => {
      const scenesVal = typeof newValOrFn === 'function' ? newValOrFn(prev.scenes) : newValOrFn;
      return {
        ...prev,
        scenes: scenesVal
      };
    }, options);
  }, [setDocState]);

  // 2. Local UI State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pdf' | 'breakdown'>('pdf'); // for mobile responsiveness
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [sceneNumber, setSceneNumber] = useState('');
  const [intExt, setIntExt] = useState('INT');
  const [dayNight, setDayNight] = useState('DAY');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [cast, setCast] = useState('');
  const [props, setProps] = useState('');
  const [wardrobe, setWardrobe] = useState('');
  const [notes, setNotes] = useState('');

  // Refs for autosave
  const debounceTimeoutRef = useRef<any>(null);
  const isInitialMount = useRef(true);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; });

  // 3. Load PDF from IndexedDB
  useEffect(() => {
    if (project?.id) {
      getImage(`script-pdf-${project.id}`).then((file) => {
        if (file) {
          setPdfFile(file);
          setPdfUrl(URL.createObjectURL(file));
        }
      }).catch(err => {
        console.error('Failed to load PDF from IndexedDB:', err);
      });
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [project?.id]);

  // 4. Autosave effect
  const stringifiedScenes = JSON.stringify(scenes);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus('dirty');
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      const dataToSave = {
        breakdownData: {
          scenes
        }
      };

      setSaveStatus('saving');
      Promise.resolve()
        .then(() => new Promise(resolve => setTimeout(resolve, 500)))
        .then(() => onSaveRef.current(dataToSave))
        .then(() => {
          setSaveStatus('saved');
          return new Promise(resolve => setTimeout(resolve, 2000));
        })
        .then(() => setSaveStatus('idle'))
        .catch(err => {
          console.error('Failed to autosave breakdown data:', err);
          setSaveStatus('idle');
        });
    }, 1000);

    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [stringifiedScenes]);

  // 5. Handlers
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsUploading(true);
      try {
        setPdfFile(file);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        const newUrl = URL.createObjectURL(file);
        setPdfUrl(newUrl);
        await setImage(`script-pdf-${project.id}`, file);
      } catch (err) {
        console.error('Failed to store PDF:', err);
        alert('Failed to cache PDF locally.');
      } finally {
        setIsUploading(false);
      }
    } else if (file) {
      alert('Please upload a valid PDF document.');
    }
  };

  const handleRemovePdf = async () => {
    if (window.confirm('Remove this PDF script from your local view?')) {
      setPdfFile(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl('');
      }
      // Delete from DB by putting null/undefined or writing delete logic.
      // Wait, we can just delete from IndexedDB by using deleteImage since it uses the same store
      try {
        await deleteImage(`script-pdf-${project.id}`);
      } catch (err) {
        console.error('Failed to delete PDF from db:', err);
      }
    }
  };

  const resetForm = () => {
    setEditingSceneId(null);
    setSceneNumber('');
    setIntExt('INT');
    setDayNight('DAY');
    setLocation('');
    setDescription('');
    setCast('');
    setProps('');
    setWardrobe('');
    setNotes('');
  };

  const handleAddOrUpdateScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sceneNumber.trim()) {
      alert('Please enter a Scene Number.');
      return;
    }

    const sceneData: BreakdownScene = {
      id: editingSceneId || generateId(),
      sceneNumber: sceneNumber.trim(),
      intExt,
      dayNight,
      location: location.trim(),
      description: description.trim(),
      cast: cast.trim(),
      props: props.trim(),
      wardrobe: wardrobe.trim(),
      notes: notes.trim(),
    };

    if (editingSceneId) {
      // Update
      const updated = scenes.map(s => s.id === editingSceneId ? sceneData : s);
      setScenes(updated);
    } else {
      // Add
      const exists = scenes.some(s => s.sceneNumber.toLowerCase() === sceneNumber.trim().toLowerCase());
      if (exists && !window.confirm(`A scene with number "${sceneNumber.trim()}" already exists. Do you want to add another one?`)) {
        return;
      }
      setScenes([...scenes, sceneData]);
    }
    resetForm();
  };

  const handleEditScene = (scene: BreakdownScene) => {
    setEditingSceneId(scene.id);
    setSceneNumber(scene.sceneNumber);
    setIntExt(scene.intExt);
    setDayNight(scene.dayNight);
    setLocation(scene.location);
    setDescription(scene.description);
    setCast(scene.cast);
    setProps(scene.props);
    setWardrobe(scene.wardrobe);
    setNotes(scene.notes);
  };

  const handleDeleteScene = (id: string, number: string) => {
    if (window.confirm(`Are you sure you want to delete Scene ${number}?`)) {
      setScenes(scenes.filter(s => s.id !== id));
      if (editingSceneId === id) {
        resetForm();
      }
    }
  };

  // Sort scenes by sceneNumber naturally (e.g. 1, 2, 2A, 10)
  const sortedScenes = React.useMemo(() => {
    return [...scenes].sort((a, b) => 
      a.sceneNumber.localeCompare(b.sceneNumber, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [scenes]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    }}>
      {/* ── HEADER ── */}
      <header style={{
        height: '56px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onBack} 
            className="btn-ghost" 
            style={{ padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {project?.name || 'Untitled Project'}
              </span>
              <span className="chip chip-violet" style={{ fontSize: '10px', padding: '1px 6px' }}>Script Breakdown</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Manual scene extraction module</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Undo/Redo buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={undo} 
              disabled={!canUndo} 
              className="btn-ghost" 
              style={{ padding: '6px', opacity: !canUndo ? 0.4 : 1, cursor: !canUndo ? 'not-allowed' : 'pointer' }}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button 
              onClick={redo} 
              disabled={!canRedo} 
              className="btn-ghost" 
              style={{ padding: '6px', opacity: !canRedo ? 0.4 : 1, cursor: !canRedo ? 'not-allowed' : 'pointer' }}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <SaveStatusIndicator status={saveStatus} />
        </div>
      </header>

      {/* ── MOBILE TABS TRIGGER ── */}
      <div className="flex md:hidden" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <button 
          onClick={() => setActiveTab('pdf')} 
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '13px',
            fontWeight: 600,
            borderBottom: activeTab === 'pdf' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'pdf' ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Script PDF
        </button>
        <button 
          onClick={() => setActiveTab('breakdown')} 
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '13px',
            fontWeight: 600,
            borderBottom: activeTab === 'breakdown' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'breakdown' ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Scenes Breakdown ({scenes.length})
        </button>
      </div>

      {/* ── SPLIT PANE BODY ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Left Pane (PDF View) */}
        <div className={`w-full md:w-1/2 flex-col ${activeTab === 'pdf' ? 'flex' : 'hidden md:flex'}`} style={{
          borderRight: '1px solid var(--border-default)',
          background: '#121212',
          overflow: 'hidden'
        }}>
          {pdfUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
              <div style={{
                height: '40px',
                background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <FileText className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pdfFile?.name || 'Uploaded Script'}
                  </span>
                </div>
                <button 
                  onClick={handleRemovePdf} 
                  className="btn-ghost" 
                  style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
              <div style={{ flex: 1, width: '100%', background: '#333' }}>
                <iframe 
                  src={pdfUrl} 
                  title="Script PDF" 
                  style={{ border: 'none', width: '100%', height: '100%' }}
                />
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <BookOpen className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Upload Script PDF</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '280px', marginBottom: '24px', lineHeight: '1.5' }}>
                Upload your PDF screenplay to keep it side-by-side while manually extracting scene breakdown cards.
              </p>
              
              <label 
                className="btn-primary" 
                style={{ cursor: 'pointer', padding: '8px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Select PDF File
                  </>
                )}
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={handlePdfUpload} 
                  style={{ display: 'none' }} 
                  disabled={isUploading}
                />
              </label>
            </div>
          )}
        </div>

        {/* Right Pane (CRUD and Scene Cards) */}
        <div className={`w-full md:w-1/2 flex-col ${activeTab === 'breakdown' ? 'flex' : 'hidden md:flex'}`} style={{
          overflow: 'hidden',
          background: 'var(--bg-base)'
        }}>
          {/* Scrollable Container */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            
            {/* ── SECTION 1: SCENE EXTRACTION FORM ── */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus className="w-4 h-4 text-emerald-400" />
                {editingSceneId ? `Edit Scene Breakdown: Scene ${sceneNumber}` : 'Extract Scene Breakdown'}
              </h3>
              
              <form onSubmit={handleAddOrUpdateScene} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Scene #</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1A, 2" 
                      value={sceneNumber} 
                      onChange={(e) => setSceneNumber(e.target.value)} 
                      style={{ width: '100%', height: '36px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>INT/EXT</label>
                    <DarkSelect<SelectOption>
                      instanceId="breakdown-intExt"
                      options={INT_EXT_OPTIONS}
                      value={findOption(INT_EXT_OPTIONS, intExt)}
                      onChange={(opt) => setIntExt((opt as SelectOption)?.value ?? 'INT')}
                      isClearable={false}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>DAY/NIGHT</label>
                    <DarkSelect<SelectOption>
                      instanceId="breakdown-dayNight"
                      options={PERIOD_OPTIONS}
                      value={findOption(PERIOD_OPTIONS, dayNight)}
                      onChange={(opt) => setDayNight((opt as SelectOption)?.value ?? 'DAY')}
                      isClearable={false}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Living Room, Coffee Shop" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Description / Action Summary</label>
                  <textarea 
                    placeholder="e.g. John enters, finds the briefcase..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={2}
                    style={{ width: '100%', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Cast / Characters</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John, Sarah" 
                      value={cast} 
                      onChange={(e) => setCast(e.target.value)} 
                      style={{ width: '100%', height: '36px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Props Needed</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Briefcase, files" 
                      value={props} 
                      onChange={(e) => setProps(e.target.value)} 
                      style={{ width: '100%', height: '36px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Wardrobe / Costume Notes</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John: Leather jacket" 
                      value={wardrobe} 
                      onChange={(e) => setWardrobe(e.target.value)} 
                      style={{ width: '100%', height: '36px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Director/DOP/Other Notes</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Low angle shot focus" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      style={{ width: '100%', height: '36px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                  {editingSceneId && (
                    <button type="button" onClick={resetForm} className="btn-ghost" style={{ fontSize: '13px' }}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="btn-primary" style={{ fontSize: '13px' }}>
                    {editingSceneId ? 'Update Scene Card' : 'Add Scene Card'}
                  </button>
                </div>
              </form>
            </div>

            {/* ── SECTION 2: EXTRACTED SCENES CARDS LIST ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Extracted Scenes ({scenes.length})
                </h3>
                {scenes.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    Auto-saves to project database
                  </span>
                )}
              </div>

              {sortedScenes.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-default)',
                  borderRadius: '12px',
                  color: 'var(--text-muted)'
                }}>
                  <FileText className="w-8 h-8" style={{ margin: '0 auto 12px', color: 'var(--text-muted)', opacity: 0.6 }} />
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No scene cards extracted yet</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>
                    Use the form above to break down your script. Extracted scenes will appear in the schedule sidebar.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sortedScenes.map((scene) => (
                    <div 
                      key={scene.id} 
                      className="glass-card" 
                      style={{
                        padding: '16px',
                        background: 'var(--bg-surface)',
                        border: editingSceneId === scene.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                        position: 'relative'
                      }}
                    >
                      {/* Top Row: Scene number, type, location */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '4px 8px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '13px',
                            color: 'var(--text-primary)'
                          }}>
                            SC. {scene.sceneNumber}
                          </span>
                          <span className="chip chip-violet">{scene.intExt}</span>
                          <span className="chip chip-amber">{scene.dayNight}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {scene.location || 'Unknown Location'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            onClick={() => handleEditScene(scene)} 
                            className="btn-ghost" 
                            style={{ padding: '6px', borderRadius: '6px' }}
                            title="Edit Scene"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteScene(scene.id, scene.sceneNumber)} 
                            className="btn-ghost" 
                            style={{ padding: '6px', borderRadius: '6px', color: 'var(--accent-red)' }}
                            title="Delete Scene"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {scene.description && (
                        <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                          {scene.description}
                        </p>
                      )}

                      {/* Metadata row */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
                        {scene.cast && (
                          <div style={{ display: 'flex', fontSize: '11px', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-secondary)', width: '64px', flexShrink: 0 }}>Cast:</span>
                            <span style={{ color: 'var(--text-primary)' }}>{scene.cast}</span>
                          </div>
                        )}
                        {scene.props && (
                          <div style={{ display: 'flex', fontSize: '11px', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-secondary)', width: '64px', flexShrink: 0 }}>Props:</span>
                            <span style={{ color: 'var(--text-primary)' }}>{scene.props}</span>
                          </div>
                        )}
                        {scene.wardrobe && (
                          <div style={{ display: 'flex', fontSize: '11px', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-secondary)', width: '64px', flexShrink: 0 }}>Wardrobe:</span>
                            <span style={{ color: 'var(--text-primary)' }}>{scene.wardrobe}</span>
                          </div>
                        )}
                        {scene.notes && (
                          <div style={{ display: 'flex', fontSize: '11px', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-secondary)', width: '64px', flexShrink: 0 }}>Notes:</span>
                            <span style={{ color: 'var(--text-accent)' }}>{scene.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
