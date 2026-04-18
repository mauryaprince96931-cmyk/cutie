import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { debounce } from 'lodash';
import { User } from '../types';

export const fetchUserData = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    return { id: uid, ...userDoc.data() } as User;
  }
  return null;
};

export const saveUserDataDebounced = debounce(async (uid: string, data: User['data']) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { data });
}, 500);

export const saveUserDataImmediate = async (uid: string, data: User['data']) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { data });
};
