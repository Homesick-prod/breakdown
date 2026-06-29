'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Folder, List, Video } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { db, isFirebaseEnabled } from '@/lib/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { generateId } from '@/utils/id';
import { calculateEndTime } from '@/utils/time';

const ProjectDashboard = dynamic(() => import('@/components/ProjectDashboard'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
      background: 'var(--bg-base)', color: 'var(--text-secondary)'
    }}>
      <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
      <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 500 }}>Loading Dashboard...</span>
    </div>
  )
});

const ShootingScheduleEditor = dynamic(() => import('@/components/ShootingScheduleEditor'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
      background: 'var(--bg-base)', color: 'var(--text-secondary)'
    }}>
      <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
      <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 500 }}>Loading Schedule Editor...</span>
    </div>
  )
});

const ShotListEditor = dynamic(() => import('@/components/ShotlistEditor'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
      background: 'var(--bg-base)', color: 'var(--text-secondary)'
    }}>
      <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
      <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 500 }}>Loading Shot List...</span>
    </div>
  )
});

const LOCK_TTL_MS = 40000;
const LOCK_HEARTBEAT_MS = 15000;
const LOCKED_PROJECT_MESSAGE = 'Someone else is currently editing this project. Access is temporarily locked to prevent data conflicts.';
const LOST_LOCK_MESSAGE = 'This editing session lost the project lock. Autosave has been stopped to prevent data conflicts.';
const SAME_DEVICE_LOCK_RECLAIMED_MESSAGE = 'This project was opened in another tab/session on this device. Autosave has been stopped to prevent data conflicts.';
const CLIENT_ID_STORAGE_KEY = 'mb_lock_client_id';
const SESSION_ID_STORAGE_KEY = 'mb_lock_session_id';

type EditorType = 'schedule' | 'shotlist' | 'breakdown';

const hasOwn = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj || {}, key);
const isHttpUrl = (value: any) => typeof value === 'string' && /^https?:\/\//i.test(value);

function recalculateTimelineTimes(items: any[], firstShotTime?: string) {
  let lastEndTime = firstShotTime || items[0]?.start || '09:00';
  return items.map(item => {
    const start = lastEndTime;
    const end = calculateEndTime(start, Number(item.duration || 0));
    lastEndTime = end || lastEndTime;
    return { ...item, start, end };
  });
}

const shotIdentityKey = (item: any) => {
  const sceneNumber = String(item?.sceneNumber || '').trim().toLowerCase();
  const shotNumber = String(item?.shotNumber || '').trim().toLowerCase();
  if (!sceneNumber || !shotNumber) return '';
  return `${sceneNumber}::${shotNumber}`;
};

function createUniqueShotKeyMap(items: any[]) {
  const map = new Map<string, any>();
  const duplicates = new Set<string>();

  for (const item of items) {
    const key = shotIdentityKey(item);
    if (!key) continue;
    if (map.has(key)) {
      duplicates.add(key);
    } else {
      map.set(key, item);
    }
  }

  duplicates.forEach(key => map.delete(key));
  return map;
}

function normalizeProjectData(projectData: any = {}) {
  const legacySchedule = projectData?.scheduleData || {};
  const nextData = {
    ...projectData,
    shotListData: projectData?.shotListData || { shotListItems: [] },
    headerInfo: projectData?.headerInfo || legacySchedule.headerInfo,
    timelineItems: Array.isArray(projectData?.timelineItems)
      ? projectData.timelineItems
      : (Array.isArray(legacySchedule.timelineItems) ? legacySchedule.timelineItems : []),
    imagePreviews: projectData?.imagePreviews || legacySchedule.imagePreviews || {},
    callSheetData: projectData?.callSheetData || legacySchedule.callSheetData || null,
  };

  if (projectData?.scheduleData) {
    nextData.scheduleData = {
      ...projectData.scheduleData,
      headerInfo: nextData.headerInfo,
      timelineItems: nextData.timelineItems,
      imagePreviews: nextData.imagePreviews,
      callSheetData: nextData.callSheetData,
    };
  }

  return nextData;
}

function withSyncedScheduleData(projectData: any, patch: any) {
  const nextData = {
    ...projectData,
    ...patch,
  };

  if (projectData?.scheduleData) {
    nextData.scheduleData = {
      ...projectData.scheduleData,
      ...(hasOwn(patch, 'headerInfo') ? { headerInfo: patch.headerInfo } : {}),
      ...(hasOwn(patch, 'timelineItems') ? { timelineItems: patch.timelineItems } : {}),
      ...(hasOwn(patch, 'imagePreviews') ? { imagePreviews: patch.imagePreviews } : {}),
      ...(hasOwn(patch, 'callSheetData') ? { callSheetData: patch.callSheetData } : {}),
    };
  }

  return nextData;
}

function syncShotListIntoSchedule(projectData: any) {
  projectData = normalizeProjectData(projectData);
  const shotListItems = projectData?.shotListData?.shotListItems;
  const timelineItems = projectData?.timelineItems;
  if (!Array.isArray(shotListItems) || !Array.isArray(timelineItems)) return projectData;

  const shotById = new Map(shotListItems.map((shot: any) => [shot.id, shot]));
  const shotByKey = createUniqueShotKeyMap(shotListItems);
  let changed = false;
  let removedLinkedRows = false;
  const nextImagePreviews = { ...(projectData.imagePreviews || {}) };

  const nextTimelineItems = timelineItems.flatMap((item: any) => {
    if (item?.type !== 'shot') return [item];

    const sourceShot = item.linkedShotId
      ? shotById.get(item.linkedShotId)
      : shotByKey.get(shotIdentityKey(item));

    if (item.linkedShotId && !sourceShot) {
      changed = true;
      removedLinkedRows = true;
      if (nextImagePreviews[item.id]) delete nextImagePreviews[item.id];
      return [];
    }

    if (!sourceShot) return [item];

    const nextItem = {
      ...item,
      linkedShotId: sourceShot.id,
      sceneNumber: sourceShot.sceneNumber ?? '',
      shotNumber: sourceShot.shotNumber ?? '',
      shotSize: sourceShot.shotSize ?? '',
      angle: sourceShot.angle ?? '',
      movement: sourceShot.movement ?? '',
      lens: sourceShot.lens ?? '',
      shotDescription: sourceShot.description ?? '',
      notes: sourceShot.notes ?? '',
      imageUrl: sourceShot.imageUrl ?? '',
    };

    if (isHttpUrl(sourceShot.imageUrl)) {
      nextImagePreviews[item.id] = sourceShot.imageUrl;
    } else if (item.imageUrl && nextImagePreviews[item.id] === item.imageUrl) {
      delete nextImagePreviews[item.id];
    }

    if (JSON.stringify(nextItem) !== JSON.stringify(item)) changed = true;
    return [nextItem];
  });

  if (!changed) return projectData;

  return withSyncedScheduleData(projectData, {
    timelineItems: removedLinkedRows
      ? recalculateTimelineTimes(nextTimelineItems, projectData.headerInfo?.firstShotTime)
      : nextTimelineItems,
    imagePreviews: nextImagePreviews,
  });
}

function syncScheduleIntoShotList(projectData: any) {
  projectData = normalizeProjectData(projectData);
  const shotListItems = projectData?.shotListData?.shotListItems;
  const timelineItems = projectData?.timelineItems;
  if (!Array.isArray(shotListItems) || !Array.isArray(timelineItems)) return projectData;

  const linkedTimelineByShotId = new Map<string, any[]>();
  const timelineByKey = new Map<string, any[]>();
  for (const item of timelineItems) {
    if (item?.type !== 'shot') continue;
    if (item.linkedShotId) {
      const group = linkedTimelineByShotId.get(item.linkedShotId) || [];
      group.push(item);
      linkedTimelineByShotId.set(item.linkedShotId, group);
    }

    const key = shotIdentityKey(item);
    if (key) {
      const group = timelineByKey.get(key) || [];
      group.push(item);
      timelineByKey.set(key, group);
    }
  }
  if (linkedTimelineByShotId.size === 0 && timelineByKey.size === 0) return projectData;

  let changed = false;
  const pickTimelineCandidate = (shot: any) => {
    const candidates = linkedTimelineByShotId.get(shot.id) || timelineByKey.get(shotIdentityKey(shot)) || [];
    if (candidates.length <= 1) return candidates[0];

    return candidates.find((item: any) => (
      String(item.sceneNumber ?? '') !== String(shot.sceneNumber ?? '') ||
      String(item.shotNumber ?? '') !== String(shot.shotNumber ?? '') ||
      JSON.stringify(item.shotSize ?? '') !== JSON.stringify(shot.shotSize ?? '') ||
      JSON.stringify(item.angle ?? '') !== JSON.stringify(shot.angle ?? '') ||
      JSON.stringify(item.movement ?? '') !== JSON.stringify(shot.movement ?? '') ||
      String(item.lens ?? '') !== String(shot.lens ?? '') ||
      String(hasOwn(item, 'shotDescription') ? (item.shotDescription ?? '') : (shot.description ?? '')) !== String(shot.description ?? '') ||
      String(item.notes ?? '') !== String(shot.notes ?? '') ||
      String(item.imageUrl ?? '') !== String(shot.imageUrl ?? '')
    )) || candidates[0];
  };

  const nextShotListItems = shotListItems.map((shot: any) => {
    const linkedItem = pickTimelineCandidate(shot);
    if (!linkedItem) return shot;

    const nextShot = {
      ...shot,
      sceneNumber: linkedItem.sceneNumber ?? '',
      shotNumber: linkedItem.shotNumber ?? '',
      shotSize: linkedItem.shotSize ?? '',
      angle: linkedItem.angle ?? '',
      movement: linkedItem.movement ?? '',
      lens: linkedItem.lens ?? '',
      description: hasOwn(linkedItem, 'shotDescription') ? (linkedItem.shotDescription ?? '') : (shot.description ?? ''),
      notes: linkedItem.notes ?? '',
      imageUrl: linkedItem.imageUrl ?? shot.imageUrl ?? '',
    };

    if (JSON.stringify(nextShot) !== JSON.stringify(shot)) changed = true;
    return nextShot;
  });

  if (!changed) return projectData;

  return {
    ...projectData,
    shotListData: {
      ...projectData.shotListData,
      shotListItems: nextShotListItems,
    },
  };
}

function syncLinkedShotData(projectData: any, incomingData: any) {
  let nextData = normalizeProjectData(projectData);
  if (hasOwn(incomingData, 'shotListData')) {
    nextData = syncShotListIntoSchedule(nextData);
  }
  if (hasOwn(incomingData, 'timelineItems')) {
    nextData = syncScheduleIntoShotList(nextData);
    nextData = syncShotListIntoSchedule(nextData);
  }
  return nextData;
}

class ProjectLockError extends Error {
  constructor(message = LOCKED_PROJECT_MESSAGE) {
    super(message);
    this.name = 'ProjectLockError';
  }
}

function isProjectLockError(err: unknown): err is ProjectLockError {
  return err instanceof ProjectLockError || (err instanceof Error && err.name === 'ProjectLockError');
}

function heartbeatToMillis(value: any): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

function isLockedByAnotherSession(projectData: any, sessionId: string, clientId: string, now = Date.now()) {
  const lockSessionId = projectData?.editingSessionId;
  if (!lockSessionId || lockSessionId === sessionId) return false;

  const lastHeartbeat = heartbeatToMillis(projectData.lastHeartbeat);
  const isFreshLock = lastHeartbeat > 0 && now - lastHeartbeat < LOCK_TTL_MS;
  if (!isFreshLock) return false;

  const lockClientId = projectData?.editingClientId;
  if (lockClientId && clientId && lockClientId === clientId) return false;

  return true;
}

function getOrCreateStoredId(storage: Storage, key: string) {
  let value = storage.getItem(key);
  if (!value) {
    value = generateId();
    storage.setItem(key, value);
  }
  return value;
}

function projectFromFirestore(projectId: string, projectData: any, fallbackProject?: any) {
  const data = normalizeProjectData(projectData.data || fallbackProject?.data || { scheduleData: null, shotListData: null });

  return {
    ...fallbackProject,
    id: projectId,
    name: projectData.name || fallbackProject?.name || 'Untitled Project',
    description: projectData.description || fallbackProject?.description || '',
    createdAt: projectData.createdAt || fallbackProject?.createdAt,
    updatedAt: projectData.updatedAt || fallbackProject?.updatedAt,
    ownerId: projectData.ownerId ?? fallbackProject?.ownerId,
    data
  };
}

async function acquireProjectLock(firestore: Firestore, project: any, sessionId: string, clientId: string) {
  const projectRef = doc(firestore, 'projects', project.id);

  return runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(projectRef);
    if (!snap.exists()) {
      throw new Error('Project not found.');
    }

    const projectData = snap.data();
    if (isLockedByAnotherSession(projectData, sessionId, clientId)) {
      throw new ProjectLockError();
    }

    transaction.set(projectRef, {
      editingSessionId: sessionId,
      editingClientId: clientId,
      lastHeartbeat: Date.now()
    }, { merge: true });

    return projectFromFirestore(project.id, projectData, project);
  });
}

async function refreshProjectLock(firestore: Firestore, projectId: string, sessionId: string, clientId: string) {
  const projectRef = doc(firestore, 'projects', projectId);

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(projectRef);
    if (!snap.exists()) {
      throw new Error('Project not found.');
    }

    const projectData = snap.data();
    if (projectData.editingSessionId !== sessionId) {
      const wasReclaimedOnSameDevice = projectData.editingClientId && projectData.editingClientId === clientId;
      throw new ProjectLockError(wasReclaimedOnSameDevice ? SAME_DEVICE_LOCK_RECLAIMED_MESSAGE : LOST_LOCK_MESSAGE);
    }

    transaction.set(projectRef, {
      editingClientId: clientId,
      lastHeartbeat: Date.now()
    }, { merge: true });
  });
}

async function releaseProjectLock(firestore: Firestore, projectId: string, sessionId: string, clientId: string) {
  const projectRef = doc(firestore, 'projects', projectId);

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(projectRef);
    if (!snap.exists()) return;

    const projectData = snap.data();
    if (projectData.editingSessionId !== sessionId) return;
    if (projectData.editingClientId !== clientId) return;

    transaction.set(projectRef, {
      editingSessionId: null,
      editingClientId: null,
      lastHeartbeat: 0
    }, { merge: true });
  });
}

async function saveProjectWithLock(
  firestore: Firestore,
  projectId: string,
  sessionId: string,
  clientId: string,
  payload: { name: string; updatedAt: string; data: any }
) {
  const projectRef = doc(firestore, 'projects', projectId);

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(projectRef);
    if (!snap.exists()) {
      throw new Error('Project not found.');
    }

    const projectData = snap.data();
    if (projectData.editingSessionId !== sessionId) {
      const wasReclaimedOnSameDevice = projectData.editingClientId && projectData.editingClientId === clientId;
      throw new ProjectLockError(wasReclaimedOnSameDevice ? SAME_DEVICE_LOCK_RECLAIMED_MESSAGE : LOST_LOCK_MESSAGE);
    }

    transaction.set(projectRef, {
      name: payload.name,
      updatedAt: payload.updatedAt,
      data: payload.data,
      editingClientId: clientId,
      lastHeartbeat: Date.now()
    }, { merge: true });
  });
}

/**
 * The main application component that handles view routing between the
 * project dashboard and the different editors, integrated with Firebase Firestore.
 */
function App() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [visitorId, setVisitorId] = useState<string>('');
  const [loadingProject, setLoadingProject] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [sharedProjectChoice, setSharedProjectChoice] = useState<any | null>(null);

  const sessionIdRef = useRef<string>('');
  const clientIdRef = useRef<string>('');

  const ensureLockIdentity = useCallback(() => {
    if (typeof window === 'undefined') {
      if (!sessionIdRef.current) sessionIdRef.current = generateId();
      if (!clientIdRef.current) clientIdRef.current = generateId();
      return { sessionId: sessionIdRef.current, clientId: clientIdRef.current };
    }

    if (!clientIdRef.current) {
      clientIdRef.current = getOrCreateStoredId(window.localStorage, CLIENT_ID_STORAGE_KEY);
    }
    if (!sessionIdRef.current) {
      sessionIdRef.current = getOrCreateStoredId(window.sessionStorage, SESSION_ID_STORAGE_KEY);
    }

    return { sessionId: sessionIdRef.current, clientId: clientIdRef.current };
  }, []);

  // 1. Initial configuration, visitor setup, and route parsing
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load or generate visitorId
    let vid = localStorage.getItem('mb_visitor_id');
    if (!vid) {
      vid = generateId();
      localStorage.setItem('mb_visitor_id', vid);
    }
    setVisitorId(vid);
    ensureLockIdentity();

    // If Firebase configuration is not valid, run in LocalStorage mode
    if (!isFirebaseEnabled || !db) return;
    const firestore = db;

    const path = pathname;
    const match = path.match(/^\/project\/([^/]+)/);
    if (match && match[1]) {
      const projId = match[1];

      const fetchProj = async () => {
        setLoadingProject(true);
        setLockError(null);
        try {
          const docSnap = await getDoc(doc(firestore, 'projects', projId));
          if (docSnap.exists()) {
            const pData = docSnap.data();
            const proj = projectFromFirestore(projId, pData);

            // Save to shared project IDs list in localStorage so it appears in the dashboard
            if (typeof window !== 'undefined') {
              try {
                const sharedIds = JSON.parse(localStorage.getItem('mb_shared_project_ids') || '[]');
                if (!sharedIds.includes(projId)) {
                  sharedIds.push(projId);
                  localStorage.setItem('mb_shared_project_ids', JSON.stringify(sharedIds));
                }
              } catch (err) {
                console.error('Failed to update shared projects list:', err);
              }
            }

            setSharedProjectChoice(proj);
          } else {
            alert('Shared project not found.');
            router.replace('/');
            setCurrentView('dashboard');
          }
        } catch (err) {
          console.error('Error fetching project:', err);
          alert('Failed to load shared project.');
          router.replace('/');
          setCurrentView('dashboard');
        } finally {
          setLoadingProject(false);
        }
      };

      fetchProj();
    }
  }, [ensureLockIdentity, pathname, router]);

  // 2. Active editing session heartbeat lock
  useEffect(() => {
    if (!isFirebaseEnabled || !db) return; // Exit if firebase is not configured
    if (!selectedProject) return;
    if (loadingProject) return;

    const firestore = db;
    let cancelled = false;
    const projectId = selectedProject.id;
    const { sessionId, clientId } = ensureLockIdentity();

    const interval = setInterval(async () => {
      try {
        await refreshProjectLock(firestore, projectId, sessionId, clientId);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to update lock heartbeat:', err);
        setSelectedProject(null);
        setCurrentView('dashboard');
        setLockError(isProjectLockError(err) ? err.message : LOST_LOCK_MESSAGE);
      }
    }, LOCK_HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      releaseProjectLock(firestore, projectId, sessionId, clientId).catch(err => console.error('Failed to release lock:', err));
    };
  }, [selectedProject?.id, loadingProject, ensureLockIdentity]);

  useEffect(() => {
    if (!isFirebaseEnabled || !db) return;
    if (!selectedProject?.id) return;

    const firestore = db;
    const projectId = selectedProject.id;

    const releaseOnPageExit = () => {
      const { sessionId, clientId } = ensureLockIdentity();
      releaseProjectLock(firestore, projectId, sessionId, clientId).catch(() => {
        // Best-effort only; same-device reclaim and TTL are the durable fallback.
      });
    };

    window.addEventListener('pagehide', releaseOnPageExit);
    window.addEventListener('beforeunload', releaseOnPageExit);
    return () => {
      window.removeEventListener('pagehide', releaseOnPageExit);
      window.removeEventListener('beforeunload', releaseOnPageExit);
    };
  }, [selectedProject?.id, ensureLockIdentity]);

  // Callback to switch to an editor view when a project is selected
  const handleSelectProject = useCallback(async (project: any, editorType: EditorType) => {
    let projectToOpen = project;

    if (isFirebaseEnabled && db) {
      const firestore = db;
      const { sessionId, clientId } = ensureLockIdentity();
      setLoadingProject(true);
      setLockError(null);

      try {
        projectToOpen = await acquireProjectLock(firestore, project, sessionId, clientId);
      } catch (err) {
        console.error('Failed to acquire project lock:', err);
        setSelectedProject(null);
        setCurrentView('dashboard');
        setLockError(isProjectLockError(err) ? err.message : 'Unable to open this project for editing.');
        setLoadingProject(false);
        return false;
      }

      setLoadingProject(false);
    }

    setSelectedProject(projectToOpen);
    if (editorType === 'schedule') {
      setCurrentView('scheduleEditor');
    } else if (editorType === 'shotlist') {
      setCurrentView('shotListEditor');
    } else if (editorType === 'breakdown') {
      setCurrentView('scriptBreakdown');
    }
    return true;
  }, [ensureLockIdentity]);

  // Helper to recursively sanitize objects for Firestore to prevent invalid entity errors
  function sanitizeForFirestore(val: any): any {
    if (val === undefined) return null;
    if (val === null) return null;

    // Perform JSON round-trip to strip any non-serializable properties, functions, classes
    let plain: any;
    try {
      plain = JSON.parse(JSON.stringify(val));
    } catch (err) {
      console.error('Failed to stringify data for Firestore:', err);
      return null;
    }

    // Now recursively strip undefined, NaN, or oversized base64 strings if necessary
    function clean(obj: any): any {
      if (obj === null || obj === undefined) return null;
      if (typeof obj === 'number') {
        if (isNaN(obj) || !isFinite(obj)) return null;
        return obj;
      }
      if (typeof obj === 'string') {
        // Strip extremely long strings (like large base64) to prevent Firestore size limit issues
        if (obj.length > 800000) return '';
        return obj;
      }
      if (typeof obj === 'boolean') return obj;
      if (Array.isArray(obj)) {
        return obj.map(clean);
      }
      if (typeof obj === 'object') {
        const result: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
          result[key] = clean(obj[key]);
        }
        return result;
      }
      return null;
    }

    return clean(plain);
  }

  // Callback to save project data from an editor to Firestore (or LocalStorage fallback)
  const handleSaveProject = useCallback(async (data: any) => {
    if (!selectedProject) return;

    const mergedData = normalizeProjectData({
      ...selectedProject.data,
      ...data
    });
    const updatedData = syncLinkedShotData(mergedData, data);

    const projectName = data.headerInfo?.projectTitle || data.scheduleData?.headerInfo?.projectTitle || selectedProject.name;
    const updatedAt = new Date().toISOString();

    const updatedSelectedProject = {
      ...selectedProject,
      data: updatedData,
      name: projectName,
      updatedAt
    };

    if (isFirebaseEnabled && db) {
      const firestore = db;
      const cleanData = sanitizeForFirestore(updatedData);
      const { sessionId, clientId } = ensureLockIdentity();
      try {
        await saveProjectWithLock(firestore, selectedProject.id, sessionId, clientId, {
          name: projectName,
          updatedAt,
          data: cleanData
        });
        setSelectedProject((prev: any) => (
          prev?.id === selectedProject.id ? updatedSelectedProject : prev
        ));
      } catch (err) {
        console.error('Failed to save project to Firestore. CleanData:', cleanData, 'Error:', err);
        if (isProjectLockError(err)) {
          setSelectedProject(null);
          setCurrentView('dashboard');
          setLockError(err.message);
        }
        throw err;
      }
    } else {
      setSelectedProject(updatedSelectedProject);
      // LocalStorage fallback
      const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
      // If it's a new unsaved project in local storage, add it
      const projectExists = projects.some((p: any) => p.id === selectedProject.id);
      let updatedProjects;
      if (projectExists) {
        updatedProjects = projects.map((p: any) => p.id === selectedProject.id ? updatedSelectedProject : p);
      } else {
        updatedProjects = [updatedSelectedProject, ...projects];
      }
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    }
  }, [selectedProject, ensureLockIdentity]);

  // Callback to return to the dashboard from an editor
  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedProject(null);
    router.replace('/');
  }, [router]);

  // Effect to load custom fonts for the application
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    document.body.style.fontFamily = "'Plus Jakarta Sans', 'IBM Plex Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif";
  }, []);

  return (
    <>
      {loadingProject && !selectedProject && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'var(--bg-base)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px'
        }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Preparing project access...</span>
        </div>
      )}

      {loadingProject && selectedProject && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'auto'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: '12px', padding: '14px 18px', boxShadow: 'var(--shadow-lg)'
          }}>
            <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Acquiring edit lock...
            </span>
          </div>
        </div>
      )}

      {lockError && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-amber)', marginBottom: '8px' }}>
              Project is Locked
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              {lockError}
            </p>
            <button
              onClick={() => {
                setLockError(null);
                setSelectedProject(null);
                router.replace('/');
                setCurrentView('dashboard');
              }}
              className="btn-primary"
              style={{ width: '100%', height: '40px', justifyContent: 'center' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {sharedProjectChoice && (
        <div className="modal-overlay" onClick={() => {
          setSharedProjectChoice(null);
          router.replace('/');
          setCurrentView('dashboard');
        }}>
          <div
            className="premium-modal animate-scale-in"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', textAlign: 'left' }}>
              <Folder className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>Open Shared Project</h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', textAlign: 'left', marginLeft: '2px' }}>
              Choose how to open <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>"{sharedProjectChoice.name}"</span>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '4px' }}>
              <button
                onClick={async () => {
                  setSharedProjectChoice(null);
                  const opened = await handleSelectProject(sharedProjectChoice, 'shotlist');
                  if (!opened) router.replace('/');
                }}
                className="option-card shotlist"
              >
                <div className="option-card-icon-wrap">
                  <List className="w-5 h-5" />
                </div>
                <div className="option-card-title">Shot List</div>
                <div className="option-card-sub">Organize your shots</div>
              </button>

              <button
                onClick={async () => {
                  setSharedProjectChoice(null);
                  const opened = await handleSelectProject(sharedProjectChoice, 'schedule');
                  if (!opened) router.replace('/');
                }}
                className="option-card schedule"
              >
                <div className="option-card-icon-wrap">
                  <Video className="w-5 h-5" />
                </div>
                <div className="option-card-title">Schedule</div>
                <div className="option-card-sub">Plan your shooting days</div>
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSharedProjectChoice(null);
                  router.replace('/');
                  setCurrentView('dashboard');
                }}
                className="btn-ghost"
              >
                Cancel & Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'dashboard' && (
        <ProjectDashboard
          onSelectProject={handleSelectProject}
          onCreateProject={() => { }}
        />
      )}

      {currentView === 'scheduleEditor' && selectedProject && (
        <ShootingScheduleEditor
          project={selectedProject}
          onBack={handleBackToDashboard}
          onSave={handleSaveProject}
        />
      )}

      {currentView === 'shotListEditor' && selectedProject && (
        <ShotListEditor
          project={selectedProject}
          onBack={handleBackToDashboard}
          onSave={handleSaveProject}
        />
      )}



      {selectedProject && (
        <BottomNav
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'dashboard') {
              handleBackToDashboard();
            } else {
              setCurrentView(view);
            }
          }}
          projectName={selectedProject.name}
        />
      )}
    </>
  );
}

export default App;
