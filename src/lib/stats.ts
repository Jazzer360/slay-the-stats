import type { ParsedRun } from '../types/run';

export interface RunSummary {
  fileName: string;
  character: string;
  ascension: number;
  win: boolean;
  wasAbandoned: boolean;
  killedBy: string;
  floorsReached: number;
  runTime: number;
  startTime: number;
  buildId: string;
  deckSize: number;
  relicCount: number;
  cardsPicked: number;
  cardsSkipped: number;
  acts: string[];
}

export function summarizeRun(run: ParsedRun): RunSummary {
  const d = run.data;
  const player = d.players[0];

  let floorsReached = 0;
  let cardsPicked = 0;
  let cardsSkipped = 0;

  for (const act of d.map_point_history) {
    floorsReached += act.length;
    for (const point of act) {
      const stats = point.player_stats?.[0];
      if (stats?.card_choices) {
        const picked = stats.card_choices.some((c) => c.was_picked);
        if (picked) cardsPicked++;
        else cardsSkipped++;
      }
    }
  }

  return {
    fileName: run.fileName,
    character: player?.character ?? 'Unknown',
    ascension: d.ascension,
    win: d.win,
    wasAbandoned: d.was_abandoned,
    killedBy: d.killed_by_encounter !== 'NONE.NONE' ? d.killed_by_encounter : '',
    floorsReached,
    runTime: d.run_time,
    startTime: d.start_time,
    buildId: d.build_id,
    deckSize: player?.deck?.length ?? 0,
    relicCount: player?.relics?.length ?? 0,
    cardsPicked,
    cardsSkipped,
    acts: d.acts,
  };
}

export interface AggregateStats {
  totalRuns: number;
  wins: number;
  losses: number;
  abandoned: number;
  winRate: number;
  avgRunTime: number;
  avgFloorsReached: number;
  avgDeckSize: number;
  avgAscension: number;
  characterBreakdown: { character: string; count: number; winRate: number }[];
  ascensionBreakdown: { ascension: number; count: number; winRate: number }[];
  commonDeaths: { encounter: string; count: number }[];
}

export function computeAggregateStats(runs: ParsedRun[]): AggregateStats {
  if (runs.length === 0) {
    return {
      totalRuns: 0,
      wins: 0,
      losses: 0,
      abandoned: 0,
      winRate: 0,
      avgRunTime: 0,
      avgFloorsReached: 0,
      avgDeckSize: 0,
      avgAscension: 0,
      characterBreakdown: [],
      ascensionBreakdown: [],
      commonDeaths: [],
    };
  }

  const summaries = runs.map(summarizeRun);

  const wins = summaries.filter((s) => s.win).length;
  const losses = summaries.filter((s) => !s.win && !s.wasAbandoned).length;
  const abandoned = summaries.filter((s) => s.wasAbandoned).length;

  // Character breakdown
  const charMap = new Map<string, { count: number; wins: number }>();
  for (const s of summaries) {
    const existing = charMap.get(s.character) ?? { count: 0, wins: 0 };
    existing.count++;
    if (s.win) existing.wins++;
    charMap.set(s.character, existing);
  }
  const characterBreakdown = [...charMap.entries()]
    .map(([character, { count, wins }]) => ({
      character,
      count,
      winRate: count > 0 ? wins / count : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Ascension breakdown
  const ascMap = new Map<number, { count: number; wins: number }>();
  for (const s of summaries) {
    const existing = ascMap.get(s.ascension) ?? { count: 0, wins: 0 };
    existing.count++;
    if (s.win) existing.wins++;
    ascMap.set(s.ascension, existing);
  }
  const ascensionBreakdown = [...ascMap.entries()]
    .map(([ascension, { count, wins }]) => ({
      ascension,
      count,
      winRate: count > 0 ? wins / count : 0,
    }))
    .sort((a, b) => a.ascension - b.ascension);

  // Death encounters
  const deathMap = new Map<string, number>();
  for (const s of summaries) {
    if (s.killedBy) {
      deathMap.set(s.killedBy, (deathMap.get(s.killedBy) ?? 0) + 1);
    }
  }
  const commonDeaths = [...deathMap.entries()]
    .map(([encounter, count]) => ({ encounter, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRuns: summaries.length,
    wins,
    losses,
    abandoned,
    winRate: summaries.length > 0 ? wins / summaries.length : 0,
    avgRunTime:
      summaries.reduce((sum, s) => sum + s.runTime, 0) / summaries.length,
    avgFloorsReached:
      summaries.reduce((sum, s) => sum + s.floorsReached, 0) / summaries.length,
    avgDeckSize:
      summaries.reduce((sum, s) => sum + s.deckSize, 0) / summaries.length,
    avgAscension:
      summaries.reduce((sum, s) => sum + s.ascension, 0) / summaries.length,
    characterBreakdown,
    ascensionBreakdown,
    commonDeaths,
  };
}
