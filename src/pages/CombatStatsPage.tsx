import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { useRunsStore } from '../store/runs';
import { useAuthStore } from '../store/auth';
import { computeCombatStats, formatActHeading, formatEncounterName } from '../lib/combat-stats';
import type { CombatBucketStats, CombatTier, EncounterStats } from '../lib/combat-stats';
import { formatPercent } from '../lib/format';

const TIER_COLORS: Record<CombatTier, string> = {
  weak: 'text-gray-400',
  normal: 'text-red-400',
  elite: 'text-orange-400',
  boss: 'text-red-300 font-bold',
};

const TIER_BG: Record<CombatTier, string> = {
  weak: 'bg-gray-800/40',
  normal: 'bg-red-900/10',
  elite: 'bg-orange-900/10',
  boss: 'bg-red-900/20',
};

interface ActGroup {
  heading: string;
  actKey: string;
  rows: CombatBucketStats[];
}

interface ActRow {
  actNum: number;
  variants: ActGroup[];
}

function groupByAct(stats: CombatBucketStats[]): ActRow[] {
  const groups: ActGroup[] = [];
  let current: ActGroup | null = null;

  for (const row of stats) {
    const heading = formatActHeading(row.bucket.act, row.bucket.actName);
    const actKey = `${row.bucket.act}|${row.bucket.actName}`;

    if (!current || current.actKey !== actKey) {
      current = { heading, actKey, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }

  // Group variants of the same act number together
  const actMap = new Map<number, ActRow>();
  for (const group of groups) {
    const actNum = group.rows[0].bucket.act;
    let row = actMap.get(actNum);
    if (!row) {
      row = { actNum, variants: [] };
      actMap.set(actNum, row);
    }
    row.variants.push(group);
  }

  return [...actMap.values()].sort((a, b) => a.actNum - b.actNum);
}

export function CombatStatsPage() {
  const filteredRuns = useFilteredRuns();
  const combatStats = useMemo(() => computeCombatStats(filteredRuns), [filteredRuns]);
  const groups = useMemo(() => groupByAct(combatStats), [combatStats]);

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

  if (combatStats.length === 0) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>No combat data found in the loaded runs.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-100 mb-8">Combat Stats</h2>

      <div className="space-y-8">
        {groups.map((actRow) => (
          <div key={actRow.actNum} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {actRow.variants.map((group) => (
              <ActSection key={group.actKey} group={group} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActSection({ group }: { group: ActGroup }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-purple-400">{group.heading}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
              <th rowSpan={2} className="text-left px-3 py-2 align-bottom">
                Type
              </th>
              <th rowSpan={2} className="text-right px-3 py-2 align-bottom">
                Fights
              </th>
              <th colSpan={4} className="text-center px-1 pt-2 pb-0.5 border-b border-gray-800">
                <span className="inline-flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                    <path d="M13 19l6-6" />
                    <path d="M16 16l4 4" />
                    <path d="M19 21l2-2" />
                  </svg>
                  Dmg Taken
                </span>
              </th>
              <th rowSpan={2} className="text-right px-3 py-2 align-bottom">
                Deaths
              </th>
              <th rowSpan={2} className="text-right px-3 py-2 align-bottom">
                Death&nbsp;%
              </th>
            </tr>
            <tr className="border-b border-gray-800 text-gray-500 text-xs tracking-wider">
              <th className="text-right px-3 py-1">Avg</th>
              <th className="text-right px-3 py-1">P20</th>
              <th className="text-right px-3 py-1">P50</th>
              <th className="text-right px-3 py-1">P80</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => (
              <TierSection key={row.bucket.tier} stats={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TierSection({ stats }: { stats: CombatBucketStats }) {
  const [expanded, setExpanded] = useState(false);
  const {
    bucket,
    timesFought,
    avgDamageTaken,
    p20DamageTaken,
    p50DamageTaken,
    p80DamageTaken,
    timesDied,
    deathRate,
    encounters,
  } = stats;
  const tierLabel = bucket.tier[0].toUpperCase() + bucket.tier.slice(1);

  return (
    <>
      <tr
        className={`border-t border-gray-800/50 hover:bg-gray-800/30 cursor-pointer ${TIER_BG[bucket.tier]}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className={`px-3 py-2 ${TIER_COLORS[bucket.tier]}`}>
          <span className="inline-flex items-center gap-1.5">
            <svg
              className={`w-3 h-3 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {tierLabel}
          </span>
        </td>
        <td className="text-right px-3 py-2 text-gray-300 tabular-nums">{timesFought}</td>
        <td className="text-right px-3 py-2 text-gray-300 tabular-nums">
          {avgDamageTaken.toFixed(1)}
        </td>
        <td className="text-right px-3 py-2 text-gray-300 tabular-nums">
          {p20DamageTaken.toFixed(1)}
        </td>
        <td className="text-right px-3 py-2 text-gray-300 tabular-nums">
          {p50DamageTaken.toFixed(1)}
        </td>
        <td className="text-right px-3 py-2 text-gray-300 tabular-nums">
          {p80DamageTaken.toFixed(1)}
        </td>
        <td className="text-right px-3 py-2 text-gray-300 tabular-nums">{timesDied}</td>
        <td className="text-right px-3 py-2 text-gray-300 tabular-nums">
          {formatPercent(deathRate)}
        </td>
      </tr>
      {expanded && encounters.map((enc) => <EncounterRow key={enc.encounterId} enc={enc} />)}
    </>
  );
}

function EncounterRow({ enc }: { enc: EncounterStats }) {
  return (
    <tr className="border-t border-gray-800/30 bg-gray-950/40">
      <td className="px-3 py-1.5 pl-10 text-gray-500 text-xs">
        {formatEncounterName(enc.encounterId)}
      </td>
      <td className="text-right px-3 py-1.5 text-gray-500 text-xs tabular-nums">
        {enc.timesFought}
      </td>
      <td className="text-right px-3 py-1.5 text-gray-500 text-xs tabular-nums">
        {enc.avgDamageTaken.toFixed(1)}
      </td>
      <td className="text-right px-3 py-1.5 text-gray-500 text-xs tabular-nums">
        {enc.p20DamageTaken.toFixed(1)}
      </td>
      <td className="text-right px-3 py-1.5 text-gray-500 text-xs tabular-nums">
        {enc.p50DamageTaken.toFixed(1)}
      </td>
      <td className="text-right px-3 py-1.5 text-gray-500 text-xs tabular-nums">
        {enc.p80DamageTaken.toFixed(1)}
      </td>
      <td className="text-right px-3 py-1.5 text-gray-500 text-xs tabular-nums">{enc.timesDied}</td>
      <td className="text-right px-3 py-1.5 text-gray-500 text-xs tabular-nums">
        {formatPercent(enc.deathRate)}
      </td>
    </tr>
  );
}
