import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { useRunsStore } from '../store/runs';
import { useAuthStore } from '../store/auth';
import { computeAggregateStats, computeDeckSizeByFloor, computeRunEndsByFloor } from '../lib/stats';
import {
  computeCombatStats,
  computeDeadliestByTier,
  formatEncounterName,
  type CombatTier,
  type DeadlyEncounter,
} from '../lib/combat-stats';
import { formatId, formatPercent, formatDuration } from '../lib/format';
import { characterColor } from '../lib/character-colors';
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
  ComposedChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';

const TIER_LABEL: Record<CombatTier, string> = {
  weak: 'Weak',
  normal: 'Normal',
  elite: 'Elite',
  boss: 'Boss',
};

const TIER_ACCENT: Record<CombatTier, string> = {
  weak: 'text-gray-300',
  normal: 'text-red-400',
  elite: 'text-orange-400',
  boss: 'text-red-300',
};

export function DashboardPage() {
  const filteredRuns = useFilteredRuns();
  const stats = useMemo(() => computeAggregateStats(filteredRuns), [filteredRuns]);
  const combatStats = useMemo(() => computeCombatStats(filteredRuns), [filteredRuns]);
  const deadliest = useMemo(() => computeDeadliestByTier(combatStats), [combatStats]);
  const deckSizeByFloor = useMemo(() => computeDeckSizeByFloor(filteredRuns), [filteredRuns]);
  const runEndsByFloor = useMemo(() => computeRunEndsByFloor(filteredRuns), [filteredRuns]);

  // Win rate moving average
  const [maWindow, setMaWindow] = useState(10);

  const winRateMA = useMemo(() => {
    if (filteredRuns.length === 0 || filteredRuns.length < maWindow) return [];

    // Sort by start time ascending
    const sorted = [...filteredRuns].sort((a, b) => a.data.start_time - b.data.start_time);

    const runFloors = sorted.map((r) =>
      r.data.map_point_history.reduce((s, act) => s + act.length, 0),
    );

    const result: { run: number; winRate: number; avgFloors: number }[] = [];
    let wins = 0;
    let floorsSum = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].data.win) wins++;
      floorsSum += runFloors[i];
      if (i >= maWindow) {
        if (sorted[i - maWindow].data.win) wins--;
        floorsSum -= runFloors[i - maWindow];
      }
      if (i >= maWindow - 1) {
        result.push({
          run: i + 1,
          winRate: (wins / maWindow) * 100,
          avgFloors: floorsSum / maWindow,
        });
      }
    }
    return result;
  }, [filteredRuns, maWindow]);

  const { authLoading, user } = useAuthStore();
  const cloudLoadDone = useRunsStore((s) => s.cloudLoadDone);

  if (filteredRuns.length === 0) {
    if (authLoading || (user && !cloudLoadDone)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading runs…</p>
        </div>
      );
    }
    return (
      <div className="text-center text-gray-500 py-20">
        <p>
          No runs loaded.{' '}
          <Link to="/import" className="text-purple-400 hover:text-purple-300">
            Import your runs
          </Link>{' '}
          to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with condensed summary */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-3">
        <h2 className="text-lg font-semibold text-gray-100">Overview</h2>
        <div className="text-sm text-gray-400">
          <span className="text-gray-200 font-semibold">{stats.totalRuns}</span>{' '}
          {stats.totalRuns === 1 ? 'run' : 'runs'}
          <span className="text-gray-600 mx-2">·</span>
          <span className="text-green-400 font-mono">{stats.wins}W</span>
          <span className="text-gray-600">–</span>
          <span className="text-red-400 font-mono">{stats.losses}L</span>
          {stats.abandoned > 0 && (
            <>
              <span className="text-gray-600 mx-1">·</span>
              <span className="text-gray-500 font-mono">{stats.abandoned} abandoned</span>
            </>
          )}
          <span className="text-gray-600 mx-2">·</span>
          <span className="text-gray-200 font-semibold">{formatPercent(stats.winRate)}</span>{' '}
          <span className="text-gray-500">win rate</span>
        </div>
      </div>
      <div className="text-xs text-gray-500 mb-8">
        Avg ascension {stats.avgAscension.toFixed(1)}
        <span className="text-gray-700 mx-2">·</span>
        Avg floors {stats.avgFloorsReached.toFixed(1)}
        <span className="text-gray-700 mx-2">·</span>
        Avg run time {formatDuration(Math.round(stats.avgRunTime))}
      </div>

      {/* Character table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden mb-10">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-purple-400">Characters</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-2">Character</th>
                <th className="text-right px-4 py-2">Runs</th>
                <th className="text-right px-4 py-2">Record</th>
                <th className="text-right px-4 py-2">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.characterBreakdown.map((cb) => {
                const wins = Math.round(cb.count * cb.winRate);
                const losses = cb.count - wins;
                const color = characterColor(cb.character);
                return (
                  <tr
                    key={cb.character}
                    className="border-b border-gray-800/60 last:border-b-0"
                    style={{ boxShadow: `inset 3px 0 0 ${color}` }}
                  >
                    <td className="px-4 py-2 font-medium" style={{ color }}>
                      {formatId(cb.character)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300 font-mono">{cb.count}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      <span className="text-green-400">{wins}W</span>
                      <span className="text-gray-600">–</span>
                      <span className="text-red-400">{losses}L</span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-200 font-mono">
                      {formatPercent(cb.winRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Win rate moving average */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-200">Win Rate (Moving Average)</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Window:</label>
            <input
              type="number"
              min={2}
              max={filteredRuns.length}
              value={maWindow}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v >= 2) setMaWindow(v);
              }}
              className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-300 text-center"
            />
            <span className="text-xs text-gray-600">runs</span>
          </div>
        </div>
        {winRateMA.length > 0 ? (
          <>
            <div className="flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="inline-block w-3 h-0.5 bg-purple-400 rounded" />
                Win Rate
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="inline-block w-3 h-0.5 bg-emerald-400 rounded" />
                Avg Floors
              </span>
            </div>
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={winRateMA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis
                  dataKey="run"
                  stroke="#6b7280"
                  fontSize={11}
                  label={{
                    value: 'Run #',
                    position: 'insideBottomRight',
                    offset: -5,
                    fill: '#6b7280',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#9f7aea"
                  fontSize={11}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#34d399"
                  fontSize={11}
                  domain={[0, 49]}
                  tickCount={8}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                    fontSize: '12px',
                  }}
                  formatter={
                    ((value: unknown, name: string) => {
                      if (name === 'winRate')
                        return [`${(value as number).toFixed(1)}%`, 'Win Rate'];
                      if (name === 'avgFloors') return [(value as number).toFixed(1), 'Avg Floors'];
                      return [value, name];
                    }) as never
                  }
                  labelFormatter={(label) => `Run #${label}`}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="winRate"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgFloors"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-gray-600 text-sm text-center py-8">
            Not enough runs ({filteredRuns.length}) for a {maWindow}-run moving average.
          </p>
        )}
      </div>

      {/* Deck size by floor */}
      {deckSizeByFloor.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-200">Deck Size by Floor</h3>
            <span className="text-xs text-gray-500">
              Cards in deck at end of each floor, averaged across runs that reached that floor
            </span>
          </div>
          <ResponsiveContainer width="100%" height={256}>
            <ComposedChart
              data={deckSizeByFloor}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="floor"
                stroke="#6b7280"
                fontSize={11}
                label={{
                  value: 'Floor',
                  position: 'insideBottomRight',
                  offset: -5,
                  fill: '#6b7280',
                  fontSize: 11,
                }}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(dataMin - 1)),
                  (dataMax: number) => Math.ceil(dataMax + 1),
                ]}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ stroke: '#6b7280', strokeWidth: 1 }}
                content={
                  ((props: {
                    active?: boolean;
                    payload?: ReadonlyArray<{
                      name?: string;
                      value?: number;
                      color?: string;
                      payload?: { p20?: number; p80?: number };
                    }>;
                    label?: number;
                  }) => {
                    const { active, payload, label } = props;
                    if (!active || !payload || payload.length === 0) return null;
                    const rows: Array<{ label: string; value: string; color: string }> = [];
                    for (const item of payload) {
                      if (item.name === 'avgSize') {
                        rows.push({
                          label: 'Average',
                          value: (item.value ?? 0).toFixed(1),
                          color: '#c084fc',
                        });
                      } else if (item.name === 'medianSize') {
                        rows.push({
                          label: 'Median',
                          value: (item.value ?? 0).toFixed(1),
                          color: '#60a5fa',
                        });
                      } else if (item.name === 'band') {
                        const p20 = item.payload?.p20 ?? 0;
                        const p80 = item.payload?.p80 ?? 0;
                        rows.push({
                          label: '20–80%',
                          value: `${p20.toFixed(1)} – ${p80.toFixed(1)}`,
                          color: '#c084fc',
                        });
                      }
                    }
                    return (
                      <div
                        style={{
                          background: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: 12,
                          color: '#e5e7eb',
                        }}
                      >
                        <div style={{ marginBottom: 4 }}>Floor {label}</div>
                        {rows.map((r) => (
                          <div key={r.label} style={{ color: r.color }}>
                            {r.label} : <span style={{ color: '#e5e7eb' }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }) as never
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
                formatter={(v) => (
                  <span style={{ color: '#9ca3af' }}>
                    {v === 'avgSize'
                      ? 'Average'
                      : v === 'medianSize'
                        ? 'Median'
                        : v === 'band'
                          ? '20–80th percentile'
                          : v}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="band"
                stroke="none"
                fill="#2b2847"
                fillOpacity={1}
                isAnimationActive={false}
                activeDot={false}
                legendType="rect"
              />
              <Line
                type="monotone"
                dataKey="avgSize"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                legendType="plainline"
              />
              <Line
                type="monotone"
                dataKey="medianSize"
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                legendType="plainline"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Run endings by floor */}
      {runEndsByFloor.data.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-200">Losses by Floor</h3>
            <span className="text-xs text-gray-500">
              Number of runs that ended in a loss on each floor, stacked by character (wins and
              abandoned runs excluded)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={runEndsByFloor.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="floor"
                stroke="#6b7280"
                fontSize={11}
                label={{
                  value: 'Floor',
                  position: 'insideBottomRight',
                  offset: -5,
                  fill: '#6b7280',
                  fontSize: 11,
                }}
              />
              <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#e5e7eb',
                  fontSize: '12px',
                }}
                formatter={
                  ((value: unknown, name: string) => [
                    value as number,
                    name === 'total' ? 'Total' : formatId(name),
                  ]) as never
                }
                labelFormatter={(label) => `Floor ${label}`}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
                itemSorter={null}
                formatter={(v) => formatId(v)}
              />
              {runEndsByFloor.characters.map((character) => (
                <Bar
                  key={character}
                  dataKey={character}
                  stackId="a"
                  fill={characterColor(character)}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Deadliest enemies by tier */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-purple-400">Deadliest Enemies</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Encounters most likely to end a run, grouped by fight type. Ranked by death rate;
            encounters with fewer than 3 fights are excluded.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-800">
          {(['weak', 'normal', 'elite', 'boss'] as CombatTier[]).map((tier) => (
            <DeadliestTierBlock key={tier} tier={tier} encounters={deadliest[tier]} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DeadliestTierBlock({
  tier,
  encounters,
}: {
  tier: CombatTier;
  encounters: DeadlyEncounter[];
}) {
  const topWithDeaths = encounters.filter((e) => e.timesDied > 0).slice(0, 5);

  return (
    <div className="bg-gray-900/60 p-4">
      <h4 className={`text-sm font-semibold mb-3 ${TIER_ACCENT[tier]}`}>{TIER_LABEL[tier]}</h4>
      {topWithDeaths.length === 0 ? (
        <p className="text-xs text-gray-600 italic">No deaths recorded.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 uppercase tracking-wider">
              <th className="text-left font-normal pb-1">Encounter</th>
              <th className="text-right font-normal pb-1">Deaths</th>
              <th className="text-right font-normal pb-1">Fights</th>
              <th className="text-right font-normal pb-1">Death %</th>
            </tr>
          </thead>
          <tbody>
            {topWithDeaths.map((e) => (
              <tr key={e.encounterId} className="border-t border-gray-800/60">
                <td className="py-1.5 pr-2 text-gray-200">{formatEncounterName(e.encounterId)}</td>
                <td className="py-1.5 text-right font-mono text-red-400">{e.timesDied}</td>
                <td className="py-1.5 text-right font-mono text-gray-400">{e.timesFought}</td>
                <td className="py-1.5 text-right font-mono text-gray-200">
                  {formatPercent(e.deathRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
