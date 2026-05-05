import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { User } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const fetchUserData = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  try {
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { id: uid, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'users/' + uid);
    return null;
  }
};

export const createUserData = async (uid: string, userData: Omit<User, 'id'>) => {
  const userRef = doc(db, 'users', uid);
  try {
    await setDoc(userRef, userData);
    return { id: uid, ...userData } as User;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'users/' + uid);
  }
};

export const deleteUserData = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  try {
    await deleteDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'users/' + uid);
  }
};

export const findUserByNameAndPass = async (name: string, passcode: string): Promise<User | null> => {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef, 
    where("name", "==", name),
    where("passcode", "==", passcode)
  );
  
  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return null;
  }
};

export const fetchAllUsers = async (): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("role", "==", "user"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
};

const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

export function saveUserDataDebounced(uid: string, data: any) {
  clearTimeout(timeouts.get(uid));

  timeouts.set(uid, setTimeout(async () => {
    timeouts.delete(uid);

    if (!data || !Array.isArray(data.statements)) {
      console.warn("Invalid data, not saving");
      return;
    }

    const removeUndefined = (obj: any): any => {
      if (obj === undefined) return null;
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(removeUndefined);
      
      const newObj: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          newObj[key] = removeUndefined(obj[key]);
        }
      }
      return newObj;
    };

    const cleanData = removeUndefined(data);

    const userRef = doc(db, "users", uid);

    let retries = 0;
    const attemptSave = async () => {
      try {
        await updateDoc(userRef, { data: cleanData });
        console.log("Saved successfully for", uid);
      } catch (err: any) {
        if (err.code === 'unavailable' && retries < 3) {
          retries++;
          setTimeout(attemptSave, 1000 * retries); // exponential backoff
        } else {
          handleFirestoreError(err, OperationType.UPDATE, 'users/' + uid);
        }
      }
    };

    attemptSave();
  }, 500));
}
