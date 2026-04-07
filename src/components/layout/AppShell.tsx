import { NavLink, Outlet } from 'react-router';
import { useRunsStore } from '../../store/runs';
import { FilterBar } from './FilterBar';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/card-elo', label: 'Card ELO' },
  { to: '/ancient-elo', label: 'Ancient ELO' },
  { to: '/runs', label: 'Run List' },
  { to: '/about', label: 'About' },
];

export function AppShell() {
  const runCount = useRunsStore((s) => s.runs.length);

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
          {runCount > 0 && (
            <span className="text-xs text-gray-500">
              {runCount} runs loaded
            </span>
          )}
        </div>
      </header>

      {/* Filter Bar (only show when runs loaded) */}
      {runCount > 0 && <FilterBar />}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
