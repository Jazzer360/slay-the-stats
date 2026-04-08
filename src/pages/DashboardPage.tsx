import { useMemo, useState } from 'react';
import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { computeAggregateStats } from '../lib/stats';
import { formatId, formatPercent, formatDuration } from '../lib/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const COLORS = [
  '#c084fc',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#a78bfa',
];

const CHARACTER_COLORS: Record<string, string> = {
  'CHARACTER.IRONCLAD': '#ef4444',   // red-500
  'CHARACTER.SILENT': '#22c55e',     // green-500
  'CHARACTER.DEFECT': '#60a5fa',     // blue-400
  'CHARACTER.REGENT': '#fbbf24',     // amber-400
  'CHARACTER.NECROBINDER': '#8b5cf6', // violet-500
};

export function DashboardPage() {
  const filteredRuns = useFilteredRuns();
  const stats = useMemo(
    () => computeAggregateStats(filteredRuns),
    [filteredRuns]
  );

  // Win rate moving average
  const [maWindow, setMaWindow] = useState(10);

  const winRateMA = useMemo(() => {
    if (filteredRuns.length === 0 || filteredRuns.length < maWindow) return [];

    // Sort by start time ascending
    const sorted = [...filteredRuns].sort(
      (a, b) => a.data.start_time - b.data.start_time
    );

    const result: { run: number; winRate: number }[] = [];
    let wins = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].data.win) wins++;
      if (i >= maWindow) {
        if (sorted[i - maWindow].data.win) wins--;
      }
      if (i >= maWindow - 1) {
        result.push({
          run: i + 1,
          winRate: (wins / maWindow) * 100,
        });
      }
    }
    return result;
  }, [filteredRuns, maWindow]);

  if (filteredRuns.length === 0) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>No runs loaded. Go to Home to load your run history.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-100 mb-6">Dashboard</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        <StatCard label="Runs" value={stats.totalRuns.toString()} />
        <StatCard label="Win Rate" value={formatPercent(stats.winRate)} />
        <StatCard label="Wins" value={stats.wins.toString()} />
        <StatCard label="Losses" value={stats.losses.toString()} />
        <StatCard label="Avg Time" value={formatDuration(Math.round(stats.avgRunTime))} />
        <StatCard
          label="Avg Ascension"
          value={stats.avgAscension.toFixed(1)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Character distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Character Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <PieChart>
                <Pie
                  data={stats.characterBreakdown.map((cb) => ({
                    name: formatId(cb.character),
                    value: cb.count,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {stats.characterBreakdown.map((cb, idx) => (
                    <Cell
                      key={idx}
                      fill={CHARACTER_COLORS[cb.character] ?? COLORS[idx % COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win rate by character */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Win Rate by Character
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <BarChart
                data={stats.characterBreakdown.map((cb) => ({
                  name: formatId(cb.character),
                  character: cb.character,
                  winRate: cb.winRate,
                  count: cb.count,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                  }}
                  formatter={((value: unknown, _name: unknown, props: { payload: { count: number } }) => [
                    `${formatPercent(value as number)} (${props.payload.count} runs)`,
                    'Win Rate',
                  ]) as never}
                />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                  {stats.characterBreakdown.map((cb, idx) => (
                    <Cell
                      key={idx}
                      fill={CHARACTER_COLORS[cb.character] ?? COLORS[idx % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Win rate moving average */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Win Rate (Moving Average)
          </h3>
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <LineChart data={winRateMA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="run"
                  stroke="#6b7280"
                  fontSize={11}
                  label={{ value: 'Run #', position: 'insideBottomRight', offset: -5, fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                  }}
                  formatter={((value: unknown) => [`${(value as number).toFixed(1)}%`, 'Win Rate']) as never}
                  labelFormatter={(label) => `Run #${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-600 text-sm text-center py-8">
            Not enough runs ({filteredRuns.length}) for a {maWindow}-run moving average.
          </p>
        )}
      </div>

      {/* Common deaths */}
      {stats.commonDeaths.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Most Common Deaths
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <BarChart
                data={stats.commonDeaths.slice(0, 8)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="encounter"
                  stroke="#6b7280"
                  fontSize={11}
                  width={150}
                  tickFormatter={formatId}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                  }}
                  labelFormatter={(l) => formatId(String(l))}
                />
                <Bar
                  dataKey="count"
                  fill="#f87171"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-100 mt-0.5">{value}</p>
    </div>
  );
}
