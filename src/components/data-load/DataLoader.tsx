import { useRef } from 'react';
import { useFileLoader } from '../../hooks/useFileLoader';
import { useRunsStore } from '../../store/runs';

export function DataLoader() {
  const { loadFromFileInput, expectedPath } =
    useFileLoader();
  const { isLoading, loadProgress, error } = useRunsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-100 mb-2">
          ⚔ Slay the Stats
        </h2>
        <p className="text-gray-400 max-w-lg">
          Load your Slay the Spire 2 run history to analyze card pick rates,
          ELO rankings, and run statistics.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Load Run History
        </h3>

        <div className="bg-gray-800/50 rounded p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">Expected location:</p>
          <code className="text-xs text-purple-400 break-all">
            {expectedPath}
          </code>
        </div>

        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            /* @ts-expect-error webkitdirectory is non-standard */
            webkitdirectory="true"
            multiple
            onChange={(e) => {
              if (e.target.files) loadFromFileInput(e.target.files);
            }}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : 'Select SlayTheSpire2 Folder'}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          All .run files are loaded recursively from the selected directory.
          You can select the root SlayTheSpire2 folder to load all profiles,
          or a single profile folder to load just that one.
        </p>

        {/* Progress */}
        {loadProgress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Loading runs...</span>
              <span>
                {loadProgress.loaded} / {loadProgress.total}
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-200"
                style={{
                  width: `${(loadProgress.loaded / loadProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-800 rounded p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 max-w-md text-center">
        All processing happens locally in your browser. No data is uploaded or
        stored on any server.
      </p>
    </div>
  );
}
