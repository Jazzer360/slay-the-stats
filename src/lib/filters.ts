import type { ParsedRun } from '../types/run';

/** Canonical in-game character pick order. */
export const CHARACTER_ORDER = [
  'CHARACTER.IRONCLAD',
  'CHARACTER.SILENT',
  'CHARACTER.REGENT',
  'CHARACTER.NECROBINDER',
  'CHARACTER.DEFECT',
] as const;

export interface FilterState {
  profile: string | null; // single-select, null = all
  character: string | null; // single-select, null = all
  playerMode: 'all' | 'solo' | 'multi';
  ascensionMin: number | null;
  ascensionMax: number | null;
  result: 'all' | 'win' | 'loss';
  dateFrom: number | null; // unix timestamp
  dateTo: number | null;
  buildIds: string[];
}

export const DEFAULT_FILTERS: FilterState = {
  profile: null,
  character: null,
  playerMode: 'all',
  ascensionMin: null,
  ascensionMax: null,
  result: 'all',
  dateFrom: null,
  dateTo: null,
  buildIds: [],
};

export function applyFilters(runs: ParsedRun[], filters: FilterState): ParsedRun[] {
  return runs.filter((run) => {
    const d = run.data;

    // Profile filter
    if (filters.profile !== null && run.profile !== filters.profile) {
      return false;
    }

    // Character filter
    if (filters.character !== null && d.players[0]?.character !== filters.character) {
      return false;
    }

    // Player mode (solo/multi)
    if (filters.playerMode === 'solo' && d.players.length > 1) return false;
    if (filters.playerMode === 'multi' && d.players.length <= 1) return false;

    // Ascension range
    if (filters.ascensionMin !== null && d.ascension < filters.ascensionMin) {
      return false;
    }
    if (filters.ascensionMax !== null && d.ascension > filters.ascensionMax) {
      return false;
    }

    // Win/loss
    if (filters.result === 'win' && !d.win) return false;
    if (filters.result === 'loss' && d.win) return false;

    // Date range
    if (filters.dateFrom !== null && d.start_time < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo !== null && d.start_time > filters.dateTo) {
      return false;
    }

    // Build version
    if (filters.buildIds.length > 0 && !filters.buildIds.includes(d.build_id)) {
      return false;
    }

    return true;
  });
}

/**
 * Extract available filter options from loaded runs.
 */
export function extractFilterOptions(runs: ParsedRun[]) {
  const profiles = new Set<string>();
  const characters = new Set<string>();
  const ascensions = new Set<number>();
  const buildIds = new Set<string>();
  let hasMultiplayer = false;

  for (const run of runs) {
    const d = run.data;
    if (run.profile) profiles.add(run.profile);
    if (d.players[0]?.character) characters.add(d.players[0].character);
    ascensions.add(d.ascension);
    buildIds.add(d.build_id);
    if (d.players.length > 1) hasMultiplayer = true;
  }

  const sortedCharacters = [...characters].sort((a, b) => {
    const ai = CHARACTER_ORDER.indexOf(a as (typeof CHARACTER_ORDER)[number]);
    const bi = CHARACTER_ORDER.indexOf(b as (typeof CHARACTER_ORDER)[number]);
    // Known characters by pick order, unknown (modded) characters alphabetically at end
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return {
    profiles: [...profiles].sort(),
    characters: sortedCharacters,
    ascensions: [...ascensions].sort((a, b) => a - b),
    buildIds: [...buildIds].sort(),
    hasMultiplayer,
  };
}
