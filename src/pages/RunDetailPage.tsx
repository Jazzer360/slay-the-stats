import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useActiveRuns } from '../hooks/useActiveRuns';
import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { useProfileNav } from '../hooks/useProfileNav';
import { useProfileRunsStore } from '../store/profileRuns';
import { useAuthStore } from '../store/auth';
import { createShare, createPublicShare } from '../lib/firestore';
import { RunDetail } from '../components/run/RunDetail';

export function RunDetailPage() {
  const { fileName } = useParams<{ fileName: string }>();
  const allRuns = useActiveRuns();
  const filteredRuns = useFilteredRuns();
  const user = useAuthStore((s) => s.user);
  const isProfileView = useProfileRunsStore((s) => s.profileRuns !== null);
  const { toRunDetail, runsPath } = useProfileNav();
  const navigate = useNavigate();
  const decodedName = fileName ? decodeURIComponent(fileName) : '';
  const matchesName = (r: { fileName: string }) =>
    r.fileName === `${decodedName}.run` || r.fileName === decodedName;
  const runExists = allRuns.some(matchesName);
  const filteredIndex = filteredRuns.findIndex(matchesName);
  const run = filteredIndex >= 0 ? filteredRuns[filteredIndex] : allRuns.find(matchesName);
  const prevRun = filteredIndex > 0 ? filteredRuns[filteredIndex - 1] : undefined;
  const nextRun =
    filteredIndex >= 0 && filteredIndex < filteredRuns.length - 1
      ? filteredRuns[filteredIndex + 1]
      : undefined;

  useEffect(() => {
    if (runExists && filteredIndex === -1) {
      navigate(runsPath, { replace: true });
    }
  }, [runExists, filteredIndex, navigate, runsPath]);

  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'copied' | 'error'>('idle');

  async function handleShare() {
    if (!run) return;
    setShareState('sharing');
    try {
      const token = crypto.randomUUID();
      const runContent = JSON.stringify(run.data);
      if (user) {
        await createShare(token, user.uid, run.fileName, runContent);
      } else {
        await createPublicShare(token, run.fileName, runContent);
      }
      const shareUrl = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 3000);
    } catch (err) {
      console.error('Share failed:', err);
      setShareState('error');
      setTimeout(() => setShareState('idle'), 3000);
    }
  }

  if (!run) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>Run not found.</p>
        <Link to={runsPath} className="text-purple-400 underline text-sm">
          Back to Run List
        </Link>
      </div>
    );
  }

  const d = run.data;
  const player = d.players[0];
  if (!player) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>Invalid run data (no player found).</p>
        <Link to={runsPath} className="text-purple-400 underline text-sm">
          Back to Run List
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link to={runsPath} className="text-sm text-gray-500 hover:text-gray-300">
          ← Back to Run List
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => prevRun && toRunDetail(prevRun.fileName)}
            disabled={!prevRun}
            className="px-3 py-1 rounded-lg text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-600">
            {filteredIndex >= 0 ? filteredIndex + 1 : '—'} / {filteredRuns.length}
          </span>
          <button
            onClick={() => nextRun && toRunDetail(nextRun.fileName)}
            disabled={!nextRun}
            className="px-3 py-1 rounded-lg text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
          {!isProfileView && (
            <button
              onClick={handleShare}
              disabled={shareState === 'sharing'}
              title={user ? 'Share this run' : 'Share this run (link is permanent)'}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                shareState === 'copied'
                  ? 'bg-green-800 text-green-300'
                  : shareState === 'error'
                    ? 'bg-red-800 text-red-300'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {shareState === 'sharing'
                ? 'Sharing…'
                : shareState === 'copied'
                  ? '✓ Link Copied!'
                  : shareState === 'error'
                    ? 'Share Failed'
                    : 'Share Run'}
            </button>
          )}
        </div>
      </div>

      <RunDetail run={run} />
    </div>
  );
}
