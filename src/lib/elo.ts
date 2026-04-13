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
 * Find the floor at which Lasting Candy was acquired in a run.
 * Returns -1 if the relic is not present.
 */
function getLastingCandyFloor(run: ParsedRun): number {
  const relics = run.data.players[0]?.relics;
  if (!relics) return -1;
  const relic = relics.find((r) => r.id === 'RELIC.LASTING_CANDY');
  return relic ? relic.floor_added_to_deck : -1;
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
    const lastingCandyFloor = getLastingCandyFloor(run);
    let lastingCandyCounter = 0;
    const history = run.data.map_point_history;
    let currentFloor = 0;
    const pickedInRun = new Set<string>();

    for (let actIdx = 0; actIdx < history.length; actIdx++) {
      const act = history[actIdx];

      for (const mapPoint of act) {
        currentFloor++;
        const stats = mapPoint.player_stats?.[0];
        const room = mapPoint.rooms?.[0];
        const isCombat = (room?.turns_taken ?? 0) > 0;

        // Track Lasting Candy counter: increments after each combat once obtained
        let lastingCandyActive = false;
        if (isCombat && lastingCandyFloor >= 0 && currentFloor > lastingCandyFloor) {
          lastingCandyCounter++;
          if (lastingCandyCounter >= 2) {
            lastingCandyActive = true;
            lastingCandyCounter = 0;
          }
        }

        if (!stats?.card_choices || stats.card_choices.length === 0) continue;

        // Exclude floor 1 bonus picks (e.g. Leaded Paperweight) from ELO
        if (currentFloor === 1) continue;

        // Skip shop floors — buying cards is not a competitive choice like card rewards
        if (room?.room_type === 'shop') continue;

        const isBoss = mapPoint.map_point_type === 'boss';
        const hasPaelsWing = paelsWingFloor >= 0 && currentFloor > paelsWingFloor;
        const cardGroupSize = lastingCandyActive ? 4 : 3;
        const isThievingHopper = room?.monster_ids?.includes('MONSTER.THIEVING_HOPPER') ?? false;
        const choices = isThievingHopper
          ? filterThievingHopperCards(stats.card_choices, stats.cards_removed)
          : stats.card_choices;
        const total = choices.length;
        if (total % cardGroupSize !== 0) {
          console.warn(
            `[ELO] Ungroupable card choices: ${run.fileName} floor ${currentFloor} — ` +
            `${total} choices, expected groups of ${cardGroupSize}` +
            (lastingCandyActive ? ' (Lasting Candy active)' : '') +
            ` | skipping floor`,
          );
        }
        const pickedIds = processCardChoices(elo, choices, actIdx, isBoss, hasPaelsWing, cardGroupSize);
        for (const id of pickedIds) pickedInRun.add(id);
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

/**
 * Filter out the stolen card from Thieving Hopper encounters.
 * Thieving Hopper steals a card during combat and places it in cards_removed,
 * but also adds it to card_choices as a recovery option. We remove one instance
 * of each stolen card from the choices so grouping and ELO work on the real rewards.
 */
function filterThievingHopperCards(
  choices: CardChoice[],
  cardsRemoved?: { id: string }[],
): CardChoice[] {
  if (!cardsRemoved || cardsRemoved.length === 0) return choices;

  const stolenCounts = new Map<string, number>();
  for (const c of cardsRemoved) {
    stolenCounts.set(c.id, (stolenCounts.get(c.id) ?? 0) + 1);
  }

  return choices.filter((choice) => {
    const remaining = stolenCounts.get(choice.card.id) ?? 0;
    if (remaining > 0) {
      stolenCounts.set(choice.card.id, remaining - 1);
      return false;
    }
    return true;
  });
}

/**
 * Determine the reward group size from the total number of card choices.
 * Cards are offered in groups of 3, or groups of 4 when Lasting Candy is active.
 * Returns 0 if the total doesn't fit the expected grouping (skip this floor).
 */
function getGroupSize(total: number, expectedSize: number): number {
  if (total > 0 && total % expectedSize === 0) return expectedSize;
  return 0;
}

/**
 * Process card choices for a single floor, splitting them into reward groups.
 * Each group of cards was presented as an independent reward with its own skip.
 *
 * Group size is determined by Lasting Candy relic tracking.
 */
function processCardChoices(
  elo: EloMap,
  choices: CardChoice[],
  actIndex: number,
  isBoss: boolean,
  hasPaelsWing: boolean,
  cardGroupSize: number,
): string[] {
  const total = choices.length;
  const groupSize = getGroupSize(total, cardGroupSize);
  if (groupSize === 0) return []; // Can't determine grouping, skip floor

  const skipId = getSkipId(actIndex, isBoss);
  const numGroups = total / groupSize;
  const allPickedIds: string[] = [];

  for (let g = 0; g < numGroups; g++) {
    const groupChoices = choices.slice(g * groupSize, (g + 1) * groupSize);
    const groupCardIds = groupChoices.map((c) => getCardId(c));
    const picked = groupChoices.filter((c) => c.was_picked);
    const pickedIds = picked.map((c) => getCardId(c));
    const unpickedIds = groupChoices.filter((c) => !c.was_picked).map((c) => getCardId(c));

    // Every group has a skip option (and sacrifice if Pael's Wing is active)
    const allOptions = [...groupCardIds];
    if (hasPaelsWing) {
      allOptions.push('SACRIFICE');
      allOptions.push(skipId);
    } else {
      allOptions.push(skipId);
    }

    // Update timesSeen for all options in this group
    for (const id of allOptions) {
      getOrCreateEntry(elo, id).timesSeen++;
    }

    if (picked.length > 0) {
      // Picked card wins against unpicked cards + skip (+ sacrifice)
      const loserIds = hasPaelsWing
        ? [...unpickedIds, 'SACRIFICE', skipId]
        : [...unpickedIds, skipId];

      for (const winnerId of pickedIds) {
        const winnerEntry = getOrCreateEntry(elo, winnerId);
        winnerEntry.timesPicked++;
        for (const loserId of loserIds) {
          applyMatch(winnerEntry, getOrCreateEntry(elo, loserId));
        }
      }
      allPickedIds.push(...pickedIds);
    } else {
      // Skip was chosen for this group
      const winnerId = hasPaelsWing ? 'SACRIFICE' : skipId;
      const winnerEntry = getOrCreateEntry(elo, winnerId);
      winnerEntry.timesPicked++;

      const losers = allOptions.filter((id) => id !== winnerId);
      for (const loserId of losers) {
        applyMatch(winnerEntry, getOrCreateEntry(elo, loserId));
      }
      allPickedIds.push(winnerId);
    }
  }

  return allPickedIds;
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
