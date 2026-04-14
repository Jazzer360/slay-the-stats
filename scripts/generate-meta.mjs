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
async function generateCards(cards, version) {
  const colorSet = new Set();
  const raritySet = new Set();
  const typeSet = new Set();

  const entries = cards.map((c) => {
    const color = titleCase(c.color);
    const rarity = c.rarity_key;
    const type = c.type_key;
    colorSet.add(color);
    raritySet.add(rarity);
    typeSet.add(type);
    return `  'CARD.${c.id}': { name: '${esc(c.name)}', color: '${color}', rarity: '${rarity}', type: '${type}' },`;
  });

  const colors = [...colorSet].sort().map((c) => `'${c}'`).join(' | ');
  const rarities = [...raritySet].sort().map((r) => `'${r}'`).join(' | ');
  const types = [...typeSet].sort().map((t) => `'${t}'`).join(' | ');

  const out = `// Auto-generated from https://github.com/ptrlrd/spire-codex (${version})
// ${cards.length} cards — regenerate with: node scripts/generate-meta.mjs

export type CardColor = ${colors};
export type CardRarity = ${rarities};
export type CardType = ${types};

export interface CardMeta {
  name: string;
  color: CardColor;
  rarity: CardRarity;
  type: CardType;
}

const CARD_META: Record<string, CardMeta> = {
${entries.join('\n')}
};

export function getCardMeta(cardId: string): CardMeta | undefined {
  // Strip enchantment suffix like " [ENCHANTMENT.SWIFT]"
  const bracketIdx = cardId.indexOf(' [');
  const withoutEnchantment = bracketIdx !== -1 ? cardId.slice(0, bracketIdx) : cardId;
  const baseId = withoutEnchantment.endsWith('+') ? withoutEnchantment.slice(0, -1) : withoutEnchantment;
  return CARD_META[baseId];
}
`;
  writeFileSync(join(SRC, 'card-meta.ts'), out);
  console.log(`✔ card-meta.ts  — ${cards.length} cards  (${colorSet.size} colors, ${raritySet.size} rarities, ${typeSet.size} types)`);
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
