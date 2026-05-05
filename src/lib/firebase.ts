import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Only log if it's a genuine configuration issue, not a transient network issue
    if (error instanceof Error && error.message.includes('permission')) {
      console.error("Firebase configuration issue detected:", error.message);
    }
    // Ignore transient network issues during startup
  }
}
testConnection();
