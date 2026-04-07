import type { ParsedRun, AncientChoice, CardChoice } from '../types/run';
import type { EloEntry, EloMap } from '../types/elo';

const INITIAL_RATING = 1500;
const K_FACTOR = 32;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function getOrCreateEntry(
  map: EloMap,
  id: string
): EloEntry {
  let entry = map.get(id);
  if (!entry) {
    entry = {
      id,
      rating: INITIAL_RATING,
      matches: 0,
      wins: 0,
      losses: 0,
      pickRate: 0,
      timesSeen: 0,
      timesPicked: 0,
      runWins: 0,
      runLosses: 0,
      runWinRate: 0,
    };
    map.set(id, entry);
  }
  return entry;
}

/**
 * Apply a single ELO match: winner beats loser.
 */
function applyMatch(winner: EloEntry, loser: EloEntry): void {
  const eW = expectedScore(winner.rating, loser.rating);
  const eL = expectedScore(loser.rating, winner.rating);

  winner.rating += K_FACTOR * (1 - eW);
  loser.rating += K_FACTOR * (0 - eL);

  winner.matches++;
  winner.wins++;
  loser.matches++;
  loser.losses++;
}

/**
 * Get the act-specific skip ID for card rewards.
 */
function getSkipId(actIndex: number, isBoss: boolean): string {
  const actNum = actIndex + 1;
  return isBoss ? `SKIP_BOSS_ACT_${actNum}` : `SKIP_ACT_${actNum}`;
}

/**
 * Find the floor at which Pael's Wing was acquired in a run.
 * Returns -1 if the relic is not present.
 */
function getPaelsWingFloor(run: ParsedRun): number {
  const relics = run.data.players[0]?.relics;
  if (!relics) return -1;
  const wing = relics.find((r) => r.id === 'RELIC.PAELS_WING');
  return wing ? wing.floor_added_to_deck : -1;
}

/**
 * Compute ELO ratings for card choices across all provided runs.
 * Runs should already be filtered and sorted chronologically.
 */
export function computeCardElo(runs: ParsedRun[]): EloMap {
  const elo: EloMap = new Map();

  for (const run of runs) {
    if (!run.data.players[0]?.character) continue;

    const paelsWingFloor = getPaelsWingFloor(run);
    const history = run.data.map_point_history;
    let currentFloor = 0;
    const pickedInRun = new Set<string>();

    for (let actIdx = 0; actIdx < history.length; actIdx++) {
      const act = history[actIdx];

      for (const mapPoint of act) {
        currentFloor++;
        const stats = mapPoint.player_stats?.[0];
        if (!stats?.card_choices || stats.card_choices.length === 0) continue;

        const isBoss = mapPoint.map_point_type === 'boss';
        const hasPaelsWing = paelsWingFloor >= 0 && currentFloor > paelsWingFloor;
        const pickedId = processCardChoices(elo, stats.card_choices, actIdx, isBoss, hasPaelsWing);
        if (pickedId) pickedInRun.add(pickedId);
      }
    }

    // Attribute run outcome to all picked entities
    for (const id of pickedInRun) {
      const entry = elo.get(id);
      if (entry) {
        if (run.data.win) entry.runWins++;
        else entry.runLosses++;
      }
    }
  }

  // Compute derived rates
  for (const entry of elo.values()) {
    entry.pickRate =
      entry.timesSeen > 0 ? entry.timesPicked / entry.timesSeen : 0;
    const totalRuns = entry.runWins + entry.runLosses;
    entry.runWinRate = totalRuns > 0 ? entry.runWins / totalRuns : 0;
  }

  return elo;
}

/**
 * Get the upgrade-aware card ID: append "+" if upgraded.
 */
function getCardId(choice: CardChoice): string {
  const base = choice.card.id;
  return choice.card.current_upgrade_level && choice.card.current_upgrade_level > 0
    ? `${base}+`
    : base;
}

function processCardChoices(
  elo: EloMap,
  choices: CardChoice[],
  actIndex: number,
  isBoss: boolean,
  hasPaelsWing: boolean
): string | null {
  const picked = choices.find((c) => c.was_picked);
  const skipId = getSkipId(actIndex, isBoss);

  // Track all presented options (with upgrade suffix)
  const allIds: string[] = choices.map((c) => getCardId(c));

  // If the player has Pael's Wing and skips, it's a "Sacrifice" instead of a normal skip.
  // Both Sacrifice and the normal Skip are always implicit options.
  if (hasPaelsWing) {
    allIds.push('SACRIFICE');
    allIds.push(skipId);
  } else {
    allIds.push(skipId);
  }

  // Update timesSeen for all options
  for (const id of allIds) {
    const entry = getOrCreateEntry(elo, id);
    entry.timesSeen++;
  }

  if (picked) {
    // A card was picked — it "wins" against every other option
    const winnerId = getCardId(picked);
    const winnerEntry = getOrCreateEntry(elo, winnerId);
    winnerEntry.timesPicked++;

    const losers = allIds.filter((id) => id !== winnerId);
    for (const loserId of losers) {
      const loserEntry = getOrCreateEntry(elo, loserId);
      applyMatch(winnerEntry, loserEntry);
    }
    return winnerId;
  } else {
    // Skip was chosen
    // If the player has Pael's Wing, this is a "Sacrifice"
    const winnerId = hasPaelsWing ? 'SACRIFICE' : skipId;
    const winnerEntry = getOrCreateEntry(elo, winnerId);
    winnerEntry.timesPicked++;

    const losers = allIds.filter((id) => id !== winnerId);
    for (const loserId of losers) {
      const loserEntry = getOrCreateEntry(elo, loserId);
      applyMatch(winnerEntry, loserEntry);
    }
    return winnerId;
  }
}

/**
 * Compute ELO ratings for ancient (post-boss) reward choices.
 * Also builds a mapping of reward TextKey -> ancient event name.
 */
export function computeAncientElo(runs: ParsedRun[]): { elo: EloMap; ancientMap: Map<string, string> } {
  const elo: EloMap = new Map();
  const ancientMap = new Map<string, string>(); // TextKey -> ancient name (e.g. "EVENT.PAEL")

  for (const run of runs) {
    if (!run.data.players[0]?.character) continue;

    const history = run.data.map_point_history;
    const pickedInRun = new Set<string>();

    for (const act of history) {
      for (const mapPoint of act) {
        const stats = mapPoint.player_stats?.[0];
        if (
          !stats?.ancient_choice ||
          stats.ancient_choice.length === 0
        )
          continue;

        // Extract the ancient name from the room's model_id
        const ancientName = mapPoint.rooms?.[0]?.model_id ?? 'UNKNOWN';
        for (const choice of stats.ancient_choice) {
          ancientMap.set(normalizeAncientId(choice), ancientName);
        }

        const pickedId = processAncientChoices(elo, stats.ancient_choice);
        if (pickedId) pickedInRun.add(pickedId);
      }
    }

    // Attribute run outcome to all picked entities
    for (const id of pickedInRun) {
      const entry = elo.get(id);
      if (entry) {
        if (run.data.win) entry.runWins++;
        else entry.runLosses++;
      }
    }
  }

  // Compute derived rates
  for (const entry of elo.values()) {
    entry.pickRate =
      entry.timesSeen > 0 ? entry.timesPicked / entry.timesSeen : 0;
    const totalRuns = entry.runWins + entry.runLosses;
    entry.runWinRate = totalRuns > 0 ? entry.runWins / totalRuns : 0;
  }

  return { elo, ancientMap };
}

/**
 * Normalize an ancient choice id. Sea Glass variants store the character name
 * as the TextKey (e.g. "DEFECT") but title.key reveals it as
 * "SEA_GLASS.DEFECT.title". We normalize these to "SEA_GLASS_(DEFECT)" etc.
 */
function normalizeAncientId(choice: AncientChoice): string {
  const titleKey = choice.title?.key ?? '';
  const match = titleKey.match(/^SEA_GLASS\.(.+)\.title$/);
  if (match) {
    return `SEA_GLASS_(${match[1]})`;
  }
  return choice.TextKey;
}

function processAncientChoices(
  elo: EloMap,
  choices: AncientChoice[]
): string | null {
  const picked = choices.find((c) => c.was_chosen);

  // Track all presented options
  for (const choice of choices) {
    const id = normalizeAncientId(choice);
    const entry = getOrCreateEntry(elo, id);
    entry.timesSeen++;
  }

  if (picked) {
    const winnerId = normalizeAncientId(picked);
    const winnerEntry = getOrCreateEntry(elo, winnerId);
    winnerEntry.timesPicked++;

    const losers = choices.filter((c) => !c.was_chosen);
    for (const loser of losers) {
      const loserId = normalizeAncientId(loser);
      const loserEntry = getOrCreateEntry(elo, loserId);
      applyMatch(winnerEntry, loserEntry);
    }
    return winnerId;
  }
  return null;
}
