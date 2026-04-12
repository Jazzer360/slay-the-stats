import { describe, it, expect } from 'vitest';
import { summarizeRun, computeAggregateStats } from '../src/lib/stats';
import { loadFixture, loadFixtures, loadAllFixtures } from './helpers';

// ─── summarizeRun ────────────────────────────────────────────────

describe('summarizeRun', () => {
  it('summarizes a 3-act winning run correctly', () => {
    const run = loadFixture('1772746469.run');
    const summary = summarizeRun(run);

    expect(summary.win).toBe(true);
    expect(summary.wasAbandoned).toBe(false);
    expect(summary.killedBy).toBe('');
    expect(summary.floorsReached).toBeGreaterThan(0);
    expect(summary.acts.length).toBe(3);
    expect(summary.character).toMatch(/^CHARACTER\./);
    expect(summary.deckSize).toBeGreaterThan(0);
    expect(summary.relicCount).toBeGreaterThan(0);
  });

  it('reports killed_by for a loss', () => {
    // Short loss — killed by an encounter
    const run = loadFixture('1772745257.run');
    const summary = summarizeRun(run);

    expect(summary.win).toBe(false);
    expect(summary.wasAbandoned).toBe(false);
    expect(summary.killedBy).not.toBe('');
    expect(summary.killedBy).toMatch(/^ENCOUNTER\./);
  });

  it('handles abandoned run that was mid-combat', () => {
    const run = loadFixture('1773771099.run');
    const summary = summarizeRun(run);

    expect(summary.wasAbandoned).toBe(true);
    expect(summary.win).toBe(false);
    // This run was abandoned during combat, so killed_by_encounter is still set.
    // The game records the encounter even though the player quit.
    expect(typeof summary.killedBy).toBe('string');
  });

  it('counts floors across all acts', () => {
    const run = loadFixture('1772746469.run');
    const summary = summarizeRun(run);

    const expectedFloors = run.data.map_point_history.reduce(
      (sum, act) => sum + act.length,
      0,
    );
    expect(summary.floorsReached).toBe(expectedFloors);
  });

  it('counts card picks and skips from card_choices', () => {
    // Use a run that has card choices
    const run = loadFixture('1772746469.run');
    const summary = summarizeRun(run);

    // A winning 3-act run should have multiple card choice opportunities
    expect(summary.cardsPicked + summary.cardsSkipped).toBeGreaterThan(0);
  });

  it('handles multiplayer run (reads player 0)', () => {
    const run = loadFixture('1772763220.run');
    const summary = summarizeRun(run);

    // Should still work — always reads players[0]
    expect(summary.character).toMatch(/^CHARACTER\./);
    expect(summary.deckSize).toBeGreaterThanOrEqual(0);
  });

  it('counts floors correctly for a very short run', () => {
    const run = loadFixture('1774125604.run');
    const summary = summarizeRun(run);

    expect(summary.floorsReached).toBe(2);
    expect(summary.wasAbandoned).toBe(true);
  });
});

// ─── computeAggregateStats ──────────────────────────────────────

describe('computeAggregateStats', () => {
  it('returns zeroed stats for empty input', () => {
    const agg = computeAggregateStats([]);
    expect(agg.totalRuns).toBe(0);
    expect(agg.wins).toBe(0);
    expect(agg.winRate).toBe(0);
    expect(agg.characterBreakdown).toEqual([]);
  });

  it('computes correct totals across all fixtures', () => {
    const runs = loadAllFixtures();
    const agg = computeAggregateStats(runs);

    expect(agg.totalRuns).toBe(207);
    expect(agg.wins).toBe(60);
    expect(agg.losses + agg.wins + agg.abandoned).toBe(207);
    expect(agg.abandoned).toBe(3);
    expect(agg.losses).toBe(144);
  });

  it('win rate is wins / total', () => {
    const runs = loadAllFixtures();
    const agg = computeAggregateStats(runs);

    expect(agg.winRate).toBeCloseTo(60 / 207, 6);
  });

  it('character breakdown sums to total runs', () => {
    const runs = loadAllFixtures();
    const agg = computeAggregateStats(runs);

    const charTotal = agg.characterBreakdown.reduce((s, c) => s + c.count, 0);
    expect(charTotal).toBe(207);
  });

  it('character win rates are between 0 and 1', () => {
    const runs = loadAllFixtures();
    const agg = computeAggregateStats(runs);

    for (const c of agg.characterBreakdown) {
      expect(c.winRate).toBeGreaterThanOrEqual(0);
      expect(c.winRate).toBeLessThanOrEqual(1);
    }
  });

  it('ascension breakdown sums to total runs', () => {
    const runs = loadAllFixtures();
    const agg = computeAggregateStats(runs);

    const ascTotal = agg.ascensionBreakdown.reduce((s, a) => s + a.count, 0);
    expect(ascTotal).toBe(207);
  });

  it('ascension breakdown is sorted ascending', () => {
    const runs = loadAllFixtures();
    const agg = computeAggregateStats(runs);

    for (let i = 1; i < agg.ascensionBreakdown.length; i++) {
      expect(agg.ascensionBreakdown[i].ascension).toBeGreaterThan(
        agg.ascensionBreakdown[i - 1].ascension,
      );
    }
  });

  it('commonDeaths has at most 10 entries', () => {
    const runs = loadAllFixtures();
    const agg = computeAggregateStats(runs);

    expect(agg.commonDeaths.length).toBeLessThanOrEqual(10);
  });

  it('commonDeaths are sorted by count descending', () => {
    const runs = loadAllFixtures();
    const agg = computeAggregateStats(runs);

    for (let i = 1; i < agg.commonDeaths.length; i++) {
      expect(agg.commonDeaths[i].count).toBeLessThanOrEqual(agg.commonDeaths[i - 1].count);
    }
  });

  it('computes correct stats for a single winning run', () => {
    const runs = loadFixtures('1772746469.run');
    const agg = computeAggregateStats(runs);

    expect(agg.totalRuns).toBe(1);
    expect(agg.wins).toBe(1);
    expect(agg.losses).toBe(0);
    expect(agg.abandoned).toBe(0);
    expect(agg.winRate).toBe(1);
    expect(agg.commonDeaths).toEqual([]);
  });

  it('computes correct stats for a single losing run', () => {
    const runs = loadFixtures('1772745257.run');
    const agg = computeAggregateStats(runs);

    expect(agg.totalRuns).toBe(1);
    expect(agg.wins).toBe(0);
    expect(agg.losses).toBe(1);
    expect(agg.winRate).toBe(0);
    expect(agg.commonDeaths.length).toBe(1);
  });

  it('abandoned runs are not counted as losses', () => {
    const runs = loadFixtures('1773771099.run', '1774125604.run', '1774144997.run');
    const agg = computeAggregateStats(runs);

    expect(agg.totalRuns).toBe(3);
    expect(agg.abandoned).toBe(3);
    expect(agg.losses).toBe(0);
    expect(agg.wins).toBe(0);
  });

  it('averages are computed correctly for a known subset', () => {
    const fileNames = ['1772746469.run', '1772745257.run'];
    const runs = loadFixtures(...fileNames);
    const agg = computeAggregateStats(runs);

    // Manually compute expected averages
    const summaries = runs.map((r) => summarizeRun(r));
    const expectedAvgFloors =
      summaries.reduce((s, r) => s + r.floorsReached, 0) / 2;

    expect(agg.avgFloorsReached).toBeCloseTo(expectedAvgFloors, 6);
  });
});
