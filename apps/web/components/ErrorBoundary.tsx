'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Send to monitoring service in production
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // TODO: Send to Sentry or similar
      this.logErrorToService(error, errorInfo);
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // This will be replaced with actual monitoring service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // TODO: Send to monitoring endpoint
    console.error('Error logged:', errorData);
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-gray-600">
                    An unexpected error occurred
                  </p>
                </div>
              </div>

              {isDevelopment && this.state.error && (
                <div className="mb-4 p-3 bg-gray-100 rounded-md">
                  <p className="text-sm font-mono text-red-600 mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="text-xs text-gray-700 overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
}

// Specialized error boundary for ML features
export function MLFeatureErrorBoundary({ 
  children, 
  feature 
}: { 
  children: ReactNode; 
  feature: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-yellow-500 mb-3" />
            <h4 className="text-md font-medium text-yellow-800 mb-2">
              {feature} Temporarily Unavailable
            </h4>
            <p className="text-sm text-yellow-600">
              This AI-powered feature is currently being optimized. 
              Basic functionality remains available.
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Hook for safely calling ML functions with error handling
export function useMLFeature<T extends any[], R>(
  mlFunction: (...args: T) => Promise<R>,
  fallbackValue: R,
  feature: string
) {
  return React.useCallback(async (...args: T): Promise<R> => {
    try {
      return await mlFunction(...args);
    } catch (error) {
      console.warn(`ML Feature Error (${feature}):`, error);
      
      // Log to monitoring service in production
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        console.error('ML Feature Error:', {
          feature,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          url: window.location.href
        });
      }
      
      return fallbackValue;
    }
  }, [mlFunction, fallbackValue, feature]);
}