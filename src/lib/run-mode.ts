import type { RunData } from '../types/run';

/**
 * Game modes in display order. IDs are the lower-cased `game_mode` value from
 * the .run file (game enum: Standard, Daily, Dread, Blitz; custom runs record
 * "custom"). Unknown modes found in run data are still filterable and sort
 * after these.
 */
export const GAME_MODE_ORDER = ['standard', 'daily', 'dread', 'blitz', 'custom'] as const;

const GAME_MODE_LABELS: Record<string, string> = {
  standard: 'Normal',
  daily: 'Daily',
  dread: 'Dread',
  blitz: 'Blitz',
  custom: 'Custom',
};

/** Modes hidden unless the viewer opts in. */
export const DEFAULT_EXCLUDED_MODES: string[] = ['custom'];

/**
 * Normalised mode ID for a run; missing/empty game_mode counts as standard.
 * Schema 11+ flags custom runs with is_custom_game (game_mode may say 'standard').
 */
export function runGameMode(data: Pick<RunData, 'game_mode' | 'is_custom_game'>): string {
  if (data.is_custom_game === true) return 'custom';
  const mode = data.game_mode?.trim().toLowerCase();
  return mode ? mode : 'standard';
}

export function gameModeLabel(mode: string): string {
  return GAME_MODE_LABELS[mode] ?? mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function sortGameModes(modes: Iterable<string>): string[] {
  const order = GAME_MODE_ORDER as readonly string[];
  return [...new Set(modes)].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

/** Modifiers can be empty on custom runs; game_mode / is_custom_game are authoritative. */
export function isCustomRun(data: Pick<RunData, 'game_mode' | 'is_custom_game'>): boolean {
  return runGameMode(data) === 'custom';
}

/** Same set of modes regardless of order/case. */
export function sameModes(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  return sa.size === new Set(b).size && b.every((m) => sa.has(m));
}

/**
 * Read a saved excluded-modes list, migrating the legacy `customRuns`
 * preference ('exclude' | 'include' | 'only') from older profiles.
 */
export function parseExcludedModes(excludedModes: unknown, legacyCustomRuns?: unknown): string[] {
  if (Array.isArray(excludedModes)) {
    return [
      ...new Set(
        excludedModes.filter((m): m is string => typeof m === 'string').map((m) => m.toLowerCase()),
      ),
    ];
  }
  if (legacyCustomRuns === 'include') return [];
  if (legacyCustomRuns === 'only') return GAME_MODE_ORDER.filter((m) => m !== 'custom');
  return [...DEFAULT_EXCLUDED_MODES];
}
