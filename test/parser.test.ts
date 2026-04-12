import { describe, it, expect } from 'vitest';
import { parseRunFile } from '../src/lib/parser';
import { loadFixture, loadFixtureRaw, loadAllFixtures, TEST_FIXTURES } from './helpers';

describe('parseRunFile', () => {
  it('parses a valid run file', () => {
    // Use a known 3-act win
    const run = loadFixture('1772746469.run');
    expect(run.fileName).toBe('1772746469.run');
    expect(run.profile).toBe('test-profile');
    expect(run.data.players.length).toBeGreaterThan(0);
    expect(run.data.map_point_history.length).toBeGreaterThan(0);
    expect(run.data.win).toBe(true);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseRunFile('bad.run', 'not json')).toThrow();
  });

  it('throws when players array is empty', () => {
    const json = JSON.stringify({ players: [], map_point_history: [[]] });
    expect(() => parseRunFile('empty-players.run', json)).toThrow(/no players/);
  });

  it('throws when map_point_history is missing', () => {
    const json = JSON.stringify({ players: [{ character: 'TEST' }] });
    expect(() => parseRunFile('no-map.run', json)).toThrow(/no map_point_history/);
  });

  it('preserves profile when provided', () => {
    const raw = loadFixtureRaw('1772746469.run');
    const run = parseRunFile('test.run', JSON.stringify(raw), 'my-profile');
    expect(run.profile).toBe('my-profile');
  });

  it('defaults profile to null', () => {
    const raw = loadFixtureRaw('1772746469.run');
    const run = parseRunFile('test.run', JSON.stringify(raw));
    expect(run.profile).toBeNull();
  });
});

describe('parseRunFile — fixture integrity', () => {
  it('all curated fixtures parse without error', () => {
    const runs = loadAllFixtures();
    expect(runs.length).toBe(TEST_FIXTURES.length);
    for (const run of runs) {
      expect(run.data.players.length).toBeGreaterThan(0);
      expect(run.data.map_point_history.length).toBeGreaterThan(0);
    }
  });

  it('fixtures are sorted chronologically by loadAllFixtures', () => {
    const runs = loadAllFixtures();
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i].data.start_time).toBeGreaterThanOrEqual(runs[i - 1].data.start_time);
    }
  });

  it('parses a multiplayer run with multiple players', () => {
    const run = loadFixture('1772763220.run');
    expect(run.data.players.length).toBeGreaterThan(1);
  });

  it('parses an abandoned run', () => {
    const run = loadFixture('1773771099.run');
    expect(run.data.was_abandoned).toBe(true);
    expect(run.data.win).toBe(false);
  });

  it('parses a short abandoned run (2 floors)', () => {
    const run = loadFixture('1774125604.run');
    expect(run.data.was_abandoned).toBe(true);
    const totalFloors = run.data.map_point_history.reduce((s, a) => s + a.length, 0);
    expect(totalFloors).toBe(2);
  });
});
