// Shared character accent colors, matching the cardpool pip colors used in the
// run detail view. Keys are canonical character IDs (e.g. "CHARACTER.IRONCLAD").
export const CHARACTER_COLORS: Record<string, string> = {
  'CHARACTER.IRONCLAD': '#ef4444', // red
  'CHARACTER.SILENT': '#22c55e', // green
  'CHARACTER.DEFECT': '#3b82f6', // blue
  'CHARACTER.REGENT': '#f59e0b', // amber
  'CHARACTER.NECROBINDER': '#a855f7', // purple
};

const FALLBACK = '#9ca3af';

export function characterColor(characterId: string): string {
  return CHARACTER_COLORS[characterId] ?? FALLBACK;
}
