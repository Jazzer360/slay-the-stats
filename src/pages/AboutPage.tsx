import { INITIAL_RATING, K_FACTOR } from '../lib/elo';

export function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h2 className="text-lg font-semibold text-gray-100 mb-2">About Slay the Stats</h2>
      <p className="text-gray-400 text-sm mb-10">
        Slay the Stats is a personal analytics tool for Slay the Spire 2. Load your run history and
        explore win rates, card pick tendencies, deck composition, and more — all calculated locally
        from the .run files the game saves to your computer.
      </p>

      <section className="mb-10">
        <h3 className="text-base font-semibold text-gray-200 mb-3">ELO Card Rating System</h3>
        <p className="text-gray-300 leading-relaxed mb-3">
          The ELO-based card rating system used in this app was inspired by{' '}
          <a
            href="https://www.youtube.com/@Jorbs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            Jorbs
          </a>
          , whose approach to evaluating card picks provided a sensible framework for understanding
          how you personally value cards relative to each other.
        </p>
        <p className="text-gray-400 leading-relaxed mb-3">
          Every time you pick a card from a reward screen, that choice is treated as a head-to-head
          match: the card you picked "wins" against each card you passed on. Over many runs, the ELO
          ratings converge to reflect your personal card preferences — which cards you reach for
          most often when given the choice.
        </p>
        <p className="text-yellow-500/80 leading-relaxed text-sm">
          Important: ELO ratings are not an indicator of how well a card has performed for you in
          runs. They do not measure win rate contribution or combat effectiveness. They simply show
          which cards you have been valuing higher when adding to your deck.
        </p>
      </section>

      <section className="mb-10">
        <h3 className="text-base font-semibold text-gray-200 mb-3">How Filtering Works</h3>
        <p className="text-gray-400 leading-relaxed mb-3">
          Filters (character, ascension range, date range, etc.) don't just slice the run list —
          they recalculate <em>all</em> stats and ELO ratings from scratch using only the matching
          runs. This means:
        </p>
        <ul className="list-disc list-inside text-gray-400 space-y-2 text-sm mb-3">
          <li>
            ELO on a character-filtered view shows your card preferences for that character only,
            not averaged across all characters.
          </li>
          <li>Win rates, average floor, and deck stats all reflect only the filtered subset.</li>
          <li>Switching filters instantly re-derives everything — no cached numbers.</li>
        </ul>
        <p className="text-gray-500 text-sm">
          Because ELO requires many matchups to stabilize, filtering to a small subset of runs will
          produce noisier ratings. The full run set gives the most reliable ELO picture.
        </p>
      </section>

      <section className="mb-10">
        <h3 className="text-base font-semibold text-gray-200 mb-3">How It Works</h3>
        <ul className="list-disc list-inside text-gray-400 space-y-2 text-sm">
          <li>All cards start at an ELO rating of {INITIAL_RATING}</li>
          <li>
            Each card reward screen is a pairwise matchup between the picked card and each skipped
            option
          </li>
          <li>Ratings adjust using K-factor {K_FACTOR}, the same system used in chess rankings</li>
          <li>Upgraded cards are tracked separately (e.g., Acrobatics vs Acrobatics+)</li>
          <li>
            Skipping all cards counts as a "pick" for the skip option, which has its own rating
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Cloud vs. Local Mode</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <p>
            <span className="text-gray-300 font-medium">Without an account</span> — Run files are
            loaded directly into your browser's memory. Nothing is sent to any server. Your data
            disappears when you close or refresh the tab.
          </p>
          <p>
            <span className="text-gray-300 font-medium">With an account</span> — Run files are
            uploaded to the cloud and associated with your account. They load automatically every
            time you sign in, from any device.
          </p>
          <p className="text-gray-500">
            You can switch to cloud mode at any time by signing in and visiting the{' '}
            <a href="/import" className="text-purple-400 hover:text-purple-300">
              Import
            </a>{' '}
            page.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Profiles &amp; Sharing</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <p>
            Signed-in users can choose a screen name in Settings to get a public profile page at{' '}
            <code className="text-purple-300 text-xs bg-gray-800/60 px-1 py-0.5 rounded">
              /u/your-name
            </code>
            . Profiles can be set to public or private.
          </p>
          <p>
            Any individual run can be shared via its detail page — click{' '}
            <span className="text-gray-300">Share Run</span> to get a link. The link works for
            anyone with it, no account required.
          </p>
          <p className="text-gray-500">
            Both authenticated and anonymous share links are permanent.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-200 mb-3">Importing Runs by Profile</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          Slay the Spire 2 saves run files separately per in-game profile (profile0, profile1,
          etc.). Slay the Stats does not currently filter by profile within a single account, but
          you can achieve the same result using the{' '}
          <a href="/import" className="text-purple-400 hover:text-purple-300">
            Import
          </a>{' '}
          page's "Replace all runs" option: wipe your current history and re-upload only the profile
          folder you want to analyze.
        </p>
      </section>
    </div>
  );
}
