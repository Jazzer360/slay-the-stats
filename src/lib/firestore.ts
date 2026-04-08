import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from '../types/user';

// ─── User Profile ────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    screenName: d.screenName ?? null,
    profileVisibility: d.profileVisibility ?? 'private',
    createdAt: (d.createdAt as Timestamp)?.toMillis() ?? Date.now(),
  };
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, 'uid'>): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    screenName: data.screenName,
    profileVisibility: data.profileVisibility,
    createdAt: serverTimestamp(),
  });
}

export async function updateUserProfile(uid: string, partial: Partial<Pick<UserProfile, 'screenName' | 'profileVisibility'>>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), partial);
}

/**
 * Atomically claim a new screen name for the user.
 * - Checks screenNames/{newName} is free (or owned by this user if changing case)
 * - Writes screenNames/{newName} -> { uid }
 * - Releases screenNames/{oldName} if provided
 * - Updates users/{uid}.screenName
 * Throws if the name is already taken.
 */
export async function reserveScreenName(uid: string, newName: string, oldName?: string | null): Promise<void> {
  const newNameLower = newName.toLowerCase();
  const oldNameLower = oldName?.toLowerCase();

  await runTransaction(db, async (tx) => {
    const newRef = doc(db, 'screenNames', newNameLower);
    const existing = await tx.get(newRef);
    if (existing.exists() && existing.data().uid !== uid) {
      throw new Error('Screen name is already taken.');
    }

    tx.set(newRef, { uid });
    tx.update(doc(db, 'users', uid), { screenName: newName });

    if (oldNameLower && oldNameLower !== newNameLower) {
      tx.delete(doc(db, 'screenNames', oldNameLower));
    }
  });
}

export async function isScreenNameAvailable(name: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'screenNames', name.toLowerCase()));
  return !snap.exists();
}

export async function getUserByScreenName(screenName: string): Promise<UserProfile | null> {
  // Look up the UID from the screenNames index (publicly readable, no collection query needed)
  const nameSnap = await getDoc(doc(db, 'screenNames', screenName.toLowerCase()));
  if (!nameSnap.exists()) return null;
  const uid = nameSnap.data().uid as string;

  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return null;
  const data = userSnap.data();
  return {
    uid,
    screenName: data.screenName ?? null,
    profileVisibility: data.profileVisibility ?? 'private',
    createdAt: (data.createdAt as Timestamp)?.toMillis() ?? Date.now(),
  };
}

// ─── Run Metadata ────────────────────────────────────────────────

export interface RunMetadata {
  fileName: string;
  uploadedAt: number;
  fileSize: number;
}

export async function listUserRuns(uid: string): Promise<RunMetadata[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'runs'));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      fileName: d.id,
      uploadedAt: (data.uploadedAt as Timestamp)?.toMillis() ?? 0,
      fileSize: data.fileSize ?? 0,
    };
  });
}

export async function addRunMetadata(uid: string, fileName: string, fileSize: number): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'runs', fileName), {
    fileName,
    uploadedAt: serverTimestamp(),
    fileSize,
  });
}

export async function deleteRunMetadata(uid: string, fileName: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'runs', fileName));
}

export async function checkRunExists(uid: string, fileName: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid, 'runs', fileName));
  return snap.exists();
}

// ─── Shares ──────────────────────────────────────────────────────

export interface ShareDoc {
  uid: string;
  fileName: string;
  runContent: string;
  createdAt: number;
}

export async function createShare(token: string, uid: string, fileName: string, runContent: string): Promise<void> {
  if (runContent.length > 900_000) {
    throw new Error('Run file is too large to share (> 900 KB).');
  }
  await setDoc(doc(db, 'shares', token), {
    uid,
    fileName,
    runContent,
    createdAt: serverTimestamp(),
  });
}

export async function getShare(token: string): Promise<ShareDoc | null> {
  const snap = await getDoc(doc(db, 'shares', token));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid: d.uid,
    fileName: d.fileName,
    runContent: d.runContent,
    createdAt: (d.createdAt as Timestamp)?.toMillis() ?? 0,
  };
}

export async function deleteShare(token: string): Promise<void> {
  await deleteDoc(doc(db, 'shares', token));
}
