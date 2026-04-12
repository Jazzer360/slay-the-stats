export interface DefaultProfileFilters {
  character: string | null;
  playerMode: 'all' | 'solo' | 'multi';
  ascensionMin: number | null;
  ascensionMax: number | null;
  result: 'all' | 'win' | 'loss';
}

export const EMPTY_DEFAULT_FILTERS: DefaultProfileFilters = {
  character: null,
  playerMode: 'all',
  ascensionMin: null,
  ascensionMax: null,
  result: 'all',
};

export interface UserProfile {
  uid: string;
  screenName: string | null;
  profileVisibility: 'public' | 'private';
  defaultFilters: DefaultProfileFilters;
  createdAt: number;
}
