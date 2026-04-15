import { useState, useEffect } from 'react';
import { useParams, Outlet, Link, useLocation } from 'react-router';
import { getUserByScreenName } from '../lib/firestore';
import { downloadAllUserRuns } from '../lib/cloudStorage';
import { useProfileRunsStore } from '../store/profileRuns';
import { useFilterStore } from '../store/filters';
import { useAuthStore } from '../store/auth';
import type { UserProfile } from '../types/user';

/** Map current profile path to its non-profile equivalent, stripping detail segments. */
function getMyStatsPath(pathname: string): string {
  const match = pathname.match(/^\/u\/[^/]+\/([^/]+)/);
  return match ? `/${match[1]}` : '/dashboard';
}

type PageState = 'loading' | 'not-found' | 'private' | 'loaded' | 'error';

export function ProfilePage() {
  const { screenName } = useParams<{ screenName: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const { setProfileRuns, clearProfileRuns } = useProfileRunsStore();
  const { applyDefaults, resetFilters } = useFilterStore();

  useEffect(() => {
    if (!screenName) return;
    let cancelled = false;

    async function load() {
      setPageState('loading');
      clearProfileRuns();
      try {
        const foundProfile = await getUserByScreenName(screenName!);
        if (cancelled) return;

        if (!foundProfile) {
          setPageState('not-found');
          return;
        }

        setProfile(foundProfile);

        if (foundProfile.profileVisibility === 'private') {
          setPageState('private');
          return;
        }

        // Apply the profile owner's default filters
        applyDefaults(foundProfile.defaultFilters);

        const runs = await downloadAllUserRuns(foundProfile.uid, (p) => {
          if (!cancelled) setLoadProgress(p);
        });

        if (cancelled) return;

        setProfileRuns(runs, foundProfile.screenName ?? screenName!);
        setLoadProgress(null);
        setPageState('loaded');
      } catch (err) {
        if (!cancelled) {
          console.error('ProfilePage load error:', err);
          setPageState('error');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      clearProfileRuns();
      const ownDefaults = useAuthStore.getState().userProfile?.defaultFilters;
      if (ownDefaults) {
        applyDefaults(ownDefaults);
      } else {
        resetFilters();
      }
    };
  }, [screenName, setProfileRuns, clearProfileRuns, applyDefaults, resetFilters]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (pageState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-400 text-sm">Loading profile…</p>
        {loadProgress && (
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>
                {loadProgress.loaded} / {loadProgress.total} runs
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${(loadProgress.loaded / loadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (pageState === 'not-found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <p className="text-2xl font-bold text-gray-300">Profile Not Found</p>
        <p className="text-gray-500 text-sm">
          No user with the screen name <span className="text-gray-300 font-mono">{screenName}</span>{' '}
          exists.
        </p>
      </div>
    );
  }

  if (pageState === 'private') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <p className="text-2xl font-bold text-gray-300">Private Profile</p>
        <p className="text-gray-500 text-sm">
          <span className="text-gray-300 font-medium">{profile?.screenName}</span>'s profile is
          private.
        </p>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-400 text-sm">Failed to load profile. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">{profile?.screenName}</h2>
          <p className="text-sm text-gray-500 mt-1">Public Profile</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Link
              to={getMyStatsPath(location.pathname)}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              ← My Stats
            </Link>
          )}
          <button
            onClick={copyLink}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Sub-page content */}
      <Outlet />
    </div>
  );
}
