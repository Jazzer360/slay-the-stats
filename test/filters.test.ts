import { describe, it, expect } from 'vitest';
import { applyFilters, extractFilterOptions, DEFAULT_FILTERS } from '../src/lib/filters';
import { loadAllFixtures } from './helpers';

describe('applyFilters', () => {
  it('returns all runs with default filters', () => {
    const runs = loadAllFixtures();
    const filtered = applyFilters(runs, DEFAULT_FILTERS);
    expect(filtered.length).toBe(runs.length);
  });

  it('filters by character', () => {
    const runs = loadAllFixtures();
    const filtered = applyFilters(runs, {
      ...DEFAULT_FILTERS,
      character: 'CHARACTER.IRONCLAD',
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(runs.length);
    for (const run of filtered) {
      expect(run.data.players[0]?.character).toBe('CHARACTER.IRONCLAD');
    }
  });

  it('filters by result=win', () => {
    const runs = loadAllFixtures();
    const filtered = applyFilters(runs, { ...DEFAULT_FILTERS, result: 'win' });

    expect(filtered.length).toBe(60);
    for (const run of filtered) {
      expect(run.data.win).toBe(true);
    }
  });

  it('filters by result=loss (includes abandoned)', () => {
    const runs = loadAllFixtures();
    const filtered = applyFilters(runs, { ...DEFAULT_FILTERS, result: 'loss' });

    // result=loss means !win, which includes abandoned
    for (const run of filtered) {
      expect(run.data.win).toBe(false);
    }
    expect(filtered.length).toBe(207 - 60);
  });

  it('filters by ascension range', () => {
    const runs = loadAllFixtures();
    const filtered = applyFilters(runs, {
      ...DEFAULT_FILTERS,
      ascensionMin: 5,
      ascensionMax: 10,
    });

    expect(filtered.length).toBeGreaterThan(0);
    for (const run of filtered) {
      expect(run.data.ascension).toBeGreaterThanOrEqual(5);
      expect(run.data.ascension).toBeLessThanOrEqual(10);
    }
  });

  it('filters by player mode=solo', () => {
    const runs = loadAllFixtures();
    const filtered = applyFilters(runs, { ...DEFAULT_FILTERS, playerMode: 'solo' });

    for (const run of filtered) {
      expect(run.data.players.length).toBe(1);
    }
    // 5 multiplayer runs, so solo = 207 - 5
    expect(filtered.length).toBe(207 - 5);
  });

  it('filters by player mode=multi', () => {
    const runs = loadAllFixtures();
    const filtered = applyFilters(runs, { ...DEFAULT_FILTERS, playerMode: 'multi' });

    expect(filtered.length).toBe(5);
    for (const run of filtered) {
      expect(run.data.players.length).toBeGreaterThan(1);
    }
  });

  it('filters by profile', () => {
    const runs = loadAllFixtures();
    // All fixtures have profile='test-profile'
    const filtered = applyFilters(runs, { ...DEFAULT_FILTERS, profile: 'test-profile' });
    expect(filtered.length).toBe(207);

    const noMatch = applyFilters(runs, { ...DEFAULT_FILTERS, profile: 'nonexistent' });
    expect(noMatch.length).toBe(0);
  });

  it('filters by build ID', () => {
    const runs = loadAllFixtures();
    const firstBuild = runs[0].data.build_id;
    const filtered = applyFilters(runs, {
      ...DEFAULT_FILTERS,
      buildIds: [firstBuild],
    });

    expect(filtered.length).toBeGreaterThan(0);
    for (const run of filtered) {
      expect(run.data.build_id).toBe(firstBuild);
    }
  });

  it('combining multiple filters is intersective', () => {
    const runs = loadAllFixtures();
    const filtered = applyFilters(runs, {
      ...DEFAULT_FILTERS,
      character: 'CHARACTER.IRONCLAD',
      result: 'win',
    });

    for (const run of filtered) {
      expect(run.data.players[0]?.character).toBe('CHARACTER.IRONCLAD');
      expect(run.data.win).toBe(true);
    }
    // Should be less than either individual filter
    const ironclad = applyFilters(runs, { ...DEFAULT_FILTERS, character: 'CHARACTER.IRONCLAD' });
    const wins = applyFilters(runs, { ...DEFAULT_FILTERS, result: 'win' });
    expect(filtered.length).toBeLessThanOrEqual(ironclad.length);
    expect(filtered.length).toBeLessThanOrEqual(wins.length);
  });
});

describe('extractFilterOptions', () => {
  it('extracts all characters', () => {
    const runs = loadAllFixtures();
    const options = extractFilterOptions(runs);

    expect(options.characters).toContain('CHARACTER.IRONCLAD');
    expect(options.characters).toContain('CHARACTER.SILENT');
    expect(options.characters).toContain('CHARACTER.REGENT');
    expect(options.characters).toContain('CHARACTER.NECROBINDER');
    expect(options.characters).toContain('CHARACTER.DEFECT');
    // Characters should be sorted
    expect(options.characters).toEqual([...options.characters].sort());
  });

  it('detects multiplayer', () => {
    const runs = loadAllFixtures();
    const options = extractFilterOptions(runs);
    expect(options.hasMultiplayer).toBe(true);
  });

  it('ascensions are sorted ascending', () => {
    const runs = loadAllFixtures();
    const options = extractFilterOptions(runs);

    for (let i = 1; i < options.ascensions.length; i++) {
      expect(options.ascensions[i]).toBeGreaterThan(options.ascensions[i - 1]);
    }
  });

  it('returns empty options for empty input', () => {
    const options = extractFilterOptions([]);
    expect(options.characters).toEqual([]);
    expect(options.ascensions).toEqual([]);
    expect(options.hasMultiplayer).toBe(false);
  });
});
