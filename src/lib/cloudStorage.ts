import { ref, uploadString, getDownloadURL, deleteObject, getBytes, type UploadMetadata } from 'firebase/storage';
import { storage } from './firebase';

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
