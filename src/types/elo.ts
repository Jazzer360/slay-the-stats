export interface OfferInstance {
  floor: number;
  actIndex: number;
  allOptions: string[];
  chosenId: string;
  wasPicked: boolean;
  eloChange: number;
  ratingAfter: number;
}

export interface RunAppearance {
  fileName: string;
  win: boolean;
  deckSize: number;
  startTime: number;
  character: string;
  ascension: number;
  floorsReached: number;
  offers: OfferInstance[];
}

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
  appearances: RunAppearance[];
}

export type EloMap = Map<string, EloEntry>;

export type EloCategory = 'card' | 'ancient';
