import React, { useMemo } from 'react';
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
import { formatId, formatDate, formatDuration } from '../../lib/format';
import { getCardMeta } from '../../lib/card-meta';
import { parseRunTimeline } from '../../lib/floor-parser';
import type { ParsedRun, DeckCard, FloorSummary, FloorEvent } from '../../types/run';

interface ConsolidatedCard {
  id: string;
  upgraded: boolean;
  enchantment: string | null;
  count: number;
}

const RARITY_ORDER = ['Ancient', 'Rare', 'Uncommon', 'Common', 'Basic', 'Curse', 'Deprecated'];

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
    return formatId(a.id).localeCompare(formatId(b.id));
  });
}

interface HpDataPoint {
  floor: number;
  currentHp: number;
  maxHp: number;
  type: string;
  label: string;
}

export function RunDetail({ run }: { run: ParsedRun }) {
  const d = run.data;
  const player = d.players[0];

  const timeline = useMemo(() => parseRunTimeline(d), [d]);

  const hpData = useMemo((): HpDataPoint[] => {
    const points: HpDataPoint[] = [];
    for (const act of timeline.acts) {
      for (const floor of act.floors) {
        if (!floor.hasStats) continue;
        points.push({
          floor: floor.globalFloor,
          currentHp: floor.currentHp,
          maxHp: floor.maxHp,
          type: floor.roomType,
          label: floor.title,
        });
      }
    }
    return points;
  }, [timeline]);

  const actBoundaries = useMemo(() => {
    return timeline.acts
      .filter((a) => a.actIndex > 0)
      .map((a) => ({
        floor: a.floors[0]?.globalFloor ?? 0,
        label: a.label,
      }));
  }, [timeline]);

  const eliteFloors = useMemo(() => {
    const floors: number[] = [];
    for (const act of timeline.acts) {
      for (const floor of act.floors) {
        if (floor.roomType === 'elite') floors.push(floor.globalFloor);
      }
    }
    return floors;
  }, [timeline]);

  if (!player) return null;

  const totalFloors = timeline.acts.reduce((sum, act) => sum + act.floors.length, 0);

  return (
    <div>
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
            <ResponsiveContainer width="100%" height={256}>
              <AreaChart data={hpData} margin={{ top: 16, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
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
                    ifOverflow="discard"
                    label={({ viewBox }) => (
                      <text
                        x={(viewBox as { x?: number }).x ?? 0}
                        y={(viewBox as { y?: number }).y ? (viewBox as { y: number }).y - 4 : 0}
                        fill="#a78bfa"
                        fontSize={10}
                        textAnchor="middle"
                      >
                        {b.label}
                      </text>
                    )}
                  />
                ))}
                {eliteFloors.map((f) => (
                  <ReferenceLine
                    key={`elite-${f}`}
                    x={f}
                    stroke="#f97316"
                    strokeDasharray="3 3"
                    strokeOpacity={0.3}
                    ifOverflow="discard"
                    label={({ viewBox }) => (
                      <text
                        x={(viewBox as { x?: number }).x ?? 0}
                        y={(viewBox as { y?: number }).y ? (viewBox as { y: number }).y - 4 : 0}
                        fill="#fb923c"
                        fontSize={10}
                        textAnchor="middle"
                        opacity={0.6}
                      >
                        elite
                      </text>
                    )}
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
          {timeline.acts.map((act) => (
            <div key={act.actIndex}>
              <div className="bg-purple-900/20 border border-purple-800/30 rounded px-3 py-1.5 mb-1 mt-2">
                <span className="text-purple-400 text-sm font-medium">
                  {act.label}
                </span>
              </div>
              {act.floors.map((floor, i) => (
                <div key={floor.floorNumber}>
                  {i > 0 && <div className="border-t border-gray-800/50 mx-3" />}
                  <FloorRow floor={floor} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  Ancient: 'text-orange-400',
  Rare: 'text-yellow-300',
  Uncommon: 'text-blue-300',
  Common: 'text-gray-100',
  Basic: 'text-gray-400',
  Curse: 'text-purple-400',
  Deprecated: 'text-gray-600',
};

const RARITY_LABEL_COLORS: Record<string, string> = {
  Ancient: 'text-orange-500',
  Rare: 'text-yellow-400',
  Uncommon: 'text-blue-400',
  Common: 'text-gray-400',
  Basic: 'text-gray-500',
  Curse: 'text-purple-500',
  Deprecated: 'text-gray-600',
};

function DeckDisplay({ deck }: { deck: DeckCard[] }) {
  const consolidated = consolidateDeck(deck);

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
                  {formatId(item.id)}
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

function FloorRow({ floor }: { floor: FloorSummary }) {
  // Split events: some go in the right-aligned stats column, rest stay in details
  const goldChange = floor.events.find((e): e is Extract<FloorEvent, { type: 'gold-change' }> => e.type === 'gold-change');
  const maxHpGained = floor.events.find((e): e is Extract<FloorEvent, { type: 'max-hp-gained' }> => e.type === 'max-hp-gained');
  const maxHpLost = floor.events.find((e): e is Extract<FloorEvent, { type: 'max-hp-lost' }> => e.type === 'max-hp-lost');
  const potionsUsed = floor.events.filter((e): e is Extract<FloorEvent, { type: 'potion-used' }> => e.type === 'potion-used');
  const detailEvents = floor.events.filter(
    (e) => e.type !== 'gold-change' && e.type !== 'max-hp-gained' && e.type !== 'max-hp-lost' && e.type !== 'potion-used',
  );

  // Build gold adjustment string
  const goldParts: string[] = [];
  if (goldChange) {
    if (goldChange.gained > 0) goldParts.push(`+${goldChange.gained}`);
    if (goldChange.spent > 0) goldParts.push(`-${goldChange.spent}`);
    if (goldChange.stolen > 0) goldParts.push(`-${goldChange.stolen}`);
  }

  const statsContent = floor.hasStats && (
    <div className="flex flex-col items-end gap-0.5">
      <div className="whitespace-nowrap">
        <span className="text-gray-500">
          {floor.currentGold}g
        </span>
        {goldParts.length > 0 && (
          <span className="text-yellow-600/70 ml-1">
            ({goldParts.join(', ')})
          </span>
        )}
        <span className="mx-1.5 text-gray-700">|</span>
        <span
          className={
            floor.currentHp < floor.maxHp * 0.3
              ? 'text-red-400'
              : floor.hpHealed > floor.damageTaken
              ? 'text-green-400/70'
              : floor.damageTaken > floor.hpHealed
              ? 'text-red-400/70'
              : 'text-gray-500'
          }
        >
          {floor.currentHp}/{floor.maxHp} HP
        </span>
        {floor.damageTaken > 0 && (
          <span className="text-red-500/50 ml-1">
            (-{floor.damageTaken})
          </span>
        )}
        {floor.hpHealed > 0 && (
          <span className="text-green-500/50 ml-1">
            (+{floor.hpHealed})
          </span>
        )}
      </div>
      {(maxHpGained || maxHpLost) && (
        <div className="whitespace-nowrap text-xs">
          {maxHpGained && (
            <span className="text-green-500/50">+{maxHpGained.amount} max HP</span>
          )}
          {maxHpGained && maxHpLost && <span className="text-gray-700 mx-1">·</span>}
          {maxHpLost && (
            <span className="text-red-500/50">-{maxHpLost.amount} max HP</span>
          )}
        </div>
      )}
      {potionsUsed.length > 0 && (
        <div className="whitespace-nowrap text-xs">
          <span className="text-cyan-500/70">
            Used {potionsUsed.flatMap((e) => e.potions).map(formatId).join(', ')}
          </span>
        </div>
      )}
    </div>
  );

  const titleContent = (
    <>
      <span className="text-gray-300">
        {floor.title}
      </span>
      {floor.isWeak && (
        <span className="text-gray-600 text-xs ml-1">(weak)</span>
      )}
      {floor.monsters.length > 0 && (
        <span className="text-gray-600 text-xs ml-2">
          vs {floor.monsters.map(formatId).join(', ')}
        </span>
      )}
      {floor.turnsTaken ? (
        <span className="text-gray-600 text-xs ml-2">
          ({floor.turnsTaken} turns)
        </span>
      ) : null}
    </>
  );

  return (
    <div className="py-1.5 px-3 hover:bg-gray-800/30 rounded text-sm">
      <div className="flex gap-3 items-start">
        <span className="text-gray-600 w-6 text-right shrink-0 font-mono text-xs pt-0.5">
          {floor.globalFloor}
        </span>

        <RoomBadge type={floor.roomType} />

        {/* Desktop: title + details + stats inline */}
        <div className="hidden md:flex flex-1 min-w-0 items-start gap-3">
          <div className="flex-1 min-w-0">
            {titleContent}
            {detailEvents.length > 0 && <FloorDetails events={detailEvents} />}
          </div>
          {floor.hasStats && (
            <div className="shrink-0 text-xs">
              {statsContent}
            </div>
          )}
        </div>

        {/* Mobile: stats summary on the first row */}
        {floor.hasStats && (
          <div className="md:hidden ml-auto shrink-0 text-xs">
            {statsContent}
          </div>
        )}
      </div>

      {/* Mobile: floor name and details below */}
      <div className="md:hidden pl-9 mt-0.5">
        <div>{titleContent}</div>
        {detailEvents.length > 0 && <FloorDetails events={detailEvents} />}
      </div>
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

function FloorDetails({ events }: { events: FloorEvent[] }) {
  const cardRewards: React.ReactNode[] = [];
  const otherItems: React.ReactNode[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'card-reward': {
        const offeredStr = event.offered.map((c) => formatId(c.id) + (c.upgraded ? '+' : '')).join(', ');
        if (event.picked) {
          cardRewards.push(
            <div key={`card-${cardRewards.length}`} className="flex flex-wrap gap-x-2 gap-y-0.5">
              <span className="text-green-400/70">
                Picked {formatId(event.picked.id)}{event.picked.upgraded ? '+' : ''}
              </span>
              <span className="text-gray-600">
                from [{offeredStr}]
              </span>
            </div>
          );
        } else {
          cardRewards.push(
            <div key={`card-${cardRewards.length}`}>
              <span className="text-yellow-500/70">
                Skipped [{offeredStr}]
              </span>
            </div>
          );
        }
        break;
      }
      case 'cards-offered':
        otherItems.push(
          <span key={`cards-off-${otherItems.length}`} className="text-gray-600">
            Cards [{event.offered.map(formatId).join(', ')}]
          </span>
        );
        break;
      case 'cards-obtained':
        otherItems.push(
          <span key={`cards-obt-${otherItems.length}`} className={event.verb === 'Gained' ? 'text-green-500/70' : 'text-green-400/70'}>
            {event.verb} {event.cards.map((c) => formatId(c.name) + (c.upgraded ? '+' : '')).join(', ')}
          </span>
        );
        break;
      case 'cards-removed':
        otherItems.push(
          <span key={`cards-rem-${otherItems.length}`} className="text-red-500/70">
            Removed {event.cards.map(formatId).join(', ')}
          </span>
        );
        break;
      case 'card-transformed':
        otherItems.push(
          <span key={`card-xform-${otherItems.length}`} className="text-blue-400/70">
            {formatId(event.original)} → {formatId(event.result)}
          </span>
        );
        break;
      case 'card-enchanted':
        otherItems.push(
          <span key={`card-ench-${otherItems.length}`} className="text-purple-400/70">
            Enchanted {formatId(event.card)} with {formatId(event.enchantment)}
          </span>
        );
        break;
      case 'cards-upgraded':
        otherItems.push(
          <span key={`cards-upg-${otherItems.length}`} className="text-blue-300/70">
            Upgraded {event.cards.map(formatId).join(', ')}
          </span>
        );
        break;
      case 'relics-offered':
        otherItems.push(
          <span key={`rel-off-${otherItems.length}`} className="text-gray-600">
            Relics [{event.offered.map(formatId).join(', ')}]
          </span>
        );
        break;
      case 'relic-obtained':
        otherItems.push(
          <span key={`rel-obt-${otherItems.length}`} className="text-yellow-400/70">
            {event.verb} {event.relics.map(formatId).join(', ')}
          </span>
        );
        break;
      case 'relic-skipped':
        otherItems.push(
          <span key={`rel-skip-${otherItems.length}`} className="text-yellow-500/70">
            Skipped relic {event.skipped.map(formatId).join(', ')}
          </span>
        );
        break;
      case 'ancient-picked':
        otherItems.push(
          <span key={`anc-pick-${otherItems.length}`} className="text-purple-400/70">
            Picked {formatId(event.chosen)}
          </span>
        );
        otherItems.push(
          <span key={`anc-off-${otherItems.length}`} className="text-gray-600">
            from [{event.offered.map(formatId).join(', ')}]
          </span>
        );
        break;
      case 'ancient-skipped':
        otherItems.push(
          <span key={`anc-skip-${otherItems.length}`} className="text-yellow-500/70">
            Skipped [{event.offered.map(formatId).join(', ')}]
          </span>
        );
        break;
      case 'event-choice':
        otherItems.push(
          <span key={`ev-${otherItems.length}`} className="text-teal-400/70">
            Choice: {formatId(event.optionName)}
          </span>
        );
        break;
      case 'potions-offered':
        otherItems.push(
          <span key={`pot-off-${otherItems.length}`} className="text-gray-600">
            Potions [{event.offered.map(formatId).join(', ')}]
          </span>
        );
        break;
      case 'potion-obtained':
        otherItems.push(
          <span key={`pot-obt-${otherItems.length}`} className="text-cyan-400/70">
            {event.verb} {event.potions.map(formatId).join(', ')}
          </span>
        );
        break;
      case 'rest-site':
        otherItems.push(
          <span key={`rest-${otherItems.length}`} className="text-green-400/70">
            {event.choices.join(', ')}
          </span>
        );
        break;
    }
  }

  if (cardRewards.length === 0 && otherItems.length === 0) return null;

  return (
    <div className="text-xs mt-0.5 space-y-0.5">
      {cardRewards}
      {otherItems.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {otherItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-700">·</span>}
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
