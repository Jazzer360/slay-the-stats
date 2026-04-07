import { useMemo } from 'react';
import { useRunsStore } from '../store/runs';
import { useFilterStore } from '../store/filters';
import { applyFilters, extractFilterOptions } from '../lib/filters';
import type { ParsedRun } from '../types/run';

export function useFilteredRuns(): ParsedRun[] {
  const runs = useRunsStore((s) => s.runs);
  const filters = useFilterStore();

  return useMemo(
    () => applyFilters(runs, filters),
    [runs, filters]
  );
}

export function useFilterOptions() {
  const runs = useRunsStore((s) => s.runs);
  return useMemo(() => extractFilterOptions(runs), [runs]);
}
