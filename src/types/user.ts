import type { CustomRunFilter } from '../lib/run-mode';

export interface DefaultProfileFilters {
  character: string | null;
  playerMode: 'all' | 'solo' | 'multi';
  customRuns: CustomRunFilter;
  ascensionMin: number | null;
  ascensionMax: number | null;
  result: 'all' | 'win' | 'loss';
}

export const EMPTY_DEFAULT_FILTERS: DefaultProfileFilters = {
  character: null,
  playerMode: 'all',
  customRuns: 'exclude',
  ascensionMin: null,
  ascensionMax: null,
  result: 'all',
};

export interface UserProfile {
  uid: string;
  screenName: string | null;
  profileVisibility: 'public' | 'private';
  defaultFilters: DefaultProfileFilters;
  createdAt: number;
}

/** Read saved preferences, including profiles created before custom-run filtering. */
export function parseDefaultFilters(raw: unknown): DefaultProfileFilters {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_DEFAULT_FILTERS };
  const r = raw as Record<string, unknown>;
  return {
    character: typeof r.character === 'string' ? r.character : null,
    playerMode: r.playerMode === 'solo' || r.playerMode === 'multi' ? r.playerMode : 'all',
    customRuns: r.customRuns === 'include' || r.customRuns === 'only' ? r.customRuns : 'exclude',
    ascensionMin: typeof r.ascensionMin === 'number' ? r.ascensionMin : null,
    ascensionMax: typeof r.ascensionMax === 'number' ? r.ascensionMax : null,
    result: r.result === 'win' || r.result === 'loss' ? r.result : 'all',
  };
}
