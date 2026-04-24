import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useRunsStore } from '../store/runs';
import { useAuthStore } from '../store/auth';
import { useRunUploader, type UploadStatus } from '../hooks/useRunUploader';
import { useFileLoader } from '../hooks/useFileLoader';
import { detectProfiles, filterFilesByProfile } from '../lib/profile-detect';
import { ProfileChooser } from '../components/data-load/ProfileChooser';

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
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [detectedProfiles, setDetectedProfiles] = useState<string[]>([]);

  function handleFolderSelected(fileList: FileList) {
    const { profiles, rootIsProfile } = detectProfiles(fileList);

    if (profiles.length > 1 && !rootIsProfile) {
      setPendingFiles(Array.from(fileList));
      setDetectedProfiles(profiles);
      return;
    }

    processFiles(Array.from(fileList), null);
  }

  async function processFiles(files: File[], selectedProfile: string | null) {
    setPendingFiles(null);
    setDetectedProfiles([]);

    const filtered = filterFilesByProfile(files, selectedProfile);
    if (filtered.length === 0) return;

    if (user) {
      setStatus(null);
      await uploadFiles(filtered, setStatus, wipeFirst ? { wipeFirst: true } : undefined);
    } else {
      const before = useRunsStore.getState().runs.length;
      await loadFromFileInput(filtered);
      const after = useRunsStore.getState().runs.length;
      setLocalLoaded(after - before);
    }
  }

  const isWiping = isLoading && loadProgress != null && loadProgress.total === 0;
  const progressPct =
    loadProgress && loadProgress.total > 0
      ? Math.round((loadProgress.loaded / loadProgress.total) * 100)
      : 0;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h2 className="text-lg font-semibold text-gray-100 mb-2">Import Runs</h2>
      <p className="text-gray-400 text-sm mb-10">
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
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-200">
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
            if (e.target.files) handleFolderSelected(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          {isLoading
            ? isWiping
              ? 'Clearing old runs…'
              : user
                ? 'Uploading…'
                : 'Loading…'
            : 'Select SlayTheSpire2 Folder'}
        </button>

        {/* Progress */}
        {isLoading && loadProgress != null && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{isWiping ? 'Removing existing runs…' : user ? 'Uploading…' : 'Loading…'}</span>
              {!isWiping && (
                <span>
                  {loadProgress.loaded} / {loadProgress.total} ({progressPct}%)
                </span>
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
            {wipeFirst && <p className="text-gray-500 mb-1">Previous runs cleared.</p>}
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
      <div className="mt-10 space-y-3">
        <h3 className="text-base font-semibold text-gray-200">Where are my run files?</h3>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-3 text-sm text-gray-400">
          <p>Run files are stored in your AppData folder on Windows:</p>
          <code className="block bg-gray-800/60 text-purple-300 px-3 py-2 rounded text-xs font-mono">
            %APPDATA%\SlayTheSpire2
          </code>
          <p>
            The folder contains a sub-folder for each in-game profile (e.g.,{' '}
            <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">
              profile0
            </code>
            ,{' '}
            <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">
              profile1
            </code>
            ). Each profile's .run files are stored inside its folder.
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            <li>
              Select the root{' '}
              <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">
                SlayTheSpire2
              </code>{' '}
              folder to import all profiles at once.
            </li>
            <li>
              Select a single{' '}
              <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">
                profile#
              </code>{' '}
              sub-folder to import only that profile.
            </li>
          </ul>
          {user && (
            <p className="text-gray-500 border-t border-gray-800 pt-3 mt-1">
              <span className="font-medium text-gray-400">Tip:</span> If you select the root
              SlayTheSpire2 folder and multiple profiles are found, you'll be prompted to choose
              which profile to import.
            </p>
          )}
        </div>
      </div>

      {/* Desktop uploader */}
      {user && (
        <div className="mt-10 space-y-3">
          <h3 className="text-base font-semibold text-gray-200">
            Automatic Uploads with the Desktop Uploader
          </h3>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-4 text-sm text-gray-400">
            <p>
              Instead of manually importing runs each time, you can install the{' '}
              <span className="text-gray-200 font-medium">SlayTheStats Desktop Uploader</span> — a
              lightweight Windows application that runs silently in your system tray and
              automatically uploads new{' '}
              <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">
                .run
              </code>{' '}
              files to your account as soon as they're created.
            </p>

            <div className="bg-gray-800/40 rounded-lg p-4 space-y-2">
              <p className="text-gray-300 font-medium text-xs uppercase tracking-wide">
                How it works
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-400">
                <li>
                  Download the portable executable — no installer required. It's a single{' '}
                  <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">
                    SlayTheStatsUploader.exe
                  </code>{' '}
                  file you can place anywhere on your system.
                </li>
                <li>
                  On first launch, a settings window opens. Paste your API key (generated on the{' '}
                  <Link to="/settings" className="text-purple-400 hover:text-purple-300">
                    Settings page
                  </Link>
                  ) and select which game profiles to monitor.
                </li>
                <li>
                  The uploader minimizes to your system tray and uses a file system watcher to
                  detect new{' '}
                  <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">
                    .run
                  </code>{' '}
                  files the moment they appear in your selected profile folders.
                </li>
                <li>
                  Each new run file is uploaded directly to your cloud account via a secure signed
                  URL. Files already uploaded are tracked locally and automatically skipped.
                </li>
              </ol>
            </div>

            <div className="bg-gray-800/40 rounded-lg p-4 space-y-2">
              <p className="text-gray-300 font-medium text-xs uppercase tracking-wide">Features</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Runs silently in the system tray — no window to keep open.</li>
                <li>
                  Optionally starts automatically when you log in to Windows (configurable in
                  settings).
                </li>
                <li>Pause and resume monitoring from the tray icon right-click menu.</li>
                <li>Retries failed uploads automatically with exponential backoff.</li>
                <li>Keeps a local log file for troubleshooting.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p>
                <span className="text-gray-300 font-medium">Portable &amp; open source:</span> The
                uploader is a single portable{' '}
                <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">
                  .exe
                </code>{' '}
                — no installation or admin rights needed. Just download and run. The full source
                code is available in the{' '}
                <a
                  href="https://github.com/Jazzer360/slay-the-stats/tree/main/uploader/client"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300"
                >
                  uploader/client
                </a>{' '}
                directory of the GitHub repository. It's written in Python and built with
                PyInstaller.
              </p>
            </div>

            <a
              href="https://github.com/Jazzer360/slay-the-stats/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" />
              </svg>
              Download Latest Uploader
            </a>
          </div>
        </div>
      )}

      {/* What happens to my data */}
      {!user && (
        <div className="mt-8 space-y-3">
          <h3 className="text-base font-semibold text-gray-200">Privacy &amp; data</h3>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 text-sm text-gray-400 space-y-2">
            <p>
              Without an account, your run files never leave your browser. All parsing, Elo
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

      {/* Profile chooser modal */}
      {pendingFiles && detectedProfiles.length > 1 && (
        <ProfileChooser
          profiles={detectedProfiles}
          onSelect={(profile) => processFiles(pendingFiles, profile)}
          onCancel={() => {
            setPendingFiles(null);
            setDetectedProfiles([]);
          }}
        />
      )}
    </div>
  );
}
