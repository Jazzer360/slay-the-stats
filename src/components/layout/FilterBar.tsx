import { useFilterStore } from '../../store/filters';
import { useFilterOptions } from '../../hooks/useFilteredRuns';
import { formatId } from '../../lib/format';

export function FilterBar() {
  const {
    profile,
    character,
    playerMode,
    ascensionMin,
    ascensionMax,
    result,
    setProfile,
    setCharacter,
    setPlayerMode,
    setAscensionRange,
    setResult,
    resetFilters,
  } = useFilterStore();
  const options = useFilterOptions();

  const hasActiveFilters =
    profile !== null ||
    character !== null ||
    playerMode !== 'all' ||
    ascensionMin !== null ||
    ascensionMax !== null ||
    result !== 'all';

  return (
    <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          Filters
        </span>

        {/* Profile single-select */}
        {options.profiles.length > 1 && (
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Profile:</label>
            <button
              onClick={() => setProfile(null)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                profile === null
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              All
            </button>
            {options.profiles.map((p) => (
              <button
                key={p}
                onClick={() => setProfile(p)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  profile === p
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                {formatId(p)}
              </button>
            ))}
          </div>
        )}

        {/* Character single-select */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCharacter(null)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              character === null
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            All
          </button>
          {options.characters.map((char) => (
            <button
              key={char}
              onClick={() => setCharacter(char)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                character === char
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {formatId(char)}
            </button>
          ))}
        </div>

        {/* Ascension range */}
        {options.ascensions.length > 1 && (
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Asc:</label>
            <select
              value={ascensionMin ?? ''}
              onChange={(e) =>
                setAscensionRange(
                  e.target.value ? Number(e.target.value) : null,
                  ascensionMax
                )
              }
              className="bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 px-1.5 py-1"
            >
              <option value="">Min</option>
              {options.ascensions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <span className="text-gray-600">–</span>
            <select
              value={ascensionMax ?? ''}
              onChange={(e) =>
                setAscensionRange(
                  ascensionMin,
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 px-1.5 py-1"
            >
              <option value="">Max</option>
              {options.ascensions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Win/Loss */}
        <div className="flex items-center gap-1">
          {(['all', 'win', 'loss'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setResult(r)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                result === r
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {r === 'all' ? 'All' : r === 'win' ? 'Wins' : 'Losses'}
            </button>
          ))}
        </div>

        {/* Solo/Multi */}
        {options.hasMultiplayer && (
          <div className="flex items-center gap-1">
            {(['all', 'solo', 'multi'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPlayerMode(m)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  playerMode === m
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                {m === 'all' ? 'All' : m === 'solo' ? 'Solo' : 'Multiplayer'}
              </button>
            ))}
          </div>
        )}

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-gray-500 hover:text-gray-300 underline"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
