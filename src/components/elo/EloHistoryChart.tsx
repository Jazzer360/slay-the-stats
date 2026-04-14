import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { EloEntry } from '../../types/elo';
import { formatDate } from '../../lib/format';

interface EloHistoryChartProps {
  entry: EloEntry;
}

interface DataPoint {
  index: number;
  rating: number;
  date: string;
  floor: number;
  picked: boolean;
  eloChange: number;
  runFileName: string;
}

export function EloHistoryChart({ entry }: EloHistoryChartProps) {
  const data = useMemo<DataPoint[]>(() => {
    const points: DataPoint[] = [];
    // Appearances are sorted most-recent-first; we need chronological order
    const sorted = [...entry.appearances].reverse();
    // Start with the initial 1500 ELO baseline
    if (sorted.length > 0) {
      points.push({
        index: 0,
        rating: 1500,
        date: formatDate(sorted[0].startTime),
        floor: 0,
        picked: false,
        eloChange: 0,
        runFileName: '',
      });
    }
    for (const run of sorted) {
      for (const offer of run.offers) {
        points.push({
          index: points.length,
          rating: Math.round(offer.ratingAfter),
          date: formatDate(run.startTime),
          floor: offer.floor,
          picked: offer.wasPicked,
          eloChange: offer.eloChange,
          runFileName: run.fileName,
        });
      }
    }
    return points;
  }, [entry.appearances]);

  if (data.length < 2) return null;

  const ratings = data.map((d) => d.rating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);

  const ticks: number[] = [1500];
  const tickMin = Math.ceil(minR / 100) * 100;
  const tickMax = Math.floor(maxR / 100) * 100;
  for (let t = tickMin; t <= tickMax; t += 100) {
    if (t !== 1500) ticks.push(t);
  }
  ticks.sort((a, b) => a - b);

  return (
    <div className="bg-[#0a0f1a] rounded-xl border border-gray-800 p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
        ELO Over Time
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <XAxis dataKey="index" hide />
          <YAxis
            domain={['dataMin - 20', 'dataMax + 20']}
            ticks={ticks}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            width={45}
          />
          {ticks.map((t) => (
            <ReferenceLine key={t} y={t} stroke="#374151" strokeDasharray="3 3" />
          ))}
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#a855f7"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#a855f7', stroke: '#1f2937', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: DataPoint }[] }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-gray-200 font-mono font-bold">{d.rating}</div>
      <div className={`${d.eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {d.eloChange >= 0 ? '+' : ''}{d.eloChange.toFixed(1)}
      </div>
      <div className="text-gray-400 mt-1">Floor {d.floor} · {d.picked ? 'Picked' : 'Passed'}</div>
      <div className="text-gray-500">{d.date}</div>
    </div>
  );
}
