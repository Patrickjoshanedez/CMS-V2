import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

/**
 * RouteErrorBoundaryInner — Class component catching unhandled render exceptions
 * in routed page hierarchies and providing graceful recovery.
 */
export class RouteErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('RouteErrorBoundary caught an unhandled rendering error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps) {
    if (
      this.state.hasError &&
      prevProps.location?.pathname !== this.props.location?.pathname
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoDashboard = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="min-h-[50vh] flex items-center justify-center p-4 sm:p-6"
        >
          <div className="max-w-md w-full bg-card border border-border/60 rounded-xl p-6 sm:p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>

            <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight mb-2">
              Something went wrong
            </h2>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              An unexpected error occurred while loading this page. You can try recovering this view
              or navigate to your dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <Button
                variant="default"
                size="sm"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={this.handleGoDashboard}
                className="w-full sm:w-auto inline-flex items-center gap-1.5"
              >
                <Home className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </Button>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error?.message && (
              <details className="mt-6 text-left border border-border/40 rounded-lg p-3 bg-muted/40">
                <summary className="text-xs font-mono font-medium text-muted-foreground cursor-pointer select-none">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs font-mono text-destructive whitespace-pre-wrap break-words overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

RouteErrorBoundaryInner.propTypes = {
  children: PropTypes.node,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  location: PropTypes.shape({
    pathname: PropTypes.string,
  }),
};

/**
 * RouteErrorBoundary — Functional wrapper providing route location context
 * to enable automatic error reset upon URL navigation.
 */
export default function RouteErrorBoundary({ children, fallback }) {
  const location = useLocation();

  return (
    <RouteErrorBoundaryInner location={location} fallback={fallback}>
      {children}
    </RouteErrorBoundaryInner>
  );
}

RouteErrorBoundary.propTypes = {
  children: PropTypes.node,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};
