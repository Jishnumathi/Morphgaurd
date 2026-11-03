/**
 * MorphGuard AI — Server-Side Firestore Persistence Engine
 * Connects Express backend to the provisioned Firestore database
 * (ai-studio-morphguardai-31a8cae7-65d4-4c77-aa39-da62463466bc)
 * with automatic schema sanitization, size guards, and fallback resilience.
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  Firestore,
} from 'firebase/firestore';
import { ForensicCase, AuditLogEntry, UserRole } from '../../types.js';

let dbInstance: Firestore | null = null;
let isInitialized = false;

function initServerFirestore(): Firestore | null {
  if (dbInstance) return dbInstance;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('firebase-applet-config.json not found on server root.');
      return null;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const app = !getApps().length ? initializeApp(config, 'morphguard-server') : (getApps().find(a => a.name === 'morphguard-server') || getApp());
    const db = config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
    dbInstance = db;
    isInitialized = true;
    console.log(`[ServerDb] Connected to Firestore database: ${config.firestoreDatabaseId || 'default'}`);
    return dbInstance;
  } catch (err) {
    console.warn('[ServerDb] Firestore server initialization notice:', err);
    return null;
  }
}

/**
 * Sanitizes a ForensicCase object to strictly adhere to Firestore's 1MB limit.
 * Large base64 image strings and dense pixel maps are excluded or downscaled.
 */
function sanitizeCaseForFirestore(target: ForensicCase): Record<string, any> {
  const safe: Record<string, any> = { ...target };

  // If imageUrl is a raw high-resolution base64 data URL, ensure it doesn't exceed Firestore doc limit
  if (safe.imageUrl && typeof safe.imageUrl === 'string' && safe.imageUrl.length > 150000) {
    // Keep a lightweight preview stub or existing thumbnail in Firestore
    if (!safe.thumbnailUrl) {
      safe.thumbnailUrl = safe.imageUrl.substring(0, 500); // placeholder or reference
    }
    // Remove heavy raw multi-megabyte base64 from Firestore document
    delete safe.imageUrl;
  }

  // Strip excessive heatmap arrays if present in results
  if (safe.results) {
    const r = { ...safe.results };
    if (r.anomalyHeatmapDataUrl && r.anomalyHeatmapDataUrl.length > 100000) {
      delete r.anomalyHeatmapDataUrl;
    }
    if (r.noise?.residualMapDataUrl && r.noise.residualMapDataUrl.length > 100000) {
      r.noise = { ...r.noise, residualMapDataUrl: undefined };
    }
    if (r.frequency?.fftSpectrumDataUrl && r.frequency.fftSpectrumDataUrl.length > 100000) {
      r.frequency = { ...r.frequency, fftSpectrumDataUrl: undefined };
    }
    if (r.compression?.elaMapDataUrl && r.compression.elaMapDataUrl.length > 100000) {
      r.compression = { ...r.compression, elaMapDataUrl: undefined };
    }
    if (r.edge?.edgeMapDataUrl && r.edge.edgeMapDataUrl.length > 100000) {
      r.edge = { ...r.edge, edgeMapDataUrl: undefined };
    }
    safe.results = r;
  }

  // Ensure riskLevel is also duplicated at root for blueprint compliance
  if (target.results?.summary?.riskLevel && !safe.riskLevel) {
    safe.riskLevel = target.results.summary.riskLevel;
  }
  if (!safe.imageHash && target.imageHashSha256) {
    safe.imageHash = target.imageHashSha256;
  }

  safe.updatedAt = new Date().toISOString();
  return safe;
}

/**
 * Persists a case document to Firestore asynchronously
 */
export async function persistCaseToFirestore(forensicCase: ForensicCase): Promise<boolean> {
  const db = initServerFirestore();
  if (!db) return false;
  try {
    const payload = sanitizeCaseForFirestore(forensicCase);
    const caseRef = doc(db, 'cases', forensicCase.id);
    await setDoc(caseRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error(`[ServerDb] Failed to persist case ${forensicCase.id} to Firestore:`, err);
    return false;
  }
}

/**
 * Loads all cases from Firestore
 */
export async function fetchCasesFromFirestore(): Promise<ForensicCase[]> {
  const db = initServerFirestore();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'cases'));
    const cases: ForensicCase[] = [];
    snap.forEach((d) => {
      const data = d.data() as ForensicCase;
      cases.push(data);
    });
    return cases;
  } catch (err) {
    console.warn('[ServerDb] Notice fetching cases from Firestore:', err);
    return [];
  }
}

/**
 * Deletes a case document from Firestore
 */
export async function deleteCaseFromFirestore(caseId: string): Promise<boolean> {
  const db = initServerFirestore();
  if (!db) return false;
  try {
    await deleteDoc(doc(db, 'cases', caseId));
    return true;
  } catch (err) {
    console.error(`[ServerDb] Failed to delete case ${caseId} from Firestore:`, err);
    return false;
  }
}

/**
 * Appends an audit log entry to Firestore
 */
export async function persistAuditLogToFirestore(entry: AuditLogEntry): Promise<boolean> {
  const db = initServerFirestore();
  if (!db) return false;
  try {
    const logRef = doc(db, 'auditTrail', entry.id);
    await setDoc(logRef, entry);
    return true;
  } catch (err) {
    console.error(`[ServerDb] Failed to persist audit log ${entry.id} to Firestore:`, err);
    return false;
  }
}

/**
 * Fetches recent audit logs from Firestore
 */
export async function fetchAuditLogsFromFirestore(maxCount = 100): Promise<AuditLogEntry[]> {
  const db = initServerFirestore();
  if (!db) return [];
  try {
    const q = query(collection(db, 'auditTrail'), orderBy('timestamp', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    const logs: AuditLogEntry[] = [];
    snap.forEach((d) => logs.push(d.data() as AuditLogEntry));
    return logs;
  } catch (err) {
    console.warn('[ServerDb] Notice fetching audit logs from Firestore:', err);
    return [];
  }
}

/**
 * Synchronizes user profile to Firestore
 */
export async function syncUserToFirestore(user: {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  agency?: string;
}): Promise<boolean> {
  const db = initServerFirestore();
  if (!db) return false;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: user.role,
        agency: user.agency || 'Federal Forensic Biometrics Unit',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error(`[ServerDb] Failed to sync user ${user.uid} to Firestore:`, err);
    return false;
  }
}

/**
 * Lists all registered users from Firestore
 */
export async function fetchUsersFromFirestore(): Promise<any[]> {
  const db = initServerFirestore();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users: any[] = [];
    snap.forEach((d) => users.push(d.data()));
    return users;
  } catch (err) {
    console.warn('[ServerDb] Notice fetching users from Firestore:', err);
    return [];
  }
}
