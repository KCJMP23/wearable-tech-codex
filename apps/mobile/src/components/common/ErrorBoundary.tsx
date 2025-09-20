import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import * as Application from 'expo-application';
import * as Device from 'expo-device';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'screen' | 'component' | 'app';
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorId: this.generateErrorId()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // Report error to external service
    this.reportError(error, errorInfo);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Show user-friendly message
    if (this.props.level !== 'app') {
      showMessage({
        message: 'Something went wrong',
        description: 'An unexpected error occurred. The issue has been reported.',
        type: 'danger',
        duration: 4000,
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((item, idx) => prevProps.resetKeys?.[idx] !== item)) {
        this.resetError();
      }
    }
    
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetError();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorReport = {
        id: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        appVersion: Application.nativeApplicationVersion,
        buildVersion: Application.nativeBuildVersion,
        platform: Device.osName,
        platformVersion: Device.osVersion,
        deviceModel: Device.modelName,
        level: this.props.level || 'component',
      };

      // In production, send to crash reporting service
      console.log('Error Report:', errorReport);
      
      // You could send to services like Sentry, Bugsnag, etc.
      // await crashReporting.reportError(errorReport);
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: this.generateErrorId()
    });
  };

  retryWithDelay = (delay: number = 1000) => {
    this.resetTimeoutId = setTimeout(() => {
      this.resetError();
    }, delay) as unknown as number;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        level={this.props.level}
        onRetry={this.resetError}
        onRetryWithDelay={() => this.retryWithDelay(2000)}
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  level?: string;
  onRetry: () => void;
  onRetryWithDelay: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  level,
  onRetry,
  onRetryWithDelay,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isDev] = useState(__DEV__);

  const getErrorTitle = () => {
    switch (level) {
      case 'app':
        return 'App Error';
      case 'screen':
        return 'Screen Error';
      default:
        return 'Something went wrong';
    }
  };

  const getErrorMessage = () => {
    switch (level) {
      case 'app':
        return 'The app encountered a critical error and needs to restart.';
      case 'screen':
        return 'This screen encountered an error. You can try refreshing or go back.';
      default:
        return 'This component encountered an error. Please try again.';
    }
  };

  const getIconName = () => {
    switch (level) {
      case 'app':
        return 'warning' as const;
      case 'screen':
        return 'refresh' as const;
      default:
        return 'alert-circle' as const;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: '#ffffff',
    },
    content: {
      alignItems: 'center',
      maxWidth: 400,
      width: '100%',
    },
    icon: {
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: 12,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: '#6b7280',
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    errorId: {
      fontSize: 12,
      color: '#9ca3af',
      marginBottom: 24,
      fontFamily: 'monospace',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
      width: '100%',
    },
    button: {
      flex: 1,
      backgroundColor: '#3b82f6',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonSecondary: {
      backgroundColor: '#6b7280',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    detailsButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    detailsButtonText: {
      color: '#6b7280',
      fontSize: 14,
    },
    detailsContainer: {
      width: '100%',
      marginTop: 16,
      padding: 16,
      backgroundColor: '#f9f9f9',
      borderRadius: 8,
      maxHeight: 200,
    },
    detailsText: {
      fontSize: 12,
      color: '#374151',
      fontFamily: 'monospace',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons 
          name={getIconName()} 
          size={64} 
          color="#ef4444" 
          style={styles.icon} 
        />
        
        <Text style={styles.title}>{getErrorTitle()}</Text>
        <Text style={styles.message}>{getErrorMessage()}</Text>
        
        <Text style={styles.errorId}>Error ID: {errorId}</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={onRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.buttonSecondary]} 
            onPress={onRetryWithDelay}
          >
            <Text style={styles.buttonText}>Retry in 2s</Text>
          </TouchableOpacity>
        </View>

        {isDev && (
          <>
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.detailsButtonText}>
                {showDetails ? 'Hide' : 'Show'} Error Details
              </Text>
            </TouchableOpacity>

            {showDetails && (
              <ScrollView style={styles.detailsContainer}>
                <Text style={styles.detailsText}>
                  {error?.message}
                  {'\n\n'}
                  {error?.stack}
                  {errorInfo?.componentStack && (
                    '\n\nComponent Stack:' + errorInfo.componentStack
                  )}
                </Text>
              </ScrollView>
            )}
          </>
        )}
      </View>
    </View>
  );
};

import { useState } from 'react';