import { create } from 'zustand';
import type { ParsedRun } from '../types/run';

interface RunsState {
  runs: ParsedRun[];
  isLoading: boolean;
  loadProgress: { loaded: number; total: number } | null;
  error: string | null;
  setRuns: (runs: ParsedRun[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadProgress: (progress: { loaded: number; total: number } | null) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useRunsStore = create<RunsState>((set) => ({
  runs: [],
  isLoading: false,
  loadProgress: null,
  error: null,
  setRuns: (runs) => set({ runs, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setError: (error) => set({ error, isLoading: false }),
  clear: () =>
    set({ runs: [], isLoading: false, loadProgress: null, error: null }),
}));
