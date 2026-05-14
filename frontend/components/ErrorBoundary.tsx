import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Error Boundary Component
 * Catches errors in child components and displays user-friendly error messages
 * Provides retry capability and error reporting
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.componentName ? ` - ${this.props.componentName}` : ''}] Error caught:`,
      error,
      errorInfo
    );

    this.setState((state) => ({
      errorInfo,
      retryCount: state.retryCount + 1,
    }));

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    console.log('[ErrorBoundary] Retrying...');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      const errorMessage = this.state.error?.message || 'An unknown error occurred';
      const isStatisticsTab = this.props.componentName?.includes('Stats');

      return (
        <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,rgba(20,40,80,0.4),rgba(15,23,42,0.9))] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700/50 p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full" />
                <AlertTriangle className="relative w-16 h-16 text-rose-400" />
              </div>
            </div>

            {/* Error Title */}
            <h2 className="text-center text-xl font-bold text-white mb-2">
              {isStatisticsTab ? 'Statistics Tab Error' : 'Component Error'}
            </h2>

            {/* Error Message */}
            <p className="text-center text-slate-300 text-sm mb-4">
              {isStatisticsTab
                ? 'The statistics dashboard encountered an issue. This might be due to large data processing or network issues.'
                : 'An unexpected error occurred while loading this component.'}
            </p>

            {/* Error Details (Dev Only) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-6 p-3 bg-slate-900/50 rounded border border-slate-600 text-xs text-slate-400">
                <summary className="cursor-pointer font-semibold text-slate-300 mb-2">
                  Error Details
                </summary>
                <div className="space-y-2 font-mono text-slate-400">
                  <div>
                    <strong>Error:</strong> {errorMessage}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Retry Count */}
            {this.state.retryCount > 1 && (
              <p className="text-center text-amber-400 text-xs mb-4">
                Retry attempt: {this.state.retryCount}
              </p>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded font-bold text-sm uppercase tracking-wider transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>

              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/80 hover:bg-slate-600 text-white rounded font-bold text-sm uppercase tracking-wider transition-all"
              >
                <Home className="w-4 h-4" />
                Reload Page
              </button>
            </div>

            {/* Help Text */}
            <p className="text-center text-slate-500 text-xs mt-4">
              If the problem persists, please refresh the page or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
