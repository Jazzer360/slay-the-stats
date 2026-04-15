import { Link } from 'react-router';
import { formatId, formatDate } from '../../lib/format';
import type { RunAppearance, OfferInstance } from '../../types/elo';

export function RunCard({
  appearance,
  entityId,
  base,
  getDetailPath,
}: {
  appearance: RunAppearance;
  entityId: string;
  base: string;
  getDetailPath?: (id: string) => string;
}) {
  const runPath = `${base}/runs/${encodeURIComponent(appearance.fileName.replace(/\.run$/, ''))}`;
  const totalEloChange = appearance.offers.reduce((sum, o) => sum + o.eloChange, 0);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Run header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className={`font-semibold ${appearance.win ? 'text-green-400' : 'text-red-400'}`}>
            {appearance.win ? 'Victory' : 'Defeat'}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-300">
            {formatId(appearance.character)} A{appearance.ascension}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">{formatDate(appearance.startTime)}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-500">Deck: {appearance.deckSize}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-500">Floors: {appearance.floorsReached}</span>
          <span className="text-gray-500">|</span>
          <span
            className={`font-mono text-xs ${totalEloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {totalEloChange >= 0 ? '+' : ''}
            {totalEloChange.toFixed(1)} ELO
          </span>
        </div>
        <Link to={runPath} className="text-purple-400 hover:text-purple-300 text-xs shrink-0">
          View Run →
        </Link>
      </div>

      {/* Offer instances */}
      <div className="divide-y divide-gray-800/50 bg-gray-950">
        {appearance.offers.map((offer, i) => (
          <OfferRow key={i} offer={offer} entityId={entityId} getDetailPath={getDetailPath} />
        ))}
      </div>
    </div>
  );
}

function OfferRow({
  offer,
  entityId,
  getDetailPath,
}: {
  offer: OfferInstance;
  entityId: string;
  getDetailPath?: (id: string) => string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm">
      <span className="text-gray-500 w-16 shrink-0">Floor {offer.floor}</span>
      <span
        className={`w-14 shrink-0 font-medium ${offer.wasPicked ? 'text-green-400' : 'text-gray-500'}`}
      >
        {offer.wasPicked ? 'Picked' : 'Passed'}
      </span>
      <span
        className={`w-16 shrink-0 font-mono text-xs ${offer.eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
      >
        {offer.eloChange >= 0 ? '+' : ''}
        {offer.eloChange.toFixed(1)}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {offer.allOptions.map((id) => {
          const isChosen = id === offer.chosenId;
          const isTarget = id === entityId;
          let className = 'px-2 py-0.5 rounded text-xs ';
          if (isChosen && isTarget) {
            className += 'bg-purple-600/50 text-purple-200 ring-1 ring-purple-400';
          } else if (isChosen) {
            className += 'bg-green-900/40 text-green-300';
          } else if (isTarget) {
            className += 'bg-gray-700 text-gray-300 ring-1 ring-purple-500/50';
          } else {
            className += 'bg-gray-800/60 text-gray-500';
          }
          const isLinkable = !isTarget && !id.startsWith('SKIP_') && id !== 'SACRIFICE';
          if (getDetailPath && isLinkable) {
            return (
              <Link
                key={id}
                to={getDetailPath(id)}
                className={`${className} hover:brightness-125 transition-all`}
              >
                {formatId(id)}
              </Link>
            );
          }
          return (
            <span key={id} className={className}>
              {formatId(id)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
