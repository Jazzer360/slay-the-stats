import { Link } from 'react-router';
import { useRunsStore } from '../store/runs';
import { useAuthStore } from '../store/auth';

export function HomePage() {
  const runs = useRunsStore((s) => s.runs);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center pt-4 mb-6">
        <h2 className="text-4xl font-bold mb-4">
          <span className="text-purple-400">⚔</span>{' '}
          <span className="text-gray-100">Slay the Stats</span>
        </h2>
        <p className="text-gray-300 text-lg leading-relaxed max-w-xl mx-auto mb-6">
          Personal analytics for{' '}
          <span className="text-gray-100 font-medium">Slay the Spire 2</span>.
          <br />
          <span className="text-gray-400">
            See your tendencies. Spot your patterns. Enjoy the data.
          </span>
        </p>
        <div className="flex items-center justify-center gap-4">
          {runs.length > 0 ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <Link
              to="/import"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
            >
              Import Runs
            </Link>
          )}
          {!user && (
            <span className="text-gray-500 text-sm">
              or sign in to sync across devices
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800/60 my-10" />

      {/* Philosophy — flowing text, not boxed */}
      <p className="text-gray-400 text-sm leading-relaxed text-center max-w-2xl mx-auto mb-4">
        In my experience, every player approaches the Spire a bit differently —
        even at higher ascensions. Aggregating data across skill levels and
        playstyles doesn't seem to tell you much. But looking at your own trends
        can be genuinely useful: which cards you tend to pick, where your runs
        fall apart, how your decisions shift over time.
      </p>
      <p className="text-gray-500 text-sm leading-relaxed text-center max-w-2xl mx-auto mb-10">
        The design follows the same idea — clean, minimal, focused on the data.
        No ads, no clutter. Just useful information that's easy to read.
      </p>

      {/* What this is / isn't */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
        <div className="border-l-2 border-purple-500/40 pl-5 py-1">
          <h3 className="text-base font-semibold text-gray-200 mb-3">What this is.</h3>
          <ul className="text-gray-400 text-sm leading-relaxed space-y-2">
            <li>A personal mirror for your own play — see your tendencies, track how they change, and enjoy digging into the data.</li>
            <li>A tool for curiosity and self-reflection, not optimization pressure.</li>
            <li>A way to share individual runs and profiles with friends if you want to.</li>
          </ul>
        </div>
        <div className="border-l-2 border-gray-700/60 pl-5 py-1">
          <h3 className="text-base font-semibold text-gray-200 mb-3">What this isn't.</h3>
          <ul className="text-gray-400 text-sm leading-relaxed space-y-2">
            <li>A leaderboard or ranking system. There are no plans to compare players against each other.</li>
            <li>A community-wide aggregation of stats. Your data is yours.</li>
            <li>A tier list or meta guide. The ratings reflect <em>your</em> picks, not what's "best."</li>
          </ul>
        </div>
      </div>

      {/* What's inside */}
      <section className="mb-14">
        <h3 className="text-lg font-semibold text-gray-100 mb-5">What's Inside</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FeatureCard icon="📊" title="Dashboard" description="Win rate and floor depth trends over time, character breakdown, and aggregate stats at a glance." />
          <FeatureCard icon="🃏" title="Card ELO" description="Card rewards as head-to-head matchups. Over many runs, ratings surface your preferences. Upgrade and enchantment-aware modes available." />
          <FeatureCard icon="🏛️" title="Ancient ELO" description="Same pairwise rating system for ancient reward choices, grouped by family." />
          <FeatureCard icon="⚔️" title="Combat Stats" description="Win rates by encounter, act, elites, and bosses. Spot which fights tend to end your runs." />
          <FeatureCard icon="🗺️" title="Run Details" description="HP chart with act boundaries and elite markers, plus floor-by-floor breakdown of every card, relic, and event." />
          <FeatureCard icon="🔗" title="Sharing" description="Share a link to any run for others to explore. Public profiles available for signed-in users." />
        </div>
      </section>

      {/* Slice & Dice — accent treatment */}
      <section className="mb-14">
        <div className="bg-gray-900/50 border border-purple-500/15 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-purple-300 mb-3">Slice &amp; Dice</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            Every page responds to the same set of filters — character, ascension,
            date range, or even a specific card or ancient pick. All stats, ratings,
            and charts recalculate on the fly from whatever subset you've selected.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Card ratings for wins only? Filter to victories. Combat stats per
            character? Pick one. Drafting differently at high ascension? Narrow
            the range. The data is always yours to slice however you like.
          </p>
        </div>
      </section>

      {/* Get started details — for people who scroll */}
      <section className="mb-14">
        <h3 className="text-lg font-semibold text-gray-100 mb-5">How It Works</h3>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
          <p className="text-gray-300 text-sm leading-relaxed">
            Slay the Spire 2 saves a{' '}
            <code className="text-purple-400">.run</code> file after every run.
            Select your save folder and your stats are ready instantly — everything
            is calculated locally in your browser. Nothing leaves your machine
            unless you sign in for cloud sync.
          </p>
          <p className="text-gray-500 text-xs leading-relaxed">
            Default save location:{' '}
            <code className="text-gray-400">%APPDATA%\SlayTheSpire2</code>
            <br />
            If you have multiple profiles, select the base folder and you'll be
            able to choose which one to load.
          </p>
        </div>
      </section>

      {/* Planned features + Known issues */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
        <div>
          <h3 className="text-base font-semibold text-gray-200 mb-3">Planned Features</h3>
          <ul className="text-gray-400 text-sm leading-relaxed space-y-2 pl-4">
            <li className="list-disc">Richer event details in the run timeline</li>
            <li className="list-disc">Relic tracking and statistics</li>
            <li className="list-disc">Continued improvements to run detail pages</li>
            <li className="list-disc">Follow other players' profiles</li>
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-200 mb-3">Known Issues</h3>
          <ul className="text-gray-400 text-sm leading-relaxed space-y-2 pl-4">
            <li className="list-disc">Multiplayer runs only display details for the host player</li>
          </ul>
        </div>
      </div>

      {/* Feedback */}
      <section className="mb-10">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-200 mb-3">
            Feedback &amp; Bug Reports
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Found a bug or have a suggestion? I'd love to hear it. No promises
            on timelines, but feedback is always welcome and helps guide where
            things go next.
          </p>
          <div className="flex flex-wrap gap-5">
            <a
              href="mailto:feedback@slaythestats.com"
              className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <MailIcon />
              feedback@slaythestats.com
            </a>
            <a
              href="https://github.com/Jazzer360/slay-the-stats/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <GitHubIcon />
              Open an issue on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Source */}
      <div className="text-center text-sm text-gray-500 mb-6">
        Open source on{' '}
        <a
          href="https://github.com/Jazzer360/slay-the-stats"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-purple-300 font-semibold text-sm">{title}</p>
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
    </div>
  );
}

function MailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}
