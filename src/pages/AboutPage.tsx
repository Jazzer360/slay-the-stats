export function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h2 className="text-2xl font-bold text-gray-100 mb-6">About Slay the Stats</h2>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-purple-400 mb-3">ELO Card Rating System</h3>
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
          , whose approach to evaluating card picks provided a sensible framework for
          understanding how you personally value cards relative to each other.
        </p>
        <p className="text-gray-400 leading-relaxed mb-3">
          Every time you pick a card from a reward screen, that choice is treated as a
          head-to-head match: the card you picked "wins" against the cards you passed on.
          Over many runs, the ELO ratings converge to reflect your personal card
          preferences — which cards you reach for most often when given the choice.
        </p>
        <p className="text-yellow-500/80 leading-relaxed text-sm">
          Important: ELO ratings are not an indicator of how well a card has performed for
          you in runs. They do not measure win rate contribution or combat effectiveness.
          They simply show which cards you have been valuing higher when adding to your deck.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-purple-400 mb-3">How It Works</h3>
        <ul className="list-disc list-inside text-gray-400 space-y-2 text-sm">
          <li>All cards start at an ELO rating of 1500</li>
          <li>Each card reward screen is a pairwise matchup between the picked card and each skipped option</li>
          <li>Ratings adjust using K-factor 32, the same system used in chess rankings</li>
          <li>Upgraded cards are tracked separately (e.g., Acrobatics vs Acrobatics+)</li>
          <li>Skipping all cards counts as a "pick" for the skip option, which has its own rating</li>
        </ul>
      </section>
    </div>
  );
}
