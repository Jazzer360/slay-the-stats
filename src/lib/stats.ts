import type { ParsedRun } from '../types/run';
import { CHARACTER_ORDER } from './filters';

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
    avgRunTime: summaries.reduce((sum, s) => sum + s.runTime, 0) / summaries.length,
    avgFloorsReached: summaries.reduce((sum, s) => sum + s.floorsReached, 0) / summaries.length,
    avgDeckSize: summaries.reduce((sum, s) => sum + s.deckSize, 0) / summaries.length,
    avgAscension: summaries.reduce((sum, s) => sum + s.ascension, 0) / summaries.length,
    characterBreakdown,
    ascensionBreakdown,
    commonDeaths,
  };
}

// ─── Deck size by floor ────────────────────────────────────────────────────

export interface DeckSizeByFloorPoint {
  floor: number;
  avgSize: number;
  medianSize: number;
  p20: number;
  p80: number;
  band: [number, number];
  sampleSize: number;
}

/**
 * Compute the number of cards gained and removed on each floor of a run,
 * then derive the deck size at the end of every floor.
 *
 * Starting deck size is derived from the run's own data rather than relying on
 * character-specific starting deck tables:
 *   startingSize = finalDeckSize − Σ (gained − removed) over all floors
 *
 * Card transforms and enchantments don't change deck size, so they're ignored.
 */
function deckSizeTrace(run: ParsedRun): number[] {
  const finalDeckSize = run.data.players[0]?.deck?.length ?? 0;
  const deltas: number[] = [];

  for (const act of run.data.map_point_history) {
    for (const point of act) {
      const s = point.player_stats?.[0];
      const gained = s?.cards_gained?.length ?? 0;
      const removed = s?.cards_removed?.length ?? 0;
      deltas.push(gained - removed);
    }
  }

  const netAdditions = deltas.reduce((a, b) => a + b, 0);
  const startingSize = finalDeckSize - netAdditions;

  // Golden Compass adds two bonus floors (a campfire at floor 24 and a bonus
  // chest at floor 26). Neither changes deck size in meaningful ways, but
  // their presence shifts every subsequent floor number by 2. For per-floor
  // aggregation we merge these two floors into the prior floor so compass
  // and non-compass runs align. See adjustedFloor() for the mirror logic.
  const mergedDeltas = hasGoldenCompass(run) ? mergeCompassFloors(deltas) : deltas;

  const trace: number[] = [];
  let size = startingSize;
  for (const d of mergedDeltas) {
    size += d;
    trace.push(size);
  }
  return trace;
}

/** True when the run has Golden Compass equipped (extra campfire + chest). */
export function hasGoldenCompass(run: ParsedRun): boolean {
  const relics = run.data.players[0]?.relics;
  if (!relics) return false;
  return relics.some((r) => r.id === 'RELIC.GOLDEN_COMPASS');
}

/**
 * Merge the two Golden Compass bonus floors (raw floors 24 and 26 — a bonus
 * campfire and bonus chest) into the previous floor by adding their deltas
 * and dropping those indices. The result has 2 fewer entries and each
 * subsequent raw floor's value now sits at the floor number it would have
 * occupied without Golden Compass.
 */
function mergeCompassFloors(deltas: number[]): number[] {
  // Work on a copy. Raw floor numbers are 1-indexed; array indices 23 and 25.
  const out = deltas.slice();
  if (out.length > 25) {
    out[24] += out[25]; // floor 26 merges into (post-removal) floor 24
    out.splice(25, 1);
  }
  if (out.length > 23) {
    out[22] += out[23]; // floor 24 merges into floor 23
    out.splice(23, 1);
  }
  return out;
}

/**
 * Map a raw ending-floor number (1-indexed) to an "adjusted" floor number
 * that aligns Golden Compass runs with non-compass runs. Bonus floors (raw
 * 24 and 26) collapse into the prior floor; floors beyond them shift down by 2.
 */
export function adjustedFloor(rawFloor: number, compass: boolean): number {
  if (!compass) return rawFloor;
  if (rawFloor <= 23) return rawFloor;
  if (rawFloor === 24) return 23; // bonus campfire → merged into 23
  if (rawFloor === 25) return 24; // post-campfire floor becomes 24
  if (rawFloor === 26) return 24; // bonus chest → merged into 24
  return rawFloor - 2;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Linear-interpolated percentile of a pre-sorted array. `p` in [0, 1]. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function computeDeckSizeByFloor(runs: ParsedRun[]): DeckSizeByFloorPoint[] {
  if (runs.length === 0) return [];

  const byFloor: number[][] = [];
  for (const run of runs) {
    const trace = deckSizeTrace(run);
    for (let i = 0; i < trace.length; i++) {
      if (!byFloor[i]) byFloor[i] = [];
      byFloor[i].push(trace[i]);
    }
  }

  const result: DeckSizeByFloorPoint[] = [];
  for (let i = 0; i < byFloor.length; i++) {
    const values = byFloor[i];
    if (!values || values.length === 0) continue;
    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p20 = percentile(sorted, 0.2);
    const p80 = percentile(sorted, 0.8);
    result.push({
      floor: i + 1,
      avgSize: avg,
      medianSize: median(sorted),
      p20,
      p80,
      band: [p20, p80],
      sampleSize: values.length,
    });
  }
  return result;
}

// ─── Run endings by floor ──────────────────────────────────────────────────

export interface RunEndsByFloorPoint {
  floor: number;
  total: number;
  [character: string]: number;
}

export interface RunEndsByFloor {
  data: RunEndsByFloorPoint[];
  characters: string[];
}

/**
 * Count the number of losses per floor, broken down by character. Wins and
 * abandoned runs are excluded — wins cluster on the final boss floor and
 * aren't meaningful data about where runs fail. The "ending floor" is the
 * total number of floors reached (length sum of map_point_history).
 */
export function computeRunEndsByFloor(runs: ParsedRun[]): RunEndsByFloor {
  if (runs.length === 0) return { data: [], characters: [] };

  const characterSet = new Set<string>();
  const byFloor = new Map<number, Map<string, number>>();
  let maxFloor = 0;

  for (const run of runs) {
    if (run.data.was_abandoned) continue;
    if (run.data.win) continue;
    const character = run.data.players[0]?.character ?? 'Unknown';
    let rawFloor = 0;
    for (const act of run.data.map_point_history) rawFloor += act.length;
    if (rawFloor <= 0) continue;
    const floor = adjustedFloor(rawFloor, hasGoldenCompass(run));
    if (floor > maxFloor) maxFloor = floor;
    characterSet.add(character);
    const bucket = byFloor.get(floor) ?? new Map<string, number>();
    bucket.set(character, (bucket.get(character) ?? 0) + 1);
    byFloor.set(floor, bucket);
  }

  const characters = [...characterSet].sort((a, b) => {
    const ai = CHARACTER_ORDER.indexOf(a as (typeof CHARACTER_ORDER)[number]);
    const bi = CHARACTER_ORDER.indexOf(b as (typeof CHARACTER_ORDER)[number]);
    // Known characters first in canonical order; unknowns alphabetised at the end.
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const data: RunEndsByFloorPoint[] = [];
  for (let f = 1; f <= maxFloor; f++) {
    const bucket = byFloor.get(f);
    const point: RunEndsByFloorPoint = { floor: f, total: 0 };
    for (const c of characters) point[c] = 0;
    if (bucket) {
      for (const [c, n] of bucket) {
        point[c] = n;
        point.total += n;
      }
    }
    data.push(point);
  }
  return { data, characters };
}
