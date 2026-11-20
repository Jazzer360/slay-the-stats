import { Link } from 'react-router';
import { useActiveRuns } from '../../hooks/useActiveRuns';
import { useFilterStore } from '../../store/filters';
import { useProfileRunsStore } from '../../store/profileRuns';
import { applyFilters } from '../../lib/filters';
import { gameModeLabel, runGameMode, sortGameModes } from '../../lib/run-mode';

export function RunEmptyState() {
  const runs = useActiveRuns();
  const filters = useFilterStore();
  const isProfileView = useProfileRunsStore((s) => s.profileRuns !== null);
  // Modes whose runs would match if they weren't excluded.
  const hiddenModes =
    filters.excludedModes.length > 0
      ? sortGameModes(
          applyFilters(runs, { ...filters, excludedModes: [] })
            .map((r) => runGameMode(r.data))
            .filter((m) => filters.excludedModes.includes(m)),
        )
      : [];

  return (
    <div className="text-center text-gray-500 py-20 space-y-3">
      {runs.length > 0 ? (
        <>
          <p>No runs match these filters.</p>
          {hiddenModes.length > 0 && (
            <>
              <p className="text-sm">
                Matching runs are hidden by the mode filter (
                {hiddenModes.map(gameModeLabel).join(', ')}).
              </p>
              <button
                onClick={() =>
                  filters.setExcludedModes(
                    filters.excludedModes.filter((m) => !hiddenModes.includes(m)),
                  )
                }
                className="text-sm text-purple-400 hover:text-purple-300 underline"
              >
                Include {hiddenModes.map((m) => gameModeLabel(m).toLowerCase()).join(' and ')} runs
              </button>
            </>
          )}
        </>
      ) : isProfileView ? (
        <p>No runs available for this profile.</p>
      ) : (
        <p>
          No runs loaded.{' '}
          <Link to="/import" className="text-purple-400 hover:text-purple-300">
            Import your runs
          </Link>{' '}
          to get started.
        </p>
      )}
    </div>
  );
}
