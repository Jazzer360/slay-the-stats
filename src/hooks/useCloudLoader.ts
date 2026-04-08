import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useRunsStore } from '../store/runs';
import { listUserRuns } from '../lib/firestore';
import { downloadRunFileBytes } from '../lib/cloudStorage';
import { parseRunFile } from '../lib/parser';
import type { ParsedRun } from '../types/run';

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
        const metadataList = await listUserRuns(currentUid!);

        if (metadataList.length === 0) {
          setLoading(false);
          return;
        }

        setLoadProgress({ loaded: 0, total: metadataList.length });

        const results = await Promise.allSettled(
          metadataList.map(async ({ fileName }) => {
            const content = await downloadRunFileBytes(currentUid!, fileName);
            return parseRunFile(fileName, content);
          })
        );

        if (cancelled) return;

        const runs: ParsedRun[] = [];
        let loaded = 0;
        for (const result of results) {
          loaded++;
          if (result.status === 'fulfilled') {
            runs.push(result.value);
          } else {
            console.warn('Failed to load run:', result.reason);
          }
          setLoadProgress({ loaded, total: metadataList.length });
        }

        // Sort chronologically
        runs.sort((a, b) => (a.data.start_time ?? 0) - (b.data.start_time ?? 0));
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
