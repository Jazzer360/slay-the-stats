import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import { useRunsStore } from '../store/runs';
import { doSignOut } from '../lib/auth';
import {
  updateUserProfile,
  reserveScreenName,
  isScreenNameAvailable,
} from '../lib/firestore';
import { deleteRunFile, listUserRunFiles, deleteAllRunFiles } from '../lib/cloudStorage';
import type { DefaultProfileFilters } from '../types/user';
import { EMPTY_DEFAULT_FILTERS } from '../types/user';

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const SCREEN_NAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

export function SettingsPage() {
  const { user, userProfile, setUserProfile } = useAuthStore();
  const { runs, setRuns } = useRunsStore();

  // ─── Profile section ─────────────────────────────────────────
  const [screenName, setScreenName] = useState(userProfile?.screenName ?? '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    userProfile?.profileVisibility ?? 'private'
  );
  const [availability, setAvailability] = useState<AvailabilityState>('idle');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // ─── Default filter settings ──────────────────────────────────
  const [defaultFilters, setDefaultFilters] = useState<DefaultProfileFilters>(
    userProfile?.defaultFilters ?? { ...EMPTY_DEFAULT_FILTERS }
  );

  useEffect(() => {
    if (userProfile?.defaultFilters) {
      setDefaultFilters(userProfile.defaultFilters);
    }
  }, [userProfile?.defaultFilters]);

  // Debounce screen name uniqueness check
  useEffect(() => {
    const trimmed = screenName.trim();
    if (trimmed === (userProfile?.screenName ?? '')) {
      setAvailability('idle');
      return;
    }
    if (!SCREEN_NAME_REGEX.test(trimmed)) {
      setAvailability(trimmed.length === 0 ? 'idle' : 'invalid');
      return;
    }
    setAvailability('checking');
    const id = setTimeout(async () => {
      try {
        const free = await isScreenNameAvailable(trimmed);
        setAvailability(free ? 'available' : 'taken');
      } catch {
        setAvailability('idle');
      }
    }, 500);
    return () => clearTimeout(id);
  }, [screenName, userProfile?.screenName]);

  async function handleSaveProfile() {
    if (!user || !userProfile) return;
    setProfileSaving(true);
    setProfileSaveError(null);
    setProfileSaved(false);
    try {
      const trimmed = screenName.trim();
      const nameChanged = trimmed !== (userProfile.screenName ?? '');

      if (nameChanged) {
        if (!SCREEN_NAME_REGEX.test(trimmed) && trimmed.length > 0) {
          throw new Error('Screen name must be 3-20 characters and contain only letters, numbers, _ or -');
        }
        if (trimmed.length > 0) {
          await reserveScreenName(user.uid, trimmed, userProfile.screenName);
        }
      }

      const updates: Record<string, unknown> = {};
      if (visibility !== userProfile.profileVisibility) {
        updates.profileVisibility = visibility;
      }
      if (JSON.stringify(defaultFilters) !== JSON.stringify(userProfile.defaultFilters)) {
        updates.defaultFilters = defaultFilters;
      }
      if (Object.keys(updates).length > 0) {
        await updateUserProfile(user.uid, updates as Parameters<typeof updateUserProfile>[1]);
      }

      setUserProfile({ ...userProfile, screenName: trimmed || null, profileVisibility: visibility, defaultFilters });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  // ─── Runs section ─────────────────────────────────────────────
  const [runFileNames, setRunFileNames] = useState<string[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const loadRunFileNames = useCallback(async () => {
    if (!user) return;
    try {
      const list = await listUserRunFiles(user.uid);
      list.sort((a, b) => a.localeCompare(b));
      setRunFileNames(list);
    } finally {
      setRunsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadRunFileNames(); }, [loadRunFileNames]);

  async function handleDeleteRun(fileName: string) {
    if (!user) return;
    setDeleting(fileName);
    try {
      await deleteRunFile(user.uid, fileName);
      setRunFileNames((prev) => prev.filter((n) => n !== fileName));
      setRuns(runs.filter((r) => r.fileName !== fileName));
    } catch (err) {
      console.error('Failed to delete run:', err);
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  }

  async function handleDeleteAllRuns() {
    if (!user) return;
    setDeletingAll(true);
    try {
      await deleteAllRunFiles(user.uid);
      setRunFileNames([]);
      setRuns([]);
    } catch (err) {
      console.error('Failed to delete all runs:', err);
    } finally {
      setDeletingAll(false);
      setDeleteAllConfirm(false);
    }
  }

  const profileLink = userProfile?.screenName
    ? `${window.location.origin}/u/${userProfile.screenName}`
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <h2 className="text-lg font-semibold text-gray-100">Settings</h2>

      {/* ── Profile ───────────────────────────────────────────── */}
      <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-200">Profile</h3>

        {/* Screen name */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Screen Name</label>
          <p className="text-xs text-gray-500 mb-2">A screen name is required to make your profile public.</p>
          <div className="relative">
            <input
              type="text"
              value={screenName}
              onChange={(e) => { setScreenName(e.target.value); setProfileSaved(false); }}
              placeholder="e.g. IroncladsUnite"
              maxLength={20}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 pr-24"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
              {availability === 'checking' && <span className="text-gray-500">checking…</span>}
              {availability === 'available' && <span className="text-green-400">✓ available</span>}
              {availability === 'taken' && <span className="text-red-400">✗ taken</span>}
              {availability === 'invalid' && <span className="text-yellow-500">invalid format</span>}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-600">3–20 characters. Letters, numbers, _ and - allowed.</p>
          {profileLink && (
            <p className="mt-2 text-xs text-gray-500">
              Profile URL:{' '}
              <a href={profileLink} className="text-purple-400 hover:underline break-all">{profileLink}</a>
            </p>
          )}
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Profile Visibility</label>
          <div className="flex gap-2">
            {(['private', 'public'] as const).map((v) => {
              const needsScreenName = v === 'public' && !screenName.trim();
              return (
                <button
                  key={v}
                  onClick={() => !needsScreenName && setVisibility(v)}
                  disabled={needsScreenName}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    visibility === v
                      ? 'bg-purple-600 text-white'
                      : needsScreenName
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-gray-600">
            {visibility === 'public'
              ? 'Anyone with your profile link can view your runs.'
              : 'Only you can see your runs. Individual runs can still be shared via a share link.'}
          </p>
        </div>

        {profileSaveError && (
          <p className="text-sm text-red-400">{profileSaveError}</p>
        )}

        <button
          onClick={handleSaveProfile}
          disabled={profileSaving || availability === 'taken' || availability === 'invalid' || availability === 'checking'}
          className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {profileSaving ? 'Saving…' : profileSaved ? '✓ Saved' : 'Save Profile'}
        </button>
      </section>

      {/* ── Default Profile Filters ───────────────────────────── */}
      <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-gray-200">Default Profile Filters</h3>
          <p className="text-xs text-gray-500 mt-1.5">
            When visitors view your public profile, these filters will be applied by default. They can still change the filters themselves.
          </p>
        </div>

        {/* Character */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Character</label>
          <select
            value={defaultFilters.character ?? ''}
            onChange={(e) => setDefaultFilters({ ...defaultFilters, character: e.target.value || null })}
            className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 px-3 py-2"
          >
            <option value="">All</option>
            <option value="IRONCLAD">Ironclad</option>
            <option value="THE_SILENT">Silent</option>
            <option value="DEFECT">Defect</option>
            <option value="WATCHER">Watcher</option>
          </select>
        </div>

        {/* Ascension range */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Ascension Range</label>
          <div className="flex items-center gap-2">
            <select
              value={defaultFilters.ascensionMin ?? ''}
              onChange={(e) => setDefaultFilters({ ...defaultFilters, ascensionMin: e.target.value ? Number(e.target.value) : null })}
              className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 px-3 py-2"
            >
              <option value="">Min</option>
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
            <span className="text-gray-600">–</span>
            <select
              value={defaultFilters.ascensionMax ?? ''}
              onChange={(e) => setDefaultFilters({ ...defaultFilters, ascensionMax: e.target.value ? Number(e.target.value) : null })}
              className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 px-3 py-2"
            >
              <option value="">Max</option>
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Result */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Result</label>
          <div className="flex gap-2">
            {(['all', 'win', 'loss'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDefaultFilters({ ...defaultFilters, result: r })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  defaultFilters.result === r
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {r === 'all' ? 'All' : r === 'win' ? 'Wins' : 'Losses'}
              </button>
            ))}
          </div>
        </div>

        {/* Player mode */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Player Mode</label>
          <div className="flex gap-2">
            {(['all', 'solo', 'multi'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setDefaultFilters({ ...defaultFilters, playerMode: m })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  defaultFilters.playerMode === m
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'all' ? 'All' : m === 'solo' ? 'Solo' : 'Multiplayer'}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-600">These defaults are saved with your profile settings above.</p>
      </section>

      {/* ── Uploaded Runs ─────────────────────────────────────── */}
      <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-200">Uploaded Runs</h3>
          <span className="text-xs text-gray-500">{runFileNames.length} total</span>
        </div>

        {runsLoading && (
          <p className="text-sm text-gray-500">Loading…</p>
        )}

        {!runsLoading && runFileNames.length === 0 && (
          <p className="text-sm text-gray-500">No runs uploaded yet.</p>
        )}

        {!runsLoading && runFileNames.length > 0 && (
          <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto rounded-lg border border-gray-800">
            {runFileNames.map((fileName) => (
              <div key={fileName} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <span className="text-xs text-gray-400 font-mono truncate">{fileName}</span>
                <button
                  onClick={() => setDeleteConfirm(fileName)}
                  disabled={deleting === fileName}
                  className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 whitespace-nowrap transition-colors"
                >
                  {deleting === fileName ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}

        {!runsLoading && runFileNames.length > 0 && (
          <button
            onClick={() => setDeleteAllConfirm(true)}
            disabled={deletingAll}
            className="text-sm text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors"
          >
            {deletingAll ? 'Deleting all…' : 'Delete All History'}
          </button>
        )}
      </section>

      {/* ── Account ───────────────────────────────────────────── */}
      <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-3">
        <h3 className="text-base font-semibold text-gray-200">Account</h3>
        <p className="text-xs text-gray-500">{user?.email}</p>
        <button
          onClick={() => doSignOut()}
          className="text-sm text-red-500 hover:text-red-400 transition-colors"
        >
          Sign Out
        </button>
      </section>

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h4 className="text-gray-100 font-medium mb-2">Delete Run?</h4>
            <p className="text-sm text-gray-400 mb-1 break-all font-mono">{deleteConfirm}</p>
            <p className="text-xs text-gray-500 mb-5">This will permanently delete the run from your cloud storage. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRun(deleteConfirm)}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete All Confirmation Modal ──────────────────────── */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h4 className="text-gray-100 font-medium mb-2">Delete All Run History?</h4>
            <p className="text-sm text-gray-400 mb-1">This will permanently delete all <strong>{runFileNames.length}</strong> runs from your cloud storage.</p>
            <p className="text-xs text-red-400 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteAllConfirm(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllRuns}
                disabled={deletingAll}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-red-900 text-white py-2 rounded-lg text-sm transition-colors"
              >
                {deletingAll ? 'Deleting…' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
