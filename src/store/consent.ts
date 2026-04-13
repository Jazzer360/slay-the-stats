import { create } from 'zustand';

const STORAGE_KEY = 'cookie-consent';

export type ConsentStatus = 'undecided' | 'accepted' | 'declined';

function loadConsent(): ConsentStatus {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'declined') return v;
  } catch { /* ignore */ }
  return 'undecided';
}

interface ConsentStore {
  consent: ConsentStatus;
  accept: () => void;
  decline: () => void;
  reset: () => void;
}

export const useConsentStore = create<ConsentStore>((set) => ({
  consent: loadConsent(),
  accept: () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    set({ consent: 'accepted' });
  },
  decline: () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    set({ consent: 'declined' });
  },
  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ consent: 'undecided' });
  },
}));
