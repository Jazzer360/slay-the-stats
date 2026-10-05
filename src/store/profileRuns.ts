import { create } from 'zustand';
import type { ParsedRun } from '../types/run';
import type { DefaultProfileFilters } from '../types/user';

interface ProfileRunsState {
  profileRuns: ParsedRun[] | null;
  screenName: string | null;
  defaultFilters: DefaultProfileFilters | null;
  setProfileRuns: (runs: ParsedRun[], screenName: string, defaults: DefaultProfileFilters) => void;
  clearProfileRuns: () => void;
}

export const useProfileRunsStore = create<ProfileRunsState>((set) => ({
  profileRuns: null,
  screenName: null,
  defaultFilters: null,
  setProfileRuns: (profileRuns, screenName, defaultFilters) =>
    set({ profileRuns, screenName, defaultFilters }),
  clearProfileRuns: () => set({ profileRuns: null, screenName: null, defaultFilters: null }),
}));
