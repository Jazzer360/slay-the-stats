import { useMemo } from 'react';
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

export function DashboardPage() {
  const filteredRuns = useFilteredRuns();
  const stats = useMemo(
    () => computeAggregateStats(filteredRuns),
    [filteredRuns]
  );

  // Win rate over time (group by week)
  const winRateOverTime = useMemo(() => {
    if (filteredRuns.length === 0) return [];

    const weekBuckets = new Map<
      string,
      { week: string; wins: number; total: number }
    >();

    for (const run of filteredRuns) {
      const date = new Date(run.data.start_time * 1000);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().slice(0, 10);

      const bucket = weekBuckets.get(key) ?? {
        week: key,
        wins: 0,
        total: 0,
      };
      bucket.total++;
      if (run.data.win) bucket.wins++;
      weekBuckets.set(key, bucket);
    }

    return [...weekBuckets.values()]
      .sort((a, b) => a.week.localeCompare(b.week))
      .map((b) => ({
        week: b.week,
        winRate: b.total > 0 ? (b.wins / b.total) * 100 : 0,
        runs: b.total,
      }));
  }, [filteredRuns]);

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
            <ResponsiveContainer width="100%" height="100%">
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
                  {stats.characterBreakdown.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={COLORS[idx % COLORS.length]}
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

        {/* Win rate by ascension */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Win Rate by Ascension
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ascensionBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="ascension"
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                  }}
                  formatter={(value) => [
                    formatPercent(Number(value)),
                    'Win Rate',
                  ]}
                  labelFormatter={(l) => `Ascension ${l}`}
                />
                <Bar
                  dataKey="winRate"
                  fill="#c084fc"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Win rate over time */}
      {winRateOverTime.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Win Rate Over Time (Weekly)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={winRateOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="week" stroke="#6b7280" fontSize={11} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                  }}
                  formatter={(value, name) => {
                    if (name === 'winRate')
                      return [`${Number(value).toFixed(1)}%`, 'Win Rate'];
                    return [value, name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={{ fill: '#c084fc', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Common deaths */}
      {stats.commonDeaths.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Most Common Deaths
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
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
