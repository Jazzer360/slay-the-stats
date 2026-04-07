import type { RunData, ParsedRun } from '../types/run';

export function parseRunFile(fileName: string, jsonText: string, profile: string | null = null): ParsedRun {
  const data = JSON.parse(jsonText) as RunData;

  // Basic validation
  if (!data.players || data.players.length === 0) {
    throw new Error(`Invalid run file ${fileName}: no players`);
  }
  if (!data.map_point_history) {
    throw new Error(`Invalid run file ${fileName}: no map_point_history`);
  }

  return { fileName, profile, data };
}

export async function loadRunFiles(files: File[]): Promise<ParsedRun[]> {
  const runs: ParsedRun[] = [];
  const errors: { fileName: string; error: string }[] = [];

  const readPromises = files
    .filter((f) => f.name.endsWith('.run'))
    .map(async (file) => {
      try {
        const text = await file.text();
        const run = parseRunFile(file.name, text);
        runs.push(run);
      } catch (e) {
        errors.push({
          fileName: file.name,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });

  await Promise.all(readPromises);

  if (errors.length > 0) {
    console.warn(`Failed to parse ${errors.length} run files:`, errors);
  }

  // Sort by start_time ascending (chronological)
  runs.sort((a, b) => a.data.start_time - b.data.start_time);

  return runs;
}
