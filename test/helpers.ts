/**
 * Test helpers for loading .run fixture files.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseRunFile } from '../src/lib/parser';
import type { ParsedRun, RunData } from '../src/types/run';
import { TEST_FIXTURES } from './fixtures.js';
export { TEST_FIXTURES } from './fixtures.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures');

/**
 * Load a single .run fixture by filename.
 * Throws if the file doesn't exist.
 */
export function loadFixture(fileName: string): ParsedRun {
  const filePath = join(FIXTURES_DIR, fileName);
  if (!existsSync(filePath)) {
    throw new Error(
      `Fixture "${fileName}" not found in ${FIXTURES_DIR}.\n` +
        'Run `npm run test:fixtures` to download fixtures from Firebase Storage.',
    );
  }
  const content = readFileSync(filePath, 'utf-8');
  return parseRunFile(fileName, content, 'test-profile');
}

/**
 * Load the raw JSON data from a fixture without parsing through parseRunFile.
 */
export function loadFixtureRaw(fileName: string): RunData {
  const filePath = join(FIXTURES_DIR, fileName);
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as RunData;
}

/**
 * Load all curated test fixtures defined in TEST_FIXTURES.
 * Returns them sorted by start_time (chronological).
 */
export function loadAllFixtures(): ParsedRun[] {
  const runs = TEST_FIXTURES.map((f) => loadFixture(f));
  runs.sort((a, b) => a.data.start_time - b.data.start_time);
  return runs;
}

/**
 * Load specific fixtures by filename.
 * Useful for tests that need a curated subset of runs.
 */
export function loadFixtures(...fileNames: string[]): ParsedRun[] {
  const runs = fileNames.map((f) => loadFixture(f));
  runs.sort((a, b) => a.data.start_time - b.data.start_time);
  return runs;
}

/**
 * List available .run fixture filenames.
 */
export function listFixtures(): string[] {
  if (!existsSync(FIXTURES_DIR)) return [];
  return readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.run')).sort();
}

/**
 * Build a minimal ParsedRun for unit tests that don't need real data.
 * Override any RunData fields via the `overrides` parameter.
 */
export function buildMockRun(overrides: Partial<RunData> = {}): ParsedRun {
  const defaults: RunData = {
    acts: ['ACT.OVERGROWTH'],
    ascension: 0,
    build_id: 'test-build',
    game_mode: 'STANDARD',
    killed_by_encounter: 'NONE.NONE',
    killed_by_event: 'NONE.NONE',
    map_point_history: [[]],
    modifiers: [],
    platform_type: 'STEAM',
    players: [
      {
        character: 'IRONCLAD',
        deck: [],
        id: 0,
        max_potion_slot_count: 3,
        potions: [],
        relics: [],
      },
    ],
    run_time: 600,
    schema_version: 1,
    seed: 'ABC123',
    start_time: 1700000000,
    was_abandoned: false,
    win: false,
    ...overrides,
  };

  return {
    fileName: 'mock.run',
    profile: 'test-profile',
    data: defaults,
  };
}
