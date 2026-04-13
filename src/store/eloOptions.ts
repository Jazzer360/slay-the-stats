import { create } from 'zustand';

interface EloOptionsStore {
  upgradeAware: boolean;
  enchantmentAware: boolean;
  setUpgradeAware: (v: boolean) => void;
  setEnchantmentAware: (v: boolean) => void;
}

export const useEloOptionsStore = create<EloOptionsStore>((set) => ({
  upgradeAware: true,
  enchantmentAware: true,
  setUpgradeAware: (upgradeAware) => set({ upgradeAware }),
  setEnchantmentAware: (enchantmentAware) => set({ enchantmentAware }),
}));
