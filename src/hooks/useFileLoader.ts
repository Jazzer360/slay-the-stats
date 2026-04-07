import { useCallback } from 'react';
import { useRunsStore } from '../store/runs';
import { parseRunFile } from '../lib/parser';
import type { ParsedRun } from '../types/run';

const EXPECTED_STEAM_PATH =
  '%APPDATA%\\SlayTheSpire2\\steam\\<steam_id>\\<profile>\\saves\\history';

interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
  kind: string;
  name: string;
}

interface FileSystemFileHandle {
  kind: string;
  name: string;
  getFile(): Promise<File>;
}

export function useFileLoader() {
  const { setRuns, setLoading, setLoadProgress, setError } = useRunsStore();

  const loadFromDirectoryPicker = useCallback(async () => {
    // Check if File System Access API is available
    if (!('showDirectoryPicker' in window)) {
      setError(
        'Your browser does not support the File System Access API. Please use Chrome or Edge, or use the file input fallback.'
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const dirHandle = await (window as any).showDirectoryPicker({
        id: 'sts2-history',
        mode: 'read',
        startIn: 'desktop',
      });

      await loadFromDirectoryHandle(dirHandle);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // User cancelled the picker
        setLoading(false);
        return;
      }
      setError(e.message || 'Failed to load directory');
    }
  }, [setRuns, setLoading, setLoadProgress, setError]);

  const loadFromDirectoryHandle = useCallback(
    async (dirHandle: FileSystemDirectoryHandle) => {
      setLoading(true);
      setError(null);

      try {
        // Collect all .run files
        const fileHandles: FileSystemFileHandle[] = [];
        for await (const entry of dirHandle.values()) {
          if (
            entry.kind === 'file' &&
            entry.name.endsWith('.run')
          ) {
            fileHandles.push(entry as FileSystemFileHandle);
          }
        }

        if (fileHandles.length === 0) {
          setError(
            `No .run files found in the selected folder. Expected location: ${EXPECTED_STEAM_PATH}`
          );
          setLoading(false);
          return;
        }

        setLoadProgress({ loaded: 0, total: fileHandles.length });

        const runs: ParsedRun[] = [];
        const errors: string[] = [];

        // Process in batches for progress updates
        const BATCH_SIZE = 20;
        for (let i = 0; i < fileHandles.length; i += BATCH_SIZE) {
          const batch = fileHandles.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (fh) => {
              try {
                const file = await fh.getFile();
                const text = await file.text();
                return parseRunFile(fh.name, text);
              } catch (e) {
                errors.push(
                  `${fh.name}: ${e instanceof Error ? e.message : String(e)}`
                );
                return null;
              }
            })
          );

          for (const result of batchResults) {
            if (result) runs.push(result);
          }

          setLoadProgress({
            loaded: Math.min(i + BATCH_SIZE, fileHandles.length),
            total: fileHandles.length,
          });
        }

        // Sort chronologically
        runs.sort((a, b) => a.data.start_time - b.data.start_time);

        if (errors.length > 0) {
          console.warn(`Failed to parse ${errors.length} files:`, errors);
        }

        setRuns(runs);
        setLoadProgress(null);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    },
    [setRuns, setLoading, setLoadProgress, setError]
  );

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
              return parseRunFile(file.name, text);
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
    loadFromDirectoryPicker,
    loadFromFileInput,
    expectedPath: EXPECTED_STEAM_PATH,
  };
}
