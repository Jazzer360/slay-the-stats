import type { ParsedRun, PlayerStats } from '../types/run';

export interface DeckEntry {
  id: string;
  upgraded: boolean;
}

export interface DeckSnapshot {
  globalFloor: number;
  deck: DeckEntry[];
}

/**
 * Reconstruct the player's deck at the end of every floor by walking backward
 * from the final deck and undoing each floor's gain/remove/transform/upgrade
 * events.
 *
 * Includes a synthetic globalFloor=0 entry representing the starting deck
 * (before any floor events are applied).
 *
 * Limitations:
 * - cards_removed entries don't carry upgrade state, so cards removed mid-run
 *   are treated as unupgraded when added back. This affects only the ~57 cards
 *   whose energy cost changes on upgrade.
 * - cards_transformed → original_card upgrade state is not recorded; assumed
 *   unupgraded. cards_enchanted is not tracked (enchantment doesn't affect cost).
 */
export function buildDeckByFloor(run: ParsedRun): DeckSnapshot[] {
  const player = run.data.players[0];
  if (!player) return [];

  const deck: DeckEntry[] = player.deck.map((c) => ({
    id: c.id,
    upgraded: (c.current_upgrade_level ?? 0) > 0,
  }));

  const floors: { globalFloor: number; stats: PlayerStats | null }[] = [];
  let g = 0;
  for (const act of run.data.map_point_history) {
    for (const point of act) {
      g++;
      floors.push({ globalFloor: g, stats: point.player_stats?.[0] ?? null });
    }
  }

  if (floors.length === 0) return [{ globalFloor: 0, deck: deck.slice() }];

  const snapshots: DeckSnapshot[] = new Array(floors.length + 1);
  snapshots[floors.length] = {
    globalFloor: floors[floors.length - 1].globalFloor,
    deck: deck.slice(),
  };

  for (let i = floors.length - 1; i >= 0; i--) {
    const stats = floors[i].stats;
    if (stats) undoFloor(deck, stats);
    const priorFloor = i === 0 ? 0 : floors[i - 1].globalFloor;
    snapshots[i] = { globalFloor: priorFloor, deck: deck.slice() };
  }

  // snapshots[0] = starting deck (globalFloor 0)
  // snapshots[N] = end of last floor (globalFloor = last)
  // snapshots[i] for 1 ≤ i ≤ N-1 = end of floors[i-1].globalFloor.
  // Re-key to: index i represents end of floor floors[i-1].globalFloor.
  return snapshots;
}

function undoFloor(deck: DeckEntry[], stats: PlayerStats): void {
  if (stats.upgraded_cards) {
    for (const id of stats.upgraded_cards) {
      const idx = deck.findIndex((c) => c.id === id && c.upgraded);
      if (idx !== -1) deck[idx] = { ...deck[idx], upgraded: false };
    }
  }

  if (stats.cards_transformed) {
    for (const t of stats.cards_transformed) {
      const idx = deck.findIndex((c) => c.id === t.final_card.id);
      if (idx !== -1) deck[idx] = { id: t.original_card.id, upgraded: false };
    }
  }

  if (stats.cards_gained) {
    for (const gained of stats.cards_gained) {
      const wantUpgraded = (gained.current_upgrade_level ?? 0) > 0;
      let idx = deck.findIndex((c) => c.id === gained.id && c.upgraded === wantUpgraded);
      if (idx === -1) idx = deck.findIndex((c) => c.id === gained.id);
      if (idx !== -1) deck.splice(idx, 1);
    }
  }

  if (stats.cards_removed) {
    for (const r of stats.cards_removed) {
      deck.push({ id: r.id, upgraded: false });
    }
  }
}
