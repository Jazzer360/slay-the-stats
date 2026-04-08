import { useRunsStore } from '../store/runs';
import { useProfileRunsStore } from '../store/profileRuns';
import type { ParsedRun } from '../types/run';

export function useActiveRuns(): ParsedRun[] {
  const ownRuns = useRunsStore((s) => s.runs);
  const profileRuns = useProfileRunsStore((s) => s.profileRuns);
  return profileRuns ?? ownRuns;
}
