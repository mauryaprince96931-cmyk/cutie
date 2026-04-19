import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { debounce } from 'lodash';
import { User } from '../types';

export const fetchUserData = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const data = userDoc.data() as User;
    console.log("LOAD:", {
      endings: data.data?.endings,
      fallbackEnding: data.data?.fallbackEnding,
      entryMessage: data.data?.entryMessage
    });
    return { id: uid, ...data } as User;
  }
  return null;
};

export const deleteUserData = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  await deleteDoc(userRef);
};

export const findUserByNameAndPass = async (name: string, passcode: string): Promise<User | null> => {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef, 
    where("name", "==", name),
    where("passcode", "==", passcode)
  );
  
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }
  return null;
};

export const fetchAllUsers = async (): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("role", "==", "user"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const createUserData = async (uid: string, userData: Omit<User, 'id'>) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, userData);
  return { id: uid, ...userData } as User;
};

export const saveUserDataDebounced = debounce(async (uid: string, data: User['data']) => {
  if (!data || !data.statements) {
    console.warn("Blocked: missing base data");
    return;
  }
  
  if (!Array.isArray(data.endings)) {
    console.warn("Blocked: invalid endings");
    return;
  }

  if (!data.entryMessage || !data.entryMessage.title) {
    console.warn("Blocked: invalid entryMessage");
    return;
  }

  console.log("UNIFIED SAVE:", data);
  
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { data });
}, 500);

export const saveUserDataImmediate = async (uid: string, data: User['data']) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { data });
};
