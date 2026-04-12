/**
 * Download .run fixtures from Firebase Storage for use in tests.
 *
 * Downloads only the curated set of fixtures defined below.
 * Each file is chosen because it exercises specific edge cases.
 *
 * Usage:
 *   node scripts/download-fixtures.js                   # download curated set
 *   node scripts/download-fixtures.js run1.run run2.run  # download specific runs
 *
 * Requires FIREBASE_UID env var (your Firebase user ID).
 * Alternatively, create a .env file at the project root with FIREBASE_UID=<uid>.
 *
 * Uses the Firebase client SDK so security rules (public profile) are respected.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, getBytes } from 'firebase/storage';
import { TEST_FIXTURES } from '../test/fixtures.js';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const FIXTURES_DIR = join(PROJECT_ROOT, 'test', 'fixtures');

// Load .env file if present
function loadEnv() {
  const envPath = join(PROJECT_ROOT, '.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w]+)\s*=\s*(.+)\s*$/);
      if (match) process.env[match[1]] = match[2];
    }
  }
}

loadEnv();

const uid = process.env.FIREBASE_UID;
if (!uid) {
  console.error('ERROR: Set FIREBASE_UID env var or add it to .env');
  console.error('You can find your UID in the app Settings page or Firebase Console.');
  process.exit(1);
}

const app = initializeApp({
  apiKey: 'AIzaSyCFRT9eSAWdDGP74mB8Zb4tXiFoUwlEOlc',
  storageBucket: 'slay-the-stats.firebasestorage.app',
});
const storage = getStorage(app);

mkdirSync(FIXTURES_DIR, { recursive: true });

async function main() {
  const requestedFiles = process.argv.slice(2);
  const fileNames = requestedFiles.length > 0 ? requestedFiles : TEST_FIXTURES;

  console.log(`Downloading ${fileNames.length} fixture(s)...`);

  let downloaded = 0;
  let skipped = 0;

  for (const fileName of fileNames) {
    const outPath = join(FIXTURES_DIR, fileName);
    if (existsSync(outPath)) {
      skipped++;
      continue;
    }
    try {
      const fileRef = ref(storage, `users/${uid}/runs/${fileName}`);
      const bytes = await getBytes(fileRef);
      const content = new TextDecoder().decode(bytes);
      writeFileSync(outPath, content, 'utf-8');
      downloaded++;
      process.stdout.write(`\r  Downloaded ${downloaded}/${fileNames.length - skipped}...`);
    } catch (err) {
      console.error(`\n  Failed: ${fileName} — ${err.message}`);
    }
  }

  console.log(`\nDone. ${downloaded} downloaded, ${skipped} already existed.`);
  console.log(`Fixtures directory: ${FIXTURES_DIR}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
