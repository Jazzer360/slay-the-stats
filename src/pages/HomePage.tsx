import { useRunsStore } from '../store/runs';
import { DataLoader } from '../components/data-load/DataLoader';
import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { computeAggregateStats } from '../lib/stats';
import { formatId, formatPercent } from '../lib/format';

export function HomePage() {
  const runs = useRunsStore((s) => s.runs);
  const filteredRuns = useFilteredRuns();

  if (runs.length === 0) {
    return <DataLoader />;
  }

  const stats = computeAggregateStats(filteredRuns);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-100">Overview</h2>
        <span className="text-sm text-gray-500">
          Showing {filteredRuns.length} of {runs.length} runs
        </span>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Runs" value={stats.totalRuns.toString()} />
        <StatCard
          label="Win Rate"
          value={formatPercent(stats.winRate)}
          sub={`${stats.wins}W / ${stats.losses}L`}
        />
        <StatCard
          label="Avg Floors"
          value={stats.avgFloorsReached.toFixed(1)}
        />
        <StatCard
          label="Avg Deck Size"
          value={stats.avgDeckSize.toFixed(1)}
        />
      </div>

      {/* Character breakdown */}
      {stats.characterBreakdown.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            By Character
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats.characterBreakdown.map((cb) => (
              <div
                key={cb.character}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-200 font-medium">
                    {formatId(cb.character)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {cb.count} runs
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-purple-400">
                    {formatPercent(cb.winRate)}
                  </span>
                  <span className="text-xs text-gray-500">win rate</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common deaths */}
      {stats.commonDeaths.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Most Common Deaths
          </h3>
          <div className="bg-gray-900 border border-gray-800 rounded-lg divide-y divide-gray-800">
            {stats.commonDeaths.slice(0, 5).map((d) => (
              <div
                key={d.encounter}
                className="flex justify-between items-center px-4 py-2.5"
              >
                <span className="text-gray-300 text-sm">
                  {formatId(d.encounter)}
                </span>
                <span className="text-gray-500 text-sm">{d.count} deaths</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
