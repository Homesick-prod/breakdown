'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Film, Upload, Plus, Folder, MoreVertical, Edit2, Copy, FileDown, Trash2, Calendar, Clock, List, Video, Clapperboard, Share2, Sun, Moon } from 'lucide-react';
import { exportProject, importProject } from '../utils/file';
import { generateId } from '../utils/id';
import { deleteImage } from '../utils/db';
import { db, logAnalyticsEvent, isFirebaseEnabled, auth, logOut } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import AuthModal from './AuthModal';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import Footer from './Footer';
import { useTheme } from './ThemeProvider';

// ────────────────────────────────────────────────
// Empty State
// ────────────────────────────────────────────────
function EmptyState({ onCreateProject }) {
  return (
    <div className="text-center py-24 animate-fade-in-up">
      <div className="empty-state-icon animate-float" style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--accent-glow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Folder className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        No projects yet
      </h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '340px', margin: '0 auto 32px', fontSize: '13px' }}>
        Create your first project to manage your shooting schedules and shot lists.
      </p>
      <button onClick={onCreateProject} className="btn-primary">
        <Plus className="w-4 h-4" />
        Create Your First Project
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────
// Project Card Dropdown Menu
// ────────────────────────────────────────────────
function ProjectCardMenu({ project, onEdit, onDuplicate, onExport, onShare, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="btn-ghost"
        style={{ padding: '6px', borderRadius: '8px' }}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '36px', zIndex: 10 }}>
          <button onClick={(e) => { e.stopPropagation(); onShare(); setIsOpen(false); }} className="dropdown-item">
            <Share2 className="w-3.5 h-3.5" /> Share Link
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }} className="dropdown-item">
            <Edit2 className="w-3.5 h-3.5" /> Edit Details
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }} className="dropdown-item">
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </button>
          <button onClick={(e) => { e.stopPropagation(); onExport(); setIsOpen(false); }} className="dropdown-item">
            <FileDown className="w-3.5 h-3.5" /> Export
          </button>
          <div className="dropdown-divider" />
          <button onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }} className="dropdown-item danger">
            <Trash2 className="w-3.5 h-3.5" /> {project.isShared ? 'Remove' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// Firestore Sanitizer
// Two-pass approach:
//  1. JSON round-trip → guarantees only JSON-safe primitives
//  2. Walk result → strip imagePreviews and oversized strings
// ────────────────────────────────────────────────
const BANNED_KEYS = new Set(['imagePreviews']);
const MAX_STR = 800_000; // anything bigger than ~800KB is almost certainly base64

function stripBannedKeys(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val.length > MAX_STR ? '' : val;
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  if (Array.isArray(val)) return val.map(item => {
    // Firestore rejects arrays directly inside arrays — wrap inner arrays in an object
    if (Array.isArray(item)) return { values: stripBannedKeys(item) };
    return stripBannedKeys(item);
  });
  if (typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (BANNED_KEYS.has(k)) continue;
      out[k] = stripBannedKeys(v);
    }
    return out;
  }
  return null; // safety net
}

function sanitizeForFirestore(proj: any) {
  // Pass 1: flush undefined, NaN, Infinity, Dates, class instances, circular refs
  let plain: any;
  try {
    plain = JSON.parse(JSON.stringify(proj));
  } catch {
    // If stringify itself fails (circular ref etc.), bail with minimal data
    return {
      name: String(proj?.name ?? ''),
      description: String(proj?.description ?? ''),
      createdAt: proj?.createdAt ?? new Date().toISOString(),
      updatedAt: proj?.updatedAt ?? new Date().toISOString(),
      ownerId: String(proj?.ownerId ?? ''),
      data: { scheduleData: null, shotListData: null }
    };
  }
  // Pass 2: strip imagePreviews and oversized strings
  return stripBannedKeys(plain);
}

// ────────────────────────────────────────────────
// Main Dashboard
// ────────────────────────────────────────────────
export default function ProjectDashboard({ onSelectProject, onCreateProject }) {
  const { theme, toggleTheme } = useTheme();
  const [projects, setProjects] = useState<any[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [projectToOpen, setProjectToOpen] = useState<any>(null);
  const [visitorId, setVisitorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user]);

  // 1. Manage Toast Auto-Hide
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 2. Setup visitorId and Auth state listener
  useEffect(() => {
    let vid = localStorage.getItem('mb_visitor_id');
    if (!vid) {
      vid = generateId();
      localStorage.setItem('mb_visitor_id', vid);
    }
    setVisitorId(vid);

    if (!isFirebaseEnabled || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && db) {
        // Link any guest projects matching the visitorId to the signed-in user
        try {
          const guestQuery = query(
            collection(db, 'projects'),
            where('ownerId', '==', vid)
          );
          const querySnapshot = await getDocs(guestQuery);
          if (!querySnapshot.empty) {
            console.log(`Linking ${querySnapshot.size} guest projects to user ${currentUser.uid}...`);
            const updatePromises: Promise<any>[] = [];
            querySnapshot.forEach((docSnap) => {
              updatePromises.push(updateDoc(doc(db, 'projects', docSnap.id), {
                ownerId: currentUser.uid,
                updatedAt: new Date().toISOString()
              }));
            });
            await Promise.all(updatePromises);
            console.log('Guest projects successfully linked!');
          }
        } catch (err) {
          console.error('Error linking guest projects on login:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Load Projects based on Auth state
  useEffect(() => {
    if (!visitorId) return;

    const loadProjects = async () => {
      setLoading(true);
      const activeOwnerId = user ? user.uid : visitorId;

      if (isFirebaseEnabled && db) {
        try {
          // Check for any legacy local projects to migrate
          const localProjsData = localStorage.getItem('shootingScheduleProjects');
          const localProjs = localProjsData ? JSON.parse(localProjsData) : [];

          if (localProjs.length > 0) {
            console.log(`Migrating ${localProjs.length} local projects to Firestore...`);
            const remaining: any[] = [];
            for (const proj of localProjs) {
              try {
                const migratedProj = sanitizeForFirestore({
                  ...proj,
                  ownerId: activeOwnerId,
                  updatedAt: proj.updatedAt || new Date().toISOString()
                });
                const docSize = JSON.stringify(migratedProj).length;
                console.log(`[Migration] "${proj.name}" sanitized → ${(docSize / 1024).toFixed(1)} KB, data keys:`, Object.keys(migratedProj.data || {}));
                await setDoc(doc(db, 'projects', proj.id), migratedProj);
              } catch (migErr) {
                console.error(`Migration failed for project "${proj.name}" (${proj.id}):`, migErr);
                console.error('[Migration] Sanitized data that failed:', JSON.stringify(sanitizeForFirestore(proj)).substring(0, 2000));
                remaining.push(proj);      // keep it in localStorage for retry
              }
            }
            if (remaining.length === 0) {
              localStorage.removeItem('shootingScheduleProjects');
              console.log('Migration complete!');
            } else {
              localStorage.setItem('shootingScheduleProjects', JSON.stringify(remaining));
              console.warn(`${remaining.length} project(s) could not be migrated and remain in local storage.`);
            }
          }

          const q = query(
            collection(db, 'projects'),
            where('ownerId', '==', activeOwnerId)
          );
          const querySnapshot = await getDocs(q);
          const projs: any[] = [];
          querySnapshot.forEach((doc) => {
            projs.push({ id: doc.id, ...doc.data(), isShared: false });
          });

          // Load tracked shared projects from localStorage IDs list
          try {
            const sharedIds = JSON.parse(localStorage.getItem('mb_shared_project_ids') || '[]');
            const foreignSharedIds = sharedIds.filter((id: string) => !projs.some(p => p.id === id));
            if (foreignSharedIds.length > 0) {
              const chunks: string[][] = [];
              for (let i = 0; i < foreignSharedIds.length; i += 10) {
                chunks.push(foreignSharedIds.slice(i, i + 10));
              }
              for (const chunk of chunks) {
                const sharedQ = query(
                  collection(db, 'projects'),
                  where('__name__', 'in', chunk)
                );
                const sharedSnap = await getDocs(sharedQ);
                sharedSnap.forEach((doc) => {
                  projs.push({ id: doc.id, ...doc.data(), isShared: true });
                });
              }
            }
          } catch (sharedErr) {
            console.error('Failed to load shared projects:', sharedErr);
          }

          projs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setProjects(projs);
        } catch (err) {
          console.error('Failed to load/migrate projects from Firestore:', err);
          const localProjs = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
          setProjects(localProjs);
        } finally {
          setLoading(false);
        }
      } else {
        const localProjs = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
        setProjects(localProjs);
        setLoading(false);
      }
    };

    loadProjects();
  }, [user, visitorId]);

  const handleOpenEditModal = (project) => {
    setEditingProject(project);
    setEditedName(project.name);
    setEditedDescription(project.description || '');
  };
  const handleCloseEditModal = () => setEditingProject(null);

  const handleUpdateProject = async () => {
    if (!editingProject || !editedName.trim()) return;
    const updatedAt = new Date().toISOString();

    const updatedProjects = projects.map(p =>
      p.id === editingProject.id ? { ...p, name: editedName, description: editedDescription, updatedAt } : p
    );
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);

    if (isFirebaseEnabled && db) {
      try {
        await updateDoc(doc(db, 'projects', editingProject.id), {
          name: editedName,
          description: editedDescription,
          updatedAt
        });
      } catch (err) {
        console.error('Failed to update project:', err);
      }
    } else {
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    }

    handleCloseEditModal();
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const newProjectId = generateId();
    const activeOwnerId = user ? user.uid : visitorId;
    const newProject = {
      name: newProjectName,
      description: newProjectDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: activeOwnerId,
      data: { scheduleData: null, shotListData: null }
    };

    const updatedProjects = [{ id: newProjectId, ...newProject }, ...projects];
    setProjects(updatedProjects);

    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'projects', newProjectId), sanitizeForFirestore(newProject));
        logAnalyticsEvent('create_project', { name: newProjectName });
      } catch (err) {
        console.error('Failed to create project in Firestore:', err);
      }
    } else {
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    }

    setNewProjectName('');
    setNewProjectDescription('');
    setShowNewProjectModal(false);
    setProjectToOpen({ id: newProjectId, ...newProject });
  };

  const handleDeleteProject = async (projectId) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    const isShared = projectToDelete?.isShared;

    if (isShared) {
      if (!window.confirm('Remove this shared project from your dashboard? (This will not delete the project for the owner)')) return;
      try {
        const sharedIds = JSON.parse(localStorage.getItem('mb_shared_project_ids') || '[]');
        const updatedSharedIds = sharedIds.filter((id: string) => id !== projectId);
        localStorage.setItem('mb_shared_project_ids', JSON.stringify(updatedSharedIds));
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (err) {
        console.error('Failed to remove shared project:', err);
      }
      return;
    }

    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    try {
      if (projectToDelete?.data?.shotListData?.shotListItems) {
        const imageDeletionPromises = projectToDelete.data.shotListData.shotListItems
          .filter(shot => shot.imageUrl)
          .map(shot => deleteImage(shot.id));
        await Promise.all(imageDeletionPromises);
      }

      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);

      if (isFirebaseEnabled && db) {
        await deleteDoc(doc(db, 'projects', projectId));
        logAnalyticsEvent('delete_project', { id: projectId });
      } else {
        localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('There was an error deleting the project.');
    }
  };

  const handleDuplicateProject = async (project) => {
    const newProjectId = generateId();
    const activeOwnerId = user ? user.uid : visitorId;
    const duplicatedProject = {
      name: `${project.name} (Copy)`,
      description: project.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: activeOwnerId,
      data: project.data || { scheduleData: null, shotListData: null }
    };

    const updatedProjects = [{ id: newProjectId, ...duplicatedProject }, ...projects];
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);

    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'projects', newProjectId), sanitizeForFirestore(duplicatedProject));
        logAnalyticsEvent('duplicate_project', { name: project.name });
      } catch (err) {
        console.error('Failed to duplicate project:', err);
      }
    } else {
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    }
  };

  const handleShareProject = (project) => {
    if (!isFirebaseEnabled) {
      alert('Sharing is not available in local storage fallback mode. Please configure Firebase to share projects.');
      return;
    }
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/project/${project.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setToastMessage('Link copied to clipboard!');
      logAnalyticsEvent('share_project', { id: project.id });
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  };

  const handleExportProject = async (project) => {
    alert('Preparing project for export. This may take a moment...');
    try {
      await exportProject(project);
      if (isFirebaseEnabled) {
        logAnalyticsEvent('export_project', { name: project.name });
      }
    }
    catch (error) { console.error('Export failed:', error); alert('Export failed.'); }
  };

  const handleImportProject = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedProject = await importProject(file);
      const activeOwnerId = user ? user.uid : visitorId;
      // Clean ownerId & timestamp for the current guest visitor
      importedProject.ownerId = activeOwnerId;
      importedProject.updatedAt = new Date().toISOString();

      const projectExists = projects.some(p => p.id === importedProject.id);
      let updatedProjects;
      if (projectExists) {
        if (window.confirm('A project with this ID already exists. Do you want to overwrite it?')) {
          updatedProjects = projects.map(p => p.id === importedProject.id ? importedProject : p);
        } else { e.target.value = null; return; }
      } else {
        updatedProjects = [...projects, importedProject];
      }
      updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(updatedProjects);

      if (isFirebaseEnabled && db) {
        await setDoc(doc(db, 'projects', importedProject.id), sanitizeForFirestore({
          name: importedProject.name,
          description: importedProject.description || '',
          createdAt: importedProject.createdAt || new Date().toISOString(),
          updatedAt: importedProject.updatedAt,
          ownerId: activeOwnerId,
          data: importedProject.data || { scheduleData: null, shotListData: null }
        }));

        logAnalyticsEvent('import_project', { name: importedProject.name });
      } else {
        localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
      }
      alert('Project imported successfully!');
    } catch (error) {
      alert(error.message || 'Import failed. The file may be corrupt or not a valid project file.');
    }
    if (e.target) e.target.value = null;
  };

  // ── Inline styles ──
  const S = {
    page: {
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    },
    bgGlow1: { display: 'none' },
    bgGlow2: { display: 'none' },
    nav: {
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '64px',
      background: 'var(--bg-overlay)',
      backdropFilter: 'blur(24px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center',
    },
    navInner: {
      maxWidth: '1400px', width: '100%', margin: '0 auto',
      padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    logoRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoBadge: {
      width: '36px', height: '36px',
      background: 'var(--accent-primary)',
      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'var(--shadow-sm)',
    },
    logoTitle: { fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' },
    logoSub: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' },
    main: { flex: 1, paddingTop: '64px', position: 'relative', zIndex: 1 },
    contentWrap: { maxWidth: '1400px', margin: '0 auto', padding: '48px 24px' },
    heroRow: { marginBottom: '40px' },
    heroTitle: { fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '8px' },
    heroSub: { fontSize: '15px', color: 'var(--text-secondary)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' },
    cardBody: { flex: 1, padding: '24px', position: 'relative', zIndex: 1 },
    cardTitle: { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' },
    cardDesc: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' },
    cardFooter: {
      padding: '12px 24px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: '12px', color: 'var(--text-muted)',
    },
    cardHeaderRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' },
    modalOverlay: {
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'var(--bg-overlay)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    },
    modal: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: '12px',
      boxShadow: 'var(--shadow-lg)',
      width: '100%', maxWidth: '460px', padding: '32px',
    },
    modalTitle: { fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' },
    modalSub: { fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' },
    label: { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' },
    formGroup: { marginBottom: '20px' },
    inputStyle: {
      width: '100%', padding: '11px 14px',
      background: 'var(--bg-input)', border: '1px solid var(--border-default)',
      borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px',
      outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit',
    },
    textareaStyle: {
      width: '100%', padding: '11px 14px',
      background: 'var(--bg-input)', border: '1px solid var(--border-default)',
      borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px',
      outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit',
      resize: 'none',
    },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '28px' },
    openGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '4px' },
    openOption: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '28px 16px', gap: '12px',
      background: 'var(--bg-input)',
      border: '1px solid var(--border-default)',
      borderRadius: '14px', cursor: 'pointer',
      transition: 'all 0.2s',
    },
  };

  return (
    <div style={S.page}>
      {/* Background glows */}
      <div style={S.bgGlow1} />
      <div style={S.bgGlow2} />

      {/* Nav */}
      <nav style={S.nav} className="dashboard-nav">
        <div style={S.navInner} className="dashboard-nav-inner">
          <div style={S.logoRow}>
            <div>
              <div style={S.logoTitle}>MentalBreakdown</div>
              <div style={S.logoSub} className="dashboard-logo-sub">Film Production Suite</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={toggleTheme}
              className="btn-ghost"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                padding: 0,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            {isFirebaseEnabled && (
              user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {user.photoURL && !imageError ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Profile'}
                      onError={() => setImageError(true)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-default)', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <button
                    onClick={logOut}
                    className="btn-ghost"
                    style={{ fontSize: '13px', padding: '6px 12px' }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-primary"
                  style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                >
                  Sign In
                </button>
              )
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".mbd,.json" onChange={handleImportProject} className="hidden" style={{ display: 'none' }} />
        </div>
      </nav>

      {/* Main */}
      <main style={S.main} className="dashboard-main">
        <div style={S.contentWrap} className="dashboard-content-wrap">
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }} className="dashboard-hero animate-fade-in-up">
            <div>
              <h2 style={S.heroTitle}>Your Projects</h2>
              <p style={S.heroSub}>Manage your shooting schedules and production timelines</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              style={{ gap: '8px', height: '40px', padding: '0 16px' }}
            >
              <Upload className="w-4 h-4" />
              Import Project
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState onCreateProject={() => setShowNewProjectModal(true)} />
          ) : (
            <div style={S.grid} className="dashboard-grid">
              {/* Create card */}
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="project-card-create animate-fade-in-up"
                style={{ border: '2px dashed var(--border-default)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'var(--bg-input)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <Plus className="w-6 h-6" />
                </div>
                <span>New Project</span>
              </button>

              {/* Project cards */}
              {projects.map((project, i) => (
                <div
                  key={project.id}
                  onClick={() => setProjectToOpen(project)}
                  className="project-card animate-fade-in-up"
                  style={{ animationDelay: `${(i + 1) * 0.05}s` }}
                >
                  {/* Accent strip */}
                  <div style={{
                    height: '3px',
                    background: `linear-gradient(90deg, var(--accent-primary), ${i % 2 === 0 ? '#5db29b' : 'var(--accent-amber)'})`,
                  }} />
                  <div style={S.cardBody}>
                    <div style={S.cardHeaderRow}>
                      <h3 style={{ ...S.cardTitle, paddingRight: '8px' }} className="line-clamp-2">
                        {project.name}
                      </h3>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProjectCardMenu
                          project={project}
                          onEdit={() => handleOpenEditModal(project)}
                          onDuplicate={() => handleDuplicateProject(project)}
                          onExport={() => handleExportProject(project)}
                          onShare={() => handleShareProject(project)}
                          onDelete={() => handleDeleteProject(project.id)}
                        />
                      </div>
                    </div>
                    <p style={S.cardDesc} className="line-clamp-3">
                      {project.description || 'No description'}
                    </p>
                    {/* Feature badges */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                      {project.isShared && (
                        <span className="chip chip-green"><Share2 className="w-3 h-3" />Shared</span>
                      )}
                      {project.data?.scheduleData && (
                        <span className="chip chip-violet"><Video className="w-3 h-3" />Schedule</span>
                      )}
                      {project.data?.shotListData && (
                        <span className="chip chip-amber"><List className="w-3 h-3" />Shot List</span>
                      )}
                    </div>
                  </div>
                  <div style={S.cardFooter}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar className="w-3 h-3" />
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock className="w-3 h-3" />
                      {new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Toast Clipboard Copy Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'rgba(76, 161, 138, 0.12)', border: '1px solid rgba(76, 161, 138, 0.25)',
          borderRadius: '8px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <svg style={{ width: '14px', height: '14px', color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}

      {/* ── Open Project Modal ── */}
      {projectToOpen && (
        <div className="modal-overlay" onClick={() => setProjectToOpen(null)}>
          <div
            className="premium-modal animate-scale-in"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Folder className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>Open Project</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', marginLeft: '2px' }}>
              Choose how to open <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>"{projectToOpen.name}"</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
              <button
                onClick={() => { onSelectProject(projectToOpen, 'shotlist'); setProjectToOpen(null); }}
                className="option-card shotlist"
              >
                <div className="option-card-icon-wrap">
                  <List className="w-5 h-5" />
                </div>
                <div className="option-card-title">Shot List</div>
              </button>
              <button
                onClick={() => { onSelectProject(projectToOpen, 'schedule'); setProjectToOpen(null); }}
                className="option-card schedule"
              >
                <div className="option-card-icon-wrap">
                  <Video className="w-5 h-5" />
                </div>
                <div className="option-card-title">Schedule</div>
              </button>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setProjectToOpen(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Project Modal ── */}
      {showNewProjectModal && (
        <div className="modal-overlay" onClick={() => setShowNewProjectModal(false)}>
          <div
            className="premium-modal animate-scale-in"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={S.modalTitle}>New Project</h3>
            <p style={S.modalSub}>Give your production a name to get started.</p>
            <div style={S.formGroup}>
              <label style={S.label}>Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder="e.g. Short Film 2026"
                autoFocus
                className="no-style"
                style={S.inputStyle}
              />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Brief description of your project..."
                rows={3}
                className="no-style"
                style={{ ...S.textareaStyle, resize: 'none' }}
              />
            </div>
            <div style={S.modalFooter}>
              <button onClick={() => setShowNewProjectModal(false)} className="btn-ghost">Cancel</button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="btn-primary"
                style={{ opacity: !newProjectName.trim() ? 0.5 : 1, cursor: !newProjectName.trim() ? 'not-allowed' : 'pointer' }}
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Project Modal ── */}
      {editingProject && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div
            className="premium-modal animate-scale-in"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={S.modalTitle}>Edit Project</h3>
            <p style={S.modalSub}>Update the details for this project.</p>
            <div style={S.formGroup}>
              <label style={S.label}>Project Name</label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                className="no-style"
                style={S.inputStyle}
              />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={3}
                className="no-style"
                style={{ ...S.textareaStyle, resize: 'none' }}
              />
            </div>
            <div style={S.modalFooter}>
              <button onClick={handleCloseEditModal} className="btn-ghost">Cancel</button>
              <button
                onClick={handleUpdateProject}
                disabled={!editedName.trim()}
                className="btn-primary"
                style={{ opacity: !editedName.trim() ? 0.5 : 1, cursor: !editedName.trim() ? 'not-allowed' : 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(loggedInUser) => setUser(loggedInUser)}
      />
    </div>
  );
}