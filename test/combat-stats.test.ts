import { describe, it, expect } from 'vitest';
import {
  computeCombatStats,
  formatActHeading,
  formatEncounterName,
} from '../src/lib/combat-stats';
import { loadFixture, loadFixtures, loadAllFixtures, buildMockRun } from './helpers';

// ─── computeCombatStats ─────────────────────────────────────────

describe('computeCombatStats', () => {
  it('returns empty array for no runs', () => {
    expect(computeCombatStats([])).toEqual([]);
  });

  it('produces bucket stats for all fixtures', () => {
    const runs = loadAllFixtures();
    const stats = computeCombatStats(runs);

    expect(stats.length).toBeGreaterThan(0);

    for (const bucket of stats) {
      expect(bucket.bucket.act).toBeGreaterThanOrEqual(1);
      expect(['weak', 'normal', 'elite', 'boss']).toContain(bucket.bucket.tier);
      expect(bucket.timesFought).toBeGreaterThan(0);
      expect(bucket.avgDamageTaken).toBeGreaterThanOrEqual(0);
      expect(bucket.deathRate).toBeGreaterThanOrEqual(0);
      expect(bucket.deathRate).toBeLessThanOrEqual(1);
    }
  });

  it('bucket stats are sorted by act → actName → tier', () => {
    const runs = loadAllFixtures();
    const stats = computeCombatStats(runs);
    const tierOrder = { weak: 0, normal: 1, elite: 2, boss: 3 };

    for (let i = 1; i < stats.length; i++) {
      const [a, b] = [stats[i - 1], stats[i]];
      if (a.bucket.act !== b.bucket.act) {
        expect(a.bucket.act).toBeLessThan(b.bucket.act);
      } else if (a.bucket.actName !== b.bucket.actName) {
        expect(a.bucket.actName.localeCompare(b.bucket.actName)).toBeLessThan(0);
      } else {
        expect(tierOrder[a.bucket.tier]).toBeLessThanOrEqual(tierOrder[b.bucket.tier]);
      }
    }
  });

  it('encounter stats within each bucket are sorted by avgDamageTaken desc', () => {
    const runs = loadAllFixtures();
    const stats = computeCombatStats(runs);

    for (const bucket of stats) {
      for (let i = 1; i < bucket.encounters.length; i++) {
        expect(bucket.encounters[i].avgDamageTaken).toBeLessThanOrEqual(
          bucket.encounters[i - 1].avgDamageTaken,
        );
      }
    }
  });

  it('per-encounter fights sum to bucket fights', () => {
    const runs = loadAllFixtures();
    const stats = computeCombatStats(runs);

    for (const bucket of stats) {
      const encFights = bucket.encounters.reduce((s, e) => s + e.timesFought, 0);
      expect(encFights).toBe(bucket.timesFought);
    }
  });

  it('per-encounter deaths sum to bucket deaths', () => {
    const runs = loadAllFixtures();
    const stats = computeCombatStats(runs);

    for (const bucket of stats) {
      const encDeaths = bucket.encounters.reduce((s, e) => s + e.timesDied, 0);
      expect(encDeaths).toBe(bucket.timesDied);
    }
  });

  it('per-encounter totalDamage sums to bucket totalDamage', () => {
    const runs = loadAllFixtures();
    const stats = computeCombatStats(runs);

    for (const bucket of stats) {
      const encDamage = bucket.encounters.reduce((s, e) => s + e.totalDamageTaken, 0);
      expect(encDamage).toBe(bucket.totalDamageTaken);
    }
  });

  it('death detection: deaths only occur on last floor of last act', () => {
    // A run that died — check that the death is attributed correctly
    const run = loadFixture('1772745257.run');
    const stats = computeCombatStats([run]);

    const totalDeaths = stats.reduce((s, b) => s + b.timesDied, 0);
    // Run was a loss, not abandoned, so exactly 1 death expected
    expect(totalDeaths).toBe(1);

    // Verify the death encounter matches killed_by_encounter
    const deathBucket = stats.find((b) => b.timesDied > 0);
    expect(deathBucket).toBeDefined();
    const deathEnc = deathBucket!.encounters.find((e) => e.timesDied > 0);
    expect(deathEnc).toBeDefined();
    expect(deathEnc!.encounterId).toBe(run.data.killed_by_encounter);
  });

  it('no deaths attributed for winning runs', () => {
    const runs = loadFixtures('1772746469.run', '1772754056.run', '1772759964.run');
    const stats = computeCombatStats(runs);

    const totalDeaths = stats.reduce((s, b) => s + b.timesDied, 0);
    expect(totalDeaths).toBe(0);
  });

  it('no deaths attributed for abandoned runs', () => {
    const runs = loadFixtures('1773771099.run', '1774125604.run', '1774144997.run');
    const stats = computeCombatStats(runs);

    const totalDeaths = stats.reduce((s, b) => s + b.timesDied, 0);
    expect(totalDeaths).toBe(0);
  });

  it('percentiles are computed for each bucket', () => {
    const runs = loadAllFixtures();
    const stats = computeCombatStats(runs);

    for (const bucket of stats) {
      expect(bucket.p20DamageTaken).toBeGreaterThanOrEqual(0);
      expect(bucket.p50DamageTaken).toBeGreaterThanOrEqual(0);
      expect(bucket.p80DamageTaken).toBeGreaterThanOrEqual(0);
      expect(bucket.p20DamageTaken).toBeLessThanOrEqual(bucket.p50DamageTaken);
      expect(bucket.p50DamageTaken).toBeLessThanOrEqual(bucket.p80DamageTaken);
    }
  });

  it('median of a single fight equals the damage value', () => {
    // Build a mock run with exactly one combat
    const run = buildMockRun({
      acts: ['ACT.TESTLAND'],
      map_point_history: [
        [
          {
            map_point_type: 'combat',
            rooms: [{ model_id: 'ENCOUNTER.GOBLIN_NORMAL', room_type: 'combat', turns_taken: 3 }],
            player_stats: [
              {
                player_id: 0,
                current_hp: 50,
                max_hp: 80,
                damage_taken: 17,
                hp_healed: 0,
                max_hp_gained: 0,
                max_hp_lost: 0,
                current_gold: 100,
                gold_gained: 20,
                gold_lost: 0,
                gold_spent: 0,
                gold_stolen: 0,
              },
            ],
          },
        ],
      ],
      killed_by_encounter: 'NONE.NONE',
    });

    const stats = computeCombatStats([run]);
    expect(stats.length).toBe(1);
    expect(stats[0].p50DamageTaken).toBe(17);
    expect(stats[0].p20DamageTaken).toBe(17);
    expect(stats[0].p80DamageTaken).toBe(17);
    expect(stats[0].avgDamageTaken).toBe(17);
  });

  it('correctly skips non-encounter rooms', () => {
    const run = buildMockRun({
      acts: ['ACT.TESTLAND'],
      map_point_history: [
        [
          {
            map_point_type: 'event',
            rooms: [{ model_id: 'EVENT.SPOOKY_DOOR', room_type: 'event', turns_taken: 0 }],
            player_stats: [
              {
                player_id: 0, current_hp: 80, max_hp: 80, damage_taken: 0,
                hp_healed: 0, max_hp_gained: 0, max_hp_lost: 0,
                current_gold: 50, gold_gained: 0, gold_lost: 0, gold_spent: 0, gold_stolen: 0,
              },
            ],
          },
        ],
      ],
    });

    const stats = computeCombatStats([run]);
    expect(stats.length).toBe(0);
  });

  it('correctly skips encounters with unknown tier', () => {
    const run = buildMockRun({
      acts: ['ACT.TESTLAND'],
      map_point_history: [
        [
          {
            map_point_type: 'combat',
            rooms: [{ model_id: 'ENCOUNTER.WEIRD_THING', room_type: 'combat', turns_taken: 3 }],
            player_stats: [
              {
                player_id: 0, current_hp: 50, max_hp: 80, damage_taken: 10,
                hp_healed: 0, max_hp_gained: 0, max_hp_lost: 0,
                current_gold: 100, gold_gained: 0, gold_lost: 0, gold_spent: 0, gold_stolen: 0,
              },
            ],
          },
        ],
      ],
    });

    const stats = computeCombatStats([run]);
    // No tier suffix → skipped
    expect(stats.length).toBe(0);
  });
});

// ─── Format helpers ─────────────────────────────────────────────

describe('formatActHeading', () => {
  it('formats act name with number', () => {
    expect(formatActHeading(1, 'OVERGROWTH')).toBe('Act 1 — Overgrowth');
  });

  it('handles underscored names', () => {
    expect(formatActHeading(2, 'DARK_FOREST')).toBe('Act 2 — Dark Forest');
  });
});

describe('formatEncounterName', () => {
  it('strips prefix and tier suffix', () => {
    expect(formatEncounterName('ENCOUNTER.BOWLBUGS_WEAK')).toBe('Bowlbugs');
  });

  it('handles multi-word names', () => {
    expect(formatEncounterName('ENCOUNTER.SKULKING_COLONY_ELITE')).toBe('Skulking Colony');
  });

  it('handles boss suffix', () => {
    expect(formatEncounterName('ENCOUNTER.CEREMONIAL_BEAST_BOSS')).toBe('Ceremonial Beast');
  });

  it('handles name without prefix', () => {
    expect(formatEncounterName('GOBLIN_NORMAL')).toBe('Goblin');
  });
});
