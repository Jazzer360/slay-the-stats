import { Link } from 'react-router';
import { useActiveRuns } from '../../hooks/useActiveRuns';
import { useFilterStore } from '../../store/filters';
import { useProfileRunsStore } from '../../store/profileRuns';
import { applyFilters } from '../../lib/filters';

export function RunEmptyState() {
  const runs = useActiveRuns();
  const filters = useFilterStore();
  const isProfileView = useProfileRunsStore((s) => s.profileRuns !== null);
  const hasExcludedCustomRuns =
    filters.customRuns === 'exclude' &&
    applyFilters(runs, { ...filters, customRuns: 'only' }).length > 0;

  return (
    <div className="text-center text-gray-500 py-20 space-y-3">
      {runs.length > 0 ? (
        <>
          <p>No runs match these filters.</p>
          {hasExcludedCustomRuns && (
            <>
              <p className="text-sm">Custom runs are excluded by default.</p>
              <button
                onClick={() => filters.setCustomRuns('include')}
                className="text-sm text-purple-400 hover:text-purple-300 underline"
              >
                Include custom runs
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
