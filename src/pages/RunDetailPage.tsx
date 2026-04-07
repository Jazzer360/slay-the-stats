import { useParams, Link } from 'react-router';
import { useRunsStore } from '../store/runs';
import { formatId, formatDate, formatDuration } from '../lib/format';
import type { MapPoint, PlayerStats } from '../types/run';

export function RunDetailPage() {
  const { fileName } = useParams<{ fileName: string }>();
  const runs = useRunsStore((s) => s.runs);
  const run = runs.find((r) => r.fileName === fileName);

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

  return (
    <div>
      <Link
        to="/runs"
        className="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block"
      >
        ← Back to Run List
      </Link>

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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Date:</span>{' '}
            <span className="text-gray-300">{formatDate(d.start_time)}</span>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>{' '}
            <span className="text-gray-300">{formatDuration(d.run_time)}</span>
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

      {/* Final deck & relics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Final Deck ({player.deck.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {player.deck.map((card, i) => (
              <span
                key={i}
                className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded"
              >
                {formatId(card.id)}
                {card.current_upgrade_level
                  ? `+${card.current_upgrade_level}`
                  : ''}
                {card.enchantment ? ` [${formatId(card.enchantment.id)}]` : ''}
              </span>
            ))}
          </div>
        </div>

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
      </div>

      {/* Floor-by-floor timeline */}
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
        Floor-by-Floor Timeline
      </h3>
      <div className="space-y-1">
        {d.map_point_history.map((act, actIdx) => (
          <div key={actIdx}>
            <div className="bg-purple-900/20 border border-purple-800/30 rounded px-3 py-1.5 mb-1">
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
  );
}

function FloorRow({ point, floorNum }: { point: MapPoint; floorNum: number }) {
  const room = point.rooms?.[0];
  const stats = point.player_stats?.[0];

  return (
    <div className="flex gap-3 items-start py-1.5 px-3 hover:bg-gray-900/30 rounded text-sm">
      {/* Floor number */}
      <span className="text-gray-600 w-6 text-right shrink-0 font-mono text-xs pt-0.5">
        {floorNum}
      </span>

      {/* Room type badge */}
      <RoomBadge type={point.map_point_type} />

      {/* Room info */}
      <div className="flex-1 min-w-0">
        <span className="text-gray-300">
          {room ? formatId(room.model_id) : formatId(point.map_point_type)}
        </span>
        {room?.turns_taken ? (
          <span className="text-gray-600 text-xs ml-2">
            {room.turns_taken} turns
          </span>
        ) : null}

        {/* Choices made */}
        {stats && <FloorDetails stats={stats} />}
      </div>

      {/* HP */}
      {stats && (
        <div className="shrink-0 text-xs text-right">
          <span
            className={
              stats.damage_taken > 0 ? 'text-red-400/70' : 'text-gray-600'
            }
          >
            {stats.current_hp}/{stats.max_hp} HP
          </span>
          {stats.damage_taken > 0 && (
            <span className="text-red-500/50 ml-1">
              (-{stats.damage_taken})
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
    event: 'bg-gray-800 text-gray-400',
  };

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded w-16 text-center shrink-0 ${
        styles[type] ?? styles.unknown
      }`}
    >
      {type}
    </span>
  );
}

function FloorDetails({ stats }: { stats: PlayerStats }) {
  const details: string[] = [];

  // Card choices
  if (stats.card_choices && stats.card_choices.length > 0) {
    const picked = stats.card_choices.find((c) => c.was_picked);
    if (picked) {
      details.push(`Picked: ${formatId(picked.card.id)}`);
    } else {
      details.push('Skipped card reward');
    }
  }

  // Ancient choices
  if (stats.ancient_choice && stats.ancient_choice.length > 0) {
    const chosen = stats.ancient_choice.find((c) => c.was_chosen);
    if (chosen) {
      details.push(`Ancient: ${formatId(chosen.TextKey)}`);
    }
  }

  // Relic choices
  if (stats.relic_choices && stats.relic_choices.length > 0) {
    const picked = stats.relic_choices.find((c) => c.was_picked);
    if (picked) {
      details.push(`Relic: ${formatId(picked.choice)}`);
    }
  }

  // Rest site
  if (stats.rest_site_choices && stats.rest_site_choices.length > 0) {
    details.push(`Rest: ${stats.rest_site_choices.join(', ')}`);
  }

  // Gold
  if (stats.gold_gained > 0) {
    details.push(`+${stats.gold_gained}g`);
  }
  if (stats.gold_spent > 0) {
    details.push(`-${stats.gold_spent}g`);
  }

  if (details.length === 0) return null;

  return (
    <div className="text-xs text-gray-500 mt-0.5">
      {details.join(' · ')}
    </div>
  );
}
