# Slay the Stats

A personal analytics dashboard for [Slay the Spire 2](https://store.steampowered.com/app/2868840/Slay_the_Spire_2/) that turns your `.run` files into actionable insights. All processing happens in your browser — no data is sent to any server unless you opt into cloud sync.

**Live site:** [slay-the-stats.web.app](https://slay-the-stats.web.app)

## Features

- **Card ELO Ratings** — Every card reward screen is treated as a head-to-head matchup. ELO ratings surface the cards you pick most often, with optional upgrade-aware and enchantment-aware modes.
- **Ancient Reward ELO** — The same ranking system applied to ancient reward choices, grouped by family.
- **Combat Stats** — Win rates broken down by encounter, act, elites, and bosses.
- **Run Timeline** — HP progression chart with act boundaries, elite encounters, and boss markers. Floor-by-floor event breakdown showing card rewards, relics, gold changes, potions, and more.
- **Dashboard** — Win rate moving average, character distribution, floor depth tracking, and run duration metrics.
- **Filtering** — Filter runs by character, ascension, date range, or individual card/ancient picks. All stats recalculate dynamically.

## Data Loading

- **Guest mode** — Upload `.run` files directly. Everything stays in-browser and disappears when you close the tab.
- **Cloud mode** — Sign in, upload your run folder, and your data persists across sessions and devices via Firebase.
- **Multi-profile support** — Detects separate Slay the Spire 2 profile folders automatically.

## Sharing

- **Public profiles** — Set a screen name in Settings and share your stats at `/u/your-name`.
- **Run sharing** — Generate a permanent link for any individual run, with or without an account.

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS, Recharts
- Firebase (Auth, Firestore, Cloud Storage)
- Zustand for state management

## Development

```bash
npm install
npm run dev
```

Run tests:

```bash
npm test
```
