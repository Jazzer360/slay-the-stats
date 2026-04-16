import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useRunsStore } from '../store/runs';
import { useFilterStore } from '../store/filters';
import { downloadAllUserRuns } from '../lib/cloudStorage';

/**
 * Automatically loads all cloud runs for the logged-in user.
 * Triggers once when `user` transitions from null to a value.
 * Clears runs when the user logs out.
 * When the user profile loads, applies their default filters.
 */
export function useCloudLoader() {
  const user = useAuthStore((s) => s.user);
  const userProfile = useAuthStore((s) => s.userProfile);
  const { setRuns, setLoading, setCloudLoadDone, setLoadProgress, setError, clear } =
    useRunsStore();
  const { applyDefaults, resetFilters } = useFilterStore();
  const prevUidRef = useRef<string | null>(null);
  const appliedFiltersRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUid = user?.uid ?? null;

    if (currentUid === prevUidRef.current) return;
    prevUidRef.current = currentUid;
    appliedFiltersRef.current = null;

    if (!currentUid) {
      clear();
      resetFilters();
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const runs = await downloadAllUserRuns(currentUid!, (p) => {
          if (!cancelled) setLoadProgress(p);
        });

        if (cancelled) return;

        setRuns(runs);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load runs from cloud.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCloudLoadDone(true);
          setLoadProgress(null);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    user?.uid,
    setRuns,
    setLoading,
    setCloudLoadDone,
    setLoadProgress,
    setError,
    clear,
    resetFilters,
  ]);

  // Apply user's default filters once when their profile loads
  useEffect(() => {
    if (!userProfile?.defaultFilters) return;
    const key = JSON.stringify(userProfile.defaultFilters);
    if (appliedFiltersRef.current === key) return;
    appliedFiltersRef.current = key;
    applyDefaults(userProfile.defaultFilters);
  }, [userProfile?.defaultFilters, applyDefaults]);
}
