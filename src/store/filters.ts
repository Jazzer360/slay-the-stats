import { create } from 'zustand';
import type { FilterState } from '../lib/filters';
import { DEFAULT_FILTERS } from '../lib/filters';

interface FilterStore extends FilterState {
  setCharacter: (character: string | null) => void;
  setAscensionRange: (min: number | null, max: number | null) => void;
  setResult: (result: 'all' | 'win' | 'loss') => void;
  setDateRange: (from: number | null, to: number | null) => void;
  setBuildIds: (buildIds: string[]) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  ...DEFAULT_FILTERS,
  setCharacter: (character) => set({ character }),
  setAscensionRange: (ascensionMin, ascensionMax) =>
    set({ ascensionMin, ascensionMax }),
  setResult: (result) => set({ result }),
  setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),
  setBuildIds: (buildIds) => set({ buildIds }),
  resetFilters: () => set(DEFAULT_FILTERS),
}));
