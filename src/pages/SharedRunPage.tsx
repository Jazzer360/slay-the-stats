import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { getShare } from '../lib/firestore';
import { parseRunFile } from '../lib/parser';
import { RunDetail } from '../components/run/RunDetail';
import type { ParsedRun } from '../types/run';


export function SharedRunPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<'loading' | 'not-found' | 'loaded' | 'error'>('loading');
  const [run, setRun] = useState<ParsedRun | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        const share = await getShare(token!);
        if (cancelled) return;
        if (!share) {
          setPageState('not-found');
          return;
        }
        const parsed = parseRunFile(share.fileName, share.runContent);
        setRun(parsed);
        setPageState('loaded');
      } catch (err) {
        if (!cancelled) {
          console.error('SharedRunPage load error:', err);
          setPageState('error');
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">Loading shared run…</p>
      </div>
    );
  }

  if (pageState === 'not-found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <p className="text-2xl font-bold text-gray-300">Share Not Found</p>
        <p className="text-gray-500 text-sm">This share link is invalid or has been removed.</p>
        <Link to="/" className="text-purple-400 hover:underline text-sm">Go Home</Link>
      </div>
    );
  }

  if (pageState === 'error' || !run) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-400 text-sm">Failed to load shared run.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-300">
          ← Home
        </Link>
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">Shared Run</span>
      </div>

      <RunDetail run={run} />
    </div>
  );
}
