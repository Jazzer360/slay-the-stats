// Auto-generated from https://github.com/ptrlrd/spire-codex (v0.103.0)
// 63 potions — regenerate with: node scripts/generate-meta.mjs

export type PotionRarity = 'Common' | 'Event' | 'Rare' | 'Token' | 'Uncommon';
export type PotionCharacter = 'Colorless' | 'Defect' | 'Ironclad' | 'Necrobinder' | 'Regent' | 'Silent';

export interface PotionMeta {
  name: string;
  character: PotionCharacter;
  rarity: PotionRarity;
}

const POTION_META: Record<string, PotionMeta> = {
  'POTION.ASHWATER': { name: 'Ashwater', character: 'Ironclad', rarity: 'Uncommon' },
  'POTION.ATTACK_POTION': { name: 'Attack Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.BEETLE_JUICE': { name: 'Beetle Juice', character: 'Colorless', rarity: 'Rare' },
  'POTION.BLESSING_OF_THE_FORGE': { name: 'Blessing of the Forge', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.BLOCK_POTION': { name: 'Block Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.BLOOD_POTION': { name: 'Blood Potion', character: 'Ironclad', rarity: 'Common' },
  'POTION.BONE_BREW': { name: 'Bone Brew', character: 'Necrobinder', rarity: 'Uncommon' },
  'POTION.BOTTLED_POTENTIAL': { name: 'Bottled Potential', character: 'Colorless', rarity: 'Rare' },
  'POTION.CLARITY': { name: 'Clarity Extract', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.COLORLESS_POTION': { name: 'Colorless Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.COSMIC_CONCOCTION': { name: 'Cosmic Concoction', character: 'Regent', rarity: 'Rare' },
  'POTION.CUNNING_POTION': { name: 'Cunning Potion', character: 'Silent', rarity: 'Uncommon' },
  'POTION.CURE_ALL': { name: 'Cure All', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.DEXTERITY_POTION': { name: 'Dexterity Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.DISTILLED_CHAOS': { name: 'Distilled Chaos', character: 'Colorless', rarity: 'Rare' },
  'POTION.DROPLET_OF_PRECOGNITION': { name: 'Droplet of Precognition', character: 'Colorless', rarity: 'Rare' },
  'POTION.DUPLICATOR': { name: 'Duplicator', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.ENERGY_POTION': { name: 'Energy Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.ENTROPIC_BREW': { name: 'Entropic Brew', character: 'Colorless', rarity: 'Rare' },
  'POTION.ESSENCE_OF_DARKNESS': { name: 'Essence of Darkness', character: 'Defect', rarity: 'Rare' },
  'POTION.EXPLOSIVE_AMPOULE': { name: 'Explosive Ampoule', character: 'Colorless', rarity: 'Common' },
  'POTION.FAIRY_IN_A_BOTTLE': { name: 'Fairy in a Bottle', character: 'Colorless', rarity: 'Rare' },
  'POTION.FIRE_POTION': { name: 'Fire Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.FLEX_POTION': { name: 'Flex Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.FOCUS_POTION': { name: 'Focus Potion', character: 'Defect', rarity: 'Common' },
  'POTION.FORTIFIER': { name: 'Fortifier', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.FOUL_POTION': { name: 'Foul Potion', character: 'Colorless', rarity: 'Event' },
  'POTION.FRUIT_JUICE': { name: 'Fruit Juice', character: 'Colorless', rarity: 'Rare' },
  'POTION.FYSH_OIL': { name: 'Fysh Oil', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.GAMBLERS_BREW': { name: 'Gambler\'s Brew', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.GHOST_IN_A_JAR': { name: 'Ghost in a Jar', character: 'Silent', rarity: 'Rare' },
  'POTION.GIGANTIFICATION_POTION': { name: 'Gigantification Potion', character: 'Colorless', rarity: 'Rare' },
  'POTION.GLOWWATER_POTION': { name: 'Glowwater Potion', character: 'Colorless', rarity: 'Event' },
  'POTION.HEART_OF_IRON': { name: 'Heart of Iron', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.KINGS_COURAGE': { name: 'King\'s Courage', character: 'Regent', rarity: 'Uncommon' },
  'POTION.LIQUID_BRONZE': { name: 'Liquid Bronze', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.LIQUID_MEMORIES': { name: 'Liquid Memories', character: 'Colorless', rarity: 'Rare' },
  'POTION.LUCKY_TONIC': { name: 'Lucky Tonic', character: 'Colorless', rarity: 'Rare' },
  'POTION.MAZALETHS_GIFT': { name: 'Mazaleth\'s Gift', character: 'Colorless', rarity: 'Rare' },
  'POTION.OROBIC_ACID': { name: 'Orobic Acid', character: 'Colorless', rarity: 'Rare' },
  'POTION.POISON_POTION': { name: 'Poison Potion', character: 'Silent', rarity: 'Common' },
  'POTION.POT_OF_GHOULS': { name: 'Pot of Ghouls', character: 'Necrobinder', rarity: 'Rare' },
  'POTION.POTION_OF_BINDING': { name: 'Potion of Binding', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.POTION_OF_CAPACITY': { name: 'Potion of Capacity', character: 'Defect', rarity: 'Uncommon' },
  'POTION.POTION_OF_DOOM': { name: 'Potion of Doom', character: 'Necrobinder', rarity: 'Common' },
  'POTION.POTION_SHAPED_ROCK': { name: 'Potion-Shaped Rock', character: 'Colorless', rarity: 'Token' },
  'POTION.POWDERED_DEMISE': { name: 'Powdered Demise', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.POWER_POTION': { name: 'Power Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.RADIANT_TINCTURE': { name: 'Radiant Tincture', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.REGEN_POTION': { name: 'Regen Potion', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.SHACKLING_POTION': { name: 'Shackling Potion', character: 'Colorless', rarity: 'Rare' },
  'POTION.SHIP_IN_A_BOTTLE': { name: 'Ship in a Bottle', character: 'Colorless', rarity: 'Rare' },
  'POTION.SKILL_POTION': { name: 'Skill Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.SNECKO_OIL': { name: 'Snecko Oil', character: 'Colorless', rarity: 'Rare' },
  'POTION.SOLDIERS_STEW': { name: 'Soldier\'s Stew', character: 'Ironclad', rarity: 'Rare' },
  'POTION.SPEED_POTION': { name: 'Speed Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.STABLE_SERUM': { name: 'Stable Serum', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.STAR_POTION': { name: 'Star Potion', character: 'Regent', rarity: 'Common' },
  'POTION.STRENGTH_POTION': { name: 'Strength Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.SWIFT_POTION': { name: 'Swift Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.TOUCH_OF_INSANITY': { name: 'Touch of Insanity', character: 'Colorless', rarity: 'Uncommon' },
  'POTION.VULNERABLE_POTION': { name: 'Vulnerable Potion', character: 'Colorless', rarity: 'Common' },
  'POTION.WEAK_POTION': { name: 'Weak Potion', character: 'Colorless', rarity: 'Common' },
};

export function getPotionMeta(id: string): PotionMeta | undefined {
  return POTION_META[id];
}
