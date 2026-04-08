import { useRunsStore } from '../store/runs';
import { useAuthStore } from '../store/auth';
import { checkRunExists, addRunMetadata } from '../lib/firestore';
import { uploadRunFile } from '../lib/cloudStorage';
import { parseRunFile } from '../lib/parser';
import type { ParsedRun } from '../types/run';

export interface UploadStatus {
  uploaded: number;
  skipped: number;
  failed: number;
  total: number;
}

const CONCURRENCY = 10;

export function useRunUploader() {
  const { runs, setRuns, setLoading, setLoadProgress } = useRunsStore();
  const user = useAuthStore((s) => s.user);

  async function uploadFiles(
    fileList: FileList | File[],
    onProgress: (status: UploadStatus) => void,
  ): Promise<UploadStatus> {
    const files = Array.from(fileList).filter((f) => f.name.endsWith('.run'));
    const total = files.length;

    setLoading(true);
    setLoadProgress({ loaded: 0, total });

    const status: UploadStatus = { uploaded: 0, skipped: 0, failed: 0, total };
    const newRuns: ParsedRun[] = [];
    let completed = 0;

    // Process files with bounded concurrency using a worker-queue pattern
    const queue = [...files];

    async function worker() {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) return;

        try {
          const exists = await checkRunExists(user!.uid, file.name);
          if (exists) {
            status.skipped++;
          } else {
            const content = await file.text();
            await uploadRunFile(user!.uid, file.name, content);
            await addRunMetadata(user!.uid, file.name, file.size);
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

    const merged = [...runs, ...newRuns].sort(
      (a, b) => (a.data.start_time ?? 0) - (b.data.start_time ?? 0),
    );
    setRuns(merged);
    setLoading(false);
    setLoadProgress(null);

    return status;
  }

  return { uploadFiles };
}
