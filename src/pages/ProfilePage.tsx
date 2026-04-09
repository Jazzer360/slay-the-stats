import { useState, useEffect } from 'react';
import { useParams, NavLink, Outlet } from 'react-router';
import { getUserByScreenName, listUserRuns } from '../lib/firestore';
import { downloadRunFileBytes } from '../lib/cloudStorage';
import { parseRunFile } from '../lib/parser';
import { useProfileRunsStore } from '../store/profileRuns';
import type { UserProfile } from '../types/user';

type PageState = 'loading' | 'not-found' | 'private' | 'loaded' | 'error';

export function ProfilePage() {
  const { screenName } = useParams<{ screenName: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const { setProfileRuns, clearProfileRuns } = useProfileRunsStore();

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

        const metadata = await listUserRuns(foundProfile.uid);
        if (cancelled) return;

        setLoadProgress({ loaded: 0, total: metadata.length });

        const results = await Promise.allSettled(
          metadata.map(async ({ fileName }) => {
            const content = await downloadRunFileBytes(foundProfile.uid, fileName);
            return parseRunFile(fileName, content);
          })
        );

        if (cancelled) return;

        const loaded = [];
        let count = 0;
        for (const r of results) {
          count++;
          if (r.status === 'fulfilled') loaded.push(r.value);
          setLoadProgress({ loaded: count, total: metadata.length });
        }

        loaded.sort((a, b) => (a.data.start_time ?? 0) - (b.data.start_time ?? 0));
        setProfileRuns(loaded, foundProfile.screenName ?? screenName!);
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
    };
  }, [screenName, setProfileRuns, clearProfileRuns]);

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
              <span>{loadProgress.loaded} / {loadProgress.total} runs</span>
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
          No user with the screen name <span className="text-gray-300 font-mono">{screenName}</span> exists.
        </p>
      </div>
    );
  }

  if (pageState === 'private') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <p className="text-2xl font-bold text-gray-300">Private Profile</p>
        <p className="text-gray-500 text-sm">
          <span className="text-gray-300 font-medium">{profile?.screenName}</span>'s profile is private.
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

  const base = `/u/${screenName}`;

  const NAV_TABS = [
    { to: base, label: 'Dashboard', end: true },
    { to: `${base}/card-elo`, label: 'Card ELO' },
    { to: `${base}/ancient-elo`, label: 'Ancient ELO' },
    { to: `${base}/combat-stats`, label: 'Combat Stats' },
    { to: `${base}/runs`, label: 'Run History' },
  ];

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">{profile?.screenName}</h2>
          <p className="text-sm text-gray-500 mt-1">Public Profile</p>
        </div>
        <button
          onClick={copyLink}
          className="px-3 py-1.5 rounded text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy Profile Link'}
        </button>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {NAV_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-3 py-2 text-sm font-medium rounded-t transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'text-purple-300 border-purple-500'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Sub-page content */}
      <Outlet />
    </div>
  );
}
