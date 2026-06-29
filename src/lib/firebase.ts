import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, initializeFirestore, collection, addDoc } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'shootingscheduleeditor',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check if credentials are valid
export const isFirebaseEnabled = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey.startsWith('AIzaSy') &&
  firebaseConfig.apiKey.trim() !== '';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

if (isFirebaseEnabled) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true
    });
    storage = getStorage(app);
    auth = getAuth(app);

    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      });
    }
  } catch (err) {
    console.error('Failed to initialize Firebase SDK:', err);
  }
} else {
  if (typeof window !== 'undefined') {
    console.warn('Firebase is disabled/not configured. LocalStorage fallback mode is active.');
  }
}

export async function uploadImageToStorage(path: string, file: File): Promise<string> {
  if (!storage) throw new Error('Firebase Storage is not enabled');
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

export async function deleteImageFromStorage(url: string): Promise<void> {
  if (!storage || !url || !url.startsWith('http')) return;
  const storageRef = ref(storage, url);
  await deleteObject(storageRef);
}

export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error('Firebase Auth is not enabled');
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

import { logEvent as firebaseLogEvent } from 'firebase/analytics';

export function logAnalyticsEvent(eventName: string, params?: Record<string, any>) {
  if (analytics) {
    try {
      firebaseLogEvent(analytics, eventName, params);
    } catch (err) {
      console.error('Failed to log analytics event:', err);
    }
  }
}

export async function logActivity(userId: string, eventType: string, extraParams?: Record<string, any>) {
  if (!db) return;
  try {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';
    
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      timestamp: new Date().toISOString(),
      eventType,
      device: {
        platform,
        userAgent
      },
      ...extraParams
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

export { app, db, analytics, auth, storage };
