import { Link } from 'react-router';
import { useConsentStore } from '../../store/consent';

export function CookieBanner() {
  const consent = useConsentStore((s) => s.consent);
  const accept = useConsentStore((s) => s.accept);
  const decline = useConsentStore((s) => s.decline);

  if (consent !== 'undecided') return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3 text-sm">
        <p className="text-gray-400 flex-1">
          We use cookies for analytics to understand how the site is used. No advertising tracking.
          See our{' '}
          <Link to="/privacy" className="text-purple-400 hover:text-purple-300 underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-1.5 rounded text-sm font-medium text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-1.5 rounded text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
