import { gameModeLabel } from '../../lib/run-mode';

const MODE_STYLES: Record<string, string> = {
  custom: 'border-amber-500/30 bg-amber-900/20 text-amber-300',
  daily: 'border-emerald-500/30 bg-emerald-900/20 text-emerald-300',
  dread: 'border-red-500/30 bg-red-900/20 text-red-300',
  blitz: 'border-sky-500/30 bg-sky-900/20 text-sky-300',
};

/** Tags non-standard runs (Daily, Dread, Blitz, Custom, …); renders nothing for standard. */
export function GameModeBadge({ mode }: { mode: string }) {
  if (mode === 'standard') return null;
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
        MODE_STYLES[mode] ?? 'border-gray-500/30 bg-gray-800/40 text-gray-300'
      }`}
    >
      {gameModeLabel(mode)}
    </span>
  );
}
