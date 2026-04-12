import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-6xl font-bold text-purple-400 mb-2">404</h1>
      <p className="text-xl text-gray-300 mb-6">Page not found</p>
      <p className="text-gray-500 mb-8 max-w-md">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
