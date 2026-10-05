import type { RunData } from '../types/run';

export type CustomRunFilter = 'exclude' | 'include' | 'only';

export const CUSTOM_RUN_OPTIONS = [
  { value: 'exclude', label: 'Exclude' },
  { value: 'include', label: 'Include' },
  { value: 'only', label: 'Only' },
] as const;

/** Modifiers can be empty on custom runs; the recorded game mode is authoritative. */
export function isCustomRun(data: Pick<RunData, 'game_mode'>): boolean {
  return data.game_mode?.toLowerCase() === 'custom';
}
