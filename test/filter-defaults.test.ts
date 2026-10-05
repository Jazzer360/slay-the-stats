import { afterEach, describe, expect, it } from 'vitest';
import { EMPTY_DEFAULT_FILTERS, parseDefaultFilters } from '../src/types/user';
import { useFilterStore } from '../src/store/filters';
import { useProfileRunsStore } from '../src/store/profileRuns';
import { applyFilters, DEFAULT_FILTERS } from '../src/lib/filters';
import { buildMockRun } from './helpers';

afterEach(() => {
  useFilterStore.getState().resetFilters();
  useProfileRunsStore.getState().clearProfileRuns();
});

describe('saved filter defaults', () => {
  it('excludes custom runs for old profiles while preserving other preferences', () => {
    const defaults = parseDefaultFilters({ character: 'IRONCLAD', ascensionMin: 10, result: 'win' });
    expect(defaults).toEqual({
      ...EMPTY_DEFAULT_FILTERS, character: 'IRONCLAD', ascensionMin: 10, result: 'win',
    });
    useFilterStore.getState().applyDefaults(defaults);
    expect(applyFilters([buildMockRun({ game_mode: 'custom', ascension: 10, win: true })],
      useFilterStore.getState())).toEqual([]);
  });

  it.each(['exclude', 'include', 'only'] as const)('restores saved custom preference %s', (customRuns) => {
    const defaults = parseDefaultFilters({ customRuns });
    useFilterStore.getState().applyDefaults(defaults);
    expect(useFilterStore.getState().customRuns).toBe(customRuns);
  });

  it.each([undefined, null, {}, { customRuns: 'invalid' }])('uses safe defaults for %j', (raw) => {
    expect(parseDefaultFilters(raw)).toEqual(EMPTY_DEFAULT_FILTERS);
  });

  it('reset restores exclusion and clears other filters', () => {
    useFilterStore.getState().setCustomRuns('only');
    useFilterStore.getState().setResult('win');
    useFilterStore.getState().resetFilters();
    expect(useFilterStore.getState()).toMatchObject(DEFAULT_FILTERS);
  });

  it('retains the viewed profile defaults for Reset and clears them on exit', () => {
    const ownerDefaults = { ...EMPTY_DEFAULT_FILTERS, customRuns: 'only' as const };
    useProfileRunsStore.getState().setProfileRuns([], 'custom-player', ownerDefaults);
    useFilterStore.getState().setCustomRuns('include');
    useFilterStore.getState().applyDefaults(useProfileRunsStore.getState().defaultFilters!);
    expect(useFilterStore.getState().customRuns).toBe('only');
    useProfileRunsStore.getState().clearProfileRuns();
    expect(useProfileRunsStore.getState().defaultFilters).toBeNull();
  });
});
