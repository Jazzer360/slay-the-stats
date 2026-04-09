import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
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

// ─── Shares ──────────────────────────────────────────────────────

export interface ShareDoc {
  uid: string | null;
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
  // Check authenticated shares first
  const snap = await getDoc(doc(db, 'shares', token));
  if (snap.exists()) {
    const d = snap.data();
    return {
      uid: d.uid ?? null,
      fileName: d.fileName,
      runContent: d.runContent,
      createdAt: (d.createdAt as Timestamp)?.toMillis() ?? 0,
    };
  }

  // Fall back to public (anonymous) shares
  const pubSnap = await getDoc(doc(db, 'public_shares', token));
  if (!pubSnap.exists()) return null;
  const d = pubSnap.data();
  return {
    uid: null,
    fileName: d.fileName,
    runContent: d.runContent,
    createdAt: (d.createdAt as Timestamp)?.toMillis() ?? 0,
  };
}

export async function createPublicShare(token: string, fileName: string, runContent: string): Promise<void> {
  if (runContent.length > 900_000) {
    throw new Error('Run file is too large to share (> 900 KB).');
  }
  await setDoc(doc(db, 'public_shares', token), {
    fileName,
    runContent,
    createdAt: serverTimestamp(),
  });
}

export async function deleteShare(token: string): Promise<void> {
  await deleteDoc(doc(db, 'shares', token));
}
