import { useAuthStore } from '../store/auth';
import { useProfileRunsStore } from '../store/profileRuns';

export function useActiveDefaultFilters() {
  const ownDefaults = useAuthStore((s) => s.userProfile?.defaultFilters);
  const profileDefaults = useProfileRunsStore((s) => s.defaultFilters);
  return profileDefaults ?? ownDefaults;
}
