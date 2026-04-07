export interface EloEntry {
  id: string;           // e.g. "CARD.BASH" or "SKIP_ACT_1" or "PAELS_LEGION"
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  pickRate: number;     // timesPicked / timesSeen
  timesSeen: number;    // total times this option appeared in a choice screen
  timesPicked: number;  // total times this option was actually picked
  runWins: number;      // runs won where this entity was picked
  runLosses: number;    // runs lost where this entity was picked
  runWinRate: number;   // runWins / (runWins + runLosses)
}

export type EloMap = Map<string, EloEntry>;

export type EloCategory = 'card' | 'ancient';
