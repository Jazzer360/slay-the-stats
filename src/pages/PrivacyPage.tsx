export function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h2 className="text-lg font-semibold text-gray-100 mb-2">Privacy Policy</h2>
      <p className="text-gray-500 text-sm mb-10">Last updated: April 13, 2026</p>

      <div className="space-y-8 text-gray-400 text-sm leading-relaxed">
        <section>
          <h3 className="text-base font-semibold text-gray-200 mb-2">Overview</h3>
          <p>
            Slay the Stats is a personal analytics tool for Slay the Spire 2. We respect your
            privacy and collect only the minimum data needed to provide our service. We do not sell
            your data or use it for advertising.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-gray-200 mb-2">Data We Collect</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong className="text-gray-300">Run data:</strong> When you upload .run files, they
              are processed locally in your browser. If you sign in and enable cloud storage, run
              files are stored in Firebase Cloud Storage associated with your account.
            </li>
            <li>
              <strong className="text-gray-300">Account information:</strong> If you create an
              account, we store your authentication details (email or third-party provider ID) and
              optional profile settings (screen name, default filters).
            </li>
            <li>
              <strong className="text-gray-300">Analytics:</strong> With your consent, we use Google
              Analytics (via Firebase) to collect anonymous usage data such as pages visited,
              session duration, and general device/browser information. No personally identifiable
              information is sent to Google Analytics.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-gray-200 mb-2">
            Cookies &amp; Local Storage
          </h3>
          <p>We use the following storage mechanisms:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong className="text-gray-300">Essential cookies:</strong> Firebase authentication
              tokens required for sign-in functionality.
            </li>
            <li>
              <strong className="text-gray-300">Analytics cookies:</strong> Google Analytics cookies
              (e.g. <code className="text-gray-300">_ga</code>) used to track anonymous site usage.
              These are only set if you consent to analytics.
            </li>
            <li>
              <strong className="text-gray-300">Local storage:</strong> Your cookie consent
              preference and application state are stored in your browser's local storage.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-gray-200 mb-2">Your Choices</h3>
          <p>
            When you first visit the site, you will be asked whether to accept analytics cookies.
            You can change this choice at any time — a link is available in the site footer.
            Declining analytics cookies does not affect the core functionality of the site.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-gray-200 mb-2">Third-Party Services</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong className="text-gray-300">Firebase (Google):</strong> Authentication,
              Firestore database, Cloud Storage, Analytics, and App Check. See{' '}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Firebase Privacy Policy
              </a>
              .
            </li>
            <li>
              <strong className="text-gray-300">Google Analytics:</strong> Anonymous usage tracking
              (with consent). See{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Google Privacy Policy
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-gray-200 mb-2">
            Data Retention &amp; Deletion
          </h3>
          <p>
            Run data stored in the cloud is retained until you delete it or delete your account. You
            can delete individual runs or all your data from the Settings page. Analytics data is
            retained according to Google Analytics' default retention policies.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-gray-200 mb-2">Contact</h3>
          <p>
            If you have questions about this privacy policy, please open an issue on the{' '}
            <a
              href="https://github.com/Jazzer360/slay-the-stats"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
