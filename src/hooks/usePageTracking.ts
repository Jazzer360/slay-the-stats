import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { logEvent } from 'firebase/analytics';
import { getAnalyticsInstance } from '../lib/firebase';
import { useConsentStore } from '../store/consent';

export function usePageTracking() {
  const location = useLocation();
  const consent = useConsentStore((s) => s.consent);

  useEffect(() => {
    if (consent !== 'accepted') return;

    logEvent(getAnalyticsInstance(), 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
    });
  }, [location, consent]);
}
