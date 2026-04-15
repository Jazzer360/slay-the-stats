import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { useProfileNav } from '../hooks/useProfileNav';
import { useAncientElo } from '../hooks/useElo';
import { EloTable } from '../components/elo/EloTable';
import type { EloMap } from '../types/elo';
import { formatId } from '../lib/format';

export function AncientEloPage() {
  const filteredRuns = useFilteredRuns();
  const { elo: ancientElo, ancientMap } = useAncientElo(filteredRuns);
  const { toAncientDetail } = useProfileNav();
  const [selectedAncient, setSelectedAncient] = useState<string>('ALL');

  // Build list of unique ancient names from the ancientMap
  const ancientNames = useMemo(() => {
    const names = new Set(ancientMap.values());
    return ['ALL', ...Array.from(names).sort()];
  }, [ancientMap]);

  // Filter the EloMap to only include entries belonging to the selected ancient
  const filteredElo: EloMap = useMemo(() => {
    if (selectedAncient === 'ALL') return ancientElo;
    const filtered: EloMap = new Map();
    for (const [key, entry] of ancientElo) {
      if (ancientMap.get(entry.id) === selectedAncient) {
        filtered.set(key, entry);
      }
    }
    return filtered;
  }, [ancientElo, ancientMap, selectedAncient]);

  if (filteredRuns.length === 0) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>
          No runs loaded.{' '}
          <Link to="/import" className="text-purple-400 hover:text-purple-300">
            Import your runs
          </Link>{' '}
          to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {ancientNames.map((name) => (
          <button
            key={name}
            onClick={() => setSelectedAncient(name)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedAncient === name
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            {name === 'ALL' ? 'All Ancients' : formatId(name)}
          </button>
        ))}
      </div>
      <EloTable
        eloMap={filteredElo}
        title="Ancient Reward ELO Rankings"
        entityLabel="Ancient Reward"
        onEntityClick={(id) => toAncientDetail(id)}
      />
    </div>
  );
}
