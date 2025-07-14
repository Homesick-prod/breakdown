
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics'; // Import Analytics type
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAlFF0N610dY2T62NNf4TwelDdTsXaYK5A",
  authDomain: "breakdown-e32f9.firebaseapp.com",
  projectId: "breakdown-e32f9",
  storageBucket: "breakdown-e32f9.firebasestorage.app",
  messagingSenderId: "37630762688",
  appId: "1:37630762688:web:125c9d80862365fb971725",
  measurementId: "G-602XYEB8NZ"
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