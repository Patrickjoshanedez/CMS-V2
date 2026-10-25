import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Home } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './Alert';
import { Button } from './Button';
import { Card, CardContent, CardFooter, CardHeader } from './Card';
import { topProgress } from '@/lib/topProgress';

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
    topProgress.fail();
    if (process.env.NODE_ENV !== 'test') {
      console.error('RouteErrorBoundary caught an unhandled rendering error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.location?.pathname !== this.props.location?.pathname) {
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
        <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-4">
              <Alert variant="destructive" className="text-left">
                <AlertTitle className="text-base font-semibold">Something went wrong</AlertTitle>
                <AlertDescription className="leading-relaxed">
                  An unexpected error occurred while loading this page. You can try recovering this
                  view or navigate to your dashboard.
                </AlertDescription>
              </Alert>
            </CardHeader>

            <CardContent className="space-y-5">
              <CardFooter className="flex-col justify-center gap-2 border-t border-border/60 pt-4 sm:flex-row sm:gap-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={this.handleReset}
                  className="min-h-[44px] w-full gap-1.5 sm:min-h-9 sm:w-auto"
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  <span>Try Again</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleGoDashboard}
                  className="min-h-[44px] w-full gap-1.5 sm:min-h-9 sm:w-auto"
                >
                  <Home className="size-4" aria-hidden="true" />
                  <span>Go to Dashboard</span>
                </Button>
              </CardFooter>

              {process.env.NODE_ENV !== 'production' && this.state.error?.message && (
                <details className="rounded-md border border-border/60 bg-muted/40 p-3 text-left">
                  <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Error Details
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-destructive-text">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
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
