import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useRunsStore } from '../store/runs';
import { formatId, formatDate, formatDuration } from '../lib/format';
import { getCardMeta } from '../lib/card-meta';
import type { DeckCard, MapPoint, PlayerStats } from '../types/run';

const CHARACTERS = ['DEFECT', 'IRONCLAD', 'SILENT', 'REGENT', 'NECROBINDER'];
const STRIKE_IDS = new Set(CHARACTERS.map((c) => `CARD.STRIKE_${c}`));
const DEFEND_IDS = new Set(CHARACTERS.map((c) => `CARD.DEFEND_${c}`));

function formatDeckCardName(id: string): string {
  if (STRIKE_IDS.has(id)) return 'Strike';
  if (DEFEND_IDS.has(id)) return 'Defend';
  return formatId(id);
}

interface ConsolidatedCard {
  id: string;
  upgraded: boolean;
  enchantment: string | null;
  count: number;
}

const RARITY_ORDER = ['Ancient', 'Rare', 'Uncommon', 'Common', 'Basic', 'Curse'];

function rarityRank(rarity: string | undefined): number {
  const idx = RARITY_ORDER.indexOf(rarity ?? '');
  return idx === -1 ? 99 : idx;
}

function consolidateDeck(deck: DeckCard[]): ConsolidatedCard[] {
  const map = new Map<string, ConsolidatedCard>();
  for (const card of deck) {
    const upgraded = (card.current_upgrade_level ?? 0) > 0;
    const enchantment = card.enchantment?.id ?? null;
    const key = `${card.id}|${upgraded}|${enchantment ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { id: card.id, upgraded, enchantment, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => {
    const ra = rarityRank(getCardMeta(a.id)?.rarity);
    const rb = rarityRank(getCardMeta(b.id)?.rarity);
    if (ra !== rb) return ra - rb;
    return formatDeckCardName(a.id).localeCompare(formatDeckCardName(b.id));
  });
}

interface HpDataPoint {
  floor: number;
  currentHp: number;
  maxHp: number;
  type: string;
  label: string;
}

export function RunDetailPage() {
  const { fileName } = useParams<{ fileName: string }>();
  const navigate = useNavigate();
  const runs = useRunsStore((s) => s.runs);
  const decodedName = fileName ? decodeURIComponent(fileName) : '';
  const runIndex = runs.findIndex((r) => r.fileName === `${decodedName}.run` || r.fileName === decodedName);
  const run = runIndex >= 0 ? runs[runIndex] : undefined;
  const prevRun = runIndex > 0 ? runs[runIndex - 1] : undefined;
  const nextRun = runIndex >= 0 && runIndex < runs.length - 1 ? runs[runIndex + 1] : undefined;

  // Build HP data for the chart
  const hpData = useMemo(() => {
    if (!run) return [];
    const points: HpDataPoint[] = [];
    let floor = 0;
    for (const act of run.data.map_point_history) {
      for (const mp of act) {
        floor++;
        const stats = mp.player_stats?.[0];
        if (!stats) continue;
        const room = mp.rooms?.[0];
        points.push({
          floor,
          currentHp: stats.current_hp,
          maxHp: stats.max_hp,
          type: mp.map_point_type,
          label: room ? formatId(room.model_id) : formatId(mp.map_point_type),
        });
      }
    }
    return points;
  }, [run]);

  // Compute act boundary floors for reference lines
  const actBoundaries = useMemo(() => {
    if (!run) return [];
    const boundaries: { floor: number; label: string }[] = [];
    let floor = 0;
    for (let i = 0; i < run.data.map_point_history.length; i++) {
      if (i > 0) {
        boundaries.push({
          floor: floor + 1,
          label: run.data.acts[i] ? formatId(run.data.acts[i]) : `Act ${i + 1}`,
        });
      }
      floor += run.data.map_point_history[i].length;
    }
    return boundaries;
  }, [run]);

  if (!run) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>Run not found.</p>
        <Link to="/runs" className="text-purple-400 underline text-sm">
          Back to Run List
        </Link>
      </div>
    );
  }

  const d = run.data;
  const player = d.players[0];
  if (!player) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>Invalid run data (no player found).</p>
        <Link to="/runs" className="text-purple-400 underline text-sm">
          Back to Run List
        </Link>
      </div>
    );
  }

  const totalFloors = d.map_point_history.reduce((sum, act) => sum + act.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/runs"
          className="text-sm text-gray-500 hover:text-gray-300"
        >
          ← Back to Run List
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => prevRun && navigate(`/runs/${encodeURIComponent(prevRun.fileName.replace(/\.run$/, ''))}`)}
            disabled={!prevRun}
            className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-600">
            {runIndex + 1} / {runs.length}
          </span>
          <button
            onClick={() => nextRun && navigate(`/runs/${encodeURIComponent(nextRun.fileName.replace(/\.run$/, ''))}`)}
            disabled={!nextRun}
            className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Run header */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-100">
              {formatId(player.character)}
            </h2>
            <span className="text-sm text-gray-500">
              Ascension {d.ascension}
            </span>
            {d.modifiers.length > 0 && (
              <span className="text-xs text-gray-600">
                {d.modifiers.map(formatId).join(', ')}
              </span>
            )}
          </div>
          {d.win ? (
            <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
              Victory
            </span>
          ) : d.was_abandoned ? (
            <span className="bg-gray-800 text-gray-500 px-3 py-1 rounded-full text-sm">
              Abandoned
            </span>
          ) : (
            <span className="bg-red-900/30 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
              Defeat
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Date:</span>{' '}
            <span className="text-gray-300">{formatDate(d.start_time)}</span>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>{' '}
            <span className="text-gray-300">{formatDuration(d.run_time)}</span>
          </div>
          <div>
            <span className="text-gray-500">Floors:</span>{' '}
            <span className="text-gray-300">{totalFloors}</span>
          </div>
          <div>
            <span className="text-gray-500">Seed:</span>{' '}
            <span className="text-gray-300 font-mono">{d.seed}</span>
          </div>
          <div>
            <span className="text-gray-500">Version:</span>{' '}
            <span className="text-gray-300">{d.build_id}</span>
          </div>
          {d.killed_by_encounter !== 'NONE.NONE' && (
            <div>
              <span className="text-gray-500">Killed by:</span>{' '}
              <span className="text-red-400">
                {formatId(d.killed_by_encounter)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* HP Chart */}
      {hpData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Health Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hpData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="floor"
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  label={{ value: 'Floor', position: 'insideBottomRight', offset: -5, fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  label={{ value: 'HP', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [
                    value,
                    name === 'maxHp' ? 'Max HP' : 'Current HP',
                  ]}
                  labelFormatter={(label) => {
                    const floor = Number(label);
                    const pt = hpData.find((p) => p.floor === floor);
                    return pt ? `Floor ${floor}: ${pt.label}` : `Floor ${floor}`;
                  }}
                />
                {actBoundaries.map((b) => (
                  <ReferenceLine
                    key={b.floor}
                    x={b.floor}
                    stroke="#7c3aed"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{ value: b.label, fill: '#a78bfa', fontSize: 10, position: 'top' }}
                  />
                ))}
                <Area
                  type="stepAfter"
                  dataKey="maxHp"
                  stroke="#6b7280"
                  fill="#37415120"
                  strokeWidth={1}
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="stepAfter"
                  dataKey="currentHp"
                  stroke="#ef4444"
                  fill="#ef444420"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Final deck, relics, potions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Final Deck ({player.deck.length})
          </h3>
          <DeckDisplay deck={player.deck} />
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Relics ({player.relics.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {player.relics.map((relic, i) => (
                <span
                  key={i}
                  className="bg-gray-800 text-yellow-400/80 text-xs px-2 py-1 rounded"
                >
                  {formatId(relic.id)}
                </span>
              ))}
            </div>
          </div>

          {player.potions.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Final Potions ({player.potions.length}/{player.max_potion_slot_count})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {player.potions.map((pot, i) => (
                  <span
                    key={i}
                    className="bg-gray-800 text-cyan-400/80 text-xs px-2 py-1 rounded"
                  >
                    {formatId(pot.id)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {player.badges && player.badges.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Badges ({player.badges.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {player.badges.map((badge, i) => (
                  <span
                    key={i}
                    className="bg-gray-800 text-purple-400/80 text-xs px-2 py-1 rounded"
                  >
                    {formatId(badge.id)}
                    <span className="text-gray-600 ml-1">({badge.rarity})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floor-by-floor timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Floor-by-Floor Timeline
        </h3>
        <div className="space-y-1">
          {d.map_point_history.map((act, actIdx) => (
            <div key={actIdx}>
              <div className="bg-purple-900/20 border border-purple-800/30 rounded px-3 py-1.5 mb-1 mt-2">
                <span className="text-purple-400 text-sm font-medium">
                  {d.acts[actIdx] ? formatId(d.acts[actIdx]) : `Act ${actIdx + 1}`}
                </span>
              </div>
              {act.map((point, roomIdx) => (
                <FloorRow
                  key={roomIdx}
                  point={point}
                  floorNum={roomIdx + 1}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const RARITY_COLORS: Record<string, string> = {
  Ancient: 'text-orange-400',
  Rare: 'text-yellow-300',
  Uncommon: 'text-blue-300',
  Common: 'text-gray-100',
  Basic: 'text-gray-400',
  Curse: 'text-purple-400',
};

const RARITY_LABEL_COLORS: Record<string, string> = {
  Ancient: 'text-orange-500',
  Rare: 'text-yellow-400',
  Uncommon: 'text-blue-400',
  Common: 'text-gray-400',
  Basic: 'text-gray-500',
  Curse: 'text-purple-500',
};

function DeckDisplay({ deck }: { deck: DeckCard[] }) {
  const consolidated = consolidateDeck(deck);

  // Group by rarity
  const groups: { rarity: string; cards: ConsolidatedCard[] }[] = [];
  let currentRarity = '';
  for (const card of consolidated) {
    const rarity = getCardMeta(card.id)?.rarity ?? 'Common';
    if (rarity !== currentRarity) {
      currentRarity = rarity;
      groups.push({ rarity, cards: [] });
    }
    groups[groups.length - 1].cards.push(card);
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.rarity}>
          <div className={`text-xs font-medium uppercase tracking-wider mb-1.5 ${RARITY_LABEL_COLORS[group.rarity] ?? 'text-gray-500'}`}>
            {group.rarity}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.cards.map((item, i) => {
              const rarity = getCardMeta(item.id)?.rarity ?? 'Common';
              const color = RARITY_COLORS[rarity] ?? 'text-gray-100';
              return (
                <span
                  key={i}
                  className={`bg-gray-800 text-xs px-2 py-1 rounded ${color}`}
                >
                  {formatDeckCardName(item.id)}
                  {item.upgraded ? '+' : ''}
                  {item.enchantment ? ` [${formatId(item.enchantment)}]` : ''}
                  {item.count > 1 && (
                    <span className="text-gray-500 ml-0.5">x{item.count}</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FloorRow({ point, floorNum }: { point: MapPoint; floorNum: number }) {
  const room = point.rooms?.[0];
  const stats = point.player_stats?.[0];

  return (
    <div className="flex gap-3 items-start py-1.5 px-3 hover:bg-gray-800/30 rounded text-sm">
      <span className="text-gray-600 w-6 text-right shrink-0 font-mono text-xs pt-0.5">
        {floorNum}
      </span>

      <RoomBadge type={point.map_point_type} />

      <div className="flex-1 min-w-0">
        <span className="text-gray-300">
          {room ? formatId(room.model_id) : formatId(point.map_point_type)}
        </span>
        {room?.monster_ids && room.monster_ids.length > 0 && (
          <span className="text-gray-600 text-xs ml-2">
            vs {room.monster_ids.map(formatId).join(', ')}
          </span>
        )}
        {room?.turns_taken ? (
          <span className="text-gray-600 text-xs ml-2">
            ({room.turns_taken} turns)
          </span>
        ) : null}

        {stats && <FloorDetails stats={stats} />}
      </div>

      {stats && (
        <div className="shrink-0 text-xs text-right whitespace-nowrap">
          <span className="text-gray-500">{stats.current_gold}g</span>
          <span className="mx-1.5 text-gray-700">|</span>
          <span
            className={
              stats.current_hp < stats.max_hp * 0.3
                ? 'text-red-400'
                : stats.damage_taken > 0
                ? 'text-red-400/70'
                : 'text-gray-500'
            }
          >
            {stats.current_hp}/{stats.max_hp} HP
          </span>
          {stats.damage_taken > 0 && (
            <span className="text-red-500/50 ml-1">
              (-{stats.damage_taken})
            </span>
          )}
          {stats.hp_healed > 0 && (
            <span className="text-green-500/50 ml-1">
              (+{stats.hp_healed})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function RoomBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    monster: 'bg-red-900/30 text-red-400',
    elite: 'bg-orange-900/30 text-orange-400',
    boss: 'bg-red-900/50 text-red-300 font-bold',
    treasure: 'bg-yellow-900/30 text-yellow-400',
    shop: 'bg-blue-900/30 text-blue-400',
    rest_site: 'bg-green-900/30 text-green-400',
    ancient: 'bg-purple-900/30 text-purple-400',
    unknown: 'bg-gray-800 text-gray-400',
    event: 'bg-teal-900/30 text-teal-400',
  };

  const labels: Record<string, string> = {
    monster: 'monster',
    elite: 'elite',
    boss: 'BOSS',
    treasure: 'chest',
    shop: 'shop',
    rest_site: 'rest',
    ancient: 'ancient',
    event: 'event',
  };

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded w-16 text-center shrink-0 ${
        styles[type] ?? styles.unknown
      }`}
    >
      {labels[type] ?? type}
    </span>
  );
}

function FloorDetails({ stats }: { stats: PlayerStats }) {
  const items: React.ReactNode[] = [];

  // Card choices
  if (stats.card_choices && stats.card_choices.length > 0) {
    const picked = stats.card_choices.find((c) => c.was_picked);
    const offered = stats.card_choices.map((c) => formatId(c.card.id)).join(', ');
    if (picked) {
      items.push(
        <span key="card" className="text-green-400/70">
          Picked {formatId(picked.card.id)}
          {picked.card.current_upgrade_level ? '+' : ''}
        </span>
      );
      items.push(
        <span key="card-offered" className="text-gray-600">
          from [{offered}]
        </span>
      );
    } else {
      items.push(
        <span key="card-skip" className="text-yellow-500/70">
          Skipped [{offered}]
        </span>
      );
    }
  }

  // Cards gained outside of choices (e.g., events)
  if (stats.cards_gained && stats.cards_gained.length > 0) {
    items.push(
      <span key="gained" className="text-green-500/70">
        +{stats.cards_gained.map((c) => formatId(c.id)).join(', ')}
      </span>
    );
  }

  // Cards removed
  if (stats.cards_removed && stats.cards_removed.length > 0) {
    items.push(
      <span key="removed" className="text-red-500/70">
        Removed {stats.cards_removed.map((c) => formatId(c.id)).join(', ')}
      </span>
    );
  }

  // Cards transformed
  if (stats.cards_transformed && stats.cards_transformed.length > 0) {
    for (const t of stats.cards_transformed) {
      items.push(
        <span key={`xform-${t.original_card.id}`} className="text-blue-400/70">
          {formatId(t.original_card.id)} → {formatId(t.final_card.id)}
        </span>
      );
    }
  }

  // Cards enchanted
  if (stats.cards_enchanted && stats.cards_enchanted.length > 0) {
    for (const e of stats.cards_enchanted) {
      items.push(
        <span key={`ench-${e.card.id}`} className="text-purple-400/70">
          Enchanted {formatId(e.card.id)} with {formatId(e.enchantment)}
        </span>
      );
    }
  }

  // Upgraded cards
  if (stats.upgraded_cards && stats.upgraded_cards.length > 0) {
    items.push(
      <span key="upgraded" className="text-blue-300/70">
        Upgraded {stats.upgraded_cards.map(formatId).join(', ')}
      </span>
    );
  }

  // Ancient choices
  if (stats.ancient_choice && stats.ancient_choice.length > 0) {
    const chosen = stats.ancient_choice.find((c) => c.was_chosen);
    if (chosen) {
      items.push(
        <span key="ancient" className="text-purple-400/70">
          Ancient: {formatId(chosen.TextKey)}
        </span>
      );
    }
  }

  // Relic choices
  if (stats.relic_choices && stats.relic_choices.length > 0) {
    const picked = stats.relic_choices.find((c) => c.was_picked);
    if (picked) {
      items.push(
        <span key="relic" className="text-yellow-400/70">
          Relic: {formatId(picked.choice)}
        </span>
      );
    }
  }

  // Bought relics
  if (stats.bought_relics && stats.bought_relics.length > 0) {
    items.push(
      <span key="bought-relic" className="text-yellow-400/70">
        Bought {stats.bought_relics.map(formatId).join(', ')}
      </span>
    );
  }

  // Event choices
  if (stats.event_choices && stats.event_choices.length > 0) {
    for (const ev of stats.event_choices) {
      items.push(
        <span key={`event-${ev.title.key}`} className="text-teal-400/70">
          Event: {formatId(ev.title.key)}
        </span>
      );
    }
  }

  // Potion choices
  if (stats.potion_choices && stats.potion_choices.length > 0) {
    const pickedPotions = stats.potion_choices.filter((p) => p.was_picked);
    if (pickedPotions.length > 0) {
      items.push(
        <span key="potion-pick" className="text-cyan-400/70">
          Grabbed {pickedPotions.map((p) => formatId(p.choice)).join(', ')}
        </span>
      );
    }
  }

  // Potion usage
  if (stats.potion_used && stats.potion_used.length > 0) {
    items.push(
      <span key="potion-use" className="text-cyan-500/70">
        Used {stats.potion_used.map(formatId).join(', ')}
      </span>
    );
  }

  // Bought potions
  if (stats.bought_potions && stats.bought_potions.length > 0) {
    items.push(
      <span key="bought-pot" className="text-cyan-400/70">
        Bought {stats.bought_potions.map(formatId).join(', ')}
      </span>
    );
  }

  // Rest site
  if (stats.rest_site_choices && stats.rest_site_choices.length > 0) {
    items.push(
      <span key="rest" className="text-green-400/70">
        {stats.rest_site_choices.join(', ')}
      </span>
    );
  }

  // Gold
  const goldParts: string[] = [];
  if (stats.gold_gained > 0) goldParts.push(`+${stats.gold_gained}g`);
  if (stats.gold_spent > 0) goldParts.push(`-${stats.gold_spent}g`);
  if (stats.gold_stolen > 0) goldParts.push(`stolen ${stats.gold_stolen}g`);
  if (goldParts.length > 0) {
    items.push(
      <span key="gold" className="text-yellow-600/70">
        {goldParts.join(', ')}
      </span>
    );
  }

  // Max HP changes
  if (stats.max_hp_gained > 0) {
    items.push(
      <span key="maxhp-up" className="text-green-500/50">
        +{stats.max_hp_gained} max HP
      </span>
    );
  }
  if (stats.max_hp_lost > 0) {
    items.push(
      <span key="maxhp-down" className="text-red-500/50">
        -{stats.max_hp_lost} max HP
      </span>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs mt-0.5">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-700">·</span>}
          {item}
        </span>
      ))}
    </div>
  );
}
