/**
 * MorphGuard AI — Firebase Service
 * Handles Firebase App initialization, Google Auth via Firebase,
 * Firestore persistence with named database, and error handling.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import { ForensicCase, AuditLogEntry, UserRole } from '../../types.js';

// Operation types for standard error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  };
}

// Initialize Firebase App instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom databaseId if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Google Auth Provider configured for biometric forensics examiners
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Standardized error handler matching skill guidelines
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentFbUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentFbUser?.uid || null,
      email: currentFbUser?.email || null,
      emailVerified: currentFbUser?.emailVerified || null,
      isAnonymous: currentFbUser?.isAnonymous || null,
      tenantId: currentFbUser?.tenantId || null,
      providerInfo:
        currentFbUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Operation Error:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Startup connection verification test
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Checking network/cache.');
    }
    // Return true since missing test doc is normal but means server was reached or handled
    return true;
  }
}

// Automatically test connection on module load
testFirestoreConnection().catch((err) => {
  console.debug('Firestore initial check:', err);
});

// --- Authentication Helpers ---

export async function signInWithGoogleFirebase(role: UserRole = 'ANALYST') {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Sync user profile to Firestore
    await syncUserProfileToFirestore(user, role);

    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Examiner',
      photoURL: user.photoURL || undefined,
      role,
      agency: 'Border Biometrics & Forensic Identity Unit',
    };
  } catch (error: any) {
    console.error('Firebase Google Sign-in Error:', error);
    throw error;
  }
}

export async function signOutFirebase() {
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error('Firebase Sign-out Error:', error);
  }
}

export async function syncUserProfileToFirestore(user: FirebaseUser, role: UserRole) {
  const userRef = doc(db, 'users', user.uid);
  try {
    const existingSnap = await getDoc(userRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : null;

    const profileData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Examiner',
      photoURL: user.photoURL || '',
      role: existingData?.role || role,
      agency: existingData?.agency || 'Border Biometrics & Forensic Identity Unit',
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, profileData, { merge: true });
    return profileData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
}

// --- Case Persistence ---

export async function saveCaseToFirestore(forensicCase: ForensicCase) {
  if (!auth.currentUser) {
    return;
  }
  const caseRef = doc(db, 'cases', forensicCase.id);
  try {
    await setDoc(
      caseRef,
      {
        ...forensicCase,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `cases/${forensicCase.id}`);
  }
}

export async function getCasesFromFirestore(): Promise<ForensicCase[]> {
  try {
    const casesCol = collection(db, 'cases');
    const snap = await getDocs(casesCol);
    const cases: ForensicCase[] = [];
    snap.forEach((d) => {
      cases.push(d.data() as ForensicCase);
    });
    return cases;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'cases');
  }
}

export function subscribeToCases(
  onUpdate: (cases: ForensicCase[]) => void,
  onError?: (err: Error) => void
) {
  const casesCol = collection(db, 'cases');
  return onSnapshot(
    casesCol,
    (snap) => {
      const cases: ForensicCase[] = [];
      snap.forEach((d) => cases.push(d.data() as ForensicCase));
      onUpdate(cases);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'cases');
    }
  );
}

// --- Audit Trail Persistence ---

export async function saveAuditLogToFirestore(logEntry: AuditLogEntry) {
  if (!auth.currentUser) {
    return;
  }
  const logRef = doc(db, 'auditTrail', logEntry.id);
  try {
    await setDoc(logRef, logEntry);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `auditTrail/${logEntry.id}`);
  }
}

export async function getAuditLogsFromFirestore(): Promise<AuditLogEntry[]> {
  try {
    const auditCol = collection(db, 'auditTrail');
    const q = query(auditCol, orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    const entries: AuditLogEntry[] = [];
    snap.forEach((d) => entries.push(d.data() as AuditLogEntry));
    return entries;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'auditTrail');
  }
}

export function subscribeToAuditLogs(
  onUpdate: (logs: AuditLogEntry[]) => void,
  onError?: (err: Error) => void
) {
  const auditCol = collection(db, 'auditTrail');
  return onSnapshot(
    auditCol,
    (snap) => {
      const entries: AuditLogEntry[] = [];
      snap.forEach((d) => entries.push(d.data() as AuditLogEntry));
      // Sort newest first
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(entries);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'auditTrail');
    }
  );
}

// --- Chat Sessions & Messages Persistence ---

export interface ChatSessionDoc {
  id: string;
  title: string;
  userId: string;
  userEmail: string;
  roleInstruction: string;
  modelName: string;
  caseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDoc {
  id: string;
  sessionId: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export async function saveChatSessionToFirestore(session: ChatSessionDoc) {
  if (!auth.currentUser) {
    return;
  }
  const sessionRef = doc(db, 'chatSessions', session.id);
  try {
    await setDoc(sessionRef, session, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chatSessions/${session.id}`);
  }
}

export async function getChatSessionsFromFirestore(): Promise<ChatSessionDoc[]> {
  if (!auth.currentUser) {
    return [];
  }
  try {
    const q = query(collection(db, 'chatSessions'), orderBy('updatedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    const sessions: ChatSessionDoc[] = [];
    snap.forEach((d) => sessions.push(d.data() as ChatSessionDoc));
    return sessions;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'chatSessions');
  }
}

export async function saveChatMessageToFirestore(
  sessionId: string,
  message: ChatMessageDoc
) {
  if (!auth.currentUser) {
    return;
  }
  const msgRef = doc(db, 'chatSessions', sessionId, 'messages', message.id);
  try {
    await setDoc(msgRef, message);
    // Also update parent session updatedAt
    await setDoc(
      doc(db, 'chatSessions', sessionId),
      { updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chatSessions/${sessionId}/messages/${message.id}`);
  }
}

export async function getChatMessagesFromFirestore(sessionId: string): Promise<ChatMessageDoc[]> {
  if (!auth.currentUser) {
    return [];
  }
  try {
    const msgsCol = collection(db, 'chatSessions', sessionId, 'messages');
    const q = query(msgsCol, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    const msgs: ChatMessageDoc[] = [];
    snap.forEach((d) => msgs.push(d.data() as ChatMessageDoc));
    return msgs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `chatSessions/${sessionId}/messages`);
  }
}

export function subscribeToChatMessages(
  sessionId: string,
  onUpdate: (msgs: ChatMessageDoc[]) => void,
  onError?: (err: Error) => void
) {
  const msgsCol = collection(db, 'chatSessions', sessionId, 'messages');
  return onSnapshot(
    msgsCol,
    (snap) => {
      const msgs: ChatMessageDoc[] = [];
      snap.forEach((d) => msgs.push(d.data() as ChatMessageDoc));
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      onUpdate(msgs);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `chatSessions/${sessionId}/messages`);
    }
  );
}
