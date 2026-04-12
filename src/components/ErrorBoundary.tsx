import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-center px-4">
          <h1 className="text-5xl font-bold text-purple-400 mb-2">Oops</h1>
          <p className="text-xl text-gray-300 mb-6">Something went wrong</p>
          <p className="text-gray-500 mb-8 max-w-md">
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
            className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
