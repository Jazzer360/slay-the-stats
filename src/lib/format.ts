/**
 * Convert IDs like "CARD.HEAVY_BLADE" to "Heavy Blade"
 * or "CHARACTER.IRONCLAD" to "Ironclad"
 * or "SKIP_ACT_1" to "Skip (Act 1)"
 * or "SKIP_BOSS_ACT_2" to "Skip Boss (Act 2)"
 * or "ENCOUNTER.QUEEN_BOSS" to "Queen Boss"
 */
export function formatId(id: string): string {
  // Skip entities
  if (id.startsWith('SKIP_BOSS_ACT_')) {
    const act = id.replace('SKIP_BOSS_ACT_', '');
    return `Skip Boss (Act ${act})`;
  }
  if (id.startsWith('SKIP_ACT_')) {
    const act = id.replace('SKIP_ACT_', '');
    return `Skip (Act ${act})`;
  }

  // Strip prefix (CARD., CHARACTER., ENCOUNTER., RELIC., etc.)
  const upgraded = id.endsWith('+');
  const base = upgraded ? id.slice(0, -1) : id;
  const withoutPrefix = base.includes('.') ? base.split('.').slice(1).join('.') : base;

  const name = withoutPrefix
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return upgraded ? `${name}+` : name;
}

/**
 * Format a unix timestamp to a readable date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Format a number as a percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format an ELO rating for display
 */
export function formatElo(rating: number): string {
  return Math.round(rating).toString();
}
