import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { useProfileNav } from '../hooks/useProfileNav';
import { useCardElo } from '../hooks/useElo';
import { EloTable } from '../components/elo/EloTable';

export function CardEloPage() {
  const filteredRuns = useFilteredRuns();
  const cardElo = useCardElo(filteredRuns);
  const { toRunsWithCard } = useProfileNav();

  if (filteredRuns.length === 0) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>No runs loaded. Go to Home to load your run history.</p>
      </div>
    );
  }

  return (
    <EloTable
      eloMap={cardElo}
      title="Card ELO Rankings"
      entityLabel="Card"
      showCardMeta
      onEntityClick={(id) => toRunsWithCard(id)}
    />
  );
}
