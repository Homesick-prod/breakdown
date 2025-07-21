
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics'; // Import Analytics type
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQ2M-umjt9KpJ9jCwkaYEpa_E7UY4kGDQ",
  authDomain: "shootingscheduleeditor.firebaseapp.com",
  projectId: "shootingscheduleeditor",
  storageBucket: "shootingscheduleeditor.firebasestorage.app",
  messagingSenderId: "732747773766",
  appId: "1:732747773766:web:222c57ee127fa108f65747",
  measurementId: "G-ZN9Z2XLPMG"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Conditionally initialize Firebase Analytics
// We declare it as 'let' and type it as 'Analytics | undefined' because it might not be initialized
let analytics: Analytics | undefined;

// Use isSupported() to check environment before trying to get Analytics
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log("Firebase Analytics initialized successfully.");
  } else {
    console.warn("Firebase Analytics is not supported in this environment (likely server-side).");
  }
}).catch(error => {
  console.error("Error checking Firebase Analytics support:", error);
});

// Export other Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export the analytics instance
// It might be undefined if not supported or not yet resolved
export { analytics };