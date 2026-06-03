'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Folder, List, Video } from 'lucide-react';
import ProjectDashboard from '@/components/ProjectDashboard';
import ShootingScheduleEditor from '@/components/ShootingScheduleEditor';
import ShotListEditor from '@/components/ShotlistEditor';
import { db, isFirebaseEnabled } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { generateId } from '@/utils/id';

/**
 * The main application component that handles view routing between the
 * project dashboard and the different editors, integrated with Firebase Firestore.
 */
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [visitorId, setVisitorId] = useState<string>('');
  const [loadingProject, setLoadingProject] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [sharedProjectChoice, setSharedProjectChoice] = useState<any | null>(null);

  const sessionId = useRef(generateId()).current;

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

    // If Firebase configuration is not valid, run in LocalStorage mode
    if (!isFirebaseEnabled || !db) return;

    const path = window.location.pathname;
    const match = path.match(/^\/project\/([^/]+)/);
    if (match && match[1]) {
      const projId = match[1];

      const fetchProj = async () => {
        setLoadingProject(true);
        setLockError(null);
        try {
          const docSnap = await getDoc(doc(db, 'projects', projId));
          if (docSnap.exists()) {
            const pData = docSnap.data();

            // Check if someone else is currently editing (within 40 seconds lock)
            const isLocked = pData.editingSessionId &&
              pData.editingSessionId !== sessionId &&
              pData.lastHeartbeat &&
              (Date.now() - pData.lastHeartbeat < 40000);

            if (isLocked) {
              setLockError('Someone else is currently editing this project. Access is temporarily locked to prevent data conflicts.');
              return;
            }

            const proj = {
              id: projId,
              name: pData.name,
              description: pData.description || '',
              createdAt: pData.createdAt,
              updatedAt: pData.updatedAt,
              data: pData.data || { scheduleData: null, shotListData: null }
            };

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
            window.history.pushState({}, '', '/');
            setCurrentView('dashboard');
          }
        } catch (err) {
          console.error('Error fetching project:', err);
          alert('Failed to load shared project.');
          window.history.pushState({}, '', '/');
          setCurrentView('dashboard');
        } finally {
          setLoadingProject(false);
        }
      };

      fetchProj();
    }
  }, [sessionId]);

  // 2. Active editing session heartbeat lock
  useEffect(() => {
    if (!isFirebaseEnabled || !db) return; // Exit if firebase is not configured
    if (!selectedProject || currentView === 'dashboard') return;

    const acquireLock = async () => {
      try {
        await setDoc(doc(db, 'projects', selectedProject.id), {
          editingSessionId: sessionId,
          lastHeartbeat: Date.now()
        }, { merge: true });
      } catch (err) {
        console.error('Failed to acquire editor lock:', err);
      }
    };
    acquireLock();

    const interval = setInterval(async () => {
      try {
        await setDoc(doc(db, 'projects', selectedProject.id), {
          editingSessionId: sessionId,
          lastHeartbeat: Date.now()
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update lock heartbeat:', err);
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      setDoc(doc(db, 'projects', selectedProject.id), {
        editingSessionId: null,
        lastHeartbeat: 0
      }, { merge: true }).catch(err => console.error('Failed to release lock:', err));
    };
  }, [selectedProject?.id, currentView, sessionId]);

  // Callback to switch to an editor view when a project is selected
  const handleSelectProject = useCallback((project, editorType) => {
    setSelectedProject(project);
    if (editorType === 'schedule') {
      setCurrentView('scheduleEditor');
    } else if (editorType === 'shotlist') {
      setCurrentView('shotListEditor');
    }
  }, []);

  // Helper to recursively sanitize objects for Firestore to prevent invalid entity errors
  function sanitizeForFirestore(val: any): any {
    if (val === undefined) return null;
    if (val === null) return null;
    if (typeof val === 'number') {
      if (isNaN(val) || !isFinite(val)) return null;
      return val;
    }
    if (typeof val === 'boolean' || typeof val === 'string') return val;
    if (val instanceof Date) return val.toISOString();
    if (Array.isArray(val)) return val.map(sanitizeForFirestore);
    if (typeof val === 'object') {
      const cleanObj: Record<string, any> = {};
      for (const key of Object.keys(val)) {
        const cleaned = sanitizeForFirestore(val[key]);
        if (cleaned !== undefined) {
          cleanObj[key] = cleaned;
        }
      }
      return cleanObj;
    }
    return null;
  }

  // Callback to save project data from an editor to Firestore (or LocalStorage fallback)
  const handleSaveProject = useCallback(async (data) => {
    if (!selectedProject) return;

    const updatedData = {
      ...selectedProject.data,
      ...data
    };

    const projectName = data.headerInfo?.projectTitle || data.scheduleData?.headerInfo?.projectTitle || selectedProject.name;
    const updatedAt = new Date().toISOString();

    const updatedSelectedProject = {
      ...selectedProject,
      data: updatedData,
      name: projectName,
      updatedAt
    };

    setSelectedProject(updatedSelectedProject);

    if (isFirebaseEnabled && db) {
      const cleanData = sanitizeForFirestore(updatedData);
      try {
        await setDoc(doc(db, 'projects', selectedProject.id), {
          name: projectName,
          updatedAt,
          data: cleanData
        }, { merge: true });
      } catch (err) {
        console.error('Failed to save project to Firestore. CleanData:', cleanData, 'Error:', err);
      }
    } else {
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
  }, [selectedProject]);

  // Callback to return to the dashboard from an editor
  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedProject(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  }, []);

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
      {loadingProject && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'var(--bg-base)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px'
        }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Loading shared project...</span>
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
                window.history.pushState({}, '', '/');
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
          window.history.pushState({}, '', '/');
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
              <button
                onClick={() => {
                  setSelectedProject(sharedProjectChoice);
                  setCurrentView('shotListEditor');
                  setSharedProjectChoice(null);
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
                onClick={() => {
                  setSelectedProject(sharedProjectChoice);
                  setCurrentView('scheduleEditor');
                  setSharedProjectChoice(null);
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
                  window.history.pushState({}, '', '/');
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
    </>
  );
}

export default App;
