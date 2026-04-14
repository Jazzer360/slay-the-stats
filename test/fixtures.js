/**
 * Curated set of fixture runs used by tests.
 * Each file is chosen because it exercises specific edge cases.
 * Update this list when adding new test scenarios — the download script
 * (scripts/download-fixtures.js) imports from here.
 */
export const TEST_FIXTURES = [
  '1772739653.run', // Floor 1 card choices, shop with card_choices
  '1772745257.run', // Short loss (8 floors), killed by encounter
  '1772746469.run', // 3-act win (primary happy-path fixture)
  '1772754056.run', // 3-act win, Sea Glass ancient choices
  '1772759964.run', // 3-act win
  '1772763220.run', // Multiplayer run
  '1772827962.run', // Lasting Candy (card choices in groups of 4), multiplayer
  '1772838127.run', // Sea Glass ancient choices
  '1773771099.run', // Abandoned mid-combat (killed_by_encounter still set)
  '1774125604.run', // Abandoned, very short (2 floors)
  '1774144997.run', // Abandoned
  '1773793331.run', // Lasting Candy + Battleworn Dummy event (multi-room combat)
  '1774314181.run', // Pael's Wing relic (SACRIFICE option in card ELO)
  '1774380897.run', // Pael's Wing relic
];
