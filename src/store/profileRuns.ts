import { create } from 'zustand';
import type { ParsedRun } from '../types/run';

interface ProfileRunsState {
  profileRuns: ParsedRun[] | null;
  screenName: string | null;
  setProfileRuns: (runs: ParsedRun[], screenName: string) => void;
  clearProfileRuns: () => void;
}

export const useProfileRunsStore = create<ProfileRunsState>((set) => ({
  profileRuns: null,
  screenName: null,
  setProfileRuns: (profileRuns, screenName) => set({ profileRuns, screenName }),
  clearProfileRuns: () => set({ profileRuns: null, screenName: null }),
}));
