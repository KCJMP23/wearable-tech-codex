import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FlashMessage from 'react-native-flash-message';

import { store } from '../src/store';
import { 
  queryClient, 
  initializeQueryPersistence, 
  initializeNetworkMonitoring,
  cleanup 
} from '../src/services/queryClient';
import { notificationService } from '../src/services/notifications';
import { webSocketService } from '../src/services/websocket';
import { offlineQueue } from '../src/services/offlineQueue';
import { deepLinkingService } from '../src/utils/deepLinking';
import { ThemeProvider } from '../src/providers/ThemeProvider';
import { AuthProvider } from '../src/providers/AuthProvider';
import { NotificationProvider } from '../src/providers/NotificationProvider';
import { OfflineProvider } from '../src/providers/OfflineProvider';
import { ErrorBoundary } from '../src/components/ui';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // Add more fonts as needed
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Initialize app services
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize React Query persistence
        await initializeQueryPersistence();
        
        // Initialize network monitoring
        initializeNetworkMonitoring();
        
        // Initialize push notifications
        await notificationService.initialize();
        
        // Initialize deep linking
        await deepLinkingService.initialize();
        
        console.log('App services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app services:', error);
      }
    };

    initializeApp();

    // Cleanup function
    return () => {
      cleanup();
      notificationService.cleanup();
      webSocketService.cleanup();
      offlineQueue.cleanup();
      deepLinkingService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Root Error Boundary caught an error:', error, errorInfo);
        // You could send this to a crash reporting service here
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                <AuthProvider>
                  <OfflineProvider>
                    <NotificationProvider>
                      <Stack
                        screenOptions={{
                          headerShown: false,
                        }}
                      >
                        <Stack.Screen 
                          name="(auth)" 
                          options={{ 
                            headerShown: false,
                            gestureEnabled: false // Prevent going back to auth screens
                          }} 
                        />
                        <Stack.Screen 
                          name="(tabs)" 
                          options={{ 
                            headerShown: false,
                            gestureEnabled: false // Prevent going back to tabs from other screens
                          }} 
                        />
                        <Stack.Screen 
                          name="products" 
                          options={{ 
                            headerShown: false,
                            presentation: 'card',
                            gestureEnabled: true
                          }} 
                        />
                        <Stack.Screen 
                          name="site" 
                          options={{ 
                            headerShown: false,
                            presentation: 'card',
                            gestureEnabled: true
                          }} 
                        />
                        <Stack.Screen 
                          name="product" 
                          options={{ 
                            headerShown: false,
                            presentation: 'card',
                            gestureEnabled: true
                          }} 
                        />
                        <Stack.Screen 
                          name="settings" 
                          options={{ 
                            headerShown: false,
                            presentation: 'card',
                            gestureEnabled: true
                          }} 
                        />
                        <Stack.Screen 
                          name="help" 
                          options={{ 
                            headerShown: false,
                            presentation: 'modal',
                            gestureEnabled: true
                          }} 
                        />
                        <Stack.Screen 
                          name="modal" 
                          options={{ 
                            presentation: 'modal',
                            gestureEnabled: true
                          }} 
                        />
                      </Stack>
                      <StatusBar style="auto" />
                      <FlashMessage 
                        position="top" 
                        duration={4000}
                        hideOnPress={true}
                        floating={true}
                        style={{
                          marginTop: 40, // Account for status bar
                          marginHorizontal: 20,
                          borderRadius: 8,
                        }}
                      />
                    </NotificationProvider>
                  </OfflineProvider>
                </AuthProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}