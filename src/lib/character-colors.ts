// Class colors sampled from each character's in-game card frame
// (cdn.spire-codex.com/card-frames/frame_attack_<char>.png), hue/saturation
// kept and lightened to L≈55% so they read on the site's dark background.
// Keyed by card pool / class name as used in card metadata (e.g. "Ironclad").
export const CLASS_COLORS: Record<string, string> = {
  Ironclad: '#ce604a', // red
  Silent: '#83c94f', // green
  Regent: '#ff9719', // orange
  Necrobinder: '#b56280', // dusty pink
  Defect: '#34a8e3', // blue
  Fool: '#c7b851', // olive yellow
};

const FALLBACK = '#9ca3af';

/** "CHARACTER.IRONCLAD" → "Ironclad" */
export function characterClassName(characterId: string): string {
  const raw = characterId.split('.').pop() ?? '';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Accent color for a canonical character ID (e.g. "CHARACTER.IRONCLAD"). */
export function characterColor(characterId: string): string {
  return CLASS_COLORS[characterClassName(characterId)] ?? FALLBACK;
}
