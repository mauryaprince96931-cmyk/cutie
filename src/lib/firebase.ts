import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// --- Safety Logic for Vercel/Production ---
export const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

if (!isConfigValid) {
  console.error("❌ Firebase Configuration Missing! App will not function correctly.");
  console.warn("Please add VITE_FIREBASE_API_KEY and other vars to your environment/Vercel settings.");
}

export const app = isConfigValid ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null as unknown as FirebaseApp;
export const auth = isConfigValid ? getAuth(app) : null as unknown as Auth;
export const db = isConfigValid ? getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID) : null as unknown as Firestore;
