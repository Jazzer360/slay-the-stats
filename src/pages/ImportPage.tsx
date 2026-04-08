import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useRunsStore } from '../store/runs';
import { useAuthStore } from '../store/auth';
import { useRunUploader, type UploadStatus } from '../hooks/useRunUploader';
import { useFileLoader } from '../hooks/useFileLoader';

export function ImportPage() {
  const user = useAuthStore((s) => s.user);
  const runs = useRunsStore((s) => s.runs);
  const { isLoading, loadProgress, error } = useRunsStore();
  const { uploadFiles } = useRunUploader();
  const { loadFromFileInput } = useFileLoader();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wipeFirst, setWipeFirst] = useState(false);
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [localLoaded, setLocalLoaded] = useState<number | null>(null);

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList).filter((f) => f.name.endsWith('.run'));
    if (files.length === 0) return;

    if (user) {
      setStatus(null);
      await uploadFiles(fileList, setStatus, wipeFirst ? { wipeFirst: true } : undefined);
    } else {
      const before = useRunsStore.getState().runs.length;
      await loadFromFileInput(fileList);
      const after = useRunsStore.getState().runs.length;
      setLocalLoaded(after - before);
    }
  }

  const isWiping = isLoading && loadProgress != null && loadProgress.total === 0;
  const progressPct = loadProgress && loadProgress.total > 0
    ? Math.round((loadProgress.loaded / loadProgress.total) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h2 className="text-2xl font-bold text-gray-100 mb-2">Import Runs</h2>
      <p className="text-gray-400 text-sm mb-8">
        {user
          ? 'Upload your Slay the Spire 2 run files to your cloud account so they load automatically on every visit.'
          : 'Load your run files locally to analyze your stats. No account required — all processing happens in your browser.'}
      </p>

      {!user && (
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-4 mb-6 text-sm text-blue-300">
          <span className="font-medium">Want to save your runs?</span> Sign in to upload them to the
          cloud, access them from any device, and get a shareable profile page. Runs loaded locally
          are session-only and will disappear when you close the tab.
        </div>
      )}

      {/* Upload card */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">
          {user ? 'Select Your SlayTheSpire2 Folder' : 'Load Run Files'}
        </h3>

        <p className="text-xs text-gray-500">
          {user
            ? 'Point to your local SlayTheSpire2 folder. Every .run file in any sub-folder will be processed. Runs already in your account are skipped unless you choose to replace everything below.'
            : 'Select your local SlayTheSpire2 folder (or a single profile folder). All .run files are loaded into memory for this browser session.'}
        </p>

        {user && (
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={wipeFirst}
              onChange={(e) => setWipeFirst(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-purple-500 shrink-0"
            />
            <div>
              <span className="text-sm text-gray-200 font-medium group-hover:text-white transition-colors">
                Replace all runs
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Permanently deletes all runs currently in your account, then uploads fresh from the
                selected folder. Use this to filter by profile — select only the profile folder you
                want to analyze.
              </p>
            </div>
          </label>
        )}

        {wipeFirst && runs.length > 0 && (
          <div className="bg-red-900/20 border border-red-800/40 rounded p-3">
            <p className="text-xs text-red-400">
              ⚠ All {runs.length} run{runs.length !== 1 ? 's' : ''} currently in your account will
              be permanently deleted before uploading. This cannot be undone.
            </p>
          </div>
        )}

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
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          {isLoading ? (isWiping ? 'Clearing old runs…' : (user ? 'Uploading…' : 'Loading…')) : 'Select SlayTheSpire2 Folder'}
        </button>

        {/* Progress */}
        {isLoading && loadProgress != null && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{isWiping ? 'Removing existing runs…' : (user ? 'Uploading…' : 'Loading…')}</span>
              {!isWiping && (
                <span>{loadProgress.loaded} / {loadProgress.total} ({progressPct}%)</span>
              )}
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-200 ${isWiping ? 'bg-red-500 w-full animate-pulse' : 'bg-purple-500'}`}
                style={isWiping ? undefined : { width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Cloud upload summary */}
        {status && !isLoading && (
          <div className="bg-gray-800/50 rounded p-3 text-xs text-gray-400 space-y-0.5">
            {wipeFirst && (
              <p className="text-gray-500 mb-1">Previous runs cleared.</p>
            )}
            <p>
              <span className="text-green-400 font-medium">{status.uploaded}</span> run
              {status.uploaded !== 1 ? 's' : ''} uploaded
            </p>
            {status.skipped > 0 && (
              <p>
                <span className="text-gray-300 font-medium">{status.skipped}</span> already existed
                (skipped)
              </p>
            )}
            {status.failed > 0 && (
              <p>
                <span className="text-red-400 font-medium">{status.failed}</span> failed
              </p>
            )}
          </div>
        )}

        {/* Local load summary */}
        {localLoaded !== null && !isLoading && (
          <div className="bg-gray-800/50 rounded p-3 text-xs text-gray-400">
            <p>
              <span className="text-green-400 font-medium">{localLoaded}</span> run
              {localLoaded !== 1 ? 's' : ''} loaded into this session.{' '}
              <Link to="/runs" className="text-purple-400 hover:text-purple-300">
                View your runs →
              </Link>
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* How to find your files */}
      <div className="mt-8 space-y-3">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Where are my run files?
        </h3>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3 text-sm text-gray-400">
          <p>Run files are stored in your AppData folder on Windows:</p>
          <code className="block bg-gray-800/60 text-purple-300 px-3 py-2 rounded text-xs font-mono">
            %APPDATA%\SlayTheSpire2
          </code>
          <p>
            The folder contains a sub-folder for each in-game profile (e.g.,{' '}
            <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">profile0</code>,{' '}
            <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">profile1</code>
            ). Each profile's .run files are stored inside its folder.
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            <li>
              Select the root <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">SlayTheSpire2</code>{' '}
              folder to import all profiles at once.
            </li>
            <li>
              Select a single <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">profile#</code>{' '}
              sub-folder to import only that profile.
            </li>
          </ul>
          {user && (
            <p className="text-gray-500 border-t border-gray-800 pt-3 mt-1">
              <span className="font-medium text-gray-400">Tip:</span> Slay the Stats currently
              doesn't filter by profile, but you can achieve the same result with "Replace all runs"
              — wipe your account and re-upload only the profile folder you want to analyze.
            </p>
          )}
        </div>
      </div>

      {/* What happens to my data */}
      {!user && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Privacy &amp; data
          </h3>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 text-sm text-gray-400 space-y-2">
            <p>
              Without an account, your run files never leave your browser. All parsing, ELO
              calculation, and stats happen locally. Nothing is sent to any server.
            </p>
            <p>
              The only exception is if you choose to{' '}
              <span className="text-gray-300">share a specific run</span> — that run's content is
              stored in the cloud so the recipient can view it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
