import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button.js';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Sanitize diagnostic logging (do not leak auth tokens/passwords)
    console.error('[Bebsayik UI ErrorBoundary caught error]:', {
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';

      return (
        <div className="min-h-[300px] w-full p-6 flex items-center justify-center">
          <div className="max-w-md w-full bg-slate-900 border border-rose-900/40 rounded-2xl p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-700/60 text-rose-400 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-100">Application Error Encountered</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-4">
              A UI component crashed safely. Tenant records and financial database state are unharmed.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-left mb-5 overflow-x-auto">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1">
                Diagnostic Trace
              </span>
              <code className="text-xs text-rose-300 font-mono break-all">{errorMessage}</code>
            </div>

            <div className="flex items-center justify-center space-x-3">
              <Button variant="secondary" size="sm" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={this.handleReload}
              >
                Reload Window
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
