import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router';
import { useActiveRuns } from '../../hooks/useActiveRuns';
import { useProfileRunsStore } from '../../store/profileRuns';
import { useAuthStore } from '../../store/auth';
import { doSignOut } from '../../lib/auth';
import { FilterBar } from './FilterBar';
import { AuthModal } from '../auth/AuthModal';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/card-elo', label: 'Card ELO' },
  { to: '/ancient-elo', label: 'Ancient ELO' },
  { to: '/runs', label: 'Run List' },
  { to: '/import', label: 'Import' },
  { to: '/about', label: 'About' },
];

export function AppShell() {
  const activeRuns = useActiveRuns();
  const runCount = activeRuns.length;
  const isProfileView = useProfileRunsStore((s) => s.profileRuns !== null);
  const { user, userProfile, authLoading } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName =
    userProfile?.screenName ??
    user?.displayName ??
    user?.email?.split('@')[0] ??
    'Account';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-purple-400 whitespace-nowrap">
              ⚔ Slay the Stats
            </h1>
            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-600/20 text-purple-300'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {runCount > 0 && !isProfileView && (
              <span className="text-xs text-gray-500">{runCount} runs loaded</span>
            )}

            {/* Auth area */}
            {!authLoading && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-gray-300 hover:text-gray-100 hover:bg-gray-800 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                      {displayName[0].toUpperCase()}
                    </span>
                    <span className="max-w-30 truncate">{displayName}</span>
                    <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 mt-1 w-44 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-20 py-1">
                        <Link
                          to="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-300 hover:text-gray-100 hover:bg-gray-800 transition-colors"
                        >
                          Settings
                        </Link>
                        {userProfile?.screenName && (
                          <Link
                            to={`/u/${userProfile.screenName}`}
                            onClick={() => setShowUserMenu(false)}
                            className="block px-4 py-2 text-sm text-gray-300 hover:text-gray-100 hover:bg-gray-800 transition-colors"
                          >
                            My Profile
                          </Link>
                        )}
                        <div className="h-px bg-gray-800 my-1" />
                        <button
                          onClick={() => { doSignOut(); setShowUserMenu(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Filter Bar (only show when runs loaded) */}
      {runCount > 0 && <FilterBar />}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
