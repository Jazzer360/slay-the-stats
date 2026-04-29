#!/usr/bin/env node
// Generates card-meta.ts, relic-meta.ts, potion-meta.ts from ptrlrd/spire-codex
// Usage: node scripts/generate-meta.mjs

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src', 'lib');

const REPO_BASE = 'https://raw.githubusercontent.com/ptrlrd/spire-codex/main/data-beta';

async function resolveVersion() {
  const res = await fetch(`${REPO_BASE}/latest`);
  if (!res.ok) throw new Error(`Failed to fetch latest version: ${res.status}`);
  return (await res.text()).trim();
}

async function fetchJSON(base, name) {
  const res = await fetch(`${base}/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
  return res.json();
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function poolToCharacter(pool) {
  const map = { shared: 'Colorless', event: 'Colorless', ironclad: 'Ironclad', silent: 'Silent', defect: 'Defect', necrobinder: 'Necrobinder', regent: 'Regent' };
  return map[pool] || 'Colorless';
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ── Cards ───────────────────────────────────────────────────────────────────
function fmtStringArr(arr) {
  return `[${arr.map((s) => `'${esc(s)}'`).join(', ')}]`;
}

function buildCardEntry(c) {
  const parts = [
    `name: '${esc(c.name)}'`,
    `color: '${titleCase(c.color)}'`,
    `rarity: '${c.rarity_key}'`,
    `type: '${c.type_key}'`,
    `cost: ${c.cost}`,
  ];
  if (c.upgrade && typeof c.upgrade === 'object' && Object.prototype.hasOwnProperty.call(c.upgrade, 'cost')) {
    parts.push(`costUpgraded: ${c.upgrade.cost}`);
  }
  if (c.is_x_cost) parts.push('isXCost: true');
  if (c.is_x_star_cost) parts.push('isXStarCost: true');
  if (c.star_cost != null) parts.push(`starCost: ${c.star_cost}`);
  parts.push(`target: '${c.target}'`);
  const keywords = c.keywords_key ?? c.keywords;
  if (keywords && keywords.length) parts.push(`keywords: ${fmtStringArr(keywords)}`);
  if (c.tags && c.tags.length) parts.push(`tags: ${fmtStringArr(c.tags)}`);
  if (c.damage != null) parts.push(`damage: ${c.damage}`);
  if (c.block != null) parts.push(`block: ${c.block}`);
  if (c.hit_count != null) parts.push(`hitCount: ${c.hit_count}`);
  if (c.cards_draw != null) parts.push(`cardsDraw: ${c.cards_draw}`);
  if (c.energy_gain != null) parts.push(`energyGain: ${c.energy_gain}`);
  if (c.hp_loss != null) parts.push(`hpLoss: ${c.hp_loss}`);
  if (c.powers_applied && c.powers_applied.length) {
    const ps = c.powers_applied
      .map((p) => `${JSON.stringify(p.power_key)}: ${p.amount}`)
      .join(', ');
    parts.push(`powersApplied: { ${ps} }`);
  }
  if (c.spawns_cards && c.spawns_cards.length) {
    parts.push(`spawnsCards: ${fmtStringArr(c.spawns_cards)}`);
  }
  return `  'CARD.${c.id}': { ${parts.join(', ')} },`;
}

async function generateCards(cards, version) {
  const colorSet = new Set();
  const raritySet = new Set();
  const typeSet = new Set();
  const targetSet = new Set();
  const keywordSet = new Set();
  const tagSet = new Set();

  const entries = cards.map((c) => {
    colorSet.add(titleCase(c.color));
    raritySet.add(c.rarity_key);
    typeSet.add(c.type_key);
    targetSet.add(c.target);
    for (const k of c.keywords_key ?? c.keywords ?? []) keywordSet.add(k);
    for (const t of c.tags ?? []) tagSet.add(t);
    return buildCardEntry(c);
  });

  const union = (set) => [...set].sort().map((v) => `'${v}'`).join(' | ');
  const colors = union(colorSet);
  const rarities = union(raritySet);
  const types = union(typeSet);
  const targets = union(targetSet);
  const keywords = keywordSet.size ? union(keywordSet) : 'never';
  const tags = tagSet.size ? union(tagSet) : 'never';

  const out = `// Auto-generated from https://github.com/ptrlrd/spire-codex (${version})
// ${cards.length} cards — regenerate with: node scripts/generate-meta.mjs

export type CardColor = ${colors};
export type CardRarity = ${rarities};
export type CardType = ${types};
export type CardTarget = ${targets};
export type CardKeyword = ${keywords};
export type CardTag = ${tags};

export interface CardMeta {
  name: string;
  color: CardColor;
  rarity: CardRarity;
  type: CardType;
  // Base energy cost. Note: -1 means "unplayable" for curses/statuses,
  // but a few X-cost cards (e.g. Cascade) also report cost=-1 — check isXCost.
  cost: number;
  // Absolute new cost when upgraded; present only when upgrading changes the cost.
  costUpgraded?: number;
  isXCost?: boolean;
  isXStarCost?: boolean;
  starCost?: number;
  target: CardTarget;
  keywords?: CardKeyword[];
  tags?: CardTag[];
  damage?: number;
  block?: number;
  hitCount?: number;
  cardsDraw?: number;
  energyGain?: number;
  hpLoss?: number;
  // Map of power_key (e.g. "Vulnerable", "Poison", "Strength") to amount applied.
  powersApplied?: Record<string, number>;
  // Card IDs spawned/added by playing this card (e.g. ["SHIV"]).
  spawnsCards?: string[];
}

const CARD_META: Record<string, CardMeta> = {
${entries.join('\n')}
};

function stripCardId(cardId: string): { baseId: string; upgraded: boolean } {
  // Strip enchantment suffix like " [ENCHANTMENT.SWIFT]"
  const bracketIdx = cardId.indexOf(' [');
  const withoutEnchantment = bracketIdx !== -1 ? cardId.slice(0, bracketIdx) : cardId;
  const upgraded = withoutEnchantment.endsWith('+');
  const baseId = upgraded ? withoutEnchantment.slice(0, -1) : withoutEnchantment;
  return { baseId, upgraded };
}

export function getCardMeta(cardId: string): CardMeta | undefined {
  return CARD_META[stripCardId(cardId).baseId];
}

// Returns the energy cost of a card, accounting for upgrade status (trailing '+').
// Returns -1 for unplayable curses/statuses; check meta.isXCost to disambiguate
// the rare X-cost card that also reports -1 (Cascade).
export function getCardCost(cardId: string): number | undefined {
  const { baseId, upgraded } = stripCardId(cardId);
  const meta = CARD_META[baseId];
  if (!meta) return undefined;
  return upgraded && meta.costUpgraded !== undefined ? meta.costUpgraded : meta.cost;
}
`;
  writeFileSync(join(SRC, 'card-meta.ts'), out);
  console.log(
    `✔ card-meta.ts  — ${cards.length} cards  (${colorSet.size} colors, ${raritySet.size} rarities, ${typeSet.size} types, ${targetSet.size} targets, ${keywordSet.size} keywords, ${tagSet.size} tags)`
  );
}

// ── Relics ──────────────────────────────────────────────────────────────────
async function generateRelics(relics, version) {
  const raritySet = new Set();
  const charSet = new Set();

  const entries = relics.map((r) => {
    const rarity = r.rarity_key;
    const character = poolToCharacter(r.pool);
    raritySet.add(rarity);
    charSet.add(character);
    return `  'RELIC.${r.id}': { name: '${esc(r.name)}', character: '${character}', rarity: '${rarity}' },`;
  });

  const rarities = [...raritySet].sort().map((r) => `'${r}'`).join(' | ');
  const chars = [...charSet].sort().map((c) => `'${c}'`).join(' | ');

  const out = `// Auto-generated from https://github.com/ptrlrd/spire-codex (${version})
// ${relics.length} relics — regenerate with: node scripts/generate-meta.mjs

export type RelicRarity = ${rarities};
export type RelicCharacter = ${chars};

export interface RelicMeta {
  name: string;
  character: RelicCharacter;
  rarity: RelicRarity;
}

const RELIC_META: Record<string, RelicMeta> = {
${entries.join('\n')}
};

export function getRelicMeta(id: string): RelicMeta | undefined {
  return RELIC_META[id];
}
`;
  writeFileSync(join(SRC, 'relic-meta.ts'), out);
  console.log(`✔ relic-meta.ts — ${relics.length} relics (${charSet.size} chars, ${raritySet.size} rarities)`);
}

// ── Potions ─────────────────────────────────────────────────────────────────
async function generatePotions(potions, version) {
  const raritySet = new Set();
  const charSet = new Set();

  const entries = potions.map((p) => {
    const rarity = p.rarity_key;
    const character = poolToCharacter(p.pool);
    raritySet.add(rarity);
    charSet.add(character);
    return `  'POTION.${p.id}': { name: '${esc(p.name)}', character: '${character}', rarity: '${rarity}' },`;
  });

  const rarities = [...raritySet].sort().map((r) => `'${r}'`).join(' | ');
  const chars = [...charSet].sort().map((c) => `'${c}'`).join(' | ');

  const out = `// Auto-generated from https://github.com/ptrlrd/spire-codex (${version})
// ${potions.length} potions — regenerate with: node scripts/generate-meta.mjs

export type PotionRarity = ${rarities};
export type PotionCharacter = ${chars};

export interface PotionMeta {
  name: string;
  character: PotionCharacter;
  rarity: PotionRarity;
}

const POTION_META: Record<string, PotionMeta> = {
${entries.join('\n')}
};

export function getPotionMeta(id: string): PotionMeta | undefined {
  return POTION_META[id];
}
`;
  writeFileSync(join(SRC, 'potion-meta.ts'), out);
  console.log(`✔ potion-meta.ts — ${potions.length} potions (${charSet.size} chars, ${raritySet.size} rarities)`);
}

// ── Main ────────────────────────────────────────────────────────────────────
const version = await resolveVersion();
console.log(`Fetching spire-codex data for ${version}...\n`);
const BASE = `${REPO_BASE}/${version}/eng`;

const [cards, relics, potions] = await Promise.all([
  fetchJSON(BASE, 'cards.json'),
  fetchJSON(BASE, 'relics.json'),
  fetchJSON(BASE, 'potions.json'),
]);

await generateCards(cards, version);
await generateRelics(relics, version);
await generatePotions(potions, version);
console.log('\nDone.');
