import { useRunsStore } from '../store/runs';
import { useAuthStore } from '../store/auth';
import { uploadRunFile, deleteAllRunFiles, listUserRunFiles } from '../lib/cloudStorage';
import { parseRunFile } from '../lib/parser';
import type { ParsedRun } from '../types/run';

export interface UploadStatus {
  uploaded: number;
  skipped: number;
  failed: number;
  total: number;
}

export interface UploadOptions {
  wipeFirst?: boolean;
}

const CONCURRENCY = 10;

export function useRunUploader() {
  const { setRuns, setLoading, setLoadProgress } = useRunsStore();
  const user = useAuthStore((s) => s.user);

  async function uploadFiles(
    fileList: FileList | File[],
    onProgress: (status: UploadStatus) => void,
    options?: UploadOptions,
  ): Promise<UploadStatus> {
    const files = Array.from(fileList).filter((f) => f.name.endsWith('.run'));
    const total = files.length;
    const status: UploadStatus = { uploaded: 0, skipped: 0, failed: 0, total };

    setLoading(true);
    setLoadProgress({ loaded: 0, total: options?.wipeFirst ? 0 : total });

    try {
      if (options?.wipeFirst) {
        await deleteAllRunFiles(user!.uid);
        setRuns([]);
        setLoadProgress({ loaded: 0, total });
      }

      // Get existing file names to skip duplicates
      const existingNames = options?.wipeFirst
        ? new Set<string>()
        : new Set(await listUserRunFiles(user!.uid));

      const newRuns: ParsedRun[] = [];
      let completed = 0;

      // Process files with bounded concurrency using a worker-queue pattern
      const queue = [...files];

      async function worker() {
        while (queue.length > 0) {
          const file = queue.shift();
          if (!file) return;

          try {
            if (existingNames.has(file.name)) {
              status.skipped++;
            } else {
              const content = await file.text();
              await uploadRunFile(user!.uid, file.name, content);
              newRuns.push(parseRunFile(file.name, content));
              status.uploaded++;
            }
          } catch {
            status.failed++;
          }

          completed++;
          setLoadProgress({ loaded: completed, total });
          onProgress({ ...status });
        }
      }

      const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker());
      await Promise.all(workers);

      // Use getState() for the current runs to correctly handle the wipeFirst case
      const currentRuns = useRunsStore.getState().runs;
      const merged = [...currentRuns, ...newRuns].sort(
        (a, b) => (a.data.start_time ?? 0) - (b.data.start_time ?? 0),
      );
      setRuns(merged);
    } finally {
      setLoading(false);
      setLoadProgress(null);
    }

    return status;
  }

  return { uploadFiles };
}
