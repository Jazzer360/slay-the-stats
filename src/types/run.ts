// TypeScript interfaces matching the .run JSON schema from Slay the Spire 2

export interface RunData {
  acts: string[];
  ascension: number;
  build_id: string;
  game_mode: string;
  killed_by_encounter: string;
  killed_by_event: string;
  map_point_history: MapPoint[][];
  modifiers: string[];
  platform_type: string;
  players: Player[];
  run_time: number;
  schema_version: number;
  seed: string;
  start_time: number;
  was_abandoned: boolean;
  win: boolean;
}

export interface Player {
  character: string;
  deck: DeckCard[];
  id: number;
  max_potion_slot_count: number;
  potions: Potion[];
  relics: Relic[];
  badges?: Badge[];
}

export interface DeckCard {
  id: string;
  floor_added_to_deck: number;
  current_upgrade_level?: number;
  enchantment?: Enchantment;
}

export interface Enchantment {
  id: string;
  amount: number;
}

export interface Potion {
  id: string;
  slot_index: number;
}

export interface Relic {
  id: string;
  floor_added_to_deck: number;
  props?: RelicProps;
}

export interface RelicProps {
  ints?: { name: string; value: number }[];
  bools?: { name: string; value: boolean }[];
  strings?: { name: string; value: string }[];
}

export interface Badge {
  id: string;
  rarity: string;
}

export interface MapPoint {
  map_point_type: string;
  player_stats: PlayerStats[];
  rooms: Room[];
}

export interface Room {
  model_id: string;
  room_type: string;
  turns_taken: number;
  monster_ids?: string[];
}

export interface PlayerStats {
  player_id: number;
  current_hp: number;
  max_hp: number;
  damage_taken: number;
  hp_healed: number;
  max_hp_gained: number;
  max_hp_lost: number;
  current_gold: number;
  gold_gained: number;
  gold_lost: number;
  gold_spent: number;
  gold_stolen: number;

  // Card choices (combat rewards, boss rewards)
  card_choices?: CardChoice[];
  cards_gained?: { id: string; current_upgrade_level?: number }[];
  cards_removed?: { id: string; floor_added_to_deck?: number }[];
  cards_transformed?: CardTransform[];
  cards_enchanted?: CardEnchant[];

  // Ancient choices (post-boss relic picks)
  ancient_choice?: AncientChoice[];

  // Relic choices
  relic_choices?: RelicChoice[];

  // Event choices
  event_choices?: EventChoice[];

  // Potion choices & usage
  potion_choices?: PotionChoice[];
  potion_used?: string[];
  potion_discarded?: string[];
  bought_potions?: string[];

  // Rest site
  rest_site_choices?: string[];
  upgraded_cards?: string[];

  // Shop
  bought_relics?: string[];
}

export interface CardChoice {
  card: {
    id: string;
    floor_added_to_deck?: number;
    current_upgrade_level?: number;
    enchantment?: Enchantment;
  };
  was_picked: boolean;
}

export interface AncientChoice {
  TextKey: string;
  title: {
    key: string;
    table: string;
  };
  was_chosen: boolean;
}

export interface CardTransform {
  original_card: {
    id: string;
    floor_added_to_deck: number;
  };
  final_card: {
    id: string;
    floor_added_to_deck: number;
  };
}

export interface CardEnchant {
  card: {
    id: string;
    floor_added_to_deck: number;
    enchantment: Enchantment;
  };
  enchantment: string;
}

export interface RelicChoice {
  choice: string;
  was_picked: boolean;
}

export interface EventChoice {
  title: {
    key: string;
    table: string;
  };
  variables?: Record<string, EventVariable>;
}

export interface EventVariable {
  type: string;
  decimal_value: number;
  bool_value: boolean;
  string_value: string;
}

export interface PotionChoice {
  choice: string;
  was_picked: boolean;
}

// Parsed run with metadata
export interface ParsedRun {
  fileName: string;
  profile: string | null;
  data: RunData;
}

// ─── Floor timeline types ─────────────────────────────────────────────────────

export interface RunTimeline {
  acts: ActSummary[];
}

export interface ActSummary {
  actIndex: number;
  label: string;
  floors: FloorSummary[];
}

export interface FloorSummary {
  floorNumber: number;
  globalFloor: number;
  roomType: string;
  title: string;
  isWeak: boolean;
  isShop: boolean;
  hasStats: boolean;
  monsters: string[];
  turnsTaken: number | null;

  currentHp: number;
  maxHp: number;
  damageTaken: number;
  hpHealed: number;
  maxHpGained: number;
  maxHpLost: number;

  currentGold: number;
  goldGained: number;
  goldSpent: number;
  goldStolen: number;

  events: FloorEvent[];
}

export type FloorEvent =
  | { type: 'card-reward'; offered: { id: string; upgraded: boolean }[]; picked: { id: string; upgraded: boolean } | null }
  | { type: 'cards-offered'; offered: string[] }
  | { type: 'cards-obtained'; cards: { name: string; upgraded: boolean }[]; verb: string }
  | { type: 'cards-removed'; cards: string[] }
  | { type: 'card-transformed'; original: string; result: string }
  | { type: 'card-enchanted'; card: string; enchantment: string }
  | { type: 'cards-upgraded'; cards: string[] }
  | { type: 'relics-offered'; offered: string[] }
  | { type: 'relic-obtained'; relics: string[]; verb: string }
  | { type: 'ancient-picked'; chosen: string; offered: string[] }
  | { type: 'ancient-skipped'; offered: string[] }
  | { type: 'event-choice'; optionName: string }
  | { type: 'potions-offered'; offered: string[] }
  | { type: 'potion-obtained'; potions: string[]; verb: string }
  | { type: 'potion-used'; potions: string[] }
  | { type: 'rest-site'; choices: string[] }
  | { type: 'gold-change'; gained: number; spent: number; stolen: number }
  | { type: 'max-hp-gained'; amount: number }
  | { type: 'max-hp-lost'; amount: number };
