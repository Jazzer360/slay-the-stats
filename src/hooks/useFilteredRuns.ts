import { useMemo } from 'react';
import { useActiveRuns } from './useActiveRuns';
import { useFilterStore } from '../store/filters';
import { applyFilters, extractFilterOptions } from '../lib/filters';
import type { ParsedRun } from '../types/run';

export function useFilteredRuns(): ParsedRun[] {
  const runs = useActiveRuns();
  const filters = useFilterStore();

  return useMemo(() => applyFilters(runs, filters), [runs, filters]);
}

export function useFilterOptions() {
  const runs = useActiveRuns();
  return useMemo(() => extractFilterOptions(runs), [runs]);
}
