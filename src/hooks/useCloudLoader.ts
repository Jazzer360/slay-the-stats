import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useRunsStore } from '../store/runs';
import { downloadAllUserRuns } from '../lib/cloudStorage';

/**
 * Automatically loads all cloud runs for the logged-in user.
 * Triggers once when `user` transitions from null to a value.
 * Clears runs when the user logs out.
 */
export function useCloudLoader() {
  const user = useAuthStore((s) => s.user);
  const { setRuns, setLoading, setLoadProgress, setError, clear } = useRunsStore();
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUid = user?.uid ?? null;

    if (currentUid === prevUidRef.current) return;
    prevUidRef.current = currentUid;

    if (!currentUid) {
      clear();
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
          setLoadProgress(null);
        }
      }
    }

    load();

    return () => { cancelled = true; };
  }, [user?.uid, setRuns, setLoading, setLoadProgress, setError, clear]);
}
