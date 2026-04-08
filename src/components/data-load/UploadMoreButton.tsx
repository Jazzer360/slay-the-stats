import { useRef, useState } from 'react';
import { useRunsStore } from '../../store/runs';
import { useAuthStore } from '../../store/auth';
import { useRunUploader, type UploadStatus } from '../../hooks/useRunUploader';

export function UploadMoreButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isLoading, loadProgress } = useRunsStore();
  const user = useAuthStore((s) => s.user);
  const { uploadFiles } = useRunUploader();
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!user) return null;

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList).filter((f) => f.name.endsWith('.run'));
    if (files.length === 0) return;
    setStatus({ uploaded: 0, skipped: 0, failed: 0, total: files.length });
    await uploadFiles(fileList, setStatus);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors"
      >
        <span className="font-medium">Upload More Runs</span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-3">
          <p className="text-xs text-gray-500">
            Select your SlayTheSpire2 folder. Runs already uploaded will be skipped.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            /* @ts-expect-error webkitdirectory is non-standard */
            webkitdirectory="true"
            multiple
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'Uploading…' : 'Select SlayTheSpire2 Folder'}
          </button>

          {loadProgress && isLoading && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Uploading…</span>
                <span>{loadProgress.loaded} / {loadProgress.total}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${(loadProgress.loaded / loadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {status && !isLoading && (
            <div className="bg-gray-800/50 rounded p-2.5 text-xs text-gray-400 space-y-0.5">
              <p><span className="text-green-400 font-medium">{status.uploaded}</span> new runs uploaded</p>
              {status.skipped > 0 && <p><span className="text-gray-300 font-medium">{status.skipped}</span> already existed (skipped)</p>}
              {status.failed > 0 && <p><span className="text-red-400 font-medium">{status.failed}</span> failed</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
