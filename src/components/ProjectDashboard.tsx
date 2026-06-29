'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Film, Upload, Plus, Folder, MoreVertical, Edit2, Copy, FileDown, Trash2, Calendar, Clock, List, Video, Clapperboard, Share2, Sun, Moon, FileText, Search, Users, Settings, Bell, MessageSquare, Home } from 'lucide-react';
import { exportProject, importProject } from '../utils/file';
import { generateId } from '../utils/id';
import { deleteImage } from '../utils/db';
import { db, logAnalyticsEvent, logActivity, isFirebaseEnabled, auth, logOut, deleteImageFromStorage } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import AuthModal from './AuthModal';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import Footer from './Footer';
import { useTheme } from './ThemeProvider';

// ────────────────────────────────────────────────
// Empty State
// ────────────────────────────────────────────────
function EmptyState({ onCreateProject, onImportProject }) {
  return (
    <div className="dashboard-empty-state text-center py-24 animate-fade-in-up">
      <div className="empty-state-icon animate-float" style={{ width: '68px', height: '68px', borderRadius: '18px', background: 'var(--accent-glow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
        <Folder className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
      </div>
      <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        No projects yet
      </h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '340px', margin: '0 auto 32px', fontSize: '13px' }}>
        Start a shot list or schedule in under a minute.
      </p>
      <div className="dashboard-empty-actions">
        <button onClick={onCreateProject} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Project
        </button>
        <button onClick={onImportProject} className="btn-secondary">
          <Upload className="w-4 h-4" />
          Import .mbd
        </button>
      </div>
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

function stripBannedKeys(val: any, isInsideArray = false): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val.length > MAX_STR ? '' : val;
  if (typeof val === 'number' || typeof val === 'boolean') return val;

  if (Array.isArray(val)) {
    if (isInsideArray) {
      // Firestore does not allow nested arrays (arrays inside arrays, even nested inside objects inside arrays).
      // Convert nested arrays to comma-separated strings to avoid "invalid nested entity" Firestore errors.
      return val.map(item => {
        if (item && typeof item === 'object') {
          return item.value || item.label || JSON.stringify(item);
        }
        return String(item);
      }).join(', ');
    }
    return val.map(item => {
      if (Array.isArray(item)) return { values: stripBannedKeys(item, true) };
      return stripBannedKeys(item, true);
    });
  }

  if (typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (BANNED_KEYS.has(k)) continue;
      out[k] = stripBannedKeys(v, isInsideArray);
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
  const [authInitialized, setAuthInitialized] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedPreference, setSelectedPreference] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string>('Producer');

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
      setAuthInitialized(true);
      setUserRole('Guest');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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

        // Check if user profile already exists in users collection
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
            // New user, trigger onboarding modal
            setOnboardingUser(currentUser);
            setUserRole('Producer');
          } else {
            // Existing user, update lastLoginAt
            const data = userDocSnap.data();
            if (data?.role) {
              setUserRole(data.role);
            } else {
              setUserRole('Producer');
            }
            await setDoc(userDocRef, {
              lastLoginAt: new Date().toISOString(),
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || ''
            }, { merge: true });
          }
        } catch (err) {
          console.error('Failed to sync user profile:', err);
        }
      } else {
        setUserRole('Guest');
      }
      setUser(currentUser);
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // 3. Load Projects based on Auth state
  useEffect(() => {
    if (!authInitialized || !visitorId) return;

    let isActive = true;

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
              } catch (migErr: any) {
                console.error(`Migration failed for project "${proj.name}" (${proj.id}):`, migErr);
                if (migErr && typeof migErr === 'object') {
                  console.error(`[Migration Error details] Code: ${migErr.code}, Message: ${migErr.message}, Stack: ${migErr.stack}`);
                }
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

            // Clean up localStorage if some shared projects are actually owned now
            if (sharedIds.length !== foreignSharedIds.length) {
              localStorage.setItem('mb_shared_project_ids', JSON.stringify(foreignSharedIds));
            }

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

          if (!isActive) return;

          projs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setProjects(projs);
        } catch (err) {
          console.error('Failed to load/migrate projects from Firestore:', err);
          if (isActive) {
            const localProjs = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
            setProjects(localProjs);
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      } else {
        if (isActive) {
          const localProjs = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
          setProjects(localProjs);
          setLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      isActive = false;
    };
  }, [user, visitorId, authInitialized]);

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

  const handleCompleteOnboarding = async (role: string, preference: string) => {
    if (!onboardingUser || !db) return;
    try {
      const userDocRef = doc(db, 'users', onboardingUser.uid);
      const now = new Date().toISOString();
      await setDoc(userDocRef, {
        uid: onboardingUser.uid,
        email: onboardingUser.email || '',
        displayName: onboardingUser.displayName || '',
        photoURL: onboardingUser.photoURL || '',
        createdAt: now,
        lastLoginAt: now,
        role,
        preferences: { primaryUsage: preference },
        plan: 'beta_free'
      });

      await logActivity(onboardingUser.uid, 'onboarding_complete', { role, preference });
      setOnboardingUser(null);
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    }
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
        await logActivity(activeOwnerId, 'create_project', { projectId: newProjectId, projectName: newProjectName });
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
      const shotListItems = projectToDelete?.data?.shotListData?.shotListItems || [];
      const timelineItems = projectToDelete?.data?.timelineItems || projectToDelete?.data?.scheduleData?.timelineItems || [];
      const imageItems = [...shotListItems, ...timelineItems].filter(item => item?.imageUrl);
      const storageUrls = Array.from(new Set(
        imageItems
          .map(item => item.imageUrl)
          .filter((url): url is string => !!url && url.startsWith('http'))
      ));

      await Promise.all([
        ...imageItems.map(item => deleteImage(item.id)),
        ...storageUrls.map(url => deleteImageFromStorage(url).catch(err => {
          console.error('Failed to delete image from Firebase Storage:', err);
        })),
      ]);

      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);

      if (isFirebaseEnabled && db) {
        await deleteDoc(doc(db, 'projects', projectId));
        logAnalyticsEvent('delete_project', { id: projectId });
        await logActivity(user ? user.uid : visitorId, 'delete_project', { projectId });
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
        await logActivity(activeOwnerId, 'duplicate_project', { originalProjectId: project.id, newProjectId });
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
        await logActivity(user ? user.uid : visitorId, 'export_project', { projectId: project.id });
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
        await logActivity(activeOwnerId, 'import_project', { projectId: importedProject.id });
      } else {
        localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
      }
      alert('Project imported successfully!');
    } catch (error) {
      alert(error.message || 'Import failed. The file may be corrupt or not a valid project file.');
    }
    if (e.target) e.target.value = null;
  };

  // Helper to extract timeline items
  const getTimelineItems = (project: any) => {
    return project.data?.timelineItems || project.data?.scheduleData?.timelineItems || [];
  };

  // Helper to calculate project progress based on completed items
  const getProjectProgress = (project: any) => {
    const shotList = project.data?.shotListData?.shotListItems || [];
    const timeline = getTimelineItems(project);
    
    if (shotList.length > 0) {
      const completed = shotList.filter((shot: any) => shot.status === 'completed' || shot.completed === true).length;
      return Math.round((completed / shotList.length) * 100);
    }
    
    if (timeline.length > 0) {
      const completed = timeline.filter((item: any) => item.status === 'completed' || item.completed === true).length;
      return Math.round((completed / timeline.length) * 100);
    }
    
    return 0;
  };

  // Filter projects by search query
  const filteredProjects = projects.filter((project: any) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = project.name?.toLowerCase().includes(query);
    const descMatch = project.description?.toLowerCase().includes(query);
    return nameMatch || descMatch;
  });

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
    <div className="redesign-layout">
      {/* 1. Left Sidebar Navigation */}
      <aside className="redesign-sidebar">
        <div className="redesign-sidebar-logo">
          MB
        </div>
        <nav className="redesign-sidebar-menu">
          <button className="redesign-sidebar-item active" title="Dashboard">
            <Home className="w-5 h-5" />
          </button>
          <button className="redesign-sidebar-item" onClick={() => setShowNewProjectModal(true)} title="New Project">
            <Plus className="w-5 h-5" />
          </button>
          <button className="redesign-sidebar-item" onClick={() => fileInputRef.current?.click()} title="Import Project">
            <Upload className="w-5 h-5" />
          </button>
          <button
            onClick={toggleTheme}
            className="redesign-sidebar-item"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </nav>
        <div className="redesign-sidebar-footer">
          {isFirebaseEnabled && user && (
            <button className="redesign-sidebar-item" onClick={logOut} title="Sign Out">
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          )}
        </div>
      </aside>

      {/* 2. Top Header Bar */}
      <header className="redesign-topbar">
        <div className="redesign-search-box">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Search projects, scenes..."
            className="redesign-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="btn-ghost" style={{ padding: '8px', borderRadius: '10px', color: 'var(--text-secondary)' }}><Bell className="w-[18px] h-[18px]" /></button>
          <button className="btn-ghost" style={{ padding: '8px', borderRadius: '10px', color: 'var(--text-secondary)' }}><MessageSquare className="w-[18px] h-[18px]" /></button>
          
          {isFirebaseEnabled && (
            user ? (
              <div className="redesign-user-badge">
                {user.photoURL && !imageError ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    onError={() => setImageError(true)}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#fff' }}>
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>{user.displayName || 'User'}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 500 }}>{userRole}</span>
                </div>
                <button
                  onClick={logOut}
                  className="btn-ghost"
                  style={{ fontSize: '10px', padding: '3px 8px', marginLeft: '6px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.1)' }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-primary"
                style={{ height: '36px', padding: '0 16px', fontSize: '13px', borderRadius: '10px' }}
              >
                Sign In
              </button>
            )
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".mbd,.json" onChange={handleImportProject} className="hidden" style={{ display: 'none' }} />
      </header>

      {/* 3. Main Dashboard Content */}
      <main className="redesign-main">
        <div className="redesign-content-inner">
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }} className="dashboard-hero animate-fade-in-up">
            <div>
              <h2 style={S.heroTitle}>Your Projects</h2>
              <p style={S.heroSub}>Manage your shooting schedules and production timelines</p>
            </div>
            {!loading && projects.length > 0 && (
              <div className="dashboard-hero-actions">
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="btn-primary"
                  style={{ gap: '8px', height: '40px', padding: '0 16px' }}
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{ gap: '8px', height: '40px', padding: '0 16px' }}
                >
                  <Upload className="w-4 h-4" />
                  Import Project
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
            </div>
          ) : filteredProjects.length === 0 && searchQuery.trim() !== '' ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
              No projects match "{searchQuery}"
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              onCreateProject={() => setShowNewProjectModal(true)}
              onImportProject={() => fileInputRef.current?.click()}
            />
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
              {filteredProjects.map((project, i) => {
                const hasSchedule = !!(
                  (project.data?.timelineItems && project.data.timelineItems.length > 0) ||
                  (project.data?.scheduleData?.timelineItems && project.data.scheduleData.timelineItems.length > 0)
                );
                const hasShotList = !!(
                  project.data?.shotListData?.shotListItems && project.data.shotListData.shotListItems.length > 0
                );

                const progress = getProjectProgress(project);

                // Determine gradient based on features containing data
                let gradient = 'linear-gradient(90deg, #444444, #555555)'; // Empty state (subtle gray)
                const activeFeatures = [hasSchedule && 'schedule', hasShotList && 'shotlist'].filter(Boolean);
                if (activeFeatures.length === 2) {
                  gradient = 'linear-gradient(90deg, var(--accent-amber), var(--accent-primary))';
                } else if (activeFeatures.length === 1) {
                  if (hasSchedule) {
                    gradient = 'linear-gradient(90deg, var(--accent-amber), #fbbf24)';
                  } else if (hasShotList) {
                    gradient = 'linear-gradient(90deg, var(--accent-primary), #3fb950)';
                  }
                }

                return (
                  <div
                    key={project.id}
                    onClick={() => setProjectToOpen(project)}
                    className="redesign-card animate-fade-in-up"
                    style={{ animationDelay: `${(i + 1) * 0.05}s` }}
                  >
                    {/* Accent strip */}
                    <div style={{
                      height: '4px',
                      background: gradient,
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
                      
                      {/* Dynamic Progress Bar */}
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          <span>Completion</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="redesign-card-progress-bar">
                          <div 
                            className="redesign-card-progress-fill" 
                            style={{ width: `${progress}%`, background: gradient }}
                          />
                        </div>
                      </div>

                      {/* Feature badges */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                        {project.isShared && (
                          <span className="chip chip-green"><Share2 className="w-3 h-3" />Shared</span>
                        )}
                        {hasSchedule && (
                          <span className="chip chip-amber"><Video className="w-3 h-3" />Schedule</span>
                        )}
                        {hasShotList && (
                          <span className="chip chip-green"><List className="w-3 h-3" />Shot List</span>
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
                );
              })}
            </div>
          )}

          {/* 4. Shooting Schedule Timeline Widget */}
          {!loading && projects.length > 0 && (
            <div className="timeline-widget">
              <div className="timeline-widget-header">
                <div className="timeline-widget-title">Shooting Schedule Timeline</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active schedules across all projects</div>
              </div>
              <div className="timeline-track-container">
                {projects.filter((p: any) => getTimelineItems(p).length > 0).length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 8px', textAlign: 'center' }}>
                    No active timeline tracks. Open a project and build a shooting schedule to visualize it here.
                  </div>
                ) : (
                  projects.filter((p: any) => getTimelineItems(p).length > 0).map((project: any) => {
                    const items = getTimelineItems(project).filter((item: any) => item.type === 'shot' || !item.type);
                    return (
                      <div key={project.id} className="timeline-track-row">
                        <div className="timeline-track-label" title={project.name}>
                          {project.name}
                        </div>
                        <div className="timeline-track-lane">
                          {items.slice(0, 3).map((item: any, idx: number) => {
                            const positions = [
                              { left: '8%', width: '30%', bg: 'rgba(79, 181, 155, 0.14)', border: '1px solid var(--accent-primary)', labelColor: 'var(--text-accent)' },
                              { left: '44%', width: '28%', bg: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--accent-amber)', labelColor: 'var(--accent-amber)' },
                              { left: '76%', width: '18%', bg: 'rgba(168, 85, 247, 0.12)', border: '1px solid #a855f7', labelColor: '#b794f4' }
                            ];
                            const pos = positions[idx] || { left: '8%', width: '25%', bg: 'rgba(79, 181, 155, 0.14)', border: '1px solid var(--accent-primary)', labelColor: 'var(--text-accent)' };
                            const label = item.sceneNumber ? `Sc. ${item.sceneNumber}` : `Row ${idx + 1}`;
                            return (
                              <div
                                key={idx}
                                className="timeline-track-block"
                                style={{
                                  left: pos.left,
                                  width: pos.width,
                                  backgroundColor: pos.bg,
                                  border: pos.border,
                                }}
                              >
                                <span style={{ color: pos.labelColor, fontWeight: 700, marginRight: '6px' }}>{label}</span>
                                <span style={{ opacity: 0.85, fontSize: '10px' }}>{item.sceneDescription || item.description || ''}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Open Project</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', marginLeft: '2px' }}>
              Choose how to open <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>"{projectToOpen.name}"</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '4px' }}>
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

      {/* ── Onboarding Modal ── */}
      {onboardingUser && (
        <div className="modal-overlay" style={{ zIndex: 70 }}>
          <div
            className="premium-modal animate-scale-in"
            style={{ maxWidth: '520px', padding: '36px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Clapperboard className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                Welcome to MentalBreakdown!
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.5' }}>
              We are building a next-generation SaaS tool for film production. Help us tailor your experience with just 2 quick questions.
            </p>

            {/* Q1: Primary Role */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                1. What is your primary role on set?
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Director', 'Producer', '1st AD', 'DOP', 'PM / UPM', 'Other'].map(r => {
                  const isSel = selectedRole === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setSelectedRole(r)}
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: isSel ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                        background: isSel ? 'rgba(76, 161, 138, 0.12)' : 'var(--bg-input)',
                        color: isSel ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Q2: Primary Usage Preference */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                2. What do you plan to use this tool for?
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Schedules', 'Shot Lists', 'Call Sheets', 'All of the above'].map(p => {
                  const isSel = selectedPreference === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setSelectedPreference(p)}
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: isSel ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                        background: isSel ? 'rgba(76, 161, 138, 0.12)' : 'var(--bg-input)',
                        color: isSel ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={() => handleCompleteOnboarding(selectedRole, selectedPreference)}
                disabled={!selectedRole || !selectedPreference}
                className="btn-primary"
                style={{
                  height: '42px',
                  padding: '0 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: (!selectedRole || !selectedPreference) ? 0.5 : 1,
                  cursor: (!selectedRole || !selectedPreference) ? 'not-allowed' : 'pointer'
                }}
              >
                Complete Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
