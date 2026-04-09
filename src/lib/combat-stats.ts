import type { ParsedRun } from '../types/run';

export type CombatTier = 'weak' | 'normal' | 'elite' | 'boss';

export interface CombatBucket {
  act: number;       // 1-indexed act number
  actName: string;   // e.g. "OVERGROWTH", "HIVE", "GLORY"
  tier: CombatTier;
}

export interface EncounterStats {
  encounterId: string; // e.g. "ENCOUNTER.BOWLBUGS_WEAK"
  totalDamageTaken: number;
  timesFought: number;
  timesDied: number;
  avgDamageTaken: number;
  medianDamageTaken: number;
  stddevDamageTaken: number;
  deathRate: number;
}

export interface CombatBucketStats {
  bucket: CombatBucket;
  totalDamageTaken: number;
  timesFought: number;
  timesDied: number;
  avgDamageTaken: number;
  medianDamageTaken: number;
  stddevDamageTaken: number;
  deathRate: number;
  encounters: EncounterStats[];
}

/** Parse "ACT.OVERGROWTH" → "OVERGROWTH" */
function parseActName(actStr: string): string {
  return actStr.startsWith('ACT.') ? actStr.slice(4) : actStr;
}

/** Determine the combat tier from the model_id suffix */
function getTier(modelId: string): CombatTier | null {
  if (/_WEAK$/i.test(modelId)) return 'weak';
  if (/_NORMAL$/i.test(modelId)) return 'normal';
  if (/_ELITE$/i.test(modelId)) return 'elite';
  if (/_BOSS$/i.test(modelId)) return 'boss';
  return null;
}

const TIER_ORDER: Record<CombatTier, number> = { weak: 0, normal: 1, elite: 2, boss: 3 };

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function bucketKey(act: number, actName: string, tier: CombatTier): string {
  return `${act}|${actName}|${tier}`;
}

interface Accum {
  bucket: CombatBucket;
  totalDamage: number;
  damages: number[];
  fights: number;
  deaths: number;
  encounterMap: Map<string, { totalDamage: number; damages: number[]; fights: number; deaths: number }>;
}

export function computeCombatStats(runs: ParsedRun[]): CombatBucketStats[] {
  const map = new Map<string, Accum>();

  for (const run of runs) {
    const { acts, map_point_history, killed_by_encounter } = run.data;

    for (let actIdx = 0; actIdx < map_point_history.length; actIdx++) {
      const actNum = actIdx + 1;
      const actName = parseActName(acts[actIdx] ?? `ACT_${actNum}`);
      const floors = map_point_history[actIdx];
      const isLastAct = actIdx === map_point_history.length - 1;

      for (let floorIdx = 0; floorIdx < floors.length; floorIdx++) {
        const point = floors[floorIdx];
        const room = point.rooms?.[0];
        if (!room?.model_id?.startsWith('ENCOUNTER.')) continue;

        const tier = getTier(room.model_id);
        if (!tier) continue;

        const stats = point.player_stats?.[0];
        const damage = stats?.damage_taken ?? 0;

        const key = bucketKey(actNum, actName, tier);

        let entry = map.get(key);
        if (!entry) {
          entry = {
            bucket: { act: actNum, actName, tier },
            totalDamage: 0,
            damages: [],
            fights: 0,
            deaths: 0,
            encounterMap: new Map(),
          };
          map.set(key, entry);
        }

        entry.totalDamage += damage;
        entry.damages.push(damage);
        entry.fights++;

        // Per-encounter tracking
        let enc = entry.encounterMap.get(room.model_id);
        if (!enc) {
          enc = { totalDamage: 0, damages: [], fights: 0, deaths: 0 };
          entry.encounterMap.set(room.model_id, enc);
        }
        enc.totalDamage += damage;
        enc.damages.push(damage);
        enc.fights++;

        // Death detection: last floor of last act, killed_by matches this room
        const isLastFloor = isLastAct && floorIdx === floors.length - 1;
        if (
          isLastFloor &&
          !run.data.win &&
          !run.data.was_abandoned &&
          killed_by_encounter !== 'NONE.NONE' &&
          killed_by_encounter === room.model_id
        ) {
          entry.deaths++;
          enc.deaths++;
        }
      }
    }
  }

  return [...map.values()]
    .map(({ bucket, totalDamage, damages, fights, deaths, encounterMap }) => ({
      bucket,
      totalDamageTaken: totalDamage,
      timesFought: fights,
      timesDied: deaths,
      avgDamageTaken: fights > 0 ? totalDamage / fights : 0,
      medianDamageTaken: median(damages),
      stddevDamageTaken: stddev(damages),
      deathRate: fights > 0 ? deaths / fights : 0,
      encounters: [...encounterMap.entries()]
        .map(([encounterId, e]) => ({
          encounterId,
          totalDamageTaken: e.totalDamage,
          timesFought: e.fights,
          timesDied: e.deaths,
          avgDamageTaken: e.fights > 0 ? e.totalDamage / e.fights : 0,
          medianDamageTaken: median(e.damages),
          stddevDamageTaken: stddev(e.damages),
          deathRate: e.fights > 0 ? e.deaths / e.fights : 0,
        }))
        .sort((a, b) => b.avgDamageTaken - a.avgDamageTaken),
    }))
    .sort((a, b) => {
      if (a.bucket.act !== b.bucket.act) return a.bucket.act - b.bucket.act;
      if (a.bucket.actName !== b.bucket.actName)
        return a.bucket.actName.localeCompare(b.bucket.actName);
      return TIER_ORDER[a.bucket.tier] - TIER_ORDER[b.bucket.tier];
    });
}

export function formatActHeading(act: number, actName: string): string {
  const pretty = actName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `Act ${act} — ${pretty}`;
}

export function formatEncounterName(encounterId: string): string {
  // Strip ENCOUNTER. prefix and tier suffix
  const base = encounterId.replace(/^ENCOUNTER\./, '').replace(/_(WEAK|NORMAL|ELITE|BOSS)$/i, '');
  return base
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
