import { formatId } from './format';
import type {
  RunData,
  CardChoice,
  PlayerStats,
  RunTimeline,
  ActSummary,
  FloorSummary,
  FloorEvent,
} from '../types/run';

/**
 * Parse raw RunData into a clean RunTimeline with per-floor summaries.
 * Extracts all the "what happened" logic into structured data.
 */
export function parseRunTimeline(data: RunData): RunTimeline {
  const player = data.players[0];
  const bingBongRelic = player?.relics.find((r) => r.id === 'RELIC.BING_BONG');
  const bingBongFloor = bingBongRelic ? bingBongRelic.floor_added_to_deck : -1;
  const lastingCandyFloor = getLastingCandyFloor(player?.relics);
  let lastingCandyCounter = 0;

  const acts: ActSummary[] = [];
  let globalFloor = 0;

  for (let actIdx = 0; actIdx < data.map_point_history.length; actIdx++) {
    const act = data.map_point_history[actIdx];
    const label = data.acts[actIdx] ? formatId(data.acts[actIdx]) : `Act ${actIdx + 1}`;
    const floors: FloorSummary[] = [];

    for (let roomIdx = 0; roomIdx < act.length; roomIdx++) {
      const point = act[roomIdx];
      globalFloor++;

      const room = point.rooms?.[0];
      const stats = point.player_stats?.[0];
      const modelId = room?.model_id ?? '';
      const roomType = room?.room_type ?? point.map_point_type;
      const isShop = roomType === 'shop' || modelId === 'EVENT.FAKE_MERCHANT';
      const isWeak = /_WEAK$/i.test(modelId);
      const hasBingBong = bingBongFloor >= 0 && globalFloor >= bingBongFloor;
      const isCombat = (room?.turns_taken ?? 0) > 0;

      // Track Lasting Candy counter: increments after each combat once obtained
      let lastingCandyActive = false;
      if (isCombat && lastingCandyFloor >= 0 && globalFloor > lastingCandyFloor) {
        lastingCandyCounter++;
        if (lastingCandyCounter >= 2) {
          lastingCandyActive = true;
          lastingCandyCounter = 0;
        }
      }

      const cardGroupSize = lastingCandyActive ? 4 : 3;

      const title = modelId
        ? formatId(modelId.replace(/_(WEAK|NORMAL|ELITE|BOSS)$/i, ''))
        : roomType === 'shop'
          ? 'Shop'
          : roomType === 'treasure'
            ? 'Chest'
            : roomType === 'rest_site'
              ? 'Rest Site'
              : formatId(point.map_point_type);

      const monsterIds = room?.monster_ids ?? [];

      const events = stats ? parseFloorEvents(stats, isShop, hasBingBong, cardGroupSize, monsterIds) : [];

      floors.push({
        floorNumber: roomIdx + 1,
        globalFloor,
        roomType: point.map_point_type,
        title,
        isWeak,
        isShop,
        hasStats: !!stats,
        monsters: room?.monster_ids ?? [],
        turnsTaken: room?.turns_taken ?? null,
        currentHp: stats?.current_hp ?? 0,
        maxHp: stats?.max_hp ?? 0,
        damageTaken: stats?.damage_taken ?? 0,
        hpHealed: stats?.hp_healed ?? 0,
        maxHpGained: stats?.max_hp_gained ?? 0,
        maxHpLost: stats?.max_hp_lost ?? 0,
        currentGold: stats?.current_gold ?? 0,
        goldGained: stats?.gold_gained ?? 0,
        goldSpent: stats?.gold_spent ?? 0,
        goldStolen: stats?.gold_stolen ?? 0,
        events,
      });
    }

    acts.push({ actIndex: actIdx, label, floors });
  }

  return { acts };
}

function parseFloorEvents(
  stats: PlayerStats,
  isShop: boolean,
  hasBingBong: boolean,
  cardGroupSize: number,
  monsterIds: string[],
): FloorEvent[] {
  const events: FloorEvent[] = [];

  // ── Card choices ──────────────────────────────────────────────────────
  if (stats.card_choices && stats.card_choices.length > 0) {
    if (isShop) {
      const offered = stats.card_choices.map((c) => c.card.id);
      const pickedCards = stats.card_choices.filter((c) => c.was_picked);
      events.push({ type: 'cards-offered', offered });
      if (pickedCards.length > 0) {
        events.push({
          type: 'cards-obtained',
          cards: pickedCards.map((c) => ({
            name: c.card.id,
            upgraded: !!(c.card.current_upgrade_level),
          })),
          verb: 'Bought',
        });
      }
    } else {
      const isThievingHopper = monsterIds.includes('MONSTER.THIEVING_HOPPER');
      const choices = isThievingHopper
        ? filterThievingHopperCards(stats.card_choices, stats.cards_removed)
        : stats.card_choices;
      const groups = splitCardRewardGroups(choices, cardGroupSize);
      for (const group of groups) {
        const offered = group.map((c) => ({
          id: c.card.id,
          upgraded: !!(c.card.current_upgrade_level),
        }));
        const pickedChoice = group.find((c) => c.was_picked);
        const picked = pickedChoice
          ? { id: pickedChoice.card.id, upgraded: !!(pickedChoice.card.current_upgrade_level) }
          : null;
        events.push({ type: 'card-reward', offered, picked });
      }
    }
  }

  // ── Extra cards gained (beyond card_choices picks) ────────────────────
  if (stats.cards_gained && stats.cards_gained.length > 0) {
    const pickedCounts = new Map<string, number>();
    for (const c of (stats.card_choices ?? []).filter((c) => c.was_picked)) {
      pickedCounts.set(c.card.id, (pickedCounts.get(c.card.id) ?? 0) + 1);
    }

    const extraGained: { id: string; current_upgrade_level?: number }[] = [];
    for (const c of stats.cards_gained) {
      const remaining = pickedCounts.get(c.id) ?? 0;
      if (remaining > 0) {
        pickedCounts.set(c.id, remaining - 1);
      } else {
        extraGained.push(c);
      }
    }

    if (isShop && hasBingBong && extraGained.length > 0) {
      const boughtCards: typeof extraGained = [];
      const dupeCards: typeof extraGained = [];
      const seenCount = new Map<string, number>();
      for (const c of extraGained) {
        const count = seenCount.get(c.id) ?? 0;
        if (count === 0) {
          boughtCards.push(c);
        } else {
          dupeCards.push(c);
        }
        seenCount.set(c.id, count + 1);
      }
      if (boughtCards.length > 0) {
        events.push({
          type: 'cards-obtained',
          cards: boughtCards.map((c) => ({
            name: c.id,
            upgraded: !!(c.current_upgrade_level),
          })),
          verb: 'Bought',
        });
      }
      if (dupeCards.length > 0) {
        events.push({
          type: 'cards-obtained',
          cards: dupeCards.map((c) => ({
            name: c.id,
            upgraded: !!(c.current_upgrade_level),
          })),
          verb: 'Gained',
        });
      }
    } else if (extraGained.length > 0) {
      events.push({
        type: 'cards-obtained',
        cards: extraGained.map((c) => ({
          name: c.id,
          upgraded: !!(c.current_upgrade_level),
        })),
        verb: isShop ? 'Bought' : 'Gained',
      });
    }
  }

  // ── Cards removed ─────────────────────────────────────────────────────
  if (stats.cards_removed && stats.cards_removed.length > 0) {
    events.push({
      type: 'cards-removed',
      cards: stats.cards_removed.map((c) => c.id),
    });
  }

  // ── Cards transformed ─────────────────────────────────────────────────
  if (stats.cards_transformed && stats.cards_transformed.length > 0) {
    for (const t of stats.cards_transformed) {
      events.push({
        type: 'card-transformed',
        original: t.original_card.id,
        result: t.final_card.id,
      });
    }
  }

  // ── Cards enchanted ───────────────────────────────────────────────────
  if (stats.cards_enchanted && stats.cards_enchanted.length > 0) {
    for (const e of stats.cards_enchanted) {
      events.push({
        type: 'card-enchanted',
        card: e.card.id,
        enchantment: e.enchantment,
      });
    }
  }

  // ── Cards upgraded ────────────────────────────────────────────────────
  if (stats.upgraded_cards && stats.upgraded_cards.length > 0) {
    events.push({
      type: 'cards-upgraded',
      cards: stats.upgraded_cards,
    });
  }

  // ── Relic choices ─────────────────────────────────────────────────────
  if (stats.relic_choices && stats.relic_choices.length > 0) {
    const picked = stats.relic_choices.filter((c) => c.was_picked);
    const offered = stats.relic_choices.map((r) => r.choice);

    if (isShop) {
      events.push({ type: 'relics-offered', offered });
      if (picked.length > 0) {
        events.push({
          type: 'relic-obtained',
          relics: picked.map((r) => r.choice),
          verb: 'Bought',
        });
      }
    } else if (picked.length > 0) {
      events.push({
        type: 'relic-obtained',
        relics: picked.map((r) => r.choice),
        verb: 'Relic:',
      });
    } else {
      const skipped = stats.relic_choices.filter((c) => !c.was_picked);
      events.push({
        type: 'relic-skipped',
        skipped: skipped.map((r) => r.choice),
      });
    }
  }

  // ── Ancient choices ───────────────────────────────────────────────────
  if (stats.ancient_choice && stats.ancient_choice.length > 0) {
    const chosen = stats.ancient_choice.find((a) => a.was_chosen);
    const offered = stats.ancient_choice.map((a) => a.TextKey);
    if (chosen) {
      events.push({ type: 'ancient-picked', chosen: chosen.TextKey, offered });
    } else {
      events.push({ type: 'ancient-skipped', offered });
    }
  }

  // ── Bought relics (fallback when no relic_choices) ────────────────────
  if (
    stats.bought_relics &&
    stats.bought_relics.length > 0 &&
    !(stats.relic_choices && stats.relic_choices.length > 0)
  ) {
    events.push({
      type: 'relic-obtained',
      relics: stats.bought_relics,
      verb: 'Bought',
    });
  }

  // ── Event choices ─────────────────────────────────────────────────────
  if (stats.event_choices && stats.event_choices.length > 0) {
    for (const ev of stats.event_choices) {
      if (ev.title.table === 'relics') continue;
      const parts = ev.title.key.split('.');
      const titleIdx = parts.lastIndexOf('title');
      const optionName = titleIdx > 0 ? parts[titleIdx - 1] : parts[0];
      events.push({ type: 'event-choice', optionName });
    }
  }

  // ── Potion choices ────────────────────────────────────────────────────
  if (stats.potion_choices && stats.potion_choices.length > 0) {
    const pickedPotions = stats.potion_choices.filter((p) => p.was_picked);
    const offeredPotions = stats.potion_choices.map((p) => p.choice);

    if (isShop) {
      events.push({ type: 'potions-offered', offered: offeredPotions });
      if (pickedPotions.length > 0) {
        events.push({
          type: 'potion-obtained',
          potions: pickedPotions.map((p) => p.choice),
          verb: 'Bought',
        });
      }
    } else if (pickedPotions.length > 0) {
      events.push({
        type: 'potion-obtained',
        potions: pickedPotions.map((p) => p.choice),
        verb: 'Grabbed',
      });
    }
  }

  // ── Potions used ──────────────────────────────────────────────────────
  if (stats.potion_used && stats.potion_used.length > 0) {
    events.push({ type: 'potion-used', potions: stats.potion_used });
  }

  // ── Bought potions (fallback when no potion_choices) ──────────────────
  if (
    stats.bought_potions &&
    stats.bought_potions.length > 0 &&
    !(stats.potion_choices && stats.potion_choices.length > 0)
  ) {
    events.push({
      type: 'potion-obtained',
      potions: stats.bought_potions,
      verb: 'Bought',
    });
  }

  // ── Rest site ─────────────────────────────────────────────────────────
  if (stats.rest_site_choices && stats.rest_site_choices.length > 0) {
    events.push({ type: 'rest-site', choices: stats.rest_site_choices });
  }

  // ── Gold changes ──────────────────────────────────────────────────────
  if (stats.gold_gained > 0 || stats.gold_spent > 0 || stats.gold_stolen > 0) {
    events.push({
      type: 'gold-change',
      gained: stats.gold_gained,
      spent: stats.gold_spent,
      stolen: stats.gold_stolen,
    });
  }

  // ── Max HP changes ────────────────────────────────────────────────────
  if (stats.max_hp_gained > 0) {
    events.push({ type: 'max-hp-gained', amount: stats.max_hp_gained });
  }
  if (stats.max_hp_lost > 0) {
    events.push({ type: 'max-hp-lost', amount: stats.max_hp_lost });
  }

  return events;
}

/**
 * Find the global floor at which Lasting Candy was obtained.
 * Returns -1 if the relic is not present.
 */
function getLastingCandyFloor(relics: { id: string; floor_added_to_deck: number }[] | undefined): number {
  if (!relics) return -1;
  const relic = relics.find((r) => r.id === 'RELIC.LASTING_CANDY');
  return relic ? relic.floor_added_to_deck : -1;
}

/**
 * Filter out the stolen card from Thieving Hopper encounters.
 * Thieving Hopper steals a card during combat and places it in cards_removed,
 * but also adds it to card_choices as a recovery option. We remove one instance
 * of each stolen card from the choices so grouping works on the real rewards.
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
 * Split a flat card_choices array into separate reward groups.
 * Each group represents one independent "pick 1 or skip" decision.
 * Falls back to a single group if the total doesn't divide evenly.
 */
function splitCardRewardGroups(choices: CardChoice[], groupSize: number): CardChoice[][] {
  const total = choices.length;
  if (total === 0 || total % groupSize !== 0) return [choices];

  const groups: CardChoice[][] = [];
  for (let i = 0; i < total; i += groupSize) {
    groups.push(choices.slice(i, i + groupSize));
  }
  return groups;
}
