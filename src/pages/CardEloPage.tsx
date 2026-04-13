import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { useProfileNav } from '../hooks/useProfileNav';
import { useCardElo } from '../hooks/useElo';
import { EloTable } from '../components/elo/EloTable';
import { useEloOptionsStore } from '../store/eloOptions';

export function CardEloPage() {
  const filteredRuns = useFilteredRuns();
  const { toRunsWithCard } = useProfileNav();

  const upgradeAware = useEloOptionsStore((s) => s.upgradeAware);
  const enchantmentAware = useEloOptionsStore((s) => s.enchantmentAware);
  const setUpgradeAware = useEloOptionsStore((s) => s.setUpgradeAware);
  const setEnchantmentAware = useEloOptionsStore((s) => s.setEnchantmentAware);

  const cardElo = useCardElo(filteredRuns, { upgradeAware, enchantmentAware });

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
      titleExtra={
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={upgradeAware}
              onChange={(e) => setUpgradeAware(e.target.checked)}
              className="accent-purple-500"
            />
            Upgrade-Aware
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enchantmentAware}
              onChange={(e) => setEnchantmentAware(e.target.checked)}
              className="accent-purple-500"
            />
            Enchantment-Aware
          </label>
        </div>
      }
    />
  );
}
