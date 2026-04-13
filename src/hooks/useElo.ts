import { useMemo } from 'react';
import { computeCardElo, computeAncientElo, type CardEloOptions } from '../lib/elo';
import type { EloMap } from '../types/elo';
import type { ParsedRun } from '../types/run';

export function useCardElo(filteredRuns: ParsedRun[], options: CardEloOptions = { upgradeAware: true, enchantmentAware: true }): EloMap {
  const { upgradeAware, enchantmentAware } = options;
  return useMemo(
    () => computeCardElo(filteredRuns, { upgradeAware, enchantmentAware }),
    [filteredRuns, upgradeAware, enchantmentAware],
  );
}

export function useAncientElo(filteredRuns: ParsedRun[]): { elo: EloMap; ancientMap: Map<string, string> } {
  return useMemo(() => computeAncientElo(filteredRuns), [filteredRuns]);
}
