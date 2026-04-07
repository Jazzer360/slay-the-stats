import { useMemo } from 'react';
import { computeCardElo, computeAncientElo } from '../lib/elo';
import type { EloMap } from '../types/elo';
import type { ParsedRun } from '../types/run';

export function useCardElo(filteredRuns: ParsedRun[]): EloMap {
  return useMemo(() => computeCardElo(filteredRuns), [filteredRuns]);
}

export function useAncientElo(filteredRuns: ParsedRun[]): { elo: EloMap; ancientMap: Map<string, string> } {
  return useMemo(() => computeAncientElo(filteredRuns), [filteredRuns]);
}
