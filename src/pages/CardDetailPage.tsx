import { useParams, Link } from 'react-router';
import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { useCardElo } from '../hooks/useElo';
import { useProfileNav } from '../hooks/useProfileNav';
import { useEloOptionsStore } from '../store/eloOptions';
import { formatId, formatElo, formatPercent } from '../lib/format';
import { getCardMeta } from '../lib/card-meta';
import { RunCard } from '../components/elo/OfferHistory';
import { EloHistoryChart } from '../components/elo/EloHistoryChart';
import { useCallback } from 'react';

export function CardDetailPage() {
  const { entityId } = useParams();
  const slug = decodeURIComponent(entityId ?? '');
  const decodedId = `CARD.${slug.toUpperCase()}`;
  const filteredRuns = useFilteredRuns();

  const upgradeAware = useEloOptionsStore((s) => s.upgradeAware);
  const enchantmentAware = useEloOptionsStore((s) => s.enchantmentAware);
  const cardElo = useCardElo(filteredRuns, { upgradeAware, enchantmentAware });
  const { base } = useProfileNav();

  const getCardDetailPath = useCallback((id: string) => {
    const slug = id.replace(/^CARD\./, '').toLowerCase();
    return `${base}/card-elo/${encodeURIComponent(slug)}`;
  }, [base]);

  const entry = cardElo.get(decodedId);

  if (!entry) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>Card not found.</p>
        <Link to={`${base}/card-elo`} className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">
          ← Back to Card ELO Rankings
        </Link>
      </div>
    );
  }

  const meta = getCardMeta(decodedId);
  const ratingColor = entry.rating >= 1600 ? 'text-green-400' : entry.rating >= 1400 ? 'text-gray-200' : 'text-red-400';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to={`${base}/card-elo`} className="text-purple-400 hover:text-purple-300 text-sm">
          ← Back to Card ELO Rankings
        </Link>
        <h2 className="text-2xl font-bold text-gray-100 mt-2">{formatId(decodedId)}</h2>
        {meta && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{meta.color}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">{meta.rarity}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm">
          <span className="text-gray-400">ELO: <span className={`font-mono font-bold ${ratingColor}`}>{formatElo(entry.rating)}</span></span>
          <span className="text-gray-400">Seen: <span className="text-gray-200">{entry.timesSeen}</span></span>
          <span className="text-gray-400">Picked: <span className="text-gray-200">{entry.timesPicked}</span></span>
          <span className="text-gray-400">Pick Rate: <span className="text-gray-200">{formatPercent(entry.pickRate)}</span></span>
          <span className="text-gray-400">Runs: <span className="text-green-500">{entry.runWins}W</span> / <span className="text-red-500">{entry.runLosses}L</span> ({formatPercent(entry.runWinRate)})</span>
        </div>
      </div>

      {/* ELO History Chart */}
      <EloHistoryChart entry={entry} />

      {/* Appearances */}
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
        Offered in {entry.appearances.length} run{entry.appearances.length !== 1 ? 's' : ''}
      </h3>
      <div className="space-y-3">
        {entry.appearances.map((appearance) => (
          <RunCard key={appearance.fileName} appearance={appearance} entityId={decodedId} base={base} getDetailPath={getCardDetailPath} />
        ))}
      </div>
    </div>
  );
}
