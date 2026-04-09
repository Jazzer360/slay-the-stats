import { ref, uploadString, getDownloadURL, deleteObject, getBytes, listAll, type UploadMetadata } from 'firebase/storage';
import { storage } from './firebase';
import { parseRunFile } from './parser';
import type { ParsedRun } from '../types/run';

function runRef(uid: string, fileName: string) {
  return ref(storage, `users/${uid}/runs/${fileName}`);
}

const RUN_UPLOAD_METADATA: UploadMetadata = {
  contentType: 'application/json',
  cacheControl: 'public, max-age=31536000, immutable',
};

export async function uploadRunFile(uid: string, fileName: string, content: string): Promise<void> {
  await uploadString(runRef(uid, fileName), content, 'raw', RUN_UPLOAD_METADATA);
}

export async function downloadRunFile(uid: string, fileName: string): Promise<string> {
  const url = await getDownloadURL(runRef(uid, fileName));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${fileName}`);
  return response.text();
}

export async function downloadRunFileBytes(uid: string, fileName: string): Promise<string> {
  const bytes = await getBytes(runRef(uid, fileName));
  return new TextDecoder().decode(bytes);
}

export async function deleteRunFile(uid: string, fileName: string): Promise<void> {
  await deleteObject(runRef(uid, fileName));
}

export async function listUserRunFiles(uid: string): Promise<string[]> {
  const dirRef = ref(storage, `users/${uid}/runs`);
  const result = await listAll(dirRef);
  return result.items.map((item) => item.name);
}

export async function deleteAllRunFiles(uid: string): Promise<void> {
  const dirRef = ref(storage, `users/${uid}/runs`);
  const result = await listAll(dirRef);
  await Promise.all(result.items.map((item) => deleteObject(item)));
}

// ─── Concurrent download helper ──────────────────────────────────

export interface DownloadProgress {
  loaded: number;
  total: number;
}

/**
 * Download and parse all run files for a user concurrently.
 * Calls `onProgress` after each file completes (success or failure).
 */
export async function downloadAllUserRuns(
  uid: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<ParsedRun[]> {
  const fileNames = await listUserRunFiles(uid);
  if (fileNames.length === 0) return [];

  const total = fileNames.length;
  let loaded = 0;

  onProgress?.({ loaded: 0, total });

  const results = await Promise.allSettled(
    fileNames.map(async (fileName) => {
      const content = await downloadRunFileBytes(uid, fileName);
      const run = parseRunFile(fileName, content);
      loaded++;
      onProgress?.({ loaded, total });
      return run;
    }),
  );

  const runs: ParsedRun[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      runs.push(result.value);
    } else {
      console.warn('Failed to load run:', result.reason);
    }
  }

  runs.sort((a, b) => (a.data.start_time ?? 0) - (b.data.start_time ?? 0));
  return runs;
}
