import type { ParsedRun, AncientChoice, CardChoice } from '../types/run';
import type { EloEntry, EloMap, OfferInstance } from '../types/elo';

export const INITIAL_RATING = 1500;
export const K_FACTOR = 32;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function getOrCreateEntry(map: EloMap, id: string): EloEntry {
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
      appearances: [],
    };
    map.set(id, entry);
  }
  return entry;
}

/**
 * Apply a single Elo match: winner beats loser.
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

type OfferLog = Map<string, Map<string, OfferInstance[]>>;

interface RunMeta {
  fileName: string;
  win: boolean;
  deckSize: number;
  startTime: number;
  character: string;
  ascension: number;
  floorsReached: number;
}

function recordOffer(
  offerLog: OfferLog,
  entityId: string,
  fileName: string,
  offer: OfferInstance,
): void {
  let runOffers = offerLog.get(entityId);
  if (!runOffers) {
    runOffers = new Map();
    offerLog.set(entityId, runOffers);
  }
  let offers = runOffers.get(fileName);
  if (!offers) {
    offers = [];
    runOffers.set(fileName, offers);
  }
  offers.push(offer);
}

function finalizeAppearances(elo: EloMap, offerLog: OfferLog, runMeta: Map<string, RunMeta>): void {
  for (const [entityId, runOffers] of offerLog) {
    const entry = elo.get(entityId);
    if (!entry) continue;
    for (const [fileName, offers] of runOffers) {
      const meta = runMeta.get(fileName);
      if (!meta) continue;
      entry.appearances.push({
        ...meta,
        offers: offers.sort((a, b) => a.floor - b.floor),
      });
    }
    entry.appearances.sort((a, b) => b.startTime - a.startTime);
  }
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

export interface CardEloOptions {
  upgradeAware: boolean;
  enchantmentAware: boolean;
}

/**
 * Compute Elo ratings for card choices across all provided runs.
 * Runs should already be filtered and sorted chronologically.
 */
export function computeCardElo(
  runs: ParsedRun[],
  options: CardEloOptions = { upgradeAware: true, enchantmentAware: true },
): EloMap {
  const elo: EloMap = new Map();
  const offerLog: OfferLog = new Map();
  const runMetaMap = new Map<string, RunMeta>();

  for (const run of runs) {
    if (!run.data.players[0]?.character) continue;

    // Compute and store run metadata for appearances
    let floorsTotal = 0;
    for (const act of run.data.map_point_history) floorsTotal += act.length;
    runMetaMap.set(run.fileName, {
      fileName: run.fileName,
      win: run.data.win,
      deckSize: run.data.players[0]?.deck?.length ?? 0,
      startTime: run.data.start_time,
      character: run.data.players[0]?.character ?? 'Unknown',
      ascension: run.data.ascension,
      floorsReached: floorsTotal,
    });

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
        const isCombat = mapPoint.rooms?.some((r) => (r.turns_taken ?? 0) > 0) ?? false;

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

        // Exclude floor 1 bonus picks (e.g. Leaded Paperweight) from Elo
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
            `[Elo] Ungroupable card choices: ${run.fileName} floor ${currentFloor} — ` +
              `${total} choices, expected groups of ${cardGroupSize}` +
              (lastingCandyActive ? ' (Lasting Candy active)' : '') +
              ` | skipping floor`,
          );
        }
        const pickedIds = processCardChoices(
          elo,
          choices,
          actIdx,
          isBoss,
          hasPaelsWing,
          cardGroupSize,
          options,
          currentFloor,
          run.fileName,
          offerLog,
        );
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

  // Build appearance histories from the offer log
  finalizeAppearances(elo, offerLog, runMetaMap);

  // Compute derived rates
  for (const entry of elo.values()) {
    entry.pickRate = entry.timesSeen > 0 ? entry.timesPicked / entry.timesSeen : 0;
    const totalRuns = entry.runWins + entry.runLosses;
    entry.runWinRate = totalRuns > 0 ? entry.runWins / totalRuns : 0;
  }

  return elo;
}

/**
 * Get the card ID, optionally including upgrade and enchantment info.
 */
function getCardId(choice: CardChoice, options: CardEloOptions): string {
  const base = choice.card.id;
  let id =
    options.upgradeAware &&
    choice.card.current_upgrade_level &&
    choice.card.current_upgrade_level > 0
      ? `${base}+`
      : base;
  if (options.enchantmentAware && choice.card.enchantment) {
    id += ` [${choice.card.enchantment.id}]`;
  }
  return id;
}

/**
 * Filter out the stolen card from Thieving Hopper encounters.
 * Thieving Hopper steals a card during combat and places it in cards_removed,
 * but also adds it to card_choices as a recovery option. We remove one instance
 * of each stolen card from the choices so grouping and Elo work on the real rewards.
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
  options: CardEloOptions,
  currentFloor: number,
  fileName: string,
  offerLog: OfferLog,
): string[] {
  const total = choices.length;
  const groupSize = getGroupSize(total, cardGroupSize);
  if (groupSize === 0) return []; // Can't determine grouping, skip floor

  const skipId = getSkipId(actIndex, isBoss);
  const numGroups = total / groupSize;
  const allPickedIds: string[] = [];

  for (let g = 0; g < numGroups; g++) {
    const groupChoices = choices.slice(g * groupSize, (g + 1) * groupSize);
    const groupCardIds = groupChoices.map((c) => getCardId(c, options));
    const picked = groupChoices.filter((c) => c.was_picked);
    const pickedIds = picked.map((c) => getCardId(c, options));
    const unpickedIds = groupChoices.filter((c) => !c.was_picked).map((c) => getCardId(c, options));

    // Every group has a skip option (and sacrifice if Pael's Wing is active)
    const allOptions = [...groupCardIds];
    if (hasPaelsWing) {
      allOptions.push('SACRIFICE');
      allOptions.push(skipId);
    } else {
      allOptions.push(skipId);
    }

    // Snapshot ratings before this group's matches
    const ratingsBefore = new Map<string, number>();
    for (const id of allOptions) {
      ratingsBefore.set(id, getOrCreateEntry(elo, id).rating);
    }

    // Update timesSeen for all options in this group
    for (const id of allOptions) {
      getOrCreateEntry(elo, id).timesSeen++;
    }

    let chosenId: string;
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
      chosenId = pickedIds[0];
      allPickedIds.push(...pickedIds);
    } else {
      // Skip was chosen for this group
      chosenId = hasPaelsWing ? 'SACRIFICE' : skipId;
      const winnerEntry = getOrCreateEntry(elo, chosenId);
      winnerEntry.timesPicked++;

      const losers = allOptions.filter((id) => id !== chosenId);
      for (const loserId of losers) {
        applyMatch(winnerEntry, getOrCreateEntry(elo, loserId));
      }
      allPickedIds.push(chosenId);
    }

    // Record offer instances for all entities in this group
    for (const id of allOptions) {
      const ratingBefore = ratingsBefore.get(id)!;
      const currentRating = getOrCreateEntry(elo, id).rating;
      recordOffer(offerLog, id, fileName, {
        floor: currentFloor,
        actIndex,
        allOptions: [...allOptions],
        chosenId,
        wasPicked: picked.length > 0 ? pickedIds.includes(id) : id === chosenId,
        eloChange: currentRating - ratingBefore,
        ratingAfter: currentRating,
      });
    }
  }

  return allPickedIds;
}

/**
 * Compute Elo ratings for ancient (post-boss) reward choices.
 * Also builds a mapping of reward TextKey -> ancient event name.
 */
export function computeAncientElo(runs: ParsedRun[]): {
  elo: EloMap;
  ancientMap: Map<string, string>;
} {
  const elo: EloMap = new Map();
  const ancientMap = new Map<string, string>(); // TextKey -> ancient name (e.g. "EVENT.PAEL")
  const offerLog: OfferLog = new Map();
  const runMetaMap = new Map<string, RunMeta>();

  for (const run of runs) {
    if (!run.data.players[0]?.character) continue;

    let floorsTotal = 0;
    for (const act of run.data.map_point_history) floorsTotal += act.length;
    runMetaMap.set(run.fileName, {
      fileName: run.fileName,
      win: run.data.win,
      deckSize: run.data.players[0]?.deck?.length ?? 0,
      startTime: run.data.start_time,
      character: run.data.players[0]?.character ?? 'Unknown',
      ascension: run.data.ascension,
      floorsReached: floorsTotal,
    });

    const history = run.data.map_point_history;
    const pickedInRun = new Set<string>();
    let currentFloor = 0;

    for (let actIdx = 0; actIdx < history.length; actIdx++) {
      const act = history[actIdx];
      for (const mapPoint of act) {
        currentFloor++;
        const stats = mapPoint.player_stats?.[0];
        if (!stats?.ancient_choice || stats.ancient_choice.length === 0) continue;

        // Extract the ancient name from the room's model_id
        const ancientName = mapPoint.rooms?.[0]?.model_id ?? 'UNKNOWN';
        for (const choice of stats.ancient_choice) {
          ancientMap.set(normalizeAncientId(choice), ancientName);
        }

        const pickedId = processAncientChoices(
          elo,
          stats.ancient_choice,
          currentFloor,
          actIdx,
          run.fileName,
          offerLog,
        );
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

  // Build appearance histories
  finalizeAppearances(elo, offerLog, runMetaMap);

  // Compute derived rates
  for (const entry of elo.values()) {
    entry.pickRate = entry.timesSeen > 0 ? entry.timesPicked / entry.timesSeen : 0;
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
  choices: AncientChoice[],
  currentFloor: number,
  actIndex: number,
  fileName: string,
  offerLog: OfferLog,
): string | null {
  const picked = choices.find((c) => c.was_chosen);
  const allOptionIds = choices.map((c) => normalizeAncientId(c));

  // Snapshot ratings before matches
  const ratingsBefore = new Map<string, number>();
  for (const choice of choices) {
    const id = normalizeAncientId(choice);
    ratingsBefore.set(id, getOrCreateEntry(elo, id).rating);
  }

  // Track all presented options
  for (const choice of choices) {
    const id = normalizeAncientId(choice);
    getOrCreateEntry(elo, id).timesSeen++;
  }

  let chosenId: string | null = null;

  if (picked) {
    chosenId = normalizeAncientId(picked);
    const winnerEntry = getOrCreateEntry(elo, chosenId);
    winnerEntry.timesPicked++;

    const losers = choices.filter((c) => !c.was_chosen);
    for (const loser of losers) {
      const loserId = normalizeAncientId(loser);
      applyMatch(winnerEntry, getOrCreateEntry(elo, loserId));
    }
  }

  // Record offer instances for all entities
  for (const choice of choices) {
    const id = normalizeAncientId(choice);
    const ratingBefore = ratingsBefore.get(id)!;
    const currentRating = getOrCreateEntry(elo, id).rating;
    recordOffer(offerLog, id, fileName, {
      floor: currentFloor,
      actIndex,
      allOptions: allOptionIds,
      chosenId: chosenId ?? 'NONE',
      wasPicked: id === chosenId,
      eloChange: currentRating - ratingBefore,
      ratingAfter: currentRating,
    });
  }

  return chosenId;
}
