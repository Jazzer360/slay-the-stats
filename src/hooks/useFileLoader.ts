import { useCallback } from 'react';
import { useRunsStore } from '../store/runs';
import { parseRunFile } from '../lib/parser';
import type { ParsedRun } from '../types/run';

const EXPECTED_PATH =
  '%APPDATA%\\SlayTheSpire2';

const PROFILE_PATTERN = /\bprofile(\d+)\b/i;

export function useFileLoader() {
  const { setRuns, setLoading, setLoadProgress, setError } = useRunsStore();

  const loadFromFileInput = useCallback(
    async (fileList: FileList) => {
      setLoading(true);
      setError(null);

      const files = Array.from(fileList).filter((f) =>
        f.name.endsWith('.run')
      );

      if (files.length === 0) {
        setError('No .run files found in the selected folder.');
        setLoading(false);
        return;
      }

      setLoadProgress({ loaded: 0, total: files.length });

      const runs: ParsedRun[] = [];
      const errors: string[] = [];

      const BATCH_SIZE = 20;
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            try {
              const text = await file.text();
              // Extract profile from webkitRelativePath
              const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
              const profileMatch = relativePath.match(PROFILE_PATTERN);
              const profile = profileMatch ? profileMatch[0] : null;
              return parseRunFile(file.name, text, profile);
            } catch (e) {
              errors.push(
                `${file.name}: ${e instanceof Error ? e.message : String(e)}`
              );
              return null;
            }
          })
        );

        for (const result of batchResults) {
          if (result) runs.push(result);
        }

        setLoadProgress({
          loaded: Math.min(i + BATCH_SIZE, files.length),
          total: files.length,
        });
      }

      runs.sort((a, b) => a.data.start_time - b.data.start_time);

      if (errors.length > 0) {
        console.warn(`Failed to parse ${errors.length} files:`, errors);
      }

      setRuns(runs);
      setLoadProgress(null);
      setLoading(false);
    },
    [setRuns, setLoading, setLoadProgress, setError]
  );

  return {
    loadFromFileInput,
    expectedPath: EXPECTED_PATH,
  };
}
