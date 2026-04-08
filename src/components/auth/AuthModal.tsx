import { useState } from 'react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../../lib/auth';

interface AuthModalProps {
  onClose: () => void;
}

type Tab = 'signin' | 'signup';

export function AuthModal({ onClose }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? formatAuthError(err.message) : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? formatAuthError(err.message) : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm mx-4 p-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1">
          {(['signin', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors mb-4"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">or</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function formatAuthError(message: string): string {
  if (message.includes('user-not-found') || message.includes('wrong-password') || message.includes('invalid-credential')) {
    return 'Invalid email or password.';
  }
  if (message.includes('email-already-in-use')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('weak-password')) {
    return 'Password must be at least 6 characters.';
  }
  if (message.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('popup-closed-by-user')) {
    return 'Sign-in was cancelled.';
  }
  return 'Authentication failed. Please try again.';
}
